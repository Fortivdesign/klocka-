import { useState } from 'react';
import { useStore } from '../store';
import { weekKey } from '../lib/time';

export function WeeklyMeeting() {
  const user = useStore((s) => s.currentUser);
  const team = useStore((s) => s.team);
  const plans = useStore((s) => s.weeklyPlans);
  const deliveries = useStore((s) => s.weeklyDeliveries);
  const addPlan = useStore((s) => s.addPlan);
  const addDelivery = useStore((s) => s.addDelivery);

  const wk = weekKey();
  const [planText, setPlanText] = useState('');
  const [deliveryText, setDeliveryText] = useState('');
  const [presentation, setPresentation] = useState<string | null>(null);

  function submitPlan() {
    if (!user) return;
    const goals = planText.split('\n').map((s) => s.trim()).filter(Boolean);
    if (!goals.length) return;
    addPlan({ userId: user.id, weekStart: wk, goals, submittedAt: Date.now() });
    setPlanText('');
  }

  async function pickPresentation() {
    const api = window.klocka;
    if (!api) return;
    const path = await api.dialog.selectFile();
    if (path) setPresentation(path);
  }

  function submitDelivery() {
    if (!user) return;
    const delivered = deliveryText.split('\n').map((s) => s.trim()).filter(Boolean);
    if (!delivered.length && !presentation) return;
    addDelivery({
      userId: user.id,
      weekStart: wk,
      delivered,
      presentationUrl: presentation ?? undefined,
      submittedAt: Date.now(),
    });
    setDeliveryText('');
    setPresentation(null);
  }

  return (
    <>
      <h1 className="h1">📅 Veckomöte</h1>
      <p className="subtitle">Vad sa du att du skulle göra — och vad gjorde du faktiskt?</p>

      <div className="grid cols-2">
        <div className="card">
          <h3 style={{ marginTop: 0 }}>📝 Min veckoplan ({wk})</h3>
          <p style={{ color: 'var(--muted)', fontSize: 12 }}>Ett mål per rad.</p>
          <textarea
            rows={6}
            placeholder={'Färdigställa onboarding-flowet\nFixa bugg i exporten\nPair med Anna på sökningen'}
            value={planText}
            onChange={(e) => setPlanText(e.target.value)}
          />
          <button className="primary" onClick={submitPlan} style={{ marginTop: 10 }}>Skicka plan</button>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>🎤 Min leverans + presentation</h3>
          <p style={{ color: 'var(--muted)', fontSize: 12 }}>Vad blev faktiskt klart? Bifoga gärna presentationen.</p>
          <textarea
            rows={5}
            placeholder={'Onboarding deployad till staging\nBugg fixad, PR mergead'}
            value={deliveryText}
            onChange={(e) => setDeliveryText(e.target.value)}
          />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }}>
            <button onClick={pickPresentation}>📎 Välj fil (.pdf, .key, .pptx)</button>
            {presentation && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{presentation.split('/').pop()}</span>}
          </div>
          <button className="success" onClick={submitDelivery} style={{ marginTop: 10 }}>Skicka leverans</button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 22 }}>
        <h3 style={{ marginTop: 0 }}>📊 Plan vs leverans — denna vecka</h3>
        <table>
          <thead>
            <tr>
              <th>Person</th>
              <th>Plan</th>
              <th>Levererat</th>
              <th>Match</th>
              <th>Pres.</th>
            </tr>
          </thead>
          <tbody>
            {team.map((m) => {
              const plan = plans.find((p) => p.userId === m.id && p.weekStart === wk);
              const delivery = deliveries.find((d) => d.userId === m.id && d.weekStart === wk);
              const planCount = plan?.goals.length ?? 0;
              const delivCount = delivery?.delivered.length ?? 0;
              const match = planCount === 0 ? 0 : Math.min(1, delivCount / planCount);
              return (
                <tr key={m.id}>
                  <td>{m.avatarEmoji} {m.name}</td>
                  <td>{planCount > 0 ? `${planCount} mål` : <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                  <td>{delivCount > 0 ? `${delivCount} klar` : <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                  <td>
                    {planCount > 0 ? (
                      <div className="score-bar" style={{ width: 100 }}>
                        <div style={{ width: `${match * 100}%` }} />
                      </div>
                    ) : '—'}
                  </td>
                  <td>{delivery?.presentationUrl ? '📎' : '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
