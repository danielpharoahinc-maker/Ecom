// Starts a Paystack checkout for the signed-in person and returns the
// payment page URL. Card details never touch Proof: Paystack hosts the page.
//
// Secrets (Supabase > Edge Functions > Secrets):
//   PAYSTACK_SECRET_KEY, PAYSTACK_PLAN_MONTHLY, PAYSTACK_PLAN_YEARLY, APP_URL
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { PLANS, type PlanName } from '../_shared/plans.ts';

const APP_URL = Deno.env.get('APP_URL') ?? '';
const cors = {
  'Access-Control-Allow-Origin': APP_URL || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  // Who is asking? Uses their own login token, so nobody can pay "as" someone else.
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: { user } } = await sb.auth.getUser();
  if (!user?.email) return json({ error: 'Sign in first.' }, 401);

  const { plan } = await req.json().catch(() => ({}));
  if (!(plan in PLANS)) return json({ error: 'Pick monthly or yearly.' }, 400);
  const p = PLANS[plan as PlanName];
  if (!p.code) return json({ error: 'Payments aren’t set up yet.' }, 503);

  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: user.email,
      amount: p.amount,
      currency: 'ZAR',
      plan: p.code, // makes it a recurring subscription
      callback_url: `${APP_URL}?paid=1`, // back to Proof after paying
      metadata: { user_id: user.id, plan },
    }),
  });
  const out = await res.json().catch(() => null);
  if (!res.ok || !out?.status) return json({ error: 'Couldn’t start the payment. Try again.' }, 502);
  return json({ url: out.data.authorization_url });
});
