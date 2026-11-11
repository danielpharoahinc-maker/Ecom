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

// Onboarding. Ordered easiest first so the progress bar climbs quickly:
// one-tap questions, then picking commitments, then typing a name, then
// permissions. The bar starts at 20% because creating the account counts.
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
    id: 'wake', type: 'choice',
    title: 'When does your day start?',
    sub: 'Be honest. You can raise the bar later.',
    options: [
      { v: 'b5',  label: 'Before 5 am', hint: 'The quiet hours',   icon: 'moon' },
      { v: '5-6', label: '5 to 6 am',   hint: 'Ahead of everyone', icon: 'sunrise' },
      { v: '6-7', label: '6 to 7 am',   hint: 'Solid start',       icon: 'sun' },
      { v: 'a7',  label: 'After 7 am',  hint: 'Room to improve',   icon: 'clock' },
    ],
  },
  {
    id: 'lockin', type: 'choice', visual: 'bar',
    title: 'How long will you lock in each day?',
    sub: 'Time you’ll spend on your commitments.',
    options: [
      { v: 30,  label: '30 minutes', hint: 'Start small, never miss', fill: 12 },
      { v: 60,  label: '1 hour',     hint: 'The sweet spot',          fill: 25 },
      { v: 120, label: '2 hours',    hint: 'Serious',                 fill: 50 },
      { v: 240, label: '4+ hours',   hint: 'All in',                  fill: 100 },
    ],
  },
  {
    id: 'proofTime', type: 'choice',
    title: 'When will you post your proof?',
    sub: 'We’ll remind you at this time.',
    options: [
      { v: 'morning', label: 'Morning',    hint: 'Before the day starts', icon: 'sunrise', phrase: 'Proof in the morning' },
      { v: 'midday',  label: 'Midday',     hint: 'Lunch break',           icon: 'sun',     phrase: 'Proof at midday' },
      { v: 'evening', label: 'Evening',    hint: 'After the work',        icon: 'sunset',  phrase: 'Proof in the evening' },
      { v: 'night',   label: 'Before bed', hint: 'Close the day out',     icon: 'moon',    phrase: 'Proof before bed' },
    ],
  },
  {
    id: 'crew', type: 'choice',
    title: 'Lock in solo or with your crew?',
    sub: 'People who post together keep going longer.',
    options: [
      { v: 'solo',   label: 'Solo',          hint: 'Just me for now',  icon: 'user' },
      { v: 'friend', label: 'With a friend', hint: 'One partner',      icon: 'users' },
      { v: 'club',   label: 'A small club',  hint: '3 to 8 people',    icon: 'club' },
      { v: 'later',  label: 'Decide later',  hint: 'Start on my own',  icon: 'clock' },
    ],
  },
  {
    id: 'obstacle', type: 'choice',
    title: 'What usually stops you?',
    sub: 'Proof is built around fixing this.',
    options: [
      { v: 'phone',      label: 'My phone',          hint: 'Scrolling eats the day', icon: 'phoneoff' },
      { v: 'motivation', label: 'Low motivation',    hint: 'Start strong, fade out', icon: 'battery' },
      { v: 'plan',       label: 'No clear plan',     hint: 'Busy, not productive',   icon: 'list' },
      { v: 'alone',      label: 'No one checks me',  hint: 'Easy to skip a day',     icon: 'users' },
    ],
  },
  { id: 'commitments', type: 'commit', title: 'Pick your 3 commitments', sub: 'You’ll post proof of these every day.' },
  { id: 'name', type: 'name', title: 'What should your crew call you?', sub: 'This shows on your proof and in clubs.' },
  { id: 'perm', type: 'perm', title: 'Proof needs your camera and mic', sub: 'A photo shows what you did. Your voice says it in 5 seconds.' },
  { id: 'plan', type: 'plan', title: 'Your plan', sub: 'Here’s what you’re signing up for.' },
];

export const LABEL = Object.fromEntries(
  STEPS.filter((s) => s.options).map((s) => [s.id, Object.fromEntries(s.options.map((o) => [o.v, o]))]),
);
