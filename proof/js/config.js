// Server settings. Leave these empty and Proof runs fully on the phone
// ("local mode"): sign-in buttons work, everything is saved on the device.
//
// To switch on real accounts and live clubs, create a free Supabase project,
// follow docs/BACKEND.md, then paste the two values below. The anon key is
// designed to be public; never paste the service_role key here.
export const CONFIG = {
  supabaseUrl: '',
  supabaseAnonKey: '',
};

export const LIVE = Boolean(CONFIG.supabaseUrl && CONFIG.supabaseAnonKey);
