import { useState } from 'react';

export function ConsentGate({ onConsent }: { onConsent: () => void }) {
  const [checked, setChecked] = useState({ activity: false, apps: false, screenshots: false });
  const all = checked.activity && checked.apps && checked.screenshots;

  return (
    <div className="consent-overlay">
      <div className="consent-card">
        <h2 style={{ marginTop: 0 }}>👋 Välkommen till Klocka</h2>
        <p style={{ color: 'var(--muted)' }}>
          För att kunna räkna ut fokus-score och Veckans Slacker behöver vi ditt samtycke.
          Du kan när som helst pausa övervakningen genom att klocka ut.
          All data lagras i ditt teams Supabase-projekt.
        </p>

        <label style={{ display: 'flex', gap: 10, padding: '10px 0', alignItems: 'flex-start' }}>
          <input type="checkbox" checked={checked.activity} onChange={(e) => setChecked({ ...checked, activity: e.target.checked })} />
          <span>
            <b>Aktivitetsmätning.</b> Klocka mäter om tangentbord/mus används,
            men loggar <i>inte</i> vad du skriver.
          </span>
        </label>

        <label style={{ display: 'flex', gap: 10, padding: '10px 0', alignItems: 'flex-start' }}>
          <input type="checkbox" checked={checked.apps} onChange={(e) => setChecked({ ...checked, apps: e.target.checked })} />
          <span>
            <b>App-detektering.</b> Klocka loggar namnet på det aktiva fönstret
            (t.ex. "Visual Studio Code" eller "FIFA 24") för kategorisering.
          </span>
        </label>

        <label style={{ display: 'flex', gap: 10, padding: '10px 0', alignItems: 'flex-start' }}>
          <input type="checkbox" checked={checked.screenshots} onChange={(e) => setChecked({ ...checked, screenshots: e.target.checked })} />
          <span>
            <b>Slumpvisa screenshots.</b> Cirka var 30–55:e minut tas en skärmdump
            som <i>du själv granskar och godkänner</i> innan den laddas upp.
            Du kan blurra eller radera den.
          </span>
        </label>

        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 16 }}>
          Genom att godkänna bekräftar du att du läst hur datan används enligt GDPR.
          Du kan när som helst återkalla samtycke och radera din data.
        </p>

        <button className="primary" disabled={!all} onClick={onConsent} style={{ width: '100%', marginTop: 12, opacity: all ? 1 : 0.5 }}>
          Godkänn och fortsätt
        </button>
      </div>
    </div>
  );
}
