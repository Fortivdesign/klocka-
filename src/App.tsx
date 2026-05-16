import { useEffect, useState } from 'react';
import { useStore, generateDemoData } from './store';
import { Sidebar, type View } from './components/Sidebar';
import { Dashboard } from './views/Dashboard';
import { Leaderboard } from './views/Leaderboard';
import { WeeklyMeeting } from './views/WeeklyMeeting';
import { SlackerView } from './views/SlackerView';
import { ScreenshotsView } from './views/ScreenshotsView';
import { Achievements } from './views/Achievements';
import { ConsentGate } from './components/ConsentGate';

export function App() {
  const [view, setView] = useState<View>('dashboard');
  const [consentChecked, setConsentChecked] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);
  const sessions = useStore((s) => s.sessions);

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
    if (sessions.length === 0) generateDemoData();
  }, [sessions.length]);

  if (!consentChecked) return null;
  if (!consentGiven) {
    return <ConsentGate onConsent={async () => {
      if (window.klocka) await window.klocka.consent.set(true);
      setConsentGiven(true);
    }} />;
  }

  return (
    <div className="app">
      <Sidebar current={view} onChange={setView} />
      <div className="main">
        {view === 'dashboard' && <Dashboard />}
        {view === 'leaderboard' && <Leaderboard />}
        {view === 'weekly' && <WeeklyMeeting />}
        {view === 'slacker' && <SlackerView />}
        {view === 'screenshots' && <ScreenshotsView />}
        {view === 'achievements' && <Achievements />}
      </div>
    </div>
  );
}
