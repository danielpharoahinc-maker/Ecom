// Turns a spoken (or typed) plan into a list of items. No AI needed:
//   "Gym at 6, then school, work on the business for an hour after school
//    and read before bed"
// becomes
//   06:00 Gym                       (linked to Train)
//         School
//         Work on the business      (linked to Build the business)
//   Night Read                      (linked to Read)
// Items linked to a commitment tick themselves off when you post proof.
import { uid } from './util.js';

const SPLIT = /\s*(?:[,.;!?\n]+|\b(?:and then|then|after that|afterwards|next|also|plus)\b)\s*/i;
const FILLER = /^(?:and |so |um+ |uh+ |okay |ok |today |first(?:ly)?,? |i(?:'m| am) (?:going|gonna) to |i(?:'ll| will) |i want to |i need to |gonna |going to |i have to |i've got to |i got to )+/i;

const LINKS = [
  ['train', /\b(gym|train(ing)?|work ?out|lift(ing)?|weights|chest|legs|push ?ups?)\b/i],
  ['run', /\b(run|running|jog|cardio)\b/i],
  ['read', /\b(read(ing)?|book|pages)\b/i],
  ['faith', /\b(pray(er)?|bible|scripture|devotion(al)?|church|quiet time)\b/i],
  ['build', /\b(business|clients?|sell(ing)?|ship|launch|sales|the app|proof app)\b/i],
  ['code', /\b(cod(e|ing)|program(ming)?|python|javascript|build an? app)\b/i],
  ['study', /\b(study|studying|homework|revise|revision|exam|maths|math)\b/i],
  ['cold', /\bcold shower\b/i],
  ['eat', /\b(eat clean|meal prep|no junk|healthy)\b/i],
  ['journal', /\bjournal(ing)?\b/i],
  ['create', /\b(film(ing)?|content|post a video|record a video|edit(ing)? (a )?video|reel|tiktok|instagram)\b/i],
  ['deep', /\b(deep work|focus(ed)? (work|block)|lock in)\b/i],
];

const SOFT_TIMES = [
  [/\b(when i wake up|first thing|in the morning|morning)\b/i, 'Morning', 7 * 60],
  [/\b(at lunch|lunch ?time|midday|noon)\b/i, 'Midday', 12 * 60],
  [/\b(after school)\b/i, 'After school', 14 * 60 + 30],
  [/\b(after work)\b/i, 'After work', 17 * 60 + 30],
  [/\b(this evening|tonight|evening|after dinner)\b/i, 'Evening', 19 * 60],
  [/\b(before bed|before i sleep|at night)\b/i, 'Night', 21 * 60 + 30],
];

// "6", "6:30", "6pm", "at 7 30", "18:00"
const CLOCK = /\b(?:at|by|around|from)?\s*(\d{1,2})(?:[:.h ](\d{2}))?\s*(a\.?m\.?|p\.?m\.?|o'?clock)?(?=\s|$|[^\d])/i;

function parseClock(text) {
  const m = text.match(CLOCK);
  if (!m) return null;
  let h = +m[1];
  const min = m[2] ? +m[2] : 0;
  const ap = (m[3] || '').toLowerCase().replace(/\./g, '');
  if (h > 23 || min > 59) return null;
  // A bare number only counts as a time when "at/by/around" or am/pm is there.
  if (!ap && !/\b(at|by|around|from)\s*\d/i.test(m[0]) && !m[2]) return null;
  if (ap.startsWith('p') && h < 12) h += 12;
  if (ap.startsWith('a') && h === 12) h = 0;
  if (!ap && h >= 1 && h <= 4) h += 12; // "at 3" means the afternoon
  return { mins: h * 60 + min, raw: m[0] };
}

const fmt = (mins) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

export function parsePlan(text, commitments = []) {
  const items = [];
  // Split on "and" only when both sides are real tasks ("film a reel and go
  // to church"), not "chest and back".
  const parts = text.split(SPLIT).flatMap((p) => {
    const bits = p.split(/\s+and\s+/i);
    if (bits.length < 2) return [p];
    return bits.every((b) => b.trim().split(/\s+/).length >= 2) ? bits : [p];
  });
  for (let part of parts) {
    part = part.trim().replace(FILLER, '').trim();
    if (part.length < 2) continue;

    let at = null, when = '';
    const clock = parseClock(part);
    let exact = false;
    if (clock) { at = clock.mins; when = fmt(at); exact = true; part = part.replace(clock.raw, ' '); }
    else {
      for (const [re, label, mins] of SOFT_TIMES) {
        if (re.test(part)) { at = mins; when = label; part = part.replace(re, ' '); break; }
      }
    }
    part = part.replace(/\s+/g, ' ').replace(/^(?:at|by|from|to|in|on|the)\s+/i, '').replace(/\s+(?:at|by|for|in)$/i, '').trim();
    if (part.length < 2) continue;

    const link = LINKS.find(([key, re]) => commitments.includes(key) && re.test(part));
    items.push({
      id: uid(),
      text: part[0].toUpperCase() + part.slice(1),
      when, at: exact ? at : null,
      cKey: link ? link[0] : null,
      done: false,
    });
  }
  // Items with a clock time go in time order. Everything else keeps the
  // order it was said in, sitting after the timed item spoken before it.
  let key = -1;
  return items
    .map((it, i) => { if (it.at !== null) key = it.at; return { it, i, key }; })
    .sort((a, b) => a.key - b.key || a.i - b.i)
    .map(({ it }) => it);
}
