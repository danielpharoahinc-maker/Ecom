// Sends one meal photo to Claude and saves its review on the proof, so the verdict
// shows up in the app a few seconds after you post. Needs a secret in Supabase
// (Edge Functions > Secrets): ANTHROPIC_API_KEY. Without it this answers
// "not_configured" and the app quietly skips it (the Connect Claude route still works).
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { LABELS } from '../_shared/labels.ts';

const MODEL = Deno.env.get('ANALYZE_MODEL') ?? 'claude-haiku-5-5';
const DAILY_LIMIT = 20;
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
const b64 = (buf: ArrayBuffer) => { let s = ''; const a = new Uint8Array(buf); for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode(...a.subarray(i, i + 0x8000)); return btoa(s); };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return json({ error: 'Sign in first.' }, 401);
  if (!apiKey) return json({ status: 'not_configured' }, 200);
  const body = await req.json().catch(() => null) as { proof_id?: string } | null;
  if (!body?.proof_id) return json({ error: 'proof_id is required.' }, 400);
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data: p } = await admin.from('proofs').select('id, c_key, note, photo_path, meta, analysis, created_at').eq('id', body.proof_id).eq('user_id', user.id).maybeSingle();
  if (!p?.photo_path) return json({ error: 'No photo on that proof.' }, 404);
  if (p.analysis) return json({ status: 'already_reviewed' });

  // A small daily cap keeps costs predictable.
  const since = new Date(Date.now() - 864e5).toISOString();
  const { count } = await admin.from('proofs').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', since).not('analysis', 'is', null);
  if ((count ?? 0) >= DAILY_LIMIT) return json({ status: 'limit', message: `Limit of ${DAILY_LIMIT} reviews a day reached.` });

  const { data: file } = await admin.storage.from('proof-media').download(p.photo_path);
  if (!file) return json({ error: 'Couldn’t read the photo.' }, 404);
  const buf = await file.arrayBuffer();
  if (buf.byteLength > 4_500_000) return json({ error: 'Photo too large.' }, 413);
  const type = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) ? file.type : 'image/jpeg';

  const meal = p.meta?.meal;
  const prompt = `You review one meal photo for a young person building a strong, healthy, disciplined life. Be honest, kind and specific. Goal: ${LABELS[p.c_key] ?? p.c_key}. ${meal ? `They say it is ${meal.type}${meal.tags?.length ? ` and tagged: ${meal.tags.join(', ')}` : ''}.` : ''} ${p.note ? `Their note: "${String(p.note).slice(0, 200)}".` : ''}
If the photo is not food, say so and give a low score. Reply with ONLY JSON: {"score": 0-10, "verdict": "great|good|ok|poor", "summary": "one or two sentences", "tips": ["up to 3 short tips"]}`;

  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: MODEL, max_tokens: 400,
      messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: type, data: b64(buf) } }, { type: 'text', text: prompt }] }],
    }),
  });
  if (!r.ok) return json({ status: 'model_error', http: r.status }, 502);
  const out = await r.json().catch(() => null) as any;
  const text: string = out?.content?.find((c: any) => c.type === 'text')?.text ?? '';
  const m = text.match(/\{[\s\S]*\}/);
  let parsed: any = null;
  try { parsed = m ? JSON.parse(m[0]) : null; } catch { parsed = null; }
  const score = Number(parsed?.score);
  if (!Number.isFinite(score)) return json({ status: 'unreadable' }, 502);
  const clean = (s: unknown, n: number) => String(s ?? '').replace(/[<>]/g, '').slice(0, n);
  const s10 = Math.max(0, Math.min(10, score));
  const analysis = {
    score: Math.round(s10 * 10) / 10,
    verdict: ['great', 'good', 'ok', 'poor'].includes(parsed.verdict) ? parsed.verdict : s10 >= 8 ? 'great' : s10 >= 6 ? 'good' : s10 >= 4 ? 'ok' : 'poor',
    summary: clean(parsed.summary, 400),
    tips: Array.isArray(parsed.tips) ? parsed.tips.slice(0, 3).map((t: unknown) => clean(t, 160)).filter(Boolean) : [],
    by: 'claude', at: new Date().toISOString(),
  };
  const { error } = await admin.from('proofs').update({ analysis }).eq('id', p.id).eq('user_id', user.id);
  if (error) return json({ error: 'Couldn’t save the review.' }, 500);
  return json({ status: 'ok', analysis });
});
