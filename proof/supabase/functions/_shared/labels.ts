// Names of the goals, for notifications like "Sipho proved Train".
export const LABELS: Record<string, string> = {
  train: 'Train', deep: 'Deep work', build: 'Build the business', read: 'Read', faith: 'Pray and Scripture',
  run: 'Run', code: 'Learn to code', study: 'Study', cold: 'Cold shower', eat: 'Eat clean', journal: 'Journal', create: 'Create content',
};
export const label = (k: string) => LABELS[k] ?? 'a goal';
