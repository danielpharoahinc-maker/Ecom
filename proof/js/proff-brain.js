// Proff's brain. No AI and no server: careful word matching plus answers that
// read your own data (streak, goals, week score). Typos are forgiven, everyday
// words are understood, and when nothing matches he suggests the closest topics
// instead of shrugging.
import { S } from './state.js';
import { commitment, needFor } from './data.js';
import { streak, bestStreak, doneToday, daysKept, ageDays, byDay } from './stats.js';
import { weekReport } from './coach.js';
import { planState, daysLeft } from './billing.js';
import { dayKey } from './util.js';
import { QA } from './proff-qa.js';

/* ---------- Words ---------- */
const STOP = new Set('a an and are can do does did how i if in is it me my of on or the to what when where who why will with you your much there this that get so any about im its just like please tell can could should would am be been being have has had was were for at as by from up out not no yes ok okay hey proff'.split(' '));
const SYN = {
  pic: 'photo', pics: 'photo', picture: 'photo', pictures: 'photo', image: 'photo', images: 'photo', photos: 'photo', selfie: 'photo', snap: 'photo', camera: 'photo',
  sees: 'see', view: 'see', views: 'see', look: 'see', visible: 'see', show: 'see', shows: 'see',
  cost: 'price', costs: 'price', money: 'price', pay: 'price', paying: 'price', expensive: 'price', cheap: 'price', billed: 'price', bill: 'price', fee: 'price', fees: 'price', subscription: 'price', subscribe: 'price', premium: 'pro', paid: 'pro',
  unsubscribe: 'cancel', quit: 'cancel', end: 'cancel', terminate: 'cancel',
  mates: 'friends', mate: 'friends', bro: 'friends', brothers: 'friends', brother: 'friends', buddy: 'friends', buddies: 'friends', crew: 'club', squad: 'club', group: 'club', team: 'club',
  login: 'sign', signin: 'sign', log: 'sign', logout: 'sign', password: 'sign',
  install: 'home', homescreen: 'home', icon: 'home',
  notif: 'reminder', notifs: 'reminder', notification: 'reminder', notifications: 'reminder', remind: 'reminder', reminders: 'reminder', alert: 'reminder', alerts: 'reminder', ping: 'reminder', nudge: 'reminder',
  remove: 'delete', erase: 'delete', wipe: 'delete', trash: 'delete', clear: 'delete',
  goals: 'commitments', goal: 'commitments', habits: 'commitments', habit: 'commitments', targets: 'commitments', target: 'commitments', commitment: 'commitments',
  broke: 'breaks', break: 'breaks', lose: 'breaks', lost: 'breaks', reset: 'breaks', resets: 'breaks', die: 'breaks', dies: 'breaks', ends: 'breaks',
  streaks: 'streak', fire: 'streak', flame: 'streak',
  rating: 'score', ratings: 'score', points: 'score', mark: 'score', grade: 'score',
  edit: 'change', switch: 'change', swap: 'change', update: 'change', modify: 'change', rename: 'change',
  app: 'proof', phone: 'home', iphone: 'home', android: 'home', ios: 'home',
  secure: 'private', safe: 'private', privacy: 'private', hack: 'private', data: 'private', spy: 'private',
  save: 'backup', saved: 'backup', cloud: 'backup', sync: 'backup', lose_photos: 'backup',
  midnight: 'day', timezone: 'day', today: 'day', yesterday: 'day', tomorrow: 'day',
  mic: 'voice', microphone: 'voice', audio: 'voice', speak: 'voice', talk: 'voice', record: 'voice', recording: 'voice',
  free: 'trial', trial: 'trial', gift: 'trial',
  sound: 'sounds', sounds: 'sounds', noise: 'sounds', mute: 'sounds', haptic: 'sounds', vibrate: 'sounds', vibration: 'sounds',
  dark: 'theme', light: 'theme', colour: 'theme', color: 'theme', colors: 'theme', colours: 'theme',
  bug: 'broken', broken: 'broken', glitch: 'broken', crash: 'broken', error: 'broken', stuck: 'broken', frozen: 'broken', freezes: 'broken', fail: 'broken', fails: 'broken', doesnt: 'broken', cant: 'broken', wont: 'broken',
};
const norm = (s) => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9 ]/g, ' ');
const stem = (w) => (w.length > 4 ? w.replace(/(ing|ed|es|s|ly)$/, '') : w);
const words = (s) => norm(s).split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w)).map((w) => SYN[w] || w).map(stem);

