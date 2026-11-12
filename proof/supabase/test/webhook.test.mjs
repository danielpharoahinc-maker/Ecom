// Payment webhook test: bundles the REAL webhook with a fake database and a fake
// Paystack, then sends genuine, forged, repeated and failing messages. All must PASS.
//   cd proof/supabase/test && npm i esbuild@0.24.0
//   npx esbuild ../functions/paystack-webhook/index.ts --bundle --format=esm --platform=neutral \
//     --alias:npm:@supabase/supabase-js@2.45.4=./fake-supabase.mjs --outfile=webhook.bundle.mjs
//   node webhook.test.mjs
import crypto from 'crypto';
const env = { PAYSTACK_SECRET_KEY: 'sk_test_secret', PAYSTACK_PLAN_MONTHLY: 'PLN_month', PAYSTACK_PLAN_YEARLY: 'PLN_year', SUPABASE_URL: 'x', SUPABASE_SERVICE_ROLE_KEY: 'y' };
let handler;
globalThis.Deno = { env: { get: (k) => env[k] }, serve: (fn) => { handler = fn; } };
const { DB } = await import('./fake-supabase.mjs');

// Fake Paystack
const calls = [];
let refundOk = true, subOk = true;
globalThis.fetch = async (url, init = {}) => {
  const path = new URL(url).pathname; const body = init.body ? JSON.parse(init.body) : null;
  calls.push({ path, method: init.method, body });
  if (path === '/refund') return new Response(JSON.stringify({ status: refundOk }), { status: refundOk ? 200 : 500 });
  if (path === '/subscription') return new Response(JSON.stringify({ status: subOk, data: { subscription_code: 'SUB_test1' } }), { status: subOk ? 200 : 500 });
  return new Response('{}', { status: 404 });
};
await import('./webhook.bundle.mjs');

const U = 'user-1';
const reset = () => { DB.profiles = {}; DB.billing = {}; calls.length = 0; refundOk = true; subOk = true; DB.profiles[U] = { id: U, pro_until: null }; };
const sign = (b) => crypto.createHmac('sha512', env.PAYSTACK_SECRET_KEY).update(b).digest('hex');
async function send(evt, sig) {
  const body = JSON.stringify(evt);
  const res = await handler(new Request('https://x/fn', { method: 'POST', body, headers: { 'x-paystack-signature': sig ?? sign(body) } }));
  return res.status + ' ' + (await res.text());
}
const daysAhead = () => (DB.profiles[U].pro_until ? Math.round((new Date(DB.profiles[U].pro_until) - Date.now()) / 864e5) : 0);
const n = (path) => calls.filter((c) => c.path === path).length;
let fails = 0;
const ok = (label, cond, info = '') => { if (!cond) fails++; console.log(`${cond ? 'PASS' : 'FAIL'} ${label}${info ? '  -> ' + info : ''}`); };
const trial = (over = {}) => ({ event: 'charge.success', data: { status: 'success', currency: 'ZAR', amount: 100, reference: 'tr1', customer: { customer_code: 'CUS_1' }, authorization: { authorization_code: 'AUTH_1', reusable: true, signature: 'SIG_card1' }, metadata: { user_id: U, plan: 'monthly', trial: true }, ...over } });
const charge = (over = {}) => ({ event: 'charge.success', data: { status: 'success', currency: 'ZAR', amount: 4900, reference: 'pay1', customer: { customer_code: 'CUS_1' }, metadata: {}, plan: { plan_code: 'PLN_month' }, ...over } });

reset();
let r = await send(trial(), 'forged');
ok('Forged signature: rejected, nothing happens', r.startsWith('401') && daysAhead() === 0 && calls.length === 0, r);
r = await send(trial({ amount: 500 }));
ok('Wrong card-check amount (R5): ignored', r.endsWith('ignored') && daysAhead() === 0 && calls.length === 0, r);
r = await send(trial({ currency: 'USD' }));
ok('Wrong currency: ignored', r.endsWith('ignored') && daysAhead() === 0, r);

