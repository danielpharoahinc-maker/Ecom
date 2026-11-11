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
  // The library ships inside the app (vendor/), so sign-in never depends on a CDN.
  if (!window.supabase) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'vendor/supabase-2.45.4.js';
      s.onload = resolve;
      s.onerror = () => reject(new Error('Couldn’t load sign-in. Check your connection and try again.'));
      document.head.appendChild(s);
    });
  }
  client = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey);
  return client;
}

// The signed-in Supabase client (null in test mode), for other modules.
export const getClient = () => sb();

const PROVIDER = { apple: 'apple', google: 'google', microsoft: 'azure' };

// Returns a signed-in user after a live redirect comes back, or null.
export async function currentLiveUser() {
  const c = await sb();
  if (!c) return null;
  const { data } = await c.auth.getSession();
  const u = data.session?.user;
  return u ? toUser(u) : null;
}

// provider: 'apple' | 'google' | 'microsoft' | 'email'
// Returns { user } when signed in now, or { pending: true } when the person
// has been sent somewhere else (provider page or their email inbox).
export async function signIn(provider, email = '') {
  const c = await sb();
  if (c) {
    const redirectTo = location.origin + location.pathname;
    if (provider === 'email') {
      await sendEmailCode(email);
      return { pending: true, code: true };
    }
    const { error } = await c.auth.signInWithOAuth({ provider: PROVIDER[provider], options: { redirectTo } });
    if (error) throw error;
    return { pending: true };
  }
  // Local mode.
  return { user: { id: uid(), email, name: '', provider, local: true } };
}

// Email sign-in with a 6-digit code (works in every browser, unlike links,
// which on iPhone often open in a different browser than the one you're in).
// New emails get an account automatically.
const toUser = (u) => ({
  id: u.id,
  email: u.email || '',
  name: u.user_metadata?.full_name || u.user_metadata?.name || '',
  provider: u.app_metadata?.provider || 'email',
});

export async function sendEmailCode(email) {
  const c = await sb();
  if (!c) throw new Error('Sign-in server isn’t connected yet.');
  // Supabase's standard email has a sign-in button (link) that opens Proof;
  // a custom email template can also show a 6-digit code. Both work.
  const { error } = await c.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: location.origin + location.pathname },
  });
  if (error) throw new Error(friendly(error));
}

// Signed in from the email link, possibly in another tab: the session is
// shared through the browser's storage, so check for it.
export async function signedInElsewhere() {
  const c = await sb();
  if (!c) return null;
  const { data } = await c.auth.getSession();
  return data.session?.user ? toUser(data.session.user) : null;
}

export async function verifyEmailCode(email, code) {
  const c = await sb();
  if (!c) throw new Error('Sign-in server isn’t connected yet.');
  const { data, error } = await c.auth.verifyOtp({ email, token: code, type: 'email' });
  if (error || !data.user) throw new Error(error ? friendly(error) : 'That code didn’t work. Check it and try again.');
  return toUser(data.user);
}

function friendly(error) {
  const m = (error.message || '').toLowerCase();
  if (error.status === 429 || m.includes('rate') || m.includes('seconds')) return 'Too many tries. Wait a minute, then send a new code.';
  if (m.includes('expired') || m.includes('invalid') || m.includes('token')) return 'That code is wrong or has expired. Send a new one.';
  if (m.includes('email')) return 'Check the email address and try again.';
  return 'Couldn’t reach the sign-in server. Check your connection and try again.';
}

export async function signOutLive() {
  const c = await sb();
  if (c) await c.auth.signOut();
}
