export type Achievement = {
  id: string;
  icon: string;
  nameKey: string;
  descKey: string;
  check: (stats: { xp: number; streak: number; questsCompleted: number; moodDays: number }) => boolean;
};

export const achievements: Achievement[] = [
  { id: 'first_steps', icon: 'baby', nameKey: 'gamify.firstSteps', descKey: 'gamify.firstStepsDesc', check: (s) => s.questsCompleted >= 1 },
  { id: 'streak3', icon: 'flame', nameKey: 'gamify.streak3', descKey: 'gamify.streak3Desc', check: (s) => s.streak >= 3 },
  { id: 'streak7', icon: 'zap', nameKey: 'gamify.streak7', descKey: 'gamify.streak7Desc', check: (s) => s.streak >= 7 },
  { id: 'xp100', icon: 'sparkles', nameKey: 'gamify.xp100', descKey: 'gamify.xp100Desc', check: (s) => s.xp >= 100 },
  { id: 'xp500', icon: 'star', nameKey: 'gamify.xp500', descKey: 'gamify.xp500Desc', check: (s) => s.xp >= 500 },
  { id: 'quests5', icon: 'compass', nameKey: 'gamify.quests5', descKey: 'gamify.quests5Desc', check: (s) => s.questsCompleted >= 5 },
  { id: 'mood_master', icon: 'heart', nameKey: 'gamify.moodMaster', descKey: 'gamify.moodMasterDesc', check: (s) => s.moodDays >= 7 },
];

export function getLevel(xp: number): { level: number; current: number; needed: number; progress: number } {
  const levelThresholds = [0, 50, 150, 300, 500, 800, 1200, 1700, 2300, 3000];
  let level = 1;
  for (let i = 0; i < levelThresholds.length; i++) {
    if (xp >= levelThresholds[i]) level = i + 1;
  }
  const currentThreshold = levelThresholds[level - 1] || 0;
  const nextThreshold = levelThresholds[level] || levelThresholds[levelThresholds.length - 1] + 500;
  const current = xp - currentThreshold;
  const needed = nextThreshold - currentThreshold;
  const progress = Math.min(100, (current / needed) * 100);
  return { level, current, needed, progress };
}

export function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
}
