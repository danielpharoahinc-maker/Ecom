// The things a person can commit to, and the onboarding questions.
// Edit this file to change the choices; nothing else needs to change.

// Goals, grouped. `food: true` ones are meal goals: posting one asks which meal it was
// and lets Claude review the photo once you have connected it (Account > Connect Claude).
export const CATS = ['Body', 'Food', 'Mind', 'Faith', 'Work & money', 'Life'];
export const CATALOG = [
  { key: 'train',    cat: 'Body', label: 'Train',              hint: 'Gym, weights, sport',   icon: 'dumbbell' },
  { key: 'run',      cat: 'Body', label: 'Run',                hint: 'Cardio, distance',      icon: 'run' },
  { key: 'walk',     cat: 'Body', label: 'Steps and walks',    hint: 'Get your steps in',     icon: 'run' },
  { key: 'stretch',  cat: 'Body', label: 'Stretch',            hint: 'Mobility, recovery',    icon: 'wave' },
  { key: 'cold',     cat: 'Body', label: 'Cold shower',        hint: 'Do the hard thing',     icon: 'snow' },
  { key: 'sun',      cat: 'Body', label: 'Morning sunlight',   hint: 'Outside in the first hour', icon: 'sun' },
  { key: 'wake',     cat: 'Body', label: 'Up before 6',        hint: 'Win the morning',       icon: 'sunrise' },
  { key: 'sleep',    cat: 'Body', label: 'Sleep on time',      hint: 'Lights out, 8 hours',   icon: 'moon' },
  { key: 'water',    cat: 'Body', label: 'Drink water',        hint: '2 to 3 litres',         icon: 'drop' },
  { key: 'eat',      cat: 'Food', label: 'Eat clean',          hint: 'No junk today',         icon: 'food', food: true },
  { key: 'meals',    cat: 'Food', label: 'Log your meals',     hint: 'Photo every meal',      icon: 'food', food: true },
  { key: 'protein',  cat: 'Food', label: 'Hit your protein',   hint: 'Protein with every meal', icon: 'food', food: true },
  { key: 'nosugar',  cat: 'Food', label: 'No sugar',           hint: 'Skip the sweet stuff',  icon: 'food', food: true },
  { key: 'vitamins', cat: 'Food', label: 'Vitamins',           hint: 'Supplements taken',     icon: 'bolt' },
  { key: 'read',     cat: 'Mind', label: 'Read',               hint: '10 pages minimum',      icon: 'book' },
  { key: 'study',    cat: 'Mind', label: 'Study',              hint: 'Grades matter',         icon: 'cap' },
  { key: 'lang',     cat: 'Mind', label: 'Learn a language',   hint: '15 minutes a day',      icon: 'globe' },
  { key: 'code',     cat: 'Mind', label: 'Learn to code',      hint: 'Build with AI',         icon: 'code' },
  { key: 'deep',     cat: 'Mind', label: 'Deep work',          hint: 'Phone away, one task',  icon: 'target' },
  { key: 'nophone',  cat: 'Mind', label: 'Phone-free hour',    hint: 'Screen down',           icon: 'phoneoff' },
  { key: 'journal',  cat: 'Mind', label: 'Journal',            hint: 'Think on paper',        icon: 'pen' },
  { key: 'meditate', cat: 'Mind', label: 'Breathe and meditate', hint: 'Ten quiet minutes',   icon: 'sparkle' },
  { key: 'plan',     cat: 'Mind', label: 'Plan tomorrow',      hint: 'Tonight, on paper',     icon: 'calendar' },
  { key: 'faith',    cat: 'Faith', label: 'Pray and Scripture', hint: 'Start with God',       icon: 'cross' },
  { key: 'gratitude', cat: 'Faith', label: 'Gratitude',         hint: 'Three things, thanks',  icon: 'thumb' },
  { key: 'serve',    cat: 'Faith', label: 'Do one kind thing',  hint: 'Serve someone',        icon: 'users' },
  { key: 'build',    cat: 'Work & money', label: 'Build the business', hint: 'Ship something daily', icon: 'trending' },
  { key: 'create',   cat: 'Work & money', label: 'Create content', hint: 'Film, write, post',  icon: 'video' },
  { key: 'sales',    cat: 'Work & money', label: 'Reach out and sell', hint: 'One real conversation', icon: 'share' },
  { key: 'money',    cat: 'Work & money', label: 'Track your money', hint: 'Spend, save, review', icon: 'list' },
  { key: 'tidy',     cat: 'Life', label: 'Make your bed',      hint: 'Tidy your space',       icon: 'check' },
  { key: 'skin',     cat: 'Life', label: 'Skincare and grooming', hint: 'Look after yourself', icon: 'sparkle' },
  { key: 'family',   cat: 'Life', label: 'Call family or a friend', hint: 'Stay close',      icon: 'users' },
];
export const FOOD_KEYS = CATALOG.filter((c) => c.food).map((c) => c.key);
export const isFood = (key) => FOOD_KEYS.includes(key);
export const groupedCatalog = () => CATS.map((cat) => ({ cat, items: CATALOG.filter((c) => c.cat === cat) }));

