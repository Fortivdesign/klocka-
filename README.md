# Klocka

Internt desktop-verktyg för teamet: klocka in/ut på kontoret, mät verkligt
fokus (inte bara stol-tid), och gör veckomötet roligt med leaderboard,
achievements och Veckans Slacker.

## Vad löser det?

Klockad tid säger inget om vem som faktiskt jobbar. Klocka räknar därför
ut en **fokus-score** per person:

```
score = klockad tid × focus_factor
focus_factor = 0.4 × aktiv_andel + 0.7 × jobb_andel − 0.5 × skoj_andel + 0.1
```

- **Aktiv andel** — tangentbord/mus använt under sessionen (inga tangenter loggas)
- **Jobb-andel** — andel tid där det aktiva fönstret tillhör en jobb-kategori
  (VS Code, Figma, Notion, Slack, Linear, …)
- **Skoj-andel** — andel tid med FIFA, UFC, TikTok, YouTube etc. (drar ner score)

Plus **manuella self-reports**: vad du sa att du skulle göra varje vecka
jämförs med vad du faktiskt levererade i veckomötet (presentationer kan
laddas upp).

## Funktioner

- **Klocka in/ut** med global tray-ikon
- **Live fokus-score** medan du jobbar
- **Leaderboard** för veckan + bonuspoäng (deploys, hjälpa kollega)
- **Veckomöte**-vy: din plan vs leverans, presentation-upload
- **Veckans Slacker** med roliga utmärkelser: 🎮 FIFA-Mästaren,
  📱 Scroll Sensei, ☕ Kaffepausens Konung, 🪑 Stol-värmaren …
- **Achievements** att låsa upp (Maraton, Fokus-Sniper, Nattugglan, …)
- **Screenshots** — slumpvisa, men inget laddas upp utan att användaren
  godkänt varje bild. GDPR-vänligt onboarding-samtycke krävs.

## Tech

- Electron (Mac/Win/Linux) + React + TypeScript + Vite
- Supabase (Postgres + Auth + Storage) för delad team-data
- `active-win` för aktivt fönster, `desktopCapturer` för skärmdump

## Köra lokalt

```bash
npm install
cp .env.example .env  # fyll i Supabase-URL och anon-nyckel
npm run dev:electron
```

## Sätta upp Supabase

1. Skapa nytt projekt på supabase.com
2. Kör `supabase/schema.sql` i SQL-editorn
3. Skapa en Storage-bucket `screenshots` och `presentations`
4. Kopiera URL + anon-nyckel till `.env`

## Paketera för teamet

```bash
npm run package
```

Skapar `.dmg` / `.exe` / `.AppImage` i `release/`.

## Roliga features att lägga till

- 🎲 Slumpa fram "veckans utmaning" (typ: ingen Slack innan 10:00)
- 🪙 Klocka-mynt: tjäna mynt på score, spendera i intern shop
  (fika, lunch, hemma-eftermiddag)
- 🎬 Auto-genererad veckorulle: AI-summering av varje persons vecka
- 🏟️ Live-overlay till veckomötet: animerad leaderboard på storbild
- 🎙️ Slacker-roast som läses upp av TTS på mötet
- 🐣 "Sidekick-mode": para ihop två personer slumpvis varje måndag
- 🎁 Mystery box när du når ett milestone

## Integritet (viktigt!)

- Allt börjar med obligatoriskt samtycke
- Inga keystrokes loggas — bara antal per intervall
- Screenshots går till lokal disk först, användaren godkänner per bild
- Du kan när som helst klocka ut för att pausa övervakning
- Data raderas på begäran (kontakta admin)
