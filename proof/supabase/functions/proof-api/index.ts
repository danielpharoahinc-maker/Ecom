// The Proof API: lets your own Claude (or any tool you trust) read your proof and write
// meal reviews back. You create a key in the app (Account > Connect Claude). Only a
// hash of the key is stored, and you can revoke it any time.
//
//   GET  ?r=help                      how this works (no key needed)
//   GET  ?r=summary                   who you are, today's progress, streak
//   GET  ?r=goals                     your goals
//   GET  ?r=proofs&days=7&goal=eat    recent proof with signed photo links
//   GET  ?r=meals&days=7              recent meals; pending=true -> not reviewed yet
//   GET  ?r=daily_log&date=YYYY-MM-DD  a ready-made Lock-in log for that day (markdown, paste into Notion)
//   GET  ?r=photo&id=<proof id>       the photo itself (send the key as usual)
//   POST ?r=analysis                  {proof_id, score 0-10, verdict, summary, tips[]}
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { LABELS } from '../_shared/labels.ts';

const FOOD = new Set(['eat', 'meals', 'protein', 'nosugar']);
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-api-key, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b, null, 2), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, '0')).join('');
const sha = async (s: string) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
const label = (k: string) => LABELS[k] ?? k;
const dayIn = (d: Date, tz: string) => { try { return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d); } catch { return new Intl.DateTimeFormat('en-CA').format(d); } };

