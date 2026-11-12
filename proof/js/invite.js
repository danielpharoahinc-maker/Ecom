// An invite link looks like ...?join=ABC123. The code is remembered on this device
// (not just this tab) for two weeks, so it survives sign-up, the email link, and
// onboarding, and the person is added to the club once they are in.
const KEY = 'proof:join';
const clean = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);

export function rememberInvite(code) {
  const c = clean(code);
  if (c.length !== 6) return '';
  try { localStorage.setItem(KEY, JSON.stringify({ code: c, ts: Date.now() })); } catch { /* private mode */ }
  return c;
}
export function pendingInvite() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (v && Date.now() - v.ts < 14 * 864e5) return clean(v.code);
  } catch { /* ignore */ }
  return '';
}
export function clearInvite() { try { localStorage.removeItem(KEY); } catch { /* ignore */ } }
