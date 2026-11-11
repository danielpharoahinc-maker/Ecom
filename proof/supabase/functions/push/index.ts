// Push notifications for Proof reminders.
//   POST {action:'key'}   -> the public push key (made on first use)
//   POST {action:'test'}  -> sends the signed-in person a test notification
//   POST {action:'send'}  -> (cron only) sends every reminder that is due
// Deploy: supabase functions deploy push --no-verify-jwt
// The cron job proves itself with x-cron-key; people prove themselves with
// their normal sign-in token. Private keys never leave the database.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import webpush from 'npm:web-push@3.6.7';
import { dueReminders, keepToday, type Row } from '../_shared/reminders.ts';

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
    let sent = 0;
    for (const row of rows ?? []) {
      const { day, due } = dueReminders(row as Row);
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
  return json({ error: 'Unknown action' }, 400);
});
