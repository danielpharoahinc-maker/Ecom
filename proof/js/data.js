// The things a person can commit to, and the onboarding questions.
// Edit this file to change the choices; nothing else needs to change.

export const CATALOG = [
  { key: 'train',   label: 'Train',              hint: 'Gym, weights, sport',   icon: 'dumbbell' },
  { key: 'deep',    label: 'Deep work',          hint: 'Phone away, one task',  icon: 'target' },
  { key: 'build',   label: 'Build the business', hint: 'Ship something daily',  icon: 'trending' },
  { key: 'read',    label: 'Read',               hint: '10 pages minimum',      icon: 'book' },
  { key: 'faith',   label: 'Pray and Scripture', hint: 'Start with God',        icon: 'cross' },
  { key: 'run',     label: 'Run',                hint: 'Cardio, distance',      icon: 'run' },
  { key: 'code',    label: 'Learn to code',      hint: 'Build with AI',         icon: 'code' },
  { key: 'study',   label: 'Study',              hint: 'Grades matter',         icon: 'cap' },
  { key: 'cold',    label: 'Cold shower',        hint: 'Do the hard thing',     icon: 'snow' },
  { key: 'eat',     label: 'Eat clean',          hint: 'No junk today',         icon: 'food' },
  { key: 'journal', label: 'Journal',            hint: 'Think on paper',        icon: 'pen' },
  { key: 'create',  label: 'Create content',     hint: 'Film, write, post',     icon: 'video' },
];

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
