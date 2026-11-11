// The + button. Designed for the fewest taps:
//   + -> camera opens with your next unfinished commitment already chosen
//   shutter -> photo, with a big mic right under it ("say what you did")
//   Post.
// Voice mode skips the photo for times a picture doesn't fit (prayer, a call).
import { S, addProof } from './state.js';
import { commitment } from './data.js';
import { doneToday, streak } from './stats.js';
import { ic } from './icons.js';
import { esc, haptic, toast, fmtDur, emit } from './util.js';

const MINS = [15, 30, 60, 120];
const MAX_TALK = 60; // seconds

let root, stream, facing = 'environment', mode, cKey;
let photo, audio, audioSecs, transcript, mins;
let rec, recStream, recog, meterRAF, talkTimer, audioCtx;

export function openCapture(opts = {}) {
  if (document.querySelector('.cap')) return;
  const done = doneToday(S.proofs);
  cKey = opts.cKey || S.profile.commitments.find((k) => !done.has(k)) || S.profile.commitments[0];
  mode = opts.mode || 'photo';
  photo = null; audio = null; audioSecs = 0; transcript = '';
  mins = defaultMins();

  root = document.createElement('div');
  root.className = 'cap';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-label', 'Post proof');
  document.body.appendChild(root);
  document.body.classList.add('noscroll');
  requestAnimationFrame(() => root.classList.add('open'));
  haptic(12);
  mode === 'photo' ? camera() : review();
}

function defaultMins() {
  const per = (S.profile.lockin || 60) / S.profile.commitments.length;
  return MINS.reduce((a, b) => (Math.abs(b - per) < Math.abs(a - per) ? b : a));
}

function close() {
  stopCamera();
  stopTalk(true);
  root?.classList.remove('open');
  const r = root;
  root = null;
  setTimeout(() => {
    r?.remove();
    if (!document.querySelector('.sheet-wrap')) document.body.classList.remove('noscroll');
  }, 250);
}

function chips() {
  const done = doneToday(S.proofs);
  return `<div class="cap-chips" role="tablist" aria-label="Commitment">${S.profile.commitments.map((k) => {
    const c = commitment(k);
    return `<button class="cchip ${k === cKey ? 'on' : ''}" data-k="${k}" role="tab" aria-selected="${k === cKey}">
      ${done.has(k) ? ic('check', 14, 2.4) : ic(c.icon, 16)}<span>${c.label}</span></button>`;
  }).join('')}</div>`;
}

function bindChips() {
  root.querySelectorAll('.cchip').forEach((b) => b.addEventListener('click', () => {
    haptic();
    cKey = b.dataset.k;
    root.querySelectorAll('.cchip').forEach((x) => {
      x.classList.toggle('on', x === b);
      x.setAttribute('aria-selected', x === b);
    });
    const t = root.querySelector('[data-ctitle]');
    if (t) t.textContent = commitment(cKey).label;
  }));
}

/* ---------- Camera ---------- */

async function camera() {
  root.innerHTML = `
  <div class="cam">
    <video playsinline autoplay muted></video>
    <div class="cam-shade top"></div><div class="cam-shade bottom"></div>
    <header class="cam-top">
      <button class="icon-btn glass" data-close aria-label="Close">${ic('close', 22)}</button>
      <button class="icon-btn glass" data-flip aria-label="Switch camera">${ic('flip', 22)}</button>
    </header>
    ${chips()}
    <p class="cam-hint" hidden>Camera is blocked. Tap the shutter to choose a photo instead.</p>
    <footer class="cam-bottom">
      <div class="modes" role="tablist">
        <button class="on" role="tab" aria-selected="true">Photo</button>
        <button data-voice role="tab" aria-selected="false">Voice</button>
      </div>
      <div class="shutter-row">
        <button class="icon-btn glass" data-pick aria-label="Choose from library">${ic('image', 22)}</button>
        <button class="shutter" data-shoot aria-label="Take photo"><i></i></button>
        <span class="icon-btn" aria-hidden="true"></span>
      </div>
    </footer>
    <input type="file" accept="image/*" capture="environment" hidden>
  </div>`;
  bindChips();
  const video = root.querySelector('video');
  const file = root.querySelector('input[type=file]');

  root.querySelector('[data-close]').addEventListener('click', close);
  root.querySelector('[data-voice]').addEventListener('click', () => { stopCamera(); mode = 'voice'; review(); });
  root.querySelector('[data-pick]').addEventListener('click', () => { file.removeAttribute('capture'); file.click(); });
  root.querySelector('[data-flip]').addEventListener('click', async () => {
    facing = facing === 'environment' ? 'user' : 'environment';
    await startStream(video);
  });
  root.querySelector('[data-shoot]').addEventListener('click', () => {
    if (!stream) { file.setAttribute('capture', 'environment'); return file.click(); }
    snap(video);
  });
  file.addEventListener('change', async () => {
    const f = file.files?.[0];
    if (!f) return;
    photo = await shrink(f);
    stopCamera();
    review();
  });
  await startStream(video);
}

