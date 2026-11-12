// Gives the signed-in person a link to manage or cancel their subscription on
// Paystack's own page. Cancelling is as easy as signing up.
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
  const { data: bill } = await admin.from('billing').select('sub_code').eq('user_id', user.id).maybeSingle();
  if (!bill?.sub_code) return json({ error: 'You don’t have a subscription to manage yet.' }, 404);
  const r = await fetch(`https://api.paystack.co/subscription/${bill.sub_code}/manage/link`, { headers: { Authorization: `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}` } });
  const out = await r.json().catch(() => null);
  const url = out?.data?.link;
  if (!r.ok || !url) return json({ error: 'Couldn’t open your subscription page. Try again.' }, 502);
  return json({ url });
});
