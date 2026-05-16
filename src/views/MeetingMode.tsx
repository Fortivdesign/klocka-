import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../store';
import { Avatar } from '../components/Avatar';
import { startOfWeek } from '../lib/time';
import { computeFocusScore, pickRoastTitle } from '@shared/scoring';
import { summarizeWeek, speakSummary } from '../lib/summary';
import { speak, sfx, celebrate } from '../lib/effects';

type Slide = 'intro' | 'leaderboard' | 'summary' | 'slacker' | 'outro';
const SLIDES: Slide[] = ['intro', 'leaderboard', 'summary', 'slacker', 'outro'];

export function MeetingMode({ onExit }: { onExit: () => void }) {
  const team = useStore((s) => s.team);
  const sessions = useStore((s) => s.sessions);
  const offline = useStore((s) => s.offlineActivities);
  const [slide, setSlide] = useState<Slide>('intro');
  const [summaryIdx, setSummaryIdx] = useState(0);
  const [autoplay, setAutoplay] = useState(true);

  const rows = useMemo(() => {
    const weekStart = startOfWeek().getTime();
    return team.map((m) => {
      const userSessions = sessions.filter((s) => s.userId === m.id && s.start >= weekStart);
      const samples = userSessions.flatMap((s) => s.samples);
      const userOffline = offline.filter((o) => o.userId === m.id && o.start >= weekStart);
      const clocked = userSessions.reduce((a, s) => a + (s.end - s.start) / 60_000, 0);
      const score = computeFocusScore({ clockedMinutes: clocked, samples, offline: userOffline });
      return { member: m, score, clockedH: clocked / 60 };
    }).sort((a, b) => b.score.finalScore - a.score.finalScore);
  }, [team, sessions, offline]);

  const winner = rows[0];
  const loser = rows[rows.length - 1];
  const summaries = useMemo(
    () => team.map((m) => ({ member: m, text: summarizeWeek(m, sessions) })),
    [team, sessions],
  );

  useEffect(() => {
    if (!autoplay) return;
    const delay =
      slide === 'intro' ? 3500 :
      slide === 'leaderboard' ? 8000 :
      slide === 'slacker' ? 9000 :
      slide === 'summary' ? 9000 :
      6000;
    const t = setTimeout(() => {
      if (slide === 'summary' && summaryIdx < summaries.length - 1) {
        setSummaryIdx((i) => i + 1);
      } else {
        const idx = SLIDES.indexOf(slide);
        const next = SLIDES[idx + 1];
        if (next) {
          setSlide(next);
          if (next === 'summary') setSummaryIdx(0);
        }
      }
    }, delay);
    return () => clearTimeout(t);
  }, [slide, summaryIdx, autoplay, summaries.length]);

  useEffect(() => {
    if (slide === 'intro') sfx.achievement();
    if (slide === 'leaderboard' && winner) celebrate({ intensity: 'huge' });
    if (slide === 'slacker' && loser) {
      const roast = pickRoastTitle(loser.member.id + new Date().toISOString().slice(0, 10));
      sfx.slackerTrombone();
      setTimeout(() => speak(`Och veckans Slacker är... ${loser.member.name}. ${roast.title}. ${roast.roast}`), 800);
    }
    if (slide === 'summary' && summaries[summaryIdx]) {
      setTimeout(() => speak(speakSummary(summaries[summaryIdx].text)), 200);
    }
  }, [slide, summaryIdx, winner, loser, summaries]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onExit();
      if (e.key === 'ArrowRight' || e.key === ' ') {
        const idx = SLIDES.indexOf(slide);
        if (slide === 'summary' && summaryIdx < summaries.length - 1) {
          setSummaryIdx((i) => i + 1);
        } else if (SLIDES[idx + 1]) {
          setSlide(SLIDES[idx + 1]);
          if (SLIDES[idx + 1] === 'summary') setSummaryIdx(0);
        }
      }
      if (e.key === 'ArrowLeft') {
        if (slide === 'summary' && summaryIdx > 0) setSummaryIdx((i) => i - 1);
        else {
          const idx = SLIDES.indexOf(slide);
          if (SLIDES[idx - 1]) setSlide(SLIDES[idx - 1]);
        }
      }
      if (e.key === 'p') setAutoplay((x) => !x);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [slide, summaryIdx, summaries.length, onExit]);

  return (
    <div className="meeting-overlay">
      <button className="meeting-exit" onClick={onExit}>✕ Stäng (Esc)</button>
      <div className="meeting-hint">
        ← → byt slide · P paus · Esc avsluta · {autoplay ? '▶ autoplay' : '⏸ pausad'}
      </div>

      {slide === 'intro' && (
        <div className="meeting-slide fade-in">
          <div className="big-brand">Klocka</div>
          <div className="big-title">Veckomöte</div>
          <div className="big-sub">{new Date().toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        </div>
      )}

      {slide === 'leaderboard' && (
        <div className="meeting-slide fade-in">
          <div className="big-eyebrow">🏆 Veckans Leaderboard</div>
          <div className="leaderboard-big">
            {rows.map((r, i) => (
              <div key={r.member.id} className={`row-big rank-${i + 1}`} style={{ animationDelay: `${i * 200}ms` }}>
                <div className="rank-big">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</div>
                <Avatar member={r.member} size={64} showRing={i === 0} />
                <div className="row-big-name">{r.member.name}</div>
                <div className="row-big-score">{r.score.finalScore} <span>pts</span></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {slide === 'summary' && summaries[summaryIdx] && (
        <div className="meeting-slide fade-in" key={summaryIdx}>
          <div className="big-eyebrow">📋 Veckosammanfattning · {summaryIdx + 1}/{summaries.length}</div>
          <div className="summary-card">
            <Avatar member={summaries[summaryIdx].member} size={92} />
            <div className="summary-name">{summaries[summaryIdx].member.name}</div>
            <div className="summary-text">{summaries[summaryIdx].text.replace(/\*\*/g, '')}</div>
          </div>
        </div>
      )}

      {slide === 'slacker' && loser && (
        <div className="meeting-slide fade-in">
          <div className="big-eyebrow">🦥 Veckans Slacker</div>
          <SlackerSlide loser={loser} />
        </div>
      )}

      {slide === 'outro' && (
        <div className="meeting-slide fade-in">
          <div className="big-title">Tack alla! 👋</div>
          <div className="big-sub">Ny vecka, ny chans.</div>
        </div>
      )}
    </div>
  );
}

function SlackerSlide({ loser }: { loser: { member: { id: string; name: string; color: string; avatarEmoji: string }; score: { finalScore: number; focusFactor: number; workCategoryMinutes: number; funCategoryMinutes: number }; clockedH: number } }) {
  const roast = pickRoastTitle(loser.member.id + new Date().toISOString().slice(0, 10));
  return (
    <div className="slacker-big">
      <div className="slacker-big-emoji">{roast.emoji}</div>
      <Avatar member={loser.member as never} size={120} />
      <div className="slacker-big-name">{loser.member.name}</div>
      <div className="slacker-big-title">{roast.title}</div>
      <div className="slacker-big-roast">"{roast.roast}"</div>
      <div className="slacker-big-stats">
        <span>{loser.clockedH.toFixed(1)}h klockat</span>
        <span>•</span>
        <span>{(loser.score.workCategoryMinutes / 60).toFixed(1)}h jobb</span>
        <span>•</span>
        <span>{Math.round(loser.score.focusFactor * 100)}% fokus</span>
      </div>
    </div>
  );
}
