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

// Free plan: how many posts (proofs and moments) before Proof Pro is needed.
// 21 is about one full week of three commitments a day.
export const FREE_POSTS = 21;

export const PRICES = { monthly: 'R49', yearly: 'R399', yearlySaving: '32%' };

export const LIVE = Boolean(CONFIG.supabaseUrl && CONFIG.supabaseAnonKey);
