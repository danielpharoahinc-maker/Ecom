// Sign-in. Four ways in: Apple, Google, Microsoft, email.
//
// Local mode (no server configured): signing in creates the account on this
// phone so the whole app can be used and tested today.
// Live mode: the same buttons go through Supabase Auth, which handles the
// Apple, Google and Microsoft (Azure) logins and email magic links.
import { CONFIG, LIVE } from './config.js';
import { uid } from './util.js';

let client = null;

async function sb() {
  if (!LIVE) return null;
  if (client) return client;
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
  client = createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);
  return client;
}

const PROVIDER = { apple: 'apple', google: 'google', microsoft: 'azure' };

// Returns a signed-in user after a live redirect comes back, or null.
export async function currentLiveUser() {
  const c = await sb();
  if (!c) return null;
  const { data } = await c.auth.getSession();
  const u = data.session?.user;
  if (!u) return null;
  return {
    id: u.id,
    email: u.email || '',
    name: u.user_metadata?.full_name || u.user_metadata?.name || '',
    provider: u.app_metadata?.provider || 'email',
  };
}

// provider: 'apple' | 'google' | 'microsoft' | 'email'
// Returns { user } when signed in now, or { pending: true } when the person
// has been sent somewhere else (provider page or their email inbox).
export async function signIn(provider, email = '') {
  const c = await sb();
  if (c) {
    const redirectTo = location.origin + location.pathname;
    if (provider === 'email') {
      const { error } = await c.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
      if (error) throw error;
      return { pending: true, message: `Check ${email} for your sign-in link.` };
    }
    const { error } = await c.auth.signInWithOAuth({ provider: PROVIDER[provider], options: { redirectTo } });
    if (error) throw error;
    return { pending: true };
  }
  // Local mode.
  return { user: { id: uid(), email, name: '', provider, local: true } };
}

export async function signOutLive() {
  const c = await sb();
  if (c) await c.auth.signOut();
}
