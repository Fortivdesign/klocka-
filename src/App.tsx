import { useEffect, useState } from 'react';
import { useStore } from './store';
import { Sidebar, type View } from './components/Sidebar';
import { Dashboard } from './views/Dashboard';
import { WeeklyPlan } from './views/WeeklyPlan';
import { Leaderboard } from './views/Leaderboard';
import { Insights } from './views/Insights';
import { WeeklyMeeting } from './views/WeeklyMeeting';
import { SlackerView } from './views/SlackerView';
import { Shop } from './views/Shop';
import { ScreenshotsView } from './views/ScreenshotsView';
import { Achievements } from './views/Achievements';
import { MeetingMode } from './views/MeetingMode';
import { ConsentGate } from './components/ConsentGate';
import { Toasts } from './components/Toasts';
import { HeartbeatModal } from './components/HeartbeatModal';
import { startRealtimeSync } from './lib/sync';

export function App() {
  const [view, setView] = useState<View>('dashboard');
  const [meetingMode, setMeetingMode] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const clockedIn = useStore((s) => s.clockedIn);
  const triggerHeartbeat = useStore((s) => s.triggerHeartbeat);
  const pendingHb = useStore((s) => s.pendingHeartbeat);

  useEffect(() => {
    if (!clockedIn) return;
    const delay = (30 + Math.random() * 45) * 60_000;
    const t = setTimeout(() => {
      if (useStore.getState().clockedIn) triggerHeartbeat();
    }, delay);
    return () => clearTimeout(t);
  }, [clockedIn, triggerHeartbeat, pendingHb]);

  useEffect(() => {
    let mounted = true;
    const api = window.klocka;
    if (api) {
      api.consent.get().then((g) => {
        if (!mounted) return;
        setConsentGiven(g);
        setConsentChecked(true);
      });
    } else {
      setConsentGiven(true);
      setConsentChecked(true);
    }
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    startRealtimeSync();
  }, []);

  useEffect(() => {
    const off = window.klocka?.on('tray:toggle-clock', () => {
      const ev = new CustomEvent('klocka:toggle-clock');
      window.dispatchEvent(ev);
    });
    return () => { off?.(); };
  }, []);

  if (!consentChecked) return null;
  if (!consentGiven) {
    return <ConsentGate onConsent={async () => {
      if (window.klocka) await window.klocka.consent.set(true);
      setConsentGiven(true);
    }} />;
  }

  if (meetingMode) {
    return <MeetingMode onExit={() => setMeetingMode(false)} />;
  }

  return (
    <div className="app">
      <Sidebar current={view} onChange={setView} />
      <div className="main">
        <button className="meeting-launch" onClick={() => setMeetingMode(true)} title="Starta presentation för veckomötet (storbild)">
          🎬 Presentation
        </button>
        {view === 'dashboard' && <Dashboard onNavigate={setView} />}
        {view === 'plan' && <WeeklyPlan />}
        {view === 'leaderboard' && <Leaderboard />}
        {view === 'insights' && <Insights />}
        {view === 'weekly' && <WeeklyMeeting />}
        {view === 'slacker' && <SlackerView />}
        {view === 'shop' && <Shop />}
        {view === 'screenshots' && <ScreenshotsView />}
        {view === 'achievements' && <Achievements />}
      </div>
      <Toasts />
      <HeartbeatModal />
    </div>
  );
}
