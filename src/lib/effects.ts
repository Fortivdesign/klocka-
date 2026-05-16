import confetti from 'canvas-confetti';

export function celebrate(opts: { intensity?: 'mini' | 'normal' | 'huge' } = {}) {
  const intensity = opts.intensity ?? 'normal';
  const count = intensity === 'mini' ? 60 : intensity === 'huge' ? 240 : 130;
  confetti({
    particleCount: count,
    spread: 75,
    origin: { y: 0.7 },
    colors: ['#7c5cff', '#29d398', '#5cc8ff', '#f5a524', '#ff6b6b'],
  });
  if (intensity === 'huge') {
    setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 65, origin: { x: 0, y: 0.65 } }), 200);
    setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 65, origin: { x: 1, y: 0.65 } }), 350);
  }
}

let ctx: AudioContext | null = null;
function getCtx() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)(); } catch { ctx = null; }
  }
  return ctx;
}

function tone(freq: number, durationMs: number, type: OscillatorType = 'sine', volume = 0.08, delayMs = 0) {
  const c = getCtx();
  if (!c) return;
  const start = c.currentTime + delayMs / 1000;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + durationMs / 1000);
  osc.connect(gain).connect(c.destination);
  osc.start(start);
  osc.stop(start + durationMs / 1000 + 0.05);
}

export const sfx = {
  clockIn() {
    tone(523, 180, 'sine');
    tone(659, 180, 'sine', 0.08, 90);
    tone(784, 260, 'sine', 0.08, 180);
  },
  clockOut() {
    tone(784, 180, 'sine');
    tone(523, 220, 'sine', 0.08, 100);
  },
  achievement() {
    tone(523, 110);
    tone(659, 110, 'sine', 0.08, 70);
    tone(784, 110, 'sine', 0.08, 140);
    tone(1047, 360, 'sine', 0.1, 220);
  },
  coin() {
    tone(988, 80, 'triangle', 0.07);
    tone(1319, 140, 'triangle', 0.07, 60);
  },
  slackerTrombone() {
    tone(440, 250, 'sawtooth', 0.06);
    tone(370, 250, 'sawtooth', 0.06, 240);
    tone(311, 250, 'sawtooth', 0.06, 480);
    tone(247, 500, 'sawtooth', 0.07, 720);
  },
};

export function speak(text: string, opts: { rate?: number; pitch?: number; lang?: string } = {}) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = opts.lang ?? 'sv-SE';
  u.rate = opts.rate ?? 1;
  u.pitch = opts.pitch ?? 1;
  window.speechSynthesis.speak(u);
}