async function startStream(video) {
  stopCamera();
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false,
    });
    if (!root) return stopCamera();
    video.srcObject = stream;
    video.classList.toggle('mirror', facing === 'user');
  } catch {
    stream = null;
    root?.querySelector('.cam-hint')?.removeAttribute('hidden');
  }
}

function stopCamera() {
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
}

function snap(video) {
  haptic(15);
  const max = 1440;
  const w = video.videoWidth, h = video.videoHeight;
  if (!w) return toast('Camera is still starting. Try again.');
  const s = Math.min(1, max / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.round(w * s); c.height = Math.round(h * s);
  const ctx = c.getContext('2d');
  if (facing === 'user') { ctx.translate(c.width, 0); ctx.scale(-1, 1); }
  ctx.drawImage(video, 0, 0, c.width, c.height);
  root.querySelector('.cam')?.classList.add('flash');
  c.toBlob((b) => { photo = b; stopCamera(); setTimeout(review, 120); }, 'image/jpeg', 0.85);
}

// Library photos can be huge; resize to keep the phone's storage light.
async function shrink(file) {
  try {
    const bmp = await createImageBitmap(file);
    const s = Math.min(1, 1440 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * s); c.height = Math.round(bmp.height * s);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.85));
  } catch { return file; }
}

/* ---------- Review: photo + talk + post ---------- */

function review() {
  const c = commitment(cKey);
  const photoURL = photo ? URL.createObjectURL(photo) : null;
  root.innerHTML = `
  <div class="rev ${mode}">
    <header class="rev-top">
      <button class="icon-btn" data-retake aria-label="${mode === 'photo' ? 'Retake' : 'Back to camera'}">${ic('back', 22)}</button>
      <b data-ctitle>${c.label}</b>
      <button class="icon-btn" data-close aria-label="Close">${ic('close', 22)}</button>
    </header>
    ${mode === 'voice' ? chips() : ''}
    ${photoURL ? `<div class="rev-photo"><img src="${photoURL}" alt="Your proof photo"></div>` : ''}
    <div class="talk glass ${mode === 'voice' ? 'big' : ''}">
      <button class="mic" data-mic aria-label="Record what you did">${ic('mic', mode === 'voice' ? 34 : 26)}</button>
      <div class="talk-body">
        <b data-talk-title>Tap and say what you did</b>
        <span data-talk-sub>“Chest and back, 45 minutes. New PR on bench.”</span>
        <div class="meter" aria-hidden="true">${'<i></i>'.repeat(18)}</div>
      </div>
      <audio data-playback hidden></audio>
    </div>
    <label class="sr" for="note">What you did</label>
    <textarea id="note" class="note glass" rows="2" maxlength="280" placeholder="Or type it">${esc(transcript)}</textarea>
    <div class="mins" role="radiogroup" aria-label="How long">
      <span>How long?</span>
      ${MINS.map((m) => `<button role="radio" aria-checked="${m === mins}" class="${m === mins ? 'on' : ''}" data-m="${m}">${m < 60 ? `${m}m` : `${m / 60}h${m === 120 ? '+' : ''}`}</button>`).join('')}
    </div>
    <button class="btn btn-white post" data-post>${ic('check', 20, 2.2)}<span>Post proof</span></button>
  </div>`;

  if (mode === 'voice') bindChips();
  root.querySelector('[data-close]').addEventListener('click', close);
  root.querySelector('[data-retake]').addEventListener('click', () => {
    stopTalk(true); photo = null; audio = null; transcript = ''; mode = 'photo'; camera();
  });
  root.querySelector('[data-mic]').addEventListener('click', () => (rec ? stopTalk() : startTalk()));
  root.querySelectorAll('[data-m]').forEach((b) => b.addEventListener('click', () => {
    haptic();
    mins = +b.dataset.m;
    root.querySelectorAll('[data-m]').forEach((x) => {
      x.classList.toggle('on', x === b); x.setAttribute('aria-checked', x === b);
    });
  }));
  root.querySelector('#note').addEventListener('input', (e) => { transcript = e.target.value; });
  root.querySelector('[data-post]').addEventListener('click', post);
  if (audio) showRecorded();
}

/* ---------- Voice ---------- */

