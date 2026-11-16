// Sends your day to Notion as a page: "Lock-in log, <date>" with your goals as to-do
// checkboxes and your meals (with Claude's review) as bullets. Needs two secrets in
// Supabase (Edge Functions > Secrets): NOTION_TOKEN (a Notion integration token) and
// NOTION_PARENT_PAGE_ID (a page you have shared with that integration).
// Without them it answers "not_configured" and the app copies the log instead.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { LABELS } from '../_shared/labels.ts';

const FOOD = new Set(['eat', 'meals', 'protein', 'nosugar']);
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
const label = (k: string) => LABELS[k] ?? k;
const dayIn = (d: Date, tz: string) => { try { return new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(d); } catch { return new Intl.DateTimeFormat('en-CA').format(d); } };
const txt = (s: string) => [{ type: 'text', text: { content: s.slice(0, 1900) } }];
const para = (type: string, s: string, extra: Record<string, unknown> = {}) => ({ object: 'block', type, [type]: { rich_text: txt(s), ...extra } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return json({ error: 'Sign in first.' }, 401);
  const token = Deno.env.get('NOTION_TOKEN'), parent = Deno.env.get('NOTION_PARENT_PAGE_ID');
  if (!token || !parent) return json({ status: 'not_configured' });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: prof } = await admin.from('profiles').select('name, commitments, tz').eq('id', user.id).maybeSingle();
  if (!prof) return json({ error: 'Finish setting up Proof first.' }, 404);
  const tz = prof.tz || 'Africa/Johannesburg';
  const goals: string[] = prof.commitments ?? [];
  const body = await req.json().catch(() => ({})) as { date?: string };
  const date = /^\d{4}-\d{2}-\d{2}$/.test(body?.date ?? '') ? body.date! : dayIn(new Date(), tz);
  const { data } = await admin.from('proofs').select('c_key, note, created_at, meta, analysis').eq('user_id', user.id).gte('created_at', new Date(Date.now() - 75 * 864e5).toISOString()).order('created_at', { ascending: true }).limit(2000);
  const rows = (data ?? []).filter((p) => dayIn(new Date(p.created_at), tz) === date);
  const clock = (iso: string) => new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  const need = Math.max(1, Math.ceil(goals.length / 2));
  const done = goals.filter((g) => rows.some((p) => p.c_key === g));
  const meals = rows.filter((p) => FOOD.has(p.c_key) || p.meta?.meal);

  const children = [
    para('paragraph', `Goals: ${done.length}/${goals.length} (${need} needed for the streak) ${done.length >= need ? '✅ streak kept' : '⚠️ streak at risk'}`),
    para('heading_2', 'Goals'),
    ...goals.map((g) => { const p = rows.find((x) => x.c_key === g); return para('to_do', `${label(g)}${p ? ` (${clock(p.created_at)})` : ''}`, { checked: Boolean(p) }); }),
    para('heading_2', 'Meals'),
    ...(meals.length ? meals.map((p) => {
      const a = p.analysis as { score?: number; verdict?: string; summary?: string } | null;
      return para('bulleted_list_item', `${clock(p.created_at)} ${p.meta?.meal?.type ?? 'Meal'}${p.note ? `: ${p.note}` : ''}${p.meta?.meal?.tags?.length ? ` [${p.meta.meal.tags.join(', ')}]` : ''}${a ? ` — ${a.score}/10, ${a.verdict}. ${a.summary ?? ''}` : ''}`);
    }) : [para('bulleted_list_item', 'No meals logged')]),
  ];
  const r = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' },
    body: JSON.stringify({ parent: { page_id: parent }, properties: { title: { title: txt(`Lock-in log, ${date}`) } }, children }),
  });
  const out = await r.json().catch(() => null) as { url?: string; message?: string } | null;
  if (!r.ok) return json({ status: 'notion_error', http: r.status, message: out?.message?.slice(0, 160) }, 502);
  return json({ status: 'ok', url: out?.url ?? null });
});
