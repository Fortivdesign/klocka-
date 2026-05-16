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
  { id: 'fika',          emoji: '☕', title: 'Bjuda team på fika',     description: 'Vi tar fika i pausrummet — du betalar!', cost: 200 },
  { id: 'leave-early',   emoji: '🏃', title: 'Lämna 15:00 på fredag',  description: 'Cash out tidigt utan dåligt samvete.',   cost: 500 },
  { id: 'custom-emoji',  emoji: '🦄', title: 'Egen avatar-emoji',      description: 'Byt avatar mot vilken emoji som helst.', cost: 150 },
  { id: 'wfh-day',       emoji: '🏠', title: 'Hemma-dag',              description: 'Ta en WFH-dag nästa vecka.',             cost: 400 },
  { id: 'lunch',         emoji: '🍕', title: 'Lunch på företaget',     description: 'Lunch upp till 200 kr på företagets kort.', cost: 350 },
  { id: 'roast-immunity',emoji: '🛡', title: 'Slacker-immunitet',      description: 'Hoppa över nästa Veckans Slacker-roast.', cost: 250 },
  { id: 'music-control', emoji: '🎵', title: 'Kontoret\'s spellista',   description: 'Du väljer musiken hela nästa dag.',     cost: 120 },
  { id: 'parking',       emoji: '🅿️', title: 'P-plats en vecka',       description: 'Reserverad p-plats nästa vecka.',        cost: 300 },
];
