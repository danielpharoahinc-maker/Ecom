// Paystack calls this after every payment and subscription change.
// It is the ONLY thing that can turn Pro on, and only for genuine,
// signed messages from Paystack with the right amount in rand.
//
// Set the webhook URL in Paystack > Settings > API Keys & Webhooks:
//   https://<project>.supabase.co/functions/v1/paystack-webhook
// Deploy with --no-verify-jwt (Paystack has no Supabase login).
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { PLANS, planByCode, type PlanName } from '../_shared/plans.ts';

const SECRET = Deno.env.get('PAYSTACK_SECRET_KEY') ?? '';
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

async function signature(body: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(SECRET), { name: 'HMAC', hash: 'SHA-512' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)));
  return [...mac].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function sameText(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST' || !SECRET) return new Response('no', { status: 400 });
  const body = await req.text();
  // 1. Reject anything not signed with our Paystack secret.
  if (!sameText(await signature(body), req.headers.get('x-paystack-signature') ?? '')) {
    return new Response('bad signature', { status: 401 });
  }
  const evt = JSON.parse(body);
  const d = evt.data ?? {};

  if (evt.event === 'charge.success') {
    // 2. Work out which person paid: first payment carries our user_id;
    //    renewals are matched by Paystack's customer code saved on the first one.
    const customer: string | undefined = d.customer?.customer_code;
    let userId: string | undefined = d.metadata?.user_id;
    if (!userId && customer) {
      const { data } = await admin.from('billing').select('user_id').eq('customer_code', customer).maybeSingle();
      userId = data?.user_id;
    }
    const plan: PlanName | null = (d.metadata?.plan in PLANS ? d.metadata.plan : null) ?? planByCode(d.plan?.plan_code);
    // 3. Check it's real money for a real plan, and not a replay.
    if (!userId || !plan || d.currency !== 'ZAR' || d.amount < PLANS[plan].amount || d.status !== 'success') {
      return new Response('ignored', { status: 200 });
    }
    const { data: bill } = await admin.from('billing').select('last_reference').eq('user_id', userId).maybeSingle();
    if (bill?.last_reference === d.reference) return new Response('duplicate', { status: 200 });

    // 4. Extend Pro from whichever is later: now, or the current end date.
    const { data: prof } = await admin.from('profiles').select('pro_until').eq('id', userId).maybeSingle();
    const from = Math.max(Date.now(), prof?.pro_until ? new Date(prof.pro_until).getTime() : 0);
    const until = new Date(from + PLANS[plan].days * 864e5).toISOString();
    await admin.from('profiles').update({ pro_until: until }).eq('id', userId);
    await admin.from('billing').upsert({
      user_id: userId, customer_code: customer ?? null, plan, last_reference: d.reference, updated_at: new Date().toISOString(),
    });
  }
  // Cancelled or failed renewals need no action: pro_until simply runs out.
  return new Response('ok', { status: 200 });
});