function lev(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i), pp = [];
  for (let i = 1; i <= a.length; i++) {
    let cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) cur[j] = Math.min(cur[j], (pp[j - 2] ?? 9) + 1);
    }
    pp = prev.slice();
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j];
  }
  return prev[b.length];
}
// Same word, allowing for a typo: streek~streak, remnder~reminder.
const close = (a, b) => a === b || (a.length >= 4 && b.length >= 4 && (a.startsWith(b) || b.startsWith(a) || lev(a, b, a.length >= 8 ? 2 : 1) <= (a.length >= 8 ? 2 : 1)));

const index = QA.map((item) => ({ item, head: [...new Set(words(`${item.q} ${item.k}`))], tail: [...new Set(words(item.a))] }));

function score(qw) {
  return index.map(({ item, head, tail }) => {
    let s = 0, hits = 0;
    for (const w of qw) {
      if (head.some((h) => close(w, h))) { s += 3; hits++; } else if (tail.some((t) => close(w, t))) { s += 1; hits++; }
    }
    // Asking the question word for word gets a bonus.
    if (norm(item.q).includes(norm(qw.join(' ')))) s += 2;
    // Tie-break: the answer whose question is mostly about what you typed.
    s += hits / Math.max(1, head.length);
    return { item, s, hits };
  }).sort((a, b) => b.s - a.s);
}

/* ---------- Your data, said plainly ---------- */
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const today = () => {
  const P = S.profile, done = doneToday(S.proofs);
  const left = P.commitments.filter((k) => !done.has(k));
  const have = P.commitments.length - left.length, need = needFor(P.commitments.length);
  return { P, done, left, have, need, total: P.commitments.length };
};
const VERSES = [
  ['Colossians 3:23', 'Whatever you do, work at it with all your heart, as working for the Lord.'],
  ['Galatians 6:9', 'Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up.'],
  ['Proverbs 16:3', 'Commit to the Lord whatever you do, and he will establish your plans.'],
  ['Joshua 1:9', 'Be strong and courageous. Do not be afraid; do not be discouraged, for the Lord your God will be with you wherever you go.'],
  ['Proverbs 21:5', 'The plans of the diligent lead to profit.'],
  ['Philippians 4:13', 'I can do all this through him who gives me strength.'],
];
const verse = (shift = 0) => { const v = VERSES[(Math.floor(Date.now() / 864e5) + shift) % VERSES.length]; return `“${v[1]}” (${v[0]})`; };
const tinyStep = (t) => t.left[0] ? `Do the smallest honest version of ${commitment(t.left[0]).label} right now: ten minutes, then post it.` : 'You’re done for today. Rest well.';

