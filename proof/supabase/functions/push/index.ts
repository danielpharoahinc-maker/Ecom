// Push notifications for Proof reminders.
//   POST {action:'key'}   -> the public push key (made on first use)
//   POST {action:'test'}  -> sends the signed-in person a test notification
//   POST {action:'send'}  -> (cron only) sends every reminder that is due
//   POST {action:'club_ping', proof_id} -> (database trigger) tells club mates a goal was proven
// Deploy: supabase functions deploy push --no-verify-jwt
// The cron job proves itself with x-cron-key; people prove themselves with
// their normal sign-in token. Private keys never leave the database.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import webpush from 'npm:web-push@3.6.7';
import { dueReminders, clubPing, keepToday, localNow, type Row, type Trial } from '../_shared/reminders.ts';
import { label } from '../_shared/labels.ts';
import { PLANS, type PlanName } from '../_shared/plans.ts';

const URL_ = Deno.env.get('SUPABASE_URL')!;
const admin = createClient(URL_, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const APP = Deno.env.get('APP_URL') ?? 'https://proof-lockin.netlify.app/';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

async function keys() {
  const { data } = await admin.from('push_keys').select('*').eq('id', 1).maybeSingle();
  if (data) return data;
  const k = webpush.generateVAPIDKeys();
  await admin.from('push_keys').insert({ id: 1, public_key: k.publicKey, private_key: k.privateKey });
  return (await admin.from('push_keys').select('*').eq('id', 1).single()).data;
}

async function deliver(sub: unknown, k: { public_key: string; private_key: string }, payload: object) {
  webpush.setVapidDetails(APP, k.public_key, k.private_key);
  try { await webpush.sendNotification(sub as webpush.PushSubscription, JSON.stringify(payload), { TTL: 3600 }); return 'ok'; }
  catch (e) { return (e as { statusCode?: number }).statusCode === 404 || (e as { statusCode?: number }).statusCode === 410 ? 'gone' : 'error'; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  const { action } = await req.json().catch(() => ({}));
  const k = await keys();

  if (action === 'key') return json({ publicKey: k.public_key });

  if (action === 'test') {
    const user = (await createClient(URL_, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } }).auth.getUser()).data.user;
    if (!user) return json({ error: 'Sign in first.' }, 401);
    const { data } = await admin.from('reminders').select('subscription').eq('user_id', user.id).maybeSingle();
    if (!data?.subscription) return json({ error: 'Reminders aren’t on for this phone yet.' }, 400);
    return json({ result: await deliver(data.subscription, k, { title: 'Proff', body: 'Reminders are on. I’ll nudge you at the right times.', tag: 'test', url: '/' }) });
  }

  if (action === 'send') {
    if (req.headers.get('x-cron-key') !== k.cron_key) return json({ error: 'forbidden' }, 403);
    const { data: rows } = await admin.from('reminders').select('*').not('subscription', 'is', null);
    const { data: bills } = await admin.from('billing').select('user_id, plan, status, charge_on').eq('status', 'trial').not('charge_on', 'is', null);
    const billOf = new Map((bills ?? []).map((b) => [b.user_id, b]));
    let sent = 0;
    for (const row of rows ?? []) {
      const b = billOf.get(row.user_id);
      const trial: Trial = b ? { chargeDay: localNow(row.tz, new Date(b.charge_on)).day, amount: `R${(PLANS[b.plan as PlanName]?.amount ?? 0) / 100}` } : null;
      const { day, due } = dueReminders(row as Row, new Date(), trial);
      if (!due.length) continue;
      const log = keepToday(row.sent, day);
      for (const p of due) {
        const r = await deliver(row.subscription, k, { title: p.title, body: p.body, tag: p.tag, url: '/' });
        if (r === 'gone') { await admin.from('reminders').update({ subscription: null }).eq('user_id', row.user_id); break; }
        log[p.key] = true; sent++;
      }
      await admin.from('reminders').update({ sent: log }).eq('user_id', row.user_id);
    }
    return json({ sent });
  }
  if (action === 'club_ping') {
    if (req.headers.get('x-cron-key') !== k.cron_key) return json({ error: 'forbidden' }, 403);
    const { proof_id } = await req.json().catch(() => ({}));
    const { data: p } = await admin.from('proofs').select('id, user_id, c_key, created_at').eq('id', proof_id).maybeSingle();
    if (!p || p.c_key === 'moment') return json({ sent: 0 });
    const { data: poster } = await admin.from('profiles').select('name, tz').eq('id', p.user_id).maybeSingle();
    if (!poster) return json({ sent: 0 });
    // Only the first proof of this goal today makes a notification.
    const day = localNow(poster.tz, new Date(p.created_at)).day;
    const { data: same } = await admin.from('proofs').select('id, created_at').eq('user_id', p.user_id).eq('c_key', p.c_key).gte('created_at', new Date(Date.now() - 36 * 3600e3).toISOString());
    if ((same ?? []).some((x) => x.id !== p.id && localNow(poster.tz, new Date(x.created_at)).day === day && x.created_at < p.created_at)) return json({ sent: 0 });
    const { data: mine } = await admin.from('club_members').select('club_id').eq('user_id', p.user_id);
    const { data: mates } = await admin.from('club_members').select('user_id').in('club_id', (mine ?? []).map((m) => m.club_id)).neq('user_id', p.user_id);
    const ids = [...new Set((mates ?? []).map((m) => m.user_id))];
    if (!ids.length) return json({ sent: 0 });
    const { data: rows } = await admin.from('reminders').select('*').in('user_id', ids).not('subscription', 'is', null);
    let sent = 0;
    for (const row of rows ?? []) {
      const ping = clubPing(row as Row, poster.name, label(p.c_key), p.id);
      if (!ping) continue;
      const r = await deliver(row.subscription, k, { title: ping.title, body: ping.body, tag: ping.tag, url: './#club' });
      if (r === 'gone') { await admin.from('reminders').update({ subscription: null }).eq('user_id', row.user_id); continue; }
      await admin.from('reminders').update({ sent: { ...keepToday(row.sent, localNow(row.tz).day), [ping.key]: true } }).eq('user_id', row.user_id);
      sent++;
    }
    return json({ sent });
  }
  return json({ error: 'Unknown action' }, 400);
});