const HELP = {
  name: 'Proof API',
  auth: 'Send your key as   Authorization: Bearer proof_...   (or the x-api-key header).',
  endpoints: {
    'GET ?r=summary': 'Name, goals, how today is going, current streak.',
    'GET ?r=goals': 'Your goals, and which ones are food goals.',
    'GET ?r=proofs&days=7&goal=<key>&limit=30': 'Recent proof (note, time, meal details, signed photo link, your earlier reviews).',
    'GET ?r=meals&days=7&pending=true': 'Recent meals. pending=true returns only the ones nobody has reviewed yet.',
    'GET ?r=daily_log&date=YYYY-MM-DD': 'A ready-made Lock-in log for one day (goals ticked, meals with reviews, as markdown for Notion). Date defaults to today.',
    'GET ?r=photo&id=<proof id>': 'The photo itself.',
    'POST ?r=analysis': 'Save a review: {"proof_id": "...", "score": 0-10, "verdict": "great|good|ok|poor", "summary": "one or two sentences", "tips": ["...", "..."]}',
  },
  for_claude: 'To review meals: call meals with pending=true, look at each photo_url (and the note and tags), judge how good the meal is for someone building a strong, lean, healthy body (protein, whole food, vegetables, sugar, frying, portion), then POST an analysis for each meal. Be honest and kind. Then summarise the day for the user and add it to their Lock-in plan if they use Notion.',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const url = new URL(req.url);
  const r = url.searchParams.get('r') ?? 'help';
  if (r === 'help') return json(HELP);

  const key = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim() || (req.headers.get('x-api-key') ?? '').trim();
  if (!key.startsWith('proof_')) return json({ error: 'Missing API key. Send it as: Authorization: Bearer proof_...' }, 401);
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: k } = await admin.from('api_keys').select('id, user_id').eq('key_hash', await sha(key)).is('revoked_at', null).maybeSingle();
  if (!k) return json({ error: 'That API key is invalid or has been revoked.' }, 401);
  admin.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', k.id).then(() => {}, () => {});
  const uid = k.user_id as string;
  const { data: prof } = await admin.from('profiles').select('name, commitments, tz, created_at').eq('id', uid).maybeSingle();
  if (!prof) return json({ error: 'No Proof profile for this key yet. Open Proof and finish setup.' }, 404);
  const tz = prof.tz || 'Africa/Johannesburg';
  const goals: string[] = prof.commitments ?? [];

  if (r === 'goals') return json({ goals: goals.map((g) => ({ key: g, label: label(g), food: FOOD.has(g) })) });

  const since = (days: number) => new Date(Date.now() - days * 864e5).toISOString();
  const shape = async (rows: any[]) => {
    const paths = rows.map((p) => p.photo_path).filter(Boolean);
    const signed = new Map<string, string>();
    if (paths.length) {
      const { data } = await admin.storage.from('proof-media').createSignedUrls(paths, 3600);
      (data ?? []).forEach((s: any) => { if (s.signedUrl && s.path) signed.set(s.path, s.signedUrl); });
    }
    return rows.map((p) => ({
      id: p.id, goal: p.c_key, goal_label: label(p.c_key), is_food: FOOD.has(p.c_key) || Boolean(p.meta?.meal),
      kind: p.kind, note: p.note, at: p.created_at, local_day: dayIn(new Date(p.created_at), tz),
      meal: p.meta?.meal ?? null, photo_url: p.photo_path ? signed.get(p.photo_path) ?? null : null,
      review: p.analysis ?? null, needs_review: (FOOD.has(p.c_key) || Boolean(p.meta?.meal)) && !p.analysis && Boolean(p.photo_path),
    }));
  };

  if (r === 'proofs' || r === 'meals') {
    const days = Math.min(60, Math.max(1, Number(url.searchParams.get('days')) || 7));
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit')) || 30));
    let q = admin.from('proofs').select('id, c_key, kind, note, created_at, photo_path, meta, analysis').eq('user_id', uid).gte('created_at', since(days)).order('created_at', { ascending: false }).limit(200);
    const goal = url.searchParams.get('goal');
    if (goal) q = q.eq('c_key', goal);
    const { data } = await q;
    let rows = data ?? [];
    if (r === 'meals') rows = rows.filter((p) => FOOD.has(p.c_key) || p.meta?.meal);
    if (url.searchParams.get('pending') === 'true') rows = rows.filter((p) => !p.analysis && p.photo_path);
    return json({ count: Math.min(rows.length, limit), proofs: await shape(rows.slice(0, limit)) });
  }

  if (r === 'photo') {
    const id = url.searchParams.get('id') ?? '';
    const { data: p } = await admin.from('proofs').select('photo_path').eq('id', id).eq('user_id', uid).maybeSingle();
    if (!p?.photo_path) return json({ error: 'No photo for that proof.' }, 404);
    const { data: file } = await admin.storage.from('proof-media').download(p.photo_path);
    if (!file) return json({ error: 'Couldn’t read the photo.' }, 404);
    return new Response(file, { headers: { ...cors, 'Content-Type': file.type || 'image/jpeg', 'Cache-Control': 'private, max-age=300' } });
  }

  if (r === 'summary') {
    const { data } = await admin.from('proofs').select('c_key, created_at, meta, analysis, photo_path').eq('user_id', uid).gte('created_at', since(90)).order('created_at', { ascending: false }).limit(1500);
    const rows = data ?? [];
    const byDay = new Map<string, Set<string>>();
    for (const p of rows) {
      if (p.c_key === 'moment' || !goals.includes(p.c_key)) continue;
      const d = dayIn(new Date(p.created_at), tz);
      if (!byDay.has(d)) byDay.set(d, new Set());
      byDay.get(d)!.add(p.c_key);
    }
    const need = Math.max(1, Math.ceil(goals.length / 2));
    const today = dayIn(new Date(), tz);
    let streak = 0;
    for (let i = byDay.get(today) && byDay.get(today)!.size >= need ? 0 : 1; i < 400; i++) {
      const d = dayIn(new Date(Date.now() - i * 864e5), tz);
      if ((byDay.get(d)?.size ?? 0) >= need) streak++; else break;
    }
    const doneToday = [...(byDay.get(today) ?? [])];
    const meals = rows.filter((p) => (FOOD.has(p.c_key) || p.meta?.meal) && dayIn(new Date(p.created_at), tz) === today);
    return json({
      name: prof.name, timezone: tz, today,
      goals: goals.map((g) => ({ key: g, label: label(g), done_today: doneToday.includes(g), food: FOOD.has(g) })),
      goals_needed_for_streak: need, goals_done_today: doneToday.length, streak_days: streak,
      meals_today: meals.length, meals_waiting_for_review: rows.filter((p) => (FOOD.has(p.c_key) || p.meta?.meal) && !p.analysis && p.photo_path).length,
    });
  }

  if (r === 'daily_log') {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get('date') ?? '') ? url.searchParams.get('date')! : dayIn(new Date(), tz);
    const { data } = await admin.from('proofs').select('c_key, kind, note, created_at, meta, analysis').eq('user_id', uid).gte('created_at', since(75)).order('created_at', { ascending: true }).limit(2000);
    const rows = (data ?? []).filter((p) => dayIn(new Date(p.created_at), tz) === date);
    const clock = (iso: string) => new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
    const need = Math.max(1, Math.ceil(goals.length / 2));
    const done = goals.filter((g) => rows.some((p) => p.c_key === g));
    const goalLines = goals.map((g) => {
      const p = rows.find((x) => x.c_key === g);
      return `- [${p ? 'x' : ' '}] ${label(g)}${p ? ` (${clock(p.created_at)})` : ''}`;
    });
    const meals = rows.filter((p) => FOOD.has(p.c_key) || p.meta?.meal);
    const mealLines = meals.map((p) => {
      const a = p.analysis as any;
      return `- ${clock(p.created_at)} ${p.meta?.meal?.type ?? 'Meal'}${p.note ? `: ${p.note}` : ''}${p.meta?.meal?.tags?.length ? ` [${p.meta.meal.tags.join(', ')}]` : ''}${a ? ` — ${a.score}/10, ${a.verdict}. ${a.summary ?? ''}` : ' — not reviewed yet'}`;
    });
    const moments = rows.filter((p) => p.c_key === 'moment').length;
    const markdown = [
      `# Lock-in log, ${date}`, '',
      `Goals: ${done.length}/${goals.length} (${need} needed for the streak) ${done.length >= need ? '✅ streak kept' : '⚠️ streak at risk'}`, '',
      '## Goals', ...goalLines, '',
      '## Meals', ...(mealLines.length ? mealLines : ['- No meals logged']),
      ...(moments ? ['', `## Moments`, `- ${moments} saved`] : []),
    ].join('\n');
    return json({ date, timezone: tz, goals_done: done.length, goals_total: goals.length, goals_needed: need, meals: meals.length, markdown });
  }

  if (r === 'analysis' && req.method === 'POST') {
    const b = await req.json().catch(() => null) as any;
    if (!b?.proof_id) return json({ error: 'Send {"proof_id": "...", "score": 0-10, "verdict": "great|good|ok|poor", "summary": "...", "tips": []}' }, 400);
    const score = Number(b.score);
    if (!Number.isFinite(score) || score < 0 || score > 10) return json({ error: 'score must be a number from 0 to 10.' }, 400);
    const verdict = ['great', 'good', 'ok', 'poor'].includes(b.verdict) ? b.verdict : score >= 8 ? 'great' : score >= 6 ? 'good' : score >= 4 ? 'ok' : 'poor';
    const clean = (s: unknown, n: number) => String(s ?? '').replace(/[<>]/g, '').slice(0, n);
    const analysis = {
      score: Math.round(score * 10) / 10, verdict, summary: clean(b.summary, 400),
      tips: Array.isArray(b.tips) ? b.tips.slice(0, 4).map((t: unknown) => clean(t, 160)).filter(Boolean) : [],
      by: 'claude', at: new Date().toISOString(),
    };
    const { data, error } = await admin.from('proofs').update({ analysis }).eq('id', b.proof_id).eq('user_id', uid).select('id');
    if (error) return json({ error: 'Couldn’t save the review.' }, 500);
    if (!data?.length) return json({ error: 'No proof with that id on your account.' }, 404);
    return json({ ok: true, proof_id: b.proof_id, analysis });
  }

  return json({ error: 'Unknown request. See ?r=help' }, 404);
});