async function startTalk() {
  if (!window.MediaRecorder) return toast('Voice recording isn’t supported here. Type it instead.');
  try {
    recStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    return toast('Microphone is blocked. Allow it in Settings, or type it.');
  }
  haptic(15);
  const type = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find((t) => MediaRecorder.isTypeSupported?.(t)) || '';
  const chunks = [];
  rec = new MediaRecorder(recStream, type ? { mimeType: type } : undefined);
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.onstop = () => {
    audio = new Blob(chunks, { type: rec?.mimeType || type || 'audio/webm' });
    rec = null;
    if (root) showRecorded();
  };
  rec.start();

  const talk = root.querySelector('.talk');
  talk.classList.add('live');
  root.querySelector('[data-mic]').innerHTML = ic('stop', 26, 2);
  root.querySelector('[data-talk-title]').textContent = 'Listening. Tap to finish.';
  const started = Date.now();
  const sub = root.querySelector('[data-talk-sub]');
  sub.textContent = '0:00';
  talkTimer = setInterval(() => {
    audioSecs = (Date.now() - started) / 1000;
    if (!recog) sub.textContent = fmtDur(audioSecs);
    if (audioSecs >= MAX_TALK) stopTalk();
  }, 250);

  meter(recStream);
  listen(sub);
}

// Live captions where the browser supports speech recognition.
function listen(sub) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;
  try {
    recog = new SR();
    recog.lang = navigator.language || 'en-US';
    recog.continuous = true;
    recog.interimResults = true;
    const base = transcript ? `${transcript.trim()} ` : '';
    recog.onresult = (e) => {
      let text = '';
      for (const r of e.results) text += r[0].transcript;
      transcript = (base + text).trim();
      sub.textContent = transcript || '…';
      const note = root?.querySelector('#note');
      if (note) note.value = transcript;
    };
    recog.onerror = () => { recog = null; };
    recog.start();
  } catch { recog = null; }
}

function meter(s) {
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const an = audioCtx.createAnalyser();
    an.fftSize = 64;
    audioCtx.createMediaStreamSource(s).connect(an);
    const data = new Uint8Array(an.frequencyBinCount);
    const bars = root.querySelectorAll('.meter i');
    const tick = () => {
      an.getByteFrequencyData(data);
      bars.forEach((b, j) => { b.style.transform = `scaleY(${0.12 + (data[j + 1] / 255) * 0.88})`; });
      meterRAF = requestAnimationFrame(tick);
    };
    tick();
  } catch { /* meter is decoration only */ }
}

function stopTalk(discard = false) {
  clearInterval(talkTimer);
  cancelAnimationFrame(meterRAF);
  try { recog?.stop(); } catch { /* already stopped */ }
  recog = null;
  try { audioCtx?.close(); } catch { /* already closed */ }
  audioCtx = null;
  if (rec && rec.state !== 'inactive') {
    if (discard) rec.onstop = null;
    rec.stop();
  }
  if (discard) rec = null;
  recStream?.getTracks().forEach((t) => t.stop());
  recStream = null;
  haptic();
}

function showRecorded() {
  const talk = root.querySelector('.talk');
  talk.classList.remove('live');
  talk.classList.add('has');
  const mic = root.querySelector('[data-mic]');
  mic.innerHTML = ic('mic', 26);
  mic.setAttribute('aria-label', 'Record again');
  root.querySelector('[data-talk-title]').textContent = 'Voice note saved';
  const sub = root.querySelector('[data-talk-sub]');
  sub.innerHTML = `<button class="link" data-play>${ic('play', 14)} Play ${fmtDur(audioSecs)}</button> <span class="dim">Tap the mic to redo</span>`;
  const player = root.querySelector('[data-playback]');
  player.src = URL.createObjectURL(audio);
  sub.querySelector('[data-play]').addEventListener('click', () => (player.paused ? player.play() : player.pause()));
}

/* ---------- Post ---------- */

async function post() {
  if (rec) stopTalk();
  await new Promise((r) => setTimeout(r, rec ? 150 : 0));
  const note = root.querySelector('#note').value.trim();
  if (mode === 'photo' && !photo) return toast('Take a photo first.');
  if (mode === 'voice' && !audio && !note) return toast('Say or type what you did.');

  const btn = root.querySelector('[data-post]');
  btn.disabled = true;
  await addProof({
    cKey, kind: photo ? 'photo' : 'voice',
    note, audioSecs: audio ? Math.round(audioSecs) : 0, mins,
  }, photo, audio);
  haptic(25);
  success();
}

function success() {
  const done = doneToday(S.proofs);
  const n = S.profile.commitments.filter((k) => done.has(k)).length;
  const st = streak(S.proofs);
  root.innerHTML = `
  <div class="done-screen">
    <div class="done-mark">${ic('check', 56, 2.2)}</div>
    <h2 class="h1">Proof posted</h2>
    <p class="sub">${n === 3 ? 'All three done. That’s a perfect day.' : `${n} of 3 locked in today.`}</p>
    <div class="done-seg">${S.profile.commitments.map((k) => `<i class="${done.has(k) ? 'on' : ''}"></i>`).join('')}</div>
    <p class="done-streak">${ic('flame', 20)} ${st} day streak</p>
    <button class="btn btn-white" data-close>Done</button>
  </div>`;
  root.querySelector('[data-close]').addEventListener('click', finish);
  const t = setTimeout(finish, 2600);
  function finish() { clearTimeout(t); if (root) { close(); emit('proof:tab', 'today'); } }
}
