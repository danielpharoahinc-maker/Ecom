// Paystack calls this after every payment and subscription change.
// It is the ONLY thing that can switch access on, and only for genuine, signed
// messages from Paystack with the right amount in rand.
//
// Free trial with a card up front:
//   1. R1 card check succeeds   -> grant 30 days (+1 day grace)
//   2. schedule the first real charge for day 30 (Paystack subscription)
//   3. refund the R1
// Each step is recorded, so Paystack retrying the message can never double a
// subscription or a refund. Day 30: Paystack charges the plan; renewals extend access.
//
// Webhook URL: https://<project>.supabase.co/functions/v1/paystack-webhook
// Deploy with --no-verify-jwt (Paystack has no Supabase login).
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';
import { PLANS, planByCode, TRIAL_AUTH, TRIAL_DAYS, type PlanName } from '../_shared/plans.ts';

const SECRET = Deno.env.get('PAYSTACK_SECRET_KEY') ?? '';
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const reply = (text: string, status = 200) => new Response(text, { status });

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
async function paystack(path: string, method: string, body?: unknown) {
  const r = await fetch(`https://api.paystack.co${path}`, {
    method, headers: { Authorization: `Bearer ${SECRET}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
  });
  return { ok: r.ok, data: await r.json().catch(() => null) };
}

/* ---------- the card check at the start of the trial ---------- */
// deno-lint-ignore no-explicit-any
async function trialStart(d: any) {
  const userId = d.metadata?.user_id as string | undefined;
  const plan = d.metadata?.plan as PlanName | undefined;
  const customer = d.customer?.customer_code as string | undefined;
  const auth = d.authorization?.authorization_code as string | undefined;
  if (!userId || !plan || !(plan in PLANS) || d.currency !== 'ZAR' || d.amount !== TRIAL_AUTH || d.status !== 'success') return reply('ignored');
  if (!customer || !auth || d.authorization?.reusable === false) { await paystack('/refund', 'POST', { transaction: d.reference }); return reply('card not reusable, refunded'); }

  const { data: found } = await admin.from('billing').select('*').eq('user_id', userId).maybeSingle();
  let bill = found;
  // One free trial per person: a second card check is just given back.
  if (bill?.trial_used_at && bill.trial_ref !== d.reference) {
    await paystack('/refund', 'POST', { transaction: d.reference });
    return reply('trial already used, refunded');
  }
  const trialEnd = bill?.charge_on ? new Date(bill.charge_on) : new Date(Date.now() + TRIAL_DAYS * 864e5);
  if (!bill?.trial_ref) {
    bill = { user_id: userId, customer_code: customer, plan, status: 'trial', charge_on: trialEnd.toISOString(), trial_ref: d.reference, trial_used_at: new Date().toISOString(), granted: false, refunded: false, sub_code: null };
    await admin.from('billing').upsert({ ...bill, updated_at: new Date().toISOString() });
  }

  // 1. Access for the free month (plus a day, so a late first charge can't lock anyone out).
  if (!bill.granted) {
    const until = new Date(trialEnd.getTime() + 864e5).toISOString();
    const { data: rows } = await admin.from('profiles').update({ pro_until: until }).eq('id', userId).select('id');
    if (!rows?.length) return reply('profile not ready', 500); // Paystack retries later
    await admin.from('billing').update({ granted: true }).eq('user_id', userId);
    bill.granted = true;
  }
  // 2. The first real charge, on day 30.
  if (!bill.sub_code) {
    const r = await paystack('/subscription', 'POST', { customer, plan: PLANS[plan].code, authorization: auth, start_date: trialEnd.toISOString() });
    const code = r.data?.data?.subscription_code;
    if (!r.ok || !code) return reply('subscription not created', 500);
    await admin.from('billing').update({ sub_code: code }).eq('user_id', userId);
    bill.sub_code = code;
  }
  // 3. Give the R1 back.
  if (!bill.refunded) {
    const r = await paystack('/refund', 'POST', { transaction: d.reference });
    if (!r.ok) return reply('refund not made', 500);
    await admin.from('billing').update({ refunded: true }).eq('user_id', userId);
  }
  return reply('ok');
}

/* ---------- a real plan charge: day 30, renewals, or paying after the trial ---------- */
// deno-lint-ignore no-explicit-any
async function planCharge(d: any) {
  const customer: string | undefined = d.customer?.customer_code;
  let userId: string | undefined = d.metadata?.user_id;
  if (!userId && customer) {
    const { data } = await admin.from('billing').select('user_id').eq('customer_code', customer).maybeSingle();
    userId = data?.user_id;
  }
  const plan: PlanName | null = (d.metadata?.plan in PLANS ? d.metadata.plan : null) ?? planByCode(d.plan?.plan_code);
  if (!userId || !plan || d.currency !== 'ZAR' || d.amount < PLANS[plan].amount || d.status !== 'success') return reply('ignored');
  const { data: bill } = await admin.from('billing').select('last_reference').eq('user_id', userId).maybeSingle();
  if (bill?.last_reference === d.reference) return reply('duplicate');

  // Extend from whichever is later: now, or the current end date.
  const { data: prof } = await admin.from('profiles').select('pro_until').eq('id', userId).maybeSingle();
  const from = Math.max(Date.now(), prof?.pro_until ? new Date(prof.pro_until).getTime() : 0);
  const until = new Date(from + PLANS[plan].days * 864e5).toISOString();
  const { data: rows } = await admin.from('profiles').update({ pro_until: until }).eq('id', userId).select('id');
  if (!rows?.length) return reply('profile not ready', 500);
  await admin.from('billing').upsert({
    user_id: userId, customer_code: customer ?? null, plan, status: 'active', charge_on: null,
    last_reference: d.reference, updated_at: new Date().toISOString(),
  });
  return reply('ok');
}

Deno.serve(async (req) => {
  if (req.method !== 'POST' || !SECRET) return reply('no', 400);
  const body = await req.text();
  // Reject anything not signed with our Paystack secret.
  if (!sameText(await signature(body), req.headers.get('x-paystack-signature') ?? '')) return reply('bad signature', 401);
  const evt = JSON.parse(body);
  const d = evt.data ?? {};

  if (evt.event === 'charge.success') return d.metadata?.trial ? await trialStart(d) : await planCharge(d);

  // Remember the subscription code Paystack gives us, if we don't have it yet.
  if (evt.event === 'subscription.create' && d.subscription_code && d.customer?.customer_code) {
    await admin.from('billing').update({ sub_code: d.subscription_code }).eq('customer_code', d.customer.customer_code).is('sub_code', null);
  }
  // Cancelled: nothing to switch off. Access simply ends when the paid time does.
  if ((evt.event === 'subscription.disable' || evt.event === 'subscription.not_renew') && d.subscription_code) {
    await admin.from('billing').update({ status: 'cancelled' }).eq('sub_code', d.subscription_code);
  }
  return reply('ok');
});