const INTENTS = [
  { re: /^(hi|hello|hey|yo|sup|howzit|good (morning|afternoon|evening))\b/, pose: 'cheer', r() { const t = today(); return { title: `Hey ${S.profile.name}.`, body: t.have >= t.need ? `You’ve kept today’s streak. ${t.left.length ? `${plural(t.left.length, 'goal')} left if you want the bonus.` : 'Every goal is done.'}` : `${t.need - t.have} more proof${t.need - t.have === 1 ? '' : 's'} keeps your streak today. Next up: ${commitment(t.left[0]).label}.` }; } },
  { re: /\b(thanks|thank you|thx|cheers|appreciate)\b/, pose: 'cheer', r: () => ({ title: 'Anytime.', body: 'Now go and prove something.' }) },
  { re: /\b(who made you|who built you|who created you|are you (ai|a robot|real|chatgpt))\b/, pose: 'talk', r: () => ({ title: 'I’m a stamp, not a robot brain.', body: 'I don’t use AI. I’m made of carefully written answers and your own numbers, so what I tell you comes from your real data and never gets made up.' }) },
  { re: /\b(you.?re|youre|you are) (smart|clever|good|great|cool|funny|useful|helpful)\b/, pose: 'cheer', r: () => ({ title: 'Careful, I’ll stamp myself.', body: 'I only know what’s in Proof and your own numbers. That’s exactly why you can trust it.' }) },
  { re: /^(whats |what is |show |tell me )?(my )?(current )?streak( now| right now| currently)?$|\b(whats my streak|what is my streak|how long (is|has) my streak|current streak)\b/, pose: 'point', r() { const s = streak(S.proofs), b = bestStreak(S.proofs); return { title: `${plural(s, 'day')} streak.`, body: s === 0 ? `Nothing running right now. Your best is ${plural(b, 'day')}. Prove ${needFor(S.profile.commitments.length)} goal${needFor(S.profile.commitments.length) === 1 ? '' : 's'} today and it starts again.` : s >= b ? 'That’s your best ever. Don’t stop now.' : `Your best is ${plural(b, 'day')}. ${plural(b - s, 'day')} to beat it.` }; } },
  { re: /\b(what (should|do) i (do|prove|post)|what.?s next|what now|what.?s left|what.?s (my )?plan|what do i (need|have) to do|next (goal|proof))\b/, pose: 'point', r() { const t = today(); if (!t.left.length) return { title: 'Nothing. You’re done.', body: 'Every goal is proven today. Spend the rest of the day on something that isn’t on a screen.' }; const c = commitment(t.left[0]); return { title: `Prove ${c.label}.`, body: `${t.have >= t.need ? 'Your streak is already safe, this one’s a bonus.' : `${t.need - t.have} more keeps your streak.`} ${t.left.length > 1 ? `Then: ${t.left.slice(1).map((k) => commitment(k).label).join(', ')}.` : ''}`.trim() }; } },
  { re: /\b(how am i doing|how.?s my (week|day|progress)|my (week|score|progress)|am i (doing )?(good|ok|okay|on track))\b/, pose: 'talk', r() { if (!S.proofs.length) return { title: 'No data yet.', body: 'Post your first proof and I’ll have something real to tell you.' }; const r = weekReport(S.proofs, S.profile); return { title: `${r.score}/10, ${r.rating}.`, body: `${r.weak && r.weak.of ? `Weakest spot: ${r.weak.c.label} (${r.weak.n} of ${r.weak.of} days). ` : ''}${r.best && r.best.of ? `Strongest: ${r.best.c.label}.` : ''}` }; } },
  { re: /\b(weak|weakest|worst|struggl|improve|work on|neglect|falling behind|bad at)\b/, pose: 'think', r() { if (!S.proofs.length) return { title: 'Too early to tell.', body: 'Give me a few days of proof and I’ll show you exactly where you’re slipping.' }; const r = weekReport(S.proofs, S.profile); const w = r.weak; if (!w || !w.of) return { title: 'No clear weak spot.', body: 'Keep posting and I’ll find it.' }; return { title: `${w.c.label}.`, body: `You proved it ${w.n} of ${w.of} days this week. Pick a fixed time for it tomorrow and put it first.` }; } },
  { re: /\bhow many (proofs?|photos?|posts?|times)\b/, pose: 'talk', r() { const n = S.proofs.filter((p) => p.cKey !== 'moment').length; return { title: plural(n, 'proof') + '.', body: `Across ${plural(ageDays(S.profile), 'day')} with Proof. You’ve kept ${plural(daysKept(S.proofs), 'day')}.` }; } },
  { re: /\b(best streak|longest streak|record)\b/, pose: 'cheer', r: () => ({ title: `${plural(bestStreak(S.proofs), 'day')}.`, body: 'That’s your personal best. Beat it.' }) },
  { re: /\b(trial|days left|my plan|how long (do i|have i)|when does (it|my).*(end|expire|charge)|am i (on|paying))\b/, pose: 'talk', r() { const p = planState(); const d = daysLeft(); return { title: p.kind === 'active' ? 'You’re on Pro.' : p.kind === 'ended' ? 'Your trial is over.' : `${plural(d, 'day')} left.`, body: p.kind === 'active' ? 'It renews until you cancel. Manage it any time under Account, then Subscription.' : p.kind === 'ended' ? 'Pick a plan under Account to keep posting. Your history is safe.' : 'Nothing is charged before day 30, and I remind you 3 days before. Cancel any time under Account.' }; } },
  { re: /\b(yesterday)\b.*\b(do|done|prove|post)|what did i (do|prove|post)\b/, pose: 'talk', r() { const m = byDay(S.proofs); const y = new Date(); y.setDate(y.getDate() - 1); const ps = m.get(dayKey(y.getTime())) || []; return ps.length ? { title: `${plural(ps.length, 'proof')} yesterday.`, body: [...new Set(ps.map((p) => commitment(p.cKey).label))].join(', ') + '.' } : { title: 'Nothing posted yesterday.', body: 'Today is a fresh page. Start with the easiest goal.' }; } },
  { re: /\b(missed|skipped|forgot|failed|slipped|fell off|didn.?t (do|post|train|go)|lost my streak|broke my streak|streak (is )?(gone|dead|broken))\b/, pose: 'worried', r() { const t = today(); return { title: 'It happens. What matters is the next one.', body: `One missed day doesn’t undo you, and you only need half your goals to keep a streak. ${tinyStep(t)}` }; } },
  { re: /\b(tired|lazy|exhausted|no energy|unmotivated|motivation|can.?t be bothered|don.?t feel like|not feeling it|discouraged|give up|giving up|bored|struggling|hard|burnt out|burned out|stressed|overwhelmed|anxious)\b/, pose: 'cheer', r() { const t = today(); return { title: 'Feeling it is not required.', body: `Discipline is doing it on the days you don’t feel like it. ${tinyStep(t)} ${verse()}` }; } },
  { re: /\b(verse|scripture|bible|encourage|encouragement|pray(er)?|god|jesus|faith)\b/, pose: 'cheer', r: () => ({ title: 'For today.', body: verse(new Date().getDate()) }) },
  { re: /\b(tip|advice|how (do|can) i (stay|keep|be) (consistent|disciplined)|consistent|consistency|discipline|habit)\b/, pose: 'think', r() { return { title: 'Make it small and make it fixed.', body: 'Same time, same place, smallest version. Pick one goal, attach it to something you already do every day, and prove it the moment it’s done. Keep the other goals as bonuses until that one is automatic.' }; } },
  { re: /\b(joke|funny|make me laugh)\b/, pose: 'cheer', r: () => ({ title: 'Why did the streak go to the gym?', body: 'To keep its form. (I’m a stamp. Don’t expect much.)' }) },
];

