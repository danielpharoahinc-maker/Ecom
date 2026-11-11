// Reminders: Proff asks first, the phone's own permission prompt only shows
// when the person taps "Turn on reminders". The server (supabase/functions/push)
// sends them at the right times, even when Proof is closed.
import { S, saveProfile, getPlan } from './state.js';
import { getClient } from './auth.js';
import { openSheet } from './sheet.js';
import { proffSVG } from './proff.js';
import { installBody, bindInstall, isInstalled } from './install.js';
import { ic } from './icons.js';
import { esc, toast, haptic, dayKey } from './util.js';
import { LIVE } from './config.js';

const TIME_FOR = { morning: '07:30', midday: '12:30', evening: '18:30', night: '21:00' };
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
export const supported = () => 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
const tz = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Johannesburg'; } catch { return 'Africa/Johannesburg'; } };
const defaultTimes = () => [...new Set([].concat(S.profile?.proofTime || 'evening').map((v) => TIME_FOR[v]).filter(Boolean))].sort();
export const remindersOn = () => Boolean(S.profile?.reminders?.on) && supported() && Notification.permission === 'granted';

// Turn a base64url key into the bytes the browser wants.
function keyBytes(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function serverRow(extra = {}) {
  const proven = new Set(S.proofs.filter((p) => p.cKey !== 'moment' && dayKey(p.ts) === dayKey()).map((p) => p.cKey));
  const plan = (await getPlan()).filter((i) => i.at !== null && i.at !== undefined && !i.done)
    .map((i) => ({ at: `${String(Math.floor(i.at / 60)).padStart(2, '0')}:${String(i.at % 60).padStart(2, '0')}`, text: i.text.slice(0, 60) }));
  const r = S.profile.reminders || {};
  return {
    user_id: S.user.id, tz: tz(), times: r.times || defaultTimes(), streak_saver: r.streakSaver !== false,
    plan_items: r.plan === false ? [] : plan, plan_day: dayKey(), last_posted_on: proven.size ? dayKey() : null,
    updated_at: new Date().toISOString(), ...extra,
  };
}

async function subscribe() {
  const c = await getClient().catch(() => null);
  if (!c) throw new Error('Reminders need Proof’s server. Open Proof from your home screen and try again.');
  const { data, error } = await c.functions.invoke('push', { body: { action: 'key' } });
  if (error || !data?.publicKey) throw new Error('Couldn’t reach the reminder server. Try again in a minute.');
  const reg = await navigator.serviceWorker.ready;
  let sub;
  try {
    sub = (await reg.pushManager.getSubscription())
      || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(data.publicKey) });
  } catch {
    throw new Error('This phone couldn’t set up notifications. Open Proof from your home screen in Safari or Chrome and try again.');
  }
  const { error: e2 } = await c.from('reminders').upsert(await serverRow({ subscription: sub.toJSON() }));
  if (e2) throw new Error('Couldn’t save your reminders. Try again.');
}

// Keep the server's copy current: today's timed plan and whether you've posted.
let syncTimer;
export function syncSoon() {
  if (!remindersOn() || !LIVE) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    const c = await getClient().catch(() => null);
    if (c) await c.from('reminders').upsert(await serverRow()).catch(() => {});
  }, 1500);
}
window.addEventListener('proof:changed', syncSoon);

async function turnOn(btn) {
  btn.disabled = true; btn.textContent = 'Waiting for your answer…';
  // Must run straight from the tap: phones only allow the prompt then.
  const answer = await Notification.requestPermission();
  if (answer !== 'granted') {
    btn.disabled = false; btn.textContent = 'Turn on reminders';
    toast(answer === 'denied' ? 'Notifications are blocked. You can allow them in your phone’s Settings.' : 'No problem. Turn them on any time in Account.');
    return false;
  }
  btn.textContent = 'Setting up…';
  try {
    await subscribe();
    await saveProfile({ ...S.profile, reminders: { on: true, times: defaultTimes(), streakSaver: true, plan: true, ...(S.profile.reminders || {}), on: true } });
    haptic(20); toast('Reminders are on');
    return true;
  } catch (e) {
    btn.disabled = false; btn.textContent = 'Try again';
    toast(e.message);
    return false;
  }
}

