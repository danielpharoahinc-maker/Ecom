// Names of the goals, for notifications like "Sipho proved Train".
export const LABELS: Record<string, string> = {
  train: 'Train', run: 'Run', walk: 'Steps and walks', stretch: 'Stretch', cold: 'Cold shower', sun: 'Morning sunlight', wake: 'Up before 6', sleep: 'Sleep on time', water: 'Drink water',
  eat: 'Eat clean', meals: 'Log your meals', protein: 'Hit your protein', nosugar: 'No sugar', vitamins: 'Vitamins',
  read: 'Read', study: 'Study', lang: 'Learn a language', code: 'Learn to code', deep: 'Deep work', nophone: 'Phone-free hour', journal: 'Journal', meditate: 'Breathe and meditate', plan: 'Plan tomorrow',
  faith: 'Pray and Scripture', gratitude: 'Gratitude', serve: 'Do one kind thing',
  build: 'Build the business', create: 'Create content', sales: 'Reach out and sell', money: 'Track your money',
  tidy: 'Make your bed', skin: 'Skincare and grooming', family: 'Call family or a friend',
};
export const label = (k: string) => LABELS[k] ?? 'a goal';
