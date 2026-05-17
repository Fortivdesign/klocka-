export interface DailyChallenge {
  id: string;
  emoji: string;
  title: string;
  description: string;
  rewardCoins: number;
}

const CHALLENGES: DailyChallenge[] = [
  { id: 'no-slack-am',  emoji: '🤫', title: 'Tyst förmiddag',        description: 'Ingen Slack/Teams innan 10:00.',         rewardCoins: 30 },
  { id: 'deep-work-2h', emoji: '🧘', title: 'Deep work 2h',          description: 'Två obrutna fokus-pass om minst 1h.',    rewardCoins: 50 },
  { id: 'lunch-walk',   emoji: '🚶', title: 'Lunch-promenad',         description: 'Ta minst 20 min utomhus på lunchen.',   rewardCoins: 20 },
  { id: 'pair',         emoji: '🤝', title: 'Pair-session',           description: 'Para ihop dig med en kollega i 1h.',     rewardCoins: 40 },
  { id: 'inbox-zero',   emoji: '📭', title: 'Inbox zero',            description: 'Töm din email-inkorg helt.',              rewardCoins: 25 },
  { id: 'no-phone',     emoji: '📵', title: 'Mobil i låda',          description: 'Lägg mobilen i en låda i 3h.',           rewardCoins: 60 },
  { id: 'ship-it',      emoji: '🚢', title: 'Ship something',         description: 'Mergea minst en PR till main.',         rewardCoins: 50 },
  { id: 'help-out',     emoji: '🆘', title: 'Hjälp en kollega',       description: 'Pinga någon proaktivt och hjälp dem.',   rewardCoins: 30 },
  { id: 'doc',          emoji: '📝', title: 'Dokumentera',            description: 'Skriv en kort doc/wiki-sida.',          rewardCoins: 35 },
  { id: 'no-fifa',      emoji: '🎮', title: 'Ingen FIFA',             description: 'Noll minuter i Skoj-kategorin idag.',   rewardCoins: 45 },
];

export function todaysChallenge(seedDate: Date = new Date()): DailyChallenge {
  const key = `${seedDate.getFullYear()}-${seedDate.getMonth()}-${seedDate.getDate()}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return CHALLENGES[Math.abs(hash) % CHALLENGES.length];
}

export interface ShopItem {
  id: string;
  emoji: string;
  title: string;
  description: string;
  cost: number;
}

export const SHOP: ShopItem[] = [
  { id: 'morby-pickup',     emoji: '🚗', title: 'Bli hämtad i Mörby',         description: 'Någon i teamet hämtar dig på Mörby station på morgonen.',     cost: 400 },
  { id: 'best-seat',        emoji: '🪑', title: 'Bästa platsen 1 vecka',       description: 'Du får sitta på den fönsterplatsen hela nästa vecka.',         cost: 250 },
  { id: 'music-control',    emoji: '🎵', title: 'DJ för en dag',               description: 'Du väljer all musik på kontorets högtalare hela dagen.',        cost: 120 },
  { id: 'wfh-day',          emoji: '🏠', title: 'Hemma-dag',                   description: 'Ta en WFH-dag utan att behöva förklara dig.',                  cost: 350 },
  { id: 'roast-immunity',   emoji: '🛡', title: 'Slacker-immunitet',           description: 'Hoppa över nästa Veckans Slacker-roast oavsett poäng.',         cost: 250 },
  { id: 'skip-notes',       emoji: '📝', title: 'Slippa mötesanteckningar',     description: 'Nästa veckomöte: någon annan skriver protokollet.',             cost: 100 },
  { id: 'pick-challenge',   emoji: '🎯', title: 'Välj nästa veckas utmaning',   description: 'Du bestämmer dagliga utmaningen för hela teamet en hel vecka.', cost: 200 },
  { id: 'late-arrival',     emoji: '🌅', title: '+1h sov-in en dag',            description: 'Kom in en timme senare en valfri dag utan straff.',             cost: 180 },
  { id: 'leave-early',      emoji: '🏃', title: 'Lämna 15:00 fredag',           description: 'Cash out tidigt utan dåligt samvete.',                          cost: 500 },
  { id: 'snacks-pick',      emoji: '🍿', title: 'Välj fredags-snacksen',         description: 'Du bestämmer vad teamet snackar på på fredag.',                 cost: 90 },
  { id: 'theme-friday',     emoji: '🎭', title: 'Sätta tema på fredagen',        description: 'Hawaii-skjorta? Pyjamas? Du bestämmer.',                        cost: 150 },
  { id: 'plaque',           emoji: '🏆', title: 'Klocka of the Month-plakett',  description: 'Ditt namn på den fysiska plaketten på kontoret en månad.',     cost: 600 },
];
