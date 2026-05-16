export type RoleId = 'vd' | 'vice-vd' | 'cmo' | 'cfo' | 'sales-chief' | 'sales' | 'senior-dev' | 'junior-dev';

export interface Role {
  id: RoleId;
  label: string;
  short: string;
  emoji: string;
  workApps: string[];
  workTitlePatterns: string[];
  signatureMetric: string;
  weeklyGoalLabel: string;
  weeklyGoalUnit: string;
  weeklyGoalDefault: number;
  challenges: { emoji: string; title: string; description: string; rewardCoins: number }[];
}

export const ROLES: Record<RoleId, Role> = {
  'vd': {
    id: 'vd',
    label: 'VD',
    short: 'VD',
    emoji: '👑',
    workApps: ['Linear', 'Notion', 'Slack', 'Calendar', 'Mail', 'zoom.us', 'Microsoft Teams', 'Google Chrome', 'Safari', 'Numbers', 'Excel', 'Google Sheets'],
    workTitlePatterns: ['notion', 'linear', 'docs\\.google', 'sheets\\.google', 'calendar', 'gmail', 'meeting'],
    signatureMetric: 'Beslut tagna',
    weeklyGoalLabel: 'Strategiska beslut',
    weeklyGoalUnit: 'beslut',
    weeklyGoalDefault: 5,
    challenges: [
      { emoji: '🎯', title: '3 1:1s', description: 'Boka och håll tre 1:1 med teamet.', rewardCoins: 50 },
      { emoji: '🧭', title: 'Roadmap-block', description: '2h obrutet på Q-planering.', rewardCoins: 60 },
      { emoji: '📊', title: 'KPI-koll', description: 'Granska veckans nyckeltal med teamet.', rewardCoins: 40 },
    ],
  },
  'vice-vd': {
    id: 'vice-vd',
    label: 'Vice VD',
    short: 'VVD',
    emoji: '🤝',
    workApps: ['Linear', 'Notion', 'Slack', 'Calendar', 'Mail', 'zoom.us', 'Microsoft Teams'],
    workTitlePatterns: ['notion', 'linear', 'docs\\.google', 'calendar', 'meeting'],
    signatureMetric: 'Operativa beslut',
    weeklyGoalLabel: 'Drift & uppföljning',
    weeklyGoalUnit: 'punkter',
    weeklyGoalDefault: 8,
    challenges: [
      { emoji: '🔧', title: 'Unblock 3', description: 'Lös tre blockerare för teamet.', rewardCoins: 50 },
      { emoji: '📅', title: 'Sprint review', description: 'Förbered + kör retro.', rewardCoins: 40 },
    ],
  },
  'cmo': {
    id: 'cmo',
    label: 'CMO',
    short: 'CMO',
    emoji: '📣',
    workApps: ['Figma', 'Canva', 'Adobe Photoshop', 'Adobe Illustrator', 'Adobe After Effects', 'Notion', 'Slack', 'LinkedIn', 'Buffer', 'Hootsuite', 'Mailchimp', 'Klaviyo', 'Google Analytics', 'Meta Business Suite'],
    workTitlePatterns: ['figma', 'canva', 'linkedin\\.com/(?:in|company|feed|post)', 'analytics\\.google', 'mailchimp', 'buffer', 'meta', 'instagram\\.com/.*?/dashboard', 'tiktok\\.com/business'],
    signatureMetric: 'Posts publicerade',
    weeklyGoalLabel: 'Innehåll producerat',
    weeklyGoalUnit: 'posts',
    weeklyGoalDefault: 5,
    challenges: [
      { emoji: '🎨', title: 'Visuellt block', description: '2h i Figma/Canva utan avbrott.', rewardCoins: 50 },
      { emoji: '📝', title: 'Posta 1', description: 'Publicera minst en post idag.', rewardCoins: 30 },
      { emoji: '📊', title: 'Analys-check', description: 'Gå igenom veckans analytics.', rewardCoins: 35 },
    ],
  },
  'cfo': {
    id: 'cfo',
    label: 'CFO',
    short: 'CFO',
    emoji: '💰',
    workApps: ['Numbers', 'Excel', 'Microsoft Excel', 'Google Sheets', 'Fortnox', 'Visma', 'QuickBooks', 'Notion', 'Slack', 'Mail', 'Stripe Dashboard'],
    workTitlePatterns: ['fortnox', 'visma', 'sheets\\.google', 'stripe', 'quickbooks', 'bookkeeping', 'invoice', 'faktura', 'bokföring'],
    signatureMetric: 'Fakturor hanterade',
    weeklyGoalLabel: 'Finansiella ärenden',
    weeklyGoalUnit: 'ärenden',
    weeklyGoalDefault: 12,
    challenges: [
      { emoji: '🧾', title: 'Faktura-pass', description: 'Hantera 5 fakturor.', rewardCoins: 40 },
      { emoji: '📈', title: 'Cash-flow-koll', description: 'Uppdatera cash-flow-prognos.', rewardCoins: 50 },
    ],
  },
  'sales-chief': {
    id: 'sales-chief',
    label: 'Försäljningschef',
    short: 'Säljchef',
    emoji: '🎖',
    workApps: ['HubSpot', 'Salesforce', 'Pipedrive', 'Notion', 'Slack', 'Mail', 'zoom.us', 'Microsoft Teams', 'Calendar', 'Calendly'],
    workTitlePatterns: ['hubspot', 'salesforce', 'pipedrive', 'calendar', 'calendly', 'meeting', 'pipeline', 'deal'],
    signatureMetric: 'Team-pipeline',
    weeklyGoalLabel: 'Pipeline-värde tillagt',
    weeklyGoalUnit: 'kr',
    weeklyGoalDefault: 200000,
    challenges: [
      { emoji: '👥', title: 'Coacha säljare', description: '1:1 med varje säljare denna vecka.', rewardCoins: 60 },
      { emoji: '🎯', title: 'Forecast', description: 'Uppdatera veckans säljprognos.', rewardCoins: 40 },
    ],
  },
  'sales': {
    id: 'sales',
    label: 'Säljare',
    short: 'Sälj',
    emoji: '📞',
    workApps: ['HubSpot', 'Salesforce', 'Pipedrive', 'Mail', 'zoom.us', 'Microsoft Teams', 'Calendar', 'Calendly', 'LinkedIn', 'Slack'],
    workTitlePatterns: ['hubspot', 'salesforce', 'pipedrive', 'linkedin\\.com/(?:in|sales)', 'calendar', 'calendly', 'meeting'],
    signatureMetric: 'Bokade möten',
    weeklyGoalLabel: 'Bokade möten',
    weeklyGoalUnit: 'möten',
    weeklyGoalDefault: 8,
    challenges: [
      { emoji: '☎️', title: '20 cold calls', description: 'Ring 20 outbound-samtal idag.', rewardCoins: 60 },
      { emoji: '📩', title: '10 follow-ups', description: 'Följ upp 10 leads idag.', rewardCoins: 40 },
      { emoji: '🤝', title: 'Boka 2', description: 'Boka minst 2 demos idag.', rewardCoins: 55 },
    ],
  },
  'senior-dev': {
    id: 'senior-dev',
    label: 'Senior utvecklare',
    short: 'Senior',
    emoji: '🛠',
    workApps: ['Visual Studio Code', 'Code', 'Cursor', 'WebStorm', 'IntelliJ IDEA', 'Xcode', 'Terminal', 'iTerm2', 'GitHub Desktop', 'Linear', 'Figma', 'Notion', 'Slack'],
    workTitlePatterns: ['github\\.com', 'gitlab', 'linear', 'figma', 'localhost', 'stackoverflow'],
    signatureMetric: 'PRs mergeade',
    weeklyGoalLabel: 'PRs mergeade',
    weeklyGoalUnit: 'PRs',
    weeklyGoalDefault: 6,
    challenges: [
      { emoji: '🚢', title: 'Ship 2 PRs', description: 'Mergea minst 2 PRs idag.', rewardCoins: 60 },
      { emoji: '👀', title: 'Code review', description: 'Granska minst 3 PRs idag.', rewardCoins: 40 },
      { emoji: '🧠', title: 'Deep work 2h', description: 'Två obrutna pass om 1h+.', rewardCoins: 55 },
    ],
  },
  'junior-dev': {
    id: 'junior-dev',
    label: 'Junior utvecklare',
    short: 'Junior',
    emoji: '🌱',
    workApps: ['Visual Studio Code', 'Code', 'Cursor', 'WebStorm', 'Terminal', 'iTerm2', 'GitHub Desktop', 'Linear', 'Slack'],
    workTitlePatterns: ['github\\.com', 'localhost', 'stackoverflow', 'mdn\\.', 'developer\\.mozilla'],
    signatureMetric: 'Commits',
    weeklyGoalLabel: 'Tickets klara',
    weeklyGoalUnit: 'tickets',
    weeklyGoalDefault: 4,
    challenges: [
      { emoji: '🧩', title: 'Ticket klar', description: 'Stäng minst en ticket idag.', rewardCoins: 50 },
      { emoji: '❓', title: 'Fråga 1', description: 'Be om feedback / pair-session.', rewardCoins: 30 },
      { emoji: '📚', title: 'Lära 30 min', description: '30 min self-study eller doc.', rewardCoins: 30 },
    ],
  },
};

export function roleWorkApps(roleIds: RoleId[]): Set<string> {
  const set = new Set<string>();
  roleIds.forEach((r) => ROLES[r]?.workApps.forEach((a) => set.add(a)));
  return set;
}

export function roleTitlePatterns(roleIds: RoleId[]): RegExp[] {
  const patterns: string[] = [];
  roleIds.forEach((r) => ROLES[r]?.workTitlePatterns.forEach((p) => patterns.push(p)));
  return patterns.map((p) => new RegExp(p, 'i'));
}