/* ---------- Typos ---------- */
const VOCAB = new Set([...index.flatMap((x) => [...x.head, ...x.tail]), ...Object.keys(SYN), ...Object.values(SYN),
  ...'should what whats next left proof exhausted photos posted charged cancel streak week score trial missed skipped forgot tired lazy motivation discipline consistent weakest improve verse scripture bible prayer yesterday progress'.split(' ')]);
function fix(text) {
  return norm(text).split(/\s+/).map((w) => {
    if (w.length < 4 || VOCAB.has(w) || VOCAB.has(stem(w)) || STOP.has(w)) return w;
    let best = null, d = w.length >= 8 ? 2 : 1;
    for (const v of VOCAB) { if (Math.abs(v.length - w.length) > d || v.length < 4) continue; const x = lev(w, v, d); if (x <= d && (best === null || x < d)) { best = v; d = x; if (x === 0) break; } }
    return best || w;
  }).join(' ');
}

/* ---------- The answer ---------- */
// Returns { personal, matches, near }.
export function think(text) {
  const raw = text.trim();
  const flat = norm(raw).trim();
  const fixed = fix(raw).trim();
  let personal = null;
  if (S.profile) {
    // Exactly as typed first; only if nothing fits, try again with typos corrected.
    for (const text2 of [flat, fixed]) {
      for (const it of INTENTS) if (it.re.test(text2)) { try { personal = { pose: it.pose, ...it.r() }; } catch { /* data not ready */ } break; }
      if (personal) break;
    }
  }
  const qw = [...new Set([...words(flat), ...words(fixed)])];
  let matches = [], near = [];
  if (qw.length) {
    const ranked = score(qw);
    const need = Math.min(2, qw.length);
    // With a personal answer on top, only add a Q&A if it is a really strong match.
    matches = ranked.filter((r) => r.hits >= need && r.s >= (personal ? 7 : 3)).slice(0, personal ? 1 : 4).map((r) => r.item);
    if (!matches.length) near = ranked.filter((r) => r.s >= 1).slice(0, 3).map((r) => r.item);
  }
  return { personal, matches, near };
}

// Questions worth tapping, based on where you are right now.
export function suggestions() {
  if (!S.profile) return [];
  const t = today();
  const out = ['What should I do next?', 'How am I doing?'];
  if (streak(S.proofs) === 0 && S.proofs.length) out.push('I missed a day');
  else out.push('What’s my streak?');
  if (t.have === 0) out.push('I’m tired');
  else out.push('Where am I weak?');
  return out.slice(0, 4);
}