// Photos from the rest of your day. Shown in Vault and Club, never counted
// toward streaks or stats.
export const MOMENT = { key: 'moment', label: 'Moment', hint: 'Anything from your day', icon: 'image' };

export const BY_KEY = Object.fromEntries([...CATALOG, MOMENT].map((c) => [c.key, c]));
export const commitment = (key) => BY_KEY[key] || { key, label: key, hint: '', icon: 'sparkle' };

export const MAX_GOALS = 6;
export const MIN_GOALS = 1;
// A day keeps your streak when you prove at least half of your goals.
export const needFor = (n) => Math.max(1, Math.ceil(n / 2));

// Onboarding: short on purpose. Easy taps first so the bar climbs, and it ends
// with your first proof. The bar starts at 20% because creating the account counts.
export const STEPS = [
  {
    id: 'goal', type: 'choice', multi: 2,
    title: 'What are you here to build?',
    sub: 'Pick one or two.',
    options: [
      { v: 'discipline', label: 'Discipline',      hint: 'Do it when you don’t feel like it', icon: 'bolt' },
      { v: 'business',   label: 'A business',      hint: 'Ship, sell, grow',                  icon: 'trending' },
      { v: 'body',       label: 'A stronger body', hint: 'Train like you mean it',            icon: 'dumbbell' },
      { v: 'mind',       label: 'A sharper mind',  hint: 'Read, learn, think',                icon: 'bulb' },
    ],
  },
  {
    id: 'proofTime', type: 'choice', multi: 2,
    title: 'When will you post your proof?',
    sub: 'Pick one or two. We’ll remind you then.',
    options: [
      { v: 'morning', label: 'Morning',    hint: 'Before the day starts', icon: 'sunrise', phrase: 'Proof in the morning' },
      { v: 'midday',  label: 'Midday',     hint: 'Lunch break',           icon: 'sun',     phrase: 'Proof at midday' },
      { v: 'evening', label: 'Evening',    hint: 'After the work',        icon: 'sunset',  phrase: 'Proof in the evening' },
      { v: 'night',   label: 'Before bed', hint: 'Close the day out',     icon: 'moon',    phrase: 'Proof before bed' },
    ],
  },
  { id: 'commitments', type: 'commit', title: 'Pick your goals', sub: 'Choose 1 to 6. You can change them any time.' },
  { id: 'name', type: 'name', title: 'What should your crew call you?', sub: 'This shows on your proof and in clubs.' },
  { id: 'age', type: 'age', title: 'How old are you?' },
  { id: 'account', type: 'account', title: 'Save your account' },
  { id: 'perm', type: 'perm', title: 'Proof needs your camera and mic', sub: 'A photo shows what you did. Your voice says it in 5 seconds.' },
  { id: 'trial', type: 'trial', title: 'Start your 30 days free', sub: 'Add a card now. You pay nothing until day 30.' },
];

export const LABEL = Object.fromEntries(
  STEPS.filter((s) => s.options).map((s) => [s.id, Object.fromEntries(s.options.map((o) => [o.v, o]))]),
);