reset();
r = await send(trial());
ok('Card check: 31 days of access (30 + 1 grace)', r === '200 ok' && daysAhead() === 31, `${r}, ${daysAhead()} days`);
const sub = calls.find((c) => c.path === '/subscription');
const startDays = Math.round((new Date(sub?.body?.start_date) - Date.now()) / 864e5);
ok('First real charge scheduled for day 30, right plan and card', sub?.body?.plan === 'PLN_month' && sub?.body?.authorization === 'AUTH_1' && startDays === 30, `plan ${sub?.body?.plan}, start in ${startDays} days`);
ok('The R1 is refunded', n('/refund') === 1 && calls.find((c) => c.path === '/refund').body.transaction === 'tr1');
ok('Billing says trial with a charge date', DB.billing[U].status === 'trial' && DB.billing[U].sub_code === 'SUB_test1' && DB.billing[U].refunded === true);
r = await send(trial());
ok('Same message delivered again: no second subscription, no second refund', n('/subscription') === 1 && n('/refund') === 1 && daysAhead() === 31, `subs ${n('/subscription')}, refunds ${n('/refund')}`);

reset(); refundOk = false;
r = await send(trial());
ok('Refund fails: tell Paystack to retry (500), access already granted', r.startsWith('500') && daysAhead() === 31 && n('/subscription') === 1, r);
refundOk = true;
r = await send(trial());
ok('Retry finishes the job without a second subscription', r === '200 ok' && n('/subscription') === 1 && DB.billing[U].refunded === true, `subs ${n('/subscription')}`);

reset(); delete DB.profiles[U];
r = await send(trial());
ok('Profile not saved yet: 500 so Paystack retries, nothing scheduled', r.startsWith('500') && n('/subscription') === 0 && n('/refund') === 0, r);
DB.profiles[U] = { id: U, pro_until: null };
r = await send(trial());
ok('Retry once the profile exists: everything completes', r === '200 ok' && daysAhead() === 31 && n('/subscription') === 1 && n('/refund') === 1);

reset(); await send(trial()); calls.length = 0; const before = DB.profiles[U].pro_until;
r = await send(trial({ reference: 'tr2' }));
ok('A second free trial for the same person: refunded, no extra time', n('/refund') === 1 && n('/subscription') === 0 && DB.profiles[U].pro_until === before, r);

reset(); await send(trial()); calls.length = 0;
DB.profiles['user-2'] = { id: 'user-2', pro_until: null };
r = await send(trial({ reference: 'tr9', customer: { customer_code: 'CUS_2' }, metadata: { user_id: 'user-2', plan: 'monthly', trial: true } }));
ok('Same card on a second account: refunded, no free month', r.endsWith('refunded') && n('/refund') === 1 && n('/subscription') === 0 && !DB.profiles['user-2'].pro_until, r);
r = await send(trial({ reference: 'tr10', customer: { customer_code: 'CUS_3' }, authorization: { authorization_code: 'AUTH_9', reusable: true, signature: 'SIG_other' }, metadata: { user_id: 'user-2', plan: 'monthly', trial: true } }));
ok('A different card on that account: gets its trial', r === '200 ok' && !!DB.profiles['user-2'].pro_until, r);

reset(); r = await send(trial({ authorization: { authorization_code: 'AUTH_x', reusable: false } }));
ok('Card that cannot be charged again: refunded, no access', n('/refund') === 1 && daysAhead() === 0, r);

reset(); await send(trial());
r = await send(charge());
ok('Day 30: the plan is charged, access extends by 31 days', r === '200 ok' && daysAhead() === 62, `${r}, ${daysAhead()} days`);
ok('...status becomes active, no charge date left', DB.billing[U].status === 'active' && DB.billing[U].charge_on === null);
r = await send(charge());
ok('The same charge twice does not extend twice', daysAhead() === 62, r);
r = await send(charge({ reference: 'pay2', amount: 100 }));
ok('A charge below the plan price is ignored', daysAhead() === 62, r);

reset(); await send(trial()); const keep = DB.profiles[U].pro_until;
r = await send({ event: 'subscription.not_renew', data: { subscription_code: 'SUB_test1' } });
ok('Cancelled before day 30: status cancelled, access kept until the paid time ends', DB.billing[U].status === 'cancelled' && DB.profiles[U].pro_until === keep, DB.billing[U].status);

reset();
r = await send(charge({ metadata: { user_id: U, plan: 'yearly' }, amount: 39900, plan: { plan_code: 'PLN_year' }, reference: 'y1' }));
ok('Paying after the trial (yearly R399): 366 days', daysAhead() === 366, `${daysAhead()} days`);
r = await send(charge({ metadata: { user_id: U, plan: 'yearly' }, amount: 4900, reference: 'y2' }));
ok('Paying the monthly price but claiming yearly is ignored', daysAhead() === 366, `${daysAhead()} days`);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
