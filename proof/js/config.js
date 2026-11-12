// Server settings. Leave these empty and Proof runs fully on the phone
// ("local mode"): sign-in buttons work, everything is saved on the device.
//
// To switch on real accounts and live clubs, create a free Supabase project,
// follow docs/BACKEND.md, then paste the two values below. The anon key is
// designed to be public; never paste the service_role key here.
export const CONFIG = {
  supabaseUrl: 'https://kfnetfsyvhyysjjhpwue.supabase.co',
  supabaseAnonKey: 'sb_publishable_Gjr7TQ0n71KiE3lf2RbJsQ_abvNlJ2v',
};

// Free trial: everyone gets this many days free.
export const TRIAL_DAYS = 30;

// Payments. Keep PAYMENTS_LIVE false until Paystack and the server functions are
// set up (docs/BACKEND.md section 2c); until then nobody is asked for a card and
// everyone simply gets the 30 free days.
export const PAYMENTS_LIVE = false;
// With payments live: true = a card is needed before the free 30 days start and
// is charged on day 30 unless cancelled; false = 30 days free, then pay.
export const REQUIRE_CARD = true;

export const PRICES = { monthly: 'R49', yearly: 'R399', yearlySaving: '32%' };

// Which sign-in buttons to show once the server is on. Add 'google',
// 'apple' or 'microsoft' here only after setting that provider up in
// Supabase > Authentication > Providers (docs/BACKEND.md).
export const SIGN_IN = ['email'];

export const LIVE = Boolean(CONFIG.supabaseUrl && CONFIG.supabaseAnonKey);
