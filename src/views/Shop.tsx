import { useStore } from '../store';
import { SHOP } from '../lib/challenges';
import { sfx, celebrate } from '../lib/effects';

export function Shop() {
  const user = useStore((s) => s.currentUser);
  const coins = useStore((s) => s.coins);
  const purchases = useStore((s) => s.purchases);
  const buy = useStore((s) => s.buyItem);
  const pushToast = useStore((s) => s.pushToast);

  if (!user) return null;
  const myCoins = coins[user.id] ?? 0;
  const myPurchases = purchases.filter((p) => p.userId === user.id).sort((a, b) => b.at - a.at);

  function handleBuy(itemId: string, cost: number, label: string) {
    if (!user) return;
    const ok = buy(user.id, itemId, cost);
    if (ok) {
      sfx.coin();
      celebrate({ intensity: 'mini' });
      pushToast({ title: `Köpt: ${label}`, body: `-${cost} 🪙`, kind: 'success' });
    } else {
      pushToast({ title: 'För dyrt!', body: `Du behöver ${cost - myCoins} 🪙 till.`, kind: 'warn' });
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="h1">🪙 Klocka-shop</h1>
          <p className="subtitle">Tjäna mynt på score och utmaningar. Lös in dem här.</p>
        </div>
        <div className="head-stats">
          <div className="head-stat" style={{ minWidth: 140 }}>
            <div className="head-stat-value" style={{ color: 'var(--gold)' }}>{myCoins} 🪙</div>
            <div className="head-stat-label">Saldo</div>
          </div>
        </div>
      </div>

      <div className="grid cols-3">
        {SHOP.map((item) => {
          const canAfford = myCoins >= item.cost;
          return (
            <div key={item.id} className="card shop-item" style={{ opacity: canAfford ? 1 : 0.65 }}>
              <div className="shop-emoji">{item.emoji}</div>
              <div style={{ fontWeight: 700, fontSize: 15, marginTop: 6 }}>{item.title}</div>
              <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 4, minHeight: 32 }}>{item.description}</div>
              <div className="shop-footer">
                <span className="shop-price">{item.cost} 🪙</span>
                <button
                  className={canAfford ? 'primary' : ''}
                  disabled={!canAfford}
                  onClick={() => handleBuy(item.id, item.cost, item.title)}
                >Köp</button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card" style={{ marginTop: 22 }}>
        <h3 style={{ marginTop: 0 }}>Mina köp</h3>
        {myPurchases.length === 0 ? (
          <div style={{ color: 'var(--muted)' }}>Inget köpt än. Tjäna mynt på leaderboard och dagliga utmaningar.</div>
        ) : (
          <table>
            <thead><tr><th>Datum</th><th>Vad</th><th>Kostnad</th></tr></thead>
            <tbody>
              {myPurchases.map((p) => {
                const item = SHOP.find((x) => x.id === p.itemId);
                return (
                  <tr key={p.id}>
                    <td>{new Date(p.at).toLocaleDateString('sv-SE')}</td>
                    <td>{item?.emoji} {item?.title ?? p.itemId}</td>
                    <td>{p.cost} 🪙</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginTop: 0 }}>Hur tjänar man mynt?</h3>
        <ul style={{ color: 'var(--muted)', lineHeight: 1.7 }}>
          <li><b>10 pts score = 1 🪙</b> automatiskt vid utklockning</li>
          <li><b>+30–60 🪙</b> för avklarad daglig utmaning</li>
          <li><b>+100 🪙</b> för att vinna veckans leaderboard</li>
          <li><b>+50 🪙</b> per achievement du låser upp</li>
        </ul>
      </div>
    </>
  );
}
