// Sync (live mode): your proof is saved to your account, so it follows you to
// any phone and your club can see it. Offline posts wait and go up later.
// Photos and voice notes go to a private bucket; the database decides who may
// look at them (you and your clubs, nobody else).
import { LIVE } from './config.js';
import { S, saveProfile } from './state.js';
import * as db from './db.js';
import { getClient } from './auth.js';
import { emit, uid, toast, feel } from './util.js';
import { pushProfile } from './billing.js';

const BUCKET = 'proof-media';
const EXT = { 'audio/webm': 'webm', 'audio/mp4': 'm4a', 'audio/mpeg': 'mp3', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const mime = (b) => (b.type || '').split(';')[0];
let busy = false;
let timer;

async function remember(p, patch) {
  Object.assign(p, patch);
  await db.put('proofs', p);
}

// Send every proof that isn't saved to the account yet, oldest first.
export async function syncProofs() {
  if (!LIVE || !S.user || !S.profile?.onboarded || busy) return;
  const c = await getClient().catch(() => null);
  if (!c) return;
  if (!(await ensureProfile()).ok) return; // proofs need your profile on the server first
  busy = true;
  try {
    const todo = S.proofs.filter((p) => !p.remoteId && p.cKey).sort((a, b) => a.ts - b.ts);
    for (const p of todo) {
      let photoPath = p.photoPath || null, audioPath = p.audioPath || null;
      if (p.photoId && !photoPath) {
        const blob = await db.get('media', p.photoId);
        if (blob) {
          photoPath = `${S.user.id}/${p.id}.${EXT[mime(blob)] || 'jpg'}`;
          const { error } = await c.storage.from(BUCKET).upload(photoPath, blob, { contentType: mime(blob) || 'image/jpeg', upsert: true });
          if (error) throw error;
        }
      }
      if (p.audioId && !audioPath) {
        const blob = await db.get('media', p.audioId);
        if (blob) {
          audioPath = `${S.user.id}/${p.id}.${EXT[mime(blob)] || 'webm'}`;
          const { error } = await c.storage.from(BUCKET).upload(audioPath, blob, { contentType: mime(blob) || 'audio/webm', upsert: true });
          if (error) throw error;
        }
      }
      const { data, error } = await c.from('proofs').upsert({
        user_id: S.user.id, client_id: p.id, c_key: p.cKey, kind: p.kind || (p.photoId ? 'photo' : 'voice'),
        note: p.note || null, photo_path: photoPath, audio_path: audioPath, audio_secs: p.audioSecs || null,
        created_at: new Date(p.ts).toISOString(), meta: p.meal ? { meal: p.meal } : null,
      }, { onConflict: 'user_id,client_id' }).select('id').single();
      if (error) throw error;
      await remember(p, { remoteId: data.id, photoPath, audioPath });
      if (p.meal && photoPath && !p.analysis) requestReview(c, p, data.id);
    }
  } catch { /* offline or not set up yet: try again later */ } finally { busy = false; }
}

// A new phone: bring your profile and proof back from the account.
export async function restoreProfile() {
  if (!LIVE || !S.user) return false;
  const c = await getClient().catch(() => null);
  if (!c) return false;
  const { data } = await c.from('profiles').select('name, goal, proof_time, commitments, goal_log, created_at').eq('id', S.user.id).maybeSingle();
  if (!data?.name || !data.commitments?.length) return false;
  const created = Date.parse(data.created_at);
  await saveProfile({
    name: data.name, goal: data.goal, proofTime: data.proof_time, commitments: data.commitments,
    goalLog: data.goal_log?.length ? data.goal_log : [{ ts: created, keys: data.commitments }],
    createdAt: created, onboarded: true, tourDone: true, firstProofDone: true,
  });
  try { localStorage.removeItem('proof:ob'); } catch { /* ignore */ }
  return true;
}

export async function pullMine() {
  if (!LIVE || !S.user || !S.profile?.onboarded) return;
  const c = await getClient().catch(() => null);
  if (!c) return;
  try {
    const have = new Set(S.proofs.flatMap((p) => [p.id, p.remoteId]));
    const { data } = await c.from('proofs')
      .select('id, client_id, c_key, kind, note, photo_path, audio_path, audio_secs, created_at')
      .eq('user_id', S.user.id).order('created_at', { ascending: false }).limit(120);
    const fresh = (data || []).filter((r) => !have.has(r.id) && !have.has(r.client_id)).slice(0, 40);
    for (const r of fresh) {
      const p = { id: r.client_id || r.id, ts: Date.parse(r.created_at), cKey: r.c_key, kind: r.kind, note: r.note || '', audioSecs: r.audio_secs || 0, remoteId: r.id, photoPath: r.photo_path, audioPath: r.audio_path };
      for (const [path, key] of [[r.photo_path, 'photoId'], [r.audio_path, 'audioId']]) {
        if (!path) continue;
        const { data: blob } = await c.storage.from(BUCKET).download(path);
        if (blob) { p[key] = uid(); await db.put('media', blob, p[key]); }
      }
      await db.put('proofs', p);
      S.proofs.push(p);
    }
    if (fresh.length) { S.proofs.sort((a, b) => b.ts - a.ts); emit('proof:changed'); }
  } catch { /* try again next time */ }
}

async function removeRemote(d) {
  const c = await getClient().catch(() => null);
  if (!c || !S.user) return;
  try {
    const paths = [d.photoPath, d.audioPath].filter(Boolean);
    if (paths.length) await c.storage.from(BUCKET).remove(paths);
    if (d.remoteId) await c.from('proofs').delete().eq('id', d.remoteId);
    else await c.from('proofs').delete().eq('user_id', S.user.id).eq('client_id', d.id);
  } catch { /* the proof is gone on this phone either way */ }
}

// Make sure you exist on the server. Club boards are built from profiles, so without
// one you are invisible to your friends. Retried every time it matters.
let profileOk = false;
export async function ensureProfile() {
  if (!LIVE) return { ok: true };
  if (!S.user || !S.profile?.onboarded) return { ok: false, reason: 'profile', message: 'Finish setup first.' };
  const c = await getClient().catch(() => null);
  if (!c) return { ok: false, reason: 'offline', message: 'Couldn’t reach Proof’s server.' };
  const { data: sess } = await c.auth.getSession();
  if (!sess.session) return { ok: false, reason: 'session', message: 'You’re signed out. Sign in again to use clubs.' };
  if (profileOk) return { ok: true };
  const { data: have, error: e1 } = await c.from('profiles').select('id').eq('id', sess.session.user.id).maybeSingle();
  if (e1) return { ok: false, reason: 'offline', message: 'Couldn’t reach Proof’s server.' };
  if (!have) {
    const err = await pushProfile(S.profile, true);
    if (err) return { ok: false, reason: 'profile', message: `Couldn’t save your profile: ${err}` };
  }
  profileOk = true;
  return { ok: true };
}

// Meals get reviewed by Claude straight after they save, if the server has a Claude key.
// If it doesn't (or the call fails) the app quietly stops trying for half a day.
const OFF = 'proof:review-off';
export const reviewOff = () => { try { return Date.now() - Number(localStorage.getItem(OFF) || 0) < 12 * 3600e3; } catch { return false; } };
async function requestReview(c, p, remoteId) {
  if (reviewOff()) return;
  try {
    const { data } = await c.functions.invoke('analyze-meal', { body: { proof_id: remoteId } });
    if (data?.status === 'ok' && data.analysis) { await remember(p, { analysis: data.analysis }); emit('proof:changed'); toast('Claude reviewed your meal'); feel('good'); }
    else if (data?.status === 'not_configured' || data?.status === 'model_error') { try { localStorage.setItem(OFF, String(Date.now())); } catch { /* ignore */ } }
  } catch { /* the Connect Claude route still works */ }
}

// Claude's reviews of your meals (written through the Proof API) come back here.
export async function pullAnalyses() {
  if (!LIVE || !S.user || !S.profile?.onboarded) return;
  const c = await getClient().catch(() => null);
  if (!c) return;
  const since = new Date(Date.now() - 21 * 864e5).toISOString();
  const { data } = await c.from('proofs').select('id, analysis').eq('user_id', S.user.id).not('analysis', 'is', null).gte('created_at', since);
  let fresh = 0;
  for (const r of data || []) {
    const p = S.proofs.find((x) => x.remoteId === r.id);
    if (p && p.analysis?.at !== r.analysis.at) { await remember(p, { analysis: r.analysis }); fresh++; }
  }
  if (fresh) { emit('proof:changed'); toast(fresh === 1 ? 'Claude reviewed your meal' : `Claude reviewed ${fresh} meals`); feel('good'); }
}

export function startSync() {
  if (!LIVE) return;
  const soon = () => { clearTimeout(timer); timer = setTimeout(syncProofs, 900); };
  window.addEventListener('proof:changed', soon);
  window.addEventListener('online', soon);
  window.addEventListener('proof:deleted', (e) => removeRemote(e.detail));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) soon(); });
  ensureProfile().then(() => { syncProofs(); pullMine(); pullAnalyses(); });
  setInterval(() => { if (!document.hidden && S.profile?.apiConnected) pullAnalyses(); }, 45000);
  window.addEventListener('online', () => ensureProfile().then(() => syncProofs()));
  window.addEventListener('proof:profile', () => { profileOk = false; ensureProfile(); });
}
