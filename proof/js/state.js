// App state held in memory, loaded from the local database at start-up.
import * as db from './db.js';
import { uid, emit, dayKey } from './util.js';

export const S = {
  user: null,     // { id, name, email, provider }
  profile: null,  // answers from onboarding + commitments
  proofs: [],     // newest first
  clubs: [],
  tab: 'today',
};

export async function load() {
  S.user = (await db.get('kv', 'user')) || null;
  S.profile = (await db.get('kv', 'profile')) || null;
  S.proofs = (await db.all('proofs')).sort((a, b) => b.ts - a.ts);
  S.clubs = (await db.all('clubs')).sort((a, b) => b.createdAt - a.createdAt);
}

export async function setUser(user) {
  S.user = user;
  await db.put('kv', user, 'user');
}

export async function saveProfile(profile) {
  S.profile = profile;
  await db.put('kv', profile, 'profile');
}

// Today's spoken plan. One list per day; a new day starts empty.
export async function getPlan(day = dayKey()) {
  return (await db.get('kv', `plan:${day}`)) || [];
}
export async function savePlan(items, day = dayKey()) {
  await db.put('kv', items, `plan:${day}`);
}

// Saves a proof plus its photo and voice files.
export async function addProof(proof, photo, audio) {
  const p = { id: uid(), ts: Date.now(), ...proof };
  if (photo) { p.photoId = uid(); await db.put('media', photo, p.photoId); }
  if (audio) { p.audioId = uid(); await db.put('media', audio, p.audioId); }
  await db.put('proofs', p);
  S.proofs.unshift(p);
  // Proof ticks off any plan item linked to the same commitment.
  const plan = await getPlan();
  if (plan.some((it) => it.cKey === p.cKey && !it.done)) {
    await savePlan(plan.map((it) => (it.cKey === p.cKey ? { ...it, done: true } : it)));
  }
  emit('proof:changed');
  return p;
}

export async function deleteProof(id) {
  const p = S.proofs.find((x) => x.id === id);
  if (!p) return;
  if (p.photoId) await db.del('media', p.photoId);
  if (p.audioId) await db.del('media', p.audioId);
  await db.del('proofs', id);
  S.proofs = S.proofs.filter((x) => x.id !== id);
  emit('proof:changed');
}

export async function saveClub(club) {
  await db.put('clubs', club);
  S.clubs = [club, ...S.clubs.filter((c) => c.id !== club.id)];
  emit('proof:changed');
}

export async function leaveClub(id) {
  await db.del('clubs', id);
  S.clubs = S.clubs.filter((c) => c.id !== id);
  emit('proof:changed');
}

// Object URLs for stored photos/voice notes, created once and reused.
const urls = new Map();
export async function mediaURL(id) {
  if (!id) return null;
  if (urls.has(id)) return urls.get(id);
  const blob = await db.get('media', id);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urls.set(id, url);
  return url;
}

// Fills every <img data-media="id"> / <audio data-media="id"> inside `root`.
export async function hydrateMedia(root) {
  for (const el of root.querySelectorAll('[data-media]')) {
    const url = await mediaURL(el.dataset.media);
    if (url) el.src = url;
  }
}

export async function signOut() {
  await db.del('kv', 'user');
  S.user = null;
}

export async function resetEverything() {
  for (const store of ['kv', 'proofs', 'media', 'clubs']) await db.clear(store);
  S.user = null; S.profile = null; S.proofs = []; S.clubs = [];
}
