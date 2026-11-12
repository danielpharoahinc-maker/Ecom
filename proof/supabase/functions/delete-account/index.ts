// Deletes the signed-in person's account and everything in it: proofs, photos,
// voice notes, goals, club memberships, reminders, billing. Stops any
// subscription first so nobody is charged after deleting.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const APP_URL = Deno.env.get('APP_URL') ?? '';
const cors = {
  'Access-Control-Allow-Origin': APP_URL ? new URL(APP_URL).origin : '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return json({ error: 'Sign in first.' }, 401);
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // 1. Stop any subscription so nothing is charged after deletion.
  const { data: bill } = await admin.from('billing').select('sub_code').eq('user_id', user.id).maybeSingle();
  const key = Deno.env.get('PAYSTACK_SECRET_KEY');
  if (bill?.sub_code && key) {
    const H = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
    const s = await fetch(`https://api.paystack.co/subscription/${bill.sub_code}`, { headers: H }).then((r) => r.json()).catch(() => null);
    const token = s?.data?.email_token;
    const status = s?.data?.status;
    if (status && status !== 'cancelled' && status !== 'complete') {
      const ok = token && (await fetch('https://api.paystack.co/subscription/disable', { method: 'POST', headers: H, body: JSON.stringify({ code: bill.sub_code, token }) }).then((r) => r.ok).catch(() => false));
      if (!ok) return json({ error: 'We couldn’t cancel your subscription, so nothing was deleted. Cancel it under Subscription, then try again.' }, 409);
    }
  }

  // 2. Every file you uploaded.
  for (let guard = 0; guard < 50; guard++) {
    const { data: files } = await admin.storage.from('proof-media').list(user.id, { limit: 100 });
    if (!files?.length) break;
    await admin.storage.from('proof-media').remove(files.map((f) => `${user.id}/${f.name}`));
  }

  // 3. The account. Everything else cascades from it.
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return json({ error: 'Couldn’t finish deleting. Try again, or contact us.' }, 500);
  return json({ ok: true });
});