// Proff asks. Called once after the tour, and from Account any time.
export function askReminders({ onDone } = {}) {
  const finish = () => { if (!S.profile.remindersAsked) saveProfile({ ...S.profile, remindersAsked: true }); onDone?.(); };
  if (!supported() && !isIOS) { finish(); return; }

  if (isIOS && !isInstalled()) {
    openSheet(`
      <div class="ask-head">${proffSVG('talk', 70)}<div><b class="h2">Want reminders?</b><p>iPhones only allow reminders for apps on your home screen. Add Proof there first, then I can nudge you.</p></div></div>
      <div class="rem-install">${installBody()}</div>`, {
      tall: true,
      onMount(body, close) {
        bindInstall(body, close);
        body.closest('.sheet-wrap').addEventListener('sheet:close', finish, { once: true });
      },
    });
    return;
  }

  const times = defaultTimes();
  openSheet(`
    <div class="ask-head">${proffSVG('talk', 70)}<div><b class="h2">Want me to remind you?</b><p>A nudge at the right moment is how streaks survive. I’ll only ping you when it matters.</p></div></div>
    <ul class="rem-list">
      <li>${ic('camera', 20)}<span><b>Proof time</b><small>${times.join(' and ')}, only if you haven’t posted yet</small></span></li>
      <li>${ic('flame', 20)}<span><b>Streak saver</b><small>8 pm, only if your streak is at risk</small></span></li>
      <li>${ic('list', 20)}<span><b>Your plan</b><small>10 minutes before anything with a time, like “Gym at 6:30”</small></span></li>
    </ul>
    <p class="fine">Nothing between 10 pm and 6 am except the streak saver. Change or switch off any time in Account.</p>
    <div class="stack">
      <button class="btn btn-primary" data-on>Turn on reminders</button>
      <button class="btn btn-quiet" data-close>Not now</button>
    </div>`, {
    onMount(body, close) {
      body.closest('.sheet-wrap').addEventListener('sheet:close', finish, { once: true });
      body.querySelector('[data-on]').addEventListener('click', async (e) => { if (await turnOn(e.currentTarget)) close(); });
    },
  });
}

// Account > Reminders: change times, switch parts on or off, send a test.
export function reminderSettings() {
  if (!remindersOn()) return askReminders();
  const r = { times: defaultTimes(), streakSaver: true, plan: true, ...S.profile.reminders };
  openSheet(`
    <h2 class="h2">Reminders</h2>
    <div class="rem-set">
      <span class="lab">Proof time</span>
      <div class="rem-times">${r.times.map((t, i) => `<label class="sr" for="rt${i}">Reminder ${i + 1}</label><input id="rt${i}" type="time" value="${esc(t)}" data-time>`).join('')}
        ${r.times.length < 3 ? '<button class="btn-pill" data-add-time>+ Add time</button>' : ''}</div>
      <label class="rem-toggle"><span><b>Streak saver</b><small>8 pm if nothing’s posted</small></span><input type="checkbox" data-streak ${r.streakSaver ? 'checked' : ''}></label>
      <label class="rem-toggle"><span><b>Plan reminders</b><small>10 minutes before timed plan items</small></span><input type="checkbox" data-plan ${r.plan ? 'checked' : ''}></label>
    </div>
    <div class="stack">
      <button class="btn btn-primary" data-save>Save</button>
      <button class="btn btn-secondary" data-test>Send me a test</button>
      <button class="btn btn-quiet danger" data-off>Turn off reminders</button>
    </div>`, {
    onMount(body, close) {
      body.querySelector('[data-add-time]')?.addEventListener('click', (e) => {
        const inp = document.createElement('input'); inp.type = 'time'; inp.value = '12:30'; inp.dataset.time = '';
        e.currentTarget.before(inp); if (body.querySelectorAll('[data-time]').length >= 3) e.currentTarget.remove();
      });
      body.querySelector('[data-save]').addEventListener('click', async () => {
        const times = [...new Set([...body.querySelectorAll('[data-time]')].map((i) => i.value).filter(Boolean))].sort();
        await saveProfile({ ...S.profile, reminders: { ...r, on: true, times, streakSaver: body.querySelector('[data-streak]').checked, plan: body.querySelector('[data-plan]').checked } });
        const c = await getClient().catch(() => null);
        if (c) await c.from('reminders').upsert(await serverRow());
        close(); toast('Reminders saved');
      });
      body.querySelector('[data-test]').addEventListener('click', async (e) => {
        const c = await getClient().catch(() => null);
        if (!c) return toast('Reminders need Proof’s server.');
        e.currentTarget.disabled = true;
        const { data } = await c.functions.invoke('push', { body: { action: 'test' } });
        e.currentTarget.disabled = false;
        toast(data?.result === 'ok' ? 'Sent. Check your notifications.' : (data?.error || 'Couldn’t send. Try turning reminders off and on.'));
      });
      body.querySelector('[data-off]').addEventListener('click', async () => {
        const reg = await navigator.serviceWorker.ready.catch(() => null);
        await (await reg?.pushManager.getSubscription())?.unsubscribe().catch(() => {});
        const c = await getClient().catch(() => null);
        if (c) await c.from('reminders').upsert({ user_id: S.user.id, subscription: null, updated_at: new Date().toISOString() });
        await saveProfile({ ...S.profile, reminders: { ...r, on: false } });
        close(); toast('Reminders off');
      });
    },
  });
}

