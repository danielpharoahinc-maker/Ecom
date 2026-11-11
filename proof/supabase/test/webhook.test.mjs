// Payment webhook test: bundles the real webhook with a fake database and
// sends genuine, forged, duplicate and wrong-amount payments. All must PASS.
//   cd proof/supabase/test && npm i esbuild@0.24.0
//   npx esbuild ../functions/paystack-webhook/index.ts --bundle --format=esm --platform=neutral \\
//     --alias:npm:@supabase/supabase-js@2.45.4=./fake-supabase.mjs --outfile=webhook.bundle.mjs
//   node webhook.test.mjs
import crypto from 'crypto';
const env = { PAYSTACK_SECRET_KEY: 'sk_test_secret', PAYSTACK_PLAN_MONTHLY: 'PLN_month', PAYSTACK_PLAN_YEARLY: 'PLN_year', SUPABASE_URL: 'x', SUPABASE_SERVICE_ROLE_KEY: 'y' };
let handler;
globalThis.Deno = { env: { get: (k) => env[k] }, serve: (fn) => { handler = fn; } };
const { DB } = await import('./fake-supabase.mjs');
await import('./webhook.bundle.mjs');
const U = 'user-1';
DB.profiles[U] = { id: U, pro_until: null };
const sign = (b) => crypto.createHmac('sha512', env.PAYSTACK_SECRET_KEY).update(b).digest('hex');
async function send(evt, sig) {
  const body = JSON.stringify(evt);
  const res = await handler(new Request('https://x/fn', { method: 'POST', body, headers: { 'x-paystack-signature': sig ?? sign(body) } }));
  return res.status + ' ' + (await res.text());
}
const days = () => DB.profiles[U].pro_until ? Math.round((new Date(DB.profiles[U].pro_until) - Date.now()) / 864e5) : 0;
const ok = (label, cond, info) => console.log((cond ? 'PASS ' : 'FAIL ') + label + (info ? '  -> ' + info : ''));
const charge = (over = {}) => ({ event: 'charge.success', data: { status: 'success', currency: 'ZAR', amount: 4900, reference: 'ref1', customer: { customer_code: 'CUS_1' }, metadata: { user_id: U, plan: 'monthly' }, plan: { plan_code: 'PLN_month' }, ...over } });

let r = await send(charge(), 'forged-signature');
ok('Forged signature rejected, no Pro', r.startsWith('401') && days() === 0, r);
r = await send(charge({ amount: 100 }));
ok('Underpaid amount ignored', days() === 0, r);
r = await send(charge({ currency: 'USD' }));
ok('Wrong currency ignored', days() === 0, r);
r = await send(charge({ status: 'failed' }));
ok('Failed charge ignored', days() === 0, r);
r = await send(charge());
ok('Real R49 monthly payment gives ~31 days Pro', days() === 31, `${r}, ${days()} days`);
r = await send(charge());
ok('Same payment sent twice does not double', days() === 31, `${r}, ${days()} days`);
r = await send(charge({ reference: 'ref2', metadata: {} }));
ok('Renewal (no metadata) matched by customer code, extends to ~62', days() === 62, `${r}, ${days()} days`);
DB.profiles[U].pro_until = null;
r = await send(charge({ reference: 'ref3', amount: 39900, metadata: { user_id: U, plan: 'yearly' }, plan: { plan_code: 'PLN_year' } }));
ok('R399 yearly payment gives ~366 days', days() === 366, `${r}, ${days()} days`);
r = await send(charge({ reference: 'ref4', amount: 4900, metadata: { user_id: U, plan: 'yearly' } }));
ok('Paying monthly price but claiming yearly is ignored', days() === 366, `${r}, ${days()} days`);
r = await send({ event: 'subscription.disable', data: {} });
ok('Cancellation keeps paid-for time', days() === 366, r);
