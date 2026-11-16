// Your day as a Lock-in log (markdown). Notion accepts markdown pasted straight in, so
// "Copy today's log" is the no-setup way to keep your Lock-in plan in Notion.
import { S } from './state.js';
import { commitment, isFood } from './data.js';
import { streak, needFor } from './stats.js';
import { dayKey } from './util.js';

export function lockinLog(date = dayKey()) {
  const P = S.profile;
  const rows = S.proofs.filter((p) => dayKey(p.ts) === date).sort((a, b) => a.ts - b.ts);
  const clock = (t) => new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  const done = P.commitments.filter((k) => rows.some((p) => p.cKey === k));
  const need = needFor(P.commitments.length);
  const meals = rows.filter((p) => p.meal || isFood(p.cKey));
  const nice = new Date(`${date}T12:00`).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return [
    `# Lock-in log, ${nice}`, '',
    `Goals: ${done.length}/${P.commitments.length} (${need} needed for the streak) ${done.length >= need ? '✅ streak kept' : '⚠️ streak at risk'}`,
    `Streak: ${streak(S.proofs, P)} ${streak(S.proofs, P) === 1 ? 'day' : 'days'}`, '',
    '## Goals',
    ...P.commitments.map((k) => { const p = rows.find((x) => x.cKey === k); return `- [${p ? 'x' : ' '}] ${commitment(k).label}${p ? ` (${clock(p.ts)})` : ''}`; }), '',
    '## Meals',
    ...(meals.length ? meals.map((p) => `- ${clock(p.ts)} ${p.meal?.type || 'Meal'}${p.note ? `: ${p.note}` : ''}${p.meal?.tags?.length ? ` [${p.meal.tags.join(', ')}]` : ''}${p.analysis ? ` — ${p.analysis.score}/10, ${p.analysis.verdict}. ${p.analysis.summary || ''}` : ''}`) : ['- No meals logged']),
    ...(rows.some((p) => p.cKey === 'moment') ? ['', '## Moments', `- ${rows.filter((p) => p.cKey === 'moment').length} saved`] : []),
  ].join('\n');
}
