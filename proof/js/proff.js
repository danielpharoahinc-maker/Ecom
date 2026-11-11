// Proff: the stamp that approves your proof. Lives in the corner, explains
// the app on a first-run tour, answers questions, and stamps every post.
// All drawing is vector (no images), so it's sharp at any size and free to animate.
import { QA, TOPICS } from './proff-qa.js';
import { openSheet } from './sheet.js';
import { S, saveProfile } from './state.js';
import { WORDMARK } from './icons.js';
import { esc, haptic } from './util.js';
import { doneToday } from './stats.js';

/* ---------- Drawing ---------- */

const R = '#e8423f', RD = '#b8302d', W = '#eef2f9', WS = '#cdd6ea', N = '#0b1630', N2 = '#1c3a8a';

// "Proff" in Fredoka (rounded), as shapes: deliberately unlike the "proof." logo.
export const NAME = (h = 18) => `<svg class="proff-name" height="${h}" viewBox="4.6 -72.0 233.0 73.7" role="img" aria-label="Proff"><path d="M12.2 0.9L12.2 0.9Q8.5 0.9 7.0-0.2Q5.4-1.3 5-3.1Q4.6-4.9 4.6-6.8L4.6-6.8L4.6-61.4Q4.6-63.3 5-65.0Q5.4-66.8 7-67.9Q8.6-69 12.3-69L12.3-69L32.8-69Q37-69 41.3-67.5Q45.5-66 49.2-62.9Q52.8-59.7 55.1-55.1Q57.3-50.5 57.3-44.3L57.3-44.3Q57.3-38.2 55.1-33.6Q52.8-29 49.2-26.0Q45.5-22.9 41.2-21.4Q36.9-19.8 32.7-19.8L32.7-19.8L19.9-19.8L19.9-6.7Q19.9-4.8 19.5-3.1Q19.1-1.3 17.5-0.2Q15.9 0.9 12.2 0.9ZM19.9-53.8L19.9-35L32.8-35Q35-35 37.1-36.0Q39.3-36.9 40.8-39Q42.2-41.1 42.2-44.4L42.2-44.4Q42.2-47.2 41-49.3Q39.8-51.4 37.6-52.6Q35.5-53.8 32.7-53.8L32.7-53.8L19.9-53.8ZM71.3 0.9L71.3 0.9Q67.6 0.9 66.0-0.2Q64.5-1.2 64.2-3Q63.8-4.8 63.8-6.7L63.8-6.7L63.8-41.6Q63.8-43.6 64.2-45.3Q64.6-47 66.2-48.1Q67.7-49.1 71.4-49.1L71.4-49.1Q74.9-49.1 76.5-48.2Q78-47.2 78.4-46.0Q78.8-44.7 78.8-43.8L78.8-43.8L77.6-43.2Q77.8-43.6 78.7-44.7Q79.5-45.7 81-46.9Q82.5-48 84.7-48.8Q86.8-49.6 89.6-49.6L89.6-49.6Q90.7-49.6 92.1-49.5Q93.4-49.3 94.8-48.9Q96.3-48.4 97.5-47.7Q98.7-46.9 99.5-45.8Q100.2-44.7 100.2-43.1L100.2-43.1Q100.2-39 98.3-36.1Q96.4-33.3 93.5-33.3L93.5-33.3Q91.8-33.3 91.1-33.6Q90.4-33.9 90.0-34.2Q89.5-34.5 88.9-34.8Q88.3-35 86.7-35L86.7-35Q85.2-35 83.9-34.6Q82.5-34.2 81.4-33.4Q80.2-32.5 79.6-31.3Q78.9-30 78.9-28.5L78.9-28.5L78.9-6.5Q78.9-4.6 78.6-2.9Q78.2-1.1 76.6-0.1Q75 0.9 71.3 0.9ZM130.1 1.7L130.1 1.7Q125.4 1.7 120.8-0.2Q116.1-2 112.3-5.4Q108.5-8.8 106.3-13.6Q104.1-18.3 104.1-24.1L104.1-24.1Q104.1-29.5 106.1-34.1Q108.1-38.8 111.7-42.4Q115.3-46 120.0-48.1Q124.6-50.1 129.9-50.1L129.9-50.1Q137.1-50.1 142.9-46.7Q148.8-43.2 152.3-37.3Q155.8-31.4 155.8-24.2L155.8-24.2Q155.8-18.1 153.6-13.4Q151.3-8.6 147.6-5.2Q143.8-1.8 139.3-0.1Q134.7 1.7 130.1 1.7ZM129.9-13.4L129.9-13.4Q132.3-13.4 134.8-14.6Q137.3-15.8 139-18.2Q140.7-20.6 140.7-24.3L140.7-24.3Q140.7-27.5 139.3-29.9Q137.9-32.3 135.4-33.6Q133-35 129.8-35L129.8-35Q126.8-35 124.5-33.6Q122.1-32.2 120.7-29.8Q119.2-27.3 119.2-24.2L119.2-24.2Q119.2-20.6 120.8-18.2Q122.5-15.7 125-14.6Q127.5-13.4 129.9-13.4ZM175.3 1L175.3 1Q171.8 1 170.2-0.1Q168.6-1.2 168.3-3.0Q167.9-4.7 167.9-6.7L167.9-6.7L167.9-53.5Q167.9-56.9 169-60.2Q170.1-63.5 172.5-66.2Q174.9-68.8 178.6-70.4Q182.3-72 187.6-72L187.6-72Q189.5-72 191.3-71.7Q193-71.3 194.1-69.8Q195.1-68.2 195.1-64.5L195.1-64.5Q195.1-60.8 194-59.3Q192.9-57.7 191.2-57.4Q189.4-57 187.5-57L187.5-57Q186.2-57 185.4-56.9Q184.5-56.7 184-56.4Q183.5-56.1 183.3-55.4Q183-54.7 183-53.7L183-53.7L183-6.4Q183-4.5 182.6-2.8Q182.2-1.1 180.6-0.1Q179 1 175.3 1ZM164.8-48.3L164.8-48.3L175.8-48.3L189.6-48.7Q191.5-48.7 193.2-48.4Q194.9-48 196-46.4Q197.1-44.8 197.1-41.1L197.1-41.1Q197.1-37.7 196.1-36.1Q195-34.5 193.3-34.1Q191.6-33.6 189.6-33.6L189.6-33.6L176.5-33.9L164.4-33.9Q161.5-34 160.3-35.6Q159.2-37.3 159.2-41.2L159.2-41.2Q159.2-44.8 160.6-46.6Q162-48.3 164.8-48.3ZM215.8 1L215.8 1Q212.3 1 210.7-0.1Q209.1-1.2 208.8-3.0Q208.4-4.7 208.4-6.7L208.4-6.7L208.4-53.5Q208.4-56.9 209.5-60.2Q210.6-63.5 213-66.2Q215.4-68.8 219.1-70.4Q222.8-72 228.1-72L228.1-72Q230-72 231.8-71.7Q233.5-71.3 234.6-69.8Q235.6-68.2 235.6-64.5L235.6-64.5Q235.6-60.8 234.5-59.3Q233.4-57.7 231.7-57.4Q229.9-57 228-57L228-57Q226.7-57 225.9-56.9Q225-56.7 224.5-56.4Q224-56.1 223.8-55.4Q223.5-54.7 223.5-53.7L223.5-53.7L223.5-6.4Q223.5-4.5 223.1-2.8Q222.7-1.1 221.1-0.1Q219.5 1 215.8 1ZM205.3-48.3L205.3-48.3L216.3-48.3L230.1-48.7Q232-48.7 233.7-48.4Q235.4-48 236.5-46.4Q237.6-44.8 237.6-41.1L237.6-41.1Q237.6-37.7 236.6-36.1Q235.5-34.5 233.8-34.1Q232.1-33.6 230.1-33.6L230.1-33.6L217-33.9L204.9-33.9Q202-34 200.8-35.6Q199.7-37.3 199.7-41.2L199.7-41.2Q199.7-44.8 201.1-46.6Q202.5-48.3 205.3-48.3Z" fill="currentColor"/></svg>`;

const handle = (lean = 0) => `<g transform="rotate(${lean} 70 70)"><rect x="63" y="30" width="14" height="22" rx="4" fill="${RD}"/><circle cx="70" cy="24" r="14" fill="${R}"/><ellipse cx="65" cy="19" rx="5" ry="3.5" fill="#fff" opacity=".35"/></g>`;
const body = (y = 52) => `<rect x="34" y="${y}" width="72" height="50" rx="12" fill="${W}"/><rect x="34" y="${y + 38}" width="72" height="12" fill="${WS}" opacity=".7"/><rect x="28" y="${y + 48}" width="84" height="13" rx="5" fill="${N2}"/><rect x="28" y="${y + 56}" width="84" height="5" rx="2.5" fill="${N}" opacity=".5"/>`;
const eye = (x, y, lx = 0, ly = 0) => `<ellipse cx="${x}" cy="${y}" rx="5.2" ry="6.4" fill="${N}"/><circle cx="${x + lx + 1.6}" cy="${y + ly - 2}" r="1.8" fill="#fff"/>`;
const eyes = (y, lx = 0, ly = 0) => `<g class="pf-eyes" style="transform-origin:70px ${y}px">${eye(55, y, lx, ly)}${eye(85, y, lx, ly)}</g>`;
const shut = (x, y) => `<path d="M${x - 5} ${y} q5 -6 10 0" stroke="${N}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
const closed = (x, y) => `<path d="M${x - 5} ${y} q5 5 10 0" stroke="${N}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
const blush = (y) => `<ellipse cx="46" cy="${y}" rx="5" ry="3" fill="${R}" opacity=".35"/><ellipse cx="94" cy="${y}" rx="5" ry="3" fill="${R}" opacity=".35"/>`;
const arm = (d) => `<path d="${d}" stroke="${WS}" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
const shadow = (w = 34) => `<ellipse class="pf-shadow" cx="70" cy="128" rx="${w}" ry="4.5" fill="#000" opacity=".35"/>`;
const smile = `<path d="M64 86 q6 5 12 0" stroke="${N}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
const grin = (y = 84) => `<path d="M62 ${y} q8 10 16 0z" fill="${N}"/>`;

const POSES = {
  rest: () => `${shadow()}<g class="pf-bob">${handle()}${body()}${eyes(72)}${smile}${blush(82)}</g>`,
  talk: () => `${shadow()}<g class="pf-bob">${handle(-6)}${body()}${eyes(71, 1, 1)}<ellipse class="pf-mouth" cx="70" cy="87" rx="6.5" ry="5" fill="${N}"/><ellipse cx="70" cy="89" rx="3.5" ry="2" fill="${R}"/>${blush(82)}${arm('M106 78 q14 -2 18 -14')}</g>`,
  point: () => `${shadow()}<g transform="rotate(-8 70 90)">${handle()}${body()}${eyes(72, 2, 0)}<path d="M66 87 q6 4 12 0" stroke="${N}" stroke-width="3" fill="none" stroke-linecap="round"/></g>${arm('M104 84 L128 72')}<path d="M124 66 l8 5 -7 6" stroke="${WS}" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  think: () => `${shadow()}${handle(4)}${body()}${eyes(71, 0, -2)}<path d="M64 88 h12" stroke="${N}" stroke-width="3" stroke-linecap="round"/>${arm('M36 84 q-10 4 -4 -14 q4 -6 10 -2')}<circle cx="108" cy="46" r="3.5" fill="${W}" opacity=".6"/><circle cx="116" cy="36" r="5" fill="${W}" opacity=".75"/><circle cx="126" cy="20" r="11" fill="${W}"/><text x="126" y="25.5" text-anchor="middle" fill="${N2}" font-weight="800" font-size="15" font-family="-apple-system,Helvetica,Arial">?</text>`,
  cheer: () => `${shadow(26)}<g transform="translate(0 -10)">${handle()}${body()}${shut(55, 74)}${shut(85, 74)}${grin()}${blush(82)}</g>${arm('M34 78 L16 58')}${arm('M106 78 L124 58')}<path d="M14 22v12M8 28h12M124 18v12M118 24h12" stroke="${R}" stroke-width="3" stroke-linecap="round"/>`,
  worried: () => `${shadow()}${handle(-3)}${body(56)}${eyes(78, 0, 1)}<path d="M47 69 l11 -4M93 69 l-11 -4" stroke="${N}" stroke-width="3" stroke-linecap="round"/><path d="M63 94 q7 -6 14 0" stroke="${N}" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M104 64 q3 6 0 9 q-3 -3 0 -9z" fill="#7fb1ff"/>`,
  sleep: () => `${shadow()}<g transform="rotate(6 70 100)">${handle()}${body()}${closed(55, 74)}${closed(85, 74)}<ellipse cx="70" cy="88" rx="3.5" ry="2.5" fill="${N}"/>${blush(82)}</g><g class="pf-z"><text x="104" y="40" fill="${W}" font-weight="800" font-size="14" font-family="-apple-system,Helvetica,Arial" opacity=".85">z</text><text x="114" y="26" fill="${W}" font-weight="800" font-size="18" font-family="-apple-system,Helvetica,Arial" opacity=".6">Z</text></g>`,
};

export function proffSVG(pose = 'rest', size = 72) {
  return `<svg class="proff pf-${pose}" width="${size}" height="${size}" viewBox="0 0 140 140" aria-hidden="true">${(POSES[pose] || POSES.rest)()}</svg>`;
}

// The red ink stamp Proff leaves on your post.
export const inkMark = () => `<span class="ink-mark" aria-hidden="true">${WORDMARK(30)}</span>`;

/* ---------- Floating Proff (tap to ask) ---------- */

let fab = null;

function moodPose() {
  const h = new Date().getHours();
  if (h >= 23 || h < 5) return 'sleep';
  const proven = doneToday(S.proofs);
  if (h >= 18 && !S.profile.commitments.some((k) => proven.has(k))) return 'worried';
  return 'rest';
}

export function mountProff() {
  if (!S.profile || S.profile.hideProff) return unmountProff();
  if (!fab) {
    fab = document.createElement('button');
    fab.className = 'proff-fab';
    fab.setAttribute('aria-label', 'Ask Proff a question');
    fab.addEventListener('click', () => { haptic(); openAsk(); });
  }
  fab.innerHTML = proffSVG(moodPose(), 54);
  if (!fab.isConnected) document.body.appendChild(fab);
}
export function unmountProff() { fab?.remove(); fab = null; }

/* ---------- Ask Proff ---------- */

const STOP = new Set('a an and are can do does did how i if in is it me my of on or the to what when where who why will with you your much there this that get so any about im its just like'.split(' '));
// Everyday words people type, mapped to the words the answers use.
const SYN = { pic: 'photo', pics: 'photo', picture: 'photo', pictures: 'photo', image: 'photo', images: 'photo', photos: 'photo', selfie: 'photo',
  sees: 'see', view: 'see', views: 'see', look: 'see', visible: 'see', cost: 'price', costs: 'price', money: 'price', pay: 'price', paying: 'price', expensive: 'price',
  unsubscribe: 'cancel', stop: 'cancel', mates: 'friends', mate: 'friends', bro: 'friends', squad: 'club', group: 'club', login: 'sign', log: 'sign',
  install: 'home', homescreen: 'home', notif: 'reminder', notifications: 'reminder', remind: 'reminder', delete: 'delete', remove: 'delete', erase: 'delete',
  goals: 'commitments', goal: 'commitments', habits: 'commitments', habit: 'commitments', broke: 'breaks', lose: 'breaks', lost: 'breaks' };
const words = (s) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length > 1 && !STOP.has(w)).map((w) => SYN[w] || w);
const stem = (w) => w.replace(/(ing|ed|es|s)$/, '');

// No AI: matches the words you type against each question, its keywords and answer.
function search(text) {
  const q = [...new Set(words(text).map(stem))];
  if (!q.length) return [];
  // An answer must match enough of what was asked: every word for one- or
  // two-word questions, at least two words for longer ones.
  const need = Math.min(2, q.length);
  return QA.map((item) => {
    const head = new Set(words(`${item.q} ${item.k}`).map(stem));
    const tail = new Set(words(item.a).map(stem));
    let score = 0, hits = 0;
    for (const w of q) {
      const inHead = head.has(w) || [...head].some((h) => h.length > 4 && w.length > 4 && (h.startsWith(w) || w.startsWith(h)));
      if (inHead) { score += 3; hits++; } else if (tail.has(w)) { score += 1; hits++; }
    }
    return { item, score, hits };
  }).filter((r) => r.hits >= need && r.score >= 3).sort((a, b) => b.score - a.score).slice(0, 4).map((r) => r.item);
}

const qaHTML = (items) => items.map((x) => `<details class="qa"><summary>${esc(x.q)}</summary><p>${esc(x.a)}</p></details>`).join('');

export function openAsk() {
  let topic = 0;
  openSheet(`
    <div class="ask-head">${proffSVG('talk', 70)}<div><span class="ask-name">${NAME(22)}</span><p>Ask me anything about Proof.</p></div></div>
    <form class="ask-search" role="search"><label class="sr" for="ask-q">Your question</label>
      <input id="ask-q" type="search" autocomplete="off" placeholder="Type a question, like “what breaks my streak?”"></form>
    <div class="ask-results" aria-live="polite" hidden></div>
    <div class="ask-browse">
      <div class="ask-topics" role="tablist">${TOPICS.map((t, i) => `<button role="tab" data-t="${i}" class="${i ? '' : 'on'}" aria-selected="${!i}">${t}</button>`).join('')}</div>
      <div class="ask-list"></div>
    </div>
    <button class="btn btn-quiet" data-tour>Show me around again</button>`, {
    tall: true,
    onMount(body, close) {
      const list = body.querySelector('.ask-list');
      const results = body.querySelector('.ask-results');
      const browse = body.querySelector('.ask-browse');
      const showTopic = () => { list.innerHTML = qaHTML(QA.filter((x) => x.t === topic)); };
      showTopic();
      body.querySelectorAll('[data-t]').forEach((b) => b.addEventListener('click', () => {
        topic = +b.dataset.t;
        body.querySelectorAll('[data-t]').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-selected', x === b); });
        showTopic();
      }));
      let timer;
      const input = body.querySelector('#ask-q');
      body.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); input.blur(); });
      input.addEventListener('input', () => {
        clearTimeout(timer);
        const text = input.value.trim();
        if (text.length < 2) { results.hidden = true; browse.hidden = false; body.querySelector('.ask-head svg').outerHTML = proffSVG('talk', 70); return; }
        body.querySelector('.ask-head svg').outerHTML = proffSVG('think', 70);
        timer = setTimeout(() => {
          const found = search(text);
          browse.hidden = true; results.hidden = false;
          body.querySelector('.ask-head svg').outerHTML = proffSVG(found.length ? 'talk' : 'worried', 70);
          results.innerHTML = found.length
            ? qaHTML(found).replace('<details class="qa">', '<details class="qa" open>')
            : `<p class="ask-none">I don’t know that one yet. Try different words, or browse the topics.</p><button class="btn btn-secondary" data-clear>Browse topics</button>`;
          results.querySelector('[data-clear]')?.addEventListener('click', () => { input.value = ''; input.dispatchEvent(new Event('input')); });
        }, 380);
      });
      body.querySelector('[data-tour]').addEventListener('click', () => { close(); setTimeout(() => startTour(), 320); });
    },
  });
}

/* ---------- First-run tour ---------- */

const TOUR = [
  { sel: null, pose: 'talk', t: 'Hi, I’m Proff.', b: 'I approve your proof. Let me show you around. It takes 30 seconds.' },
  { sel: '.cm-list', pose: 'point', t: 'Your three commitments', b: 'Tap one to post proof for it. Every one you prove counts toward your streak.' },
  { sel: '.talkbox', pose: 'point', t: 'Plan your day', b: 'Tap the mic and say your plan like you’d tell a friend. I turn it into a list.' },
  { sel: '[data-add]', pose: 'point', t: 'The + button', b: 'The fastest way to post proof: take a photo, say what you did, post. I’ll stamp it.' },
  { sel: '.day-sec', pose: 'point', t: 'Your day', b: 'Snap moments from your day here. They tell the story but don’t count toward your streak.' },
  { sel: '[data-tab="vault"]', pose: 'point', t: 'Vault', b: 'Every proof is locked in here. Hold the door to open it, and I’ll score your week out of 10.' },
  { sel: '[data-tab="stats"]', pose: 'point', t: 'Stats', b: 'Your streak, your consistency, and every day stacked up.' },
  { sel: '[data-tab="club"]', pose: 'point', t: 'Club', b: 'Lock in with friends. Invite them with a code and see who’s posted today.' },
  { sel: '.proff-fab', pose: 'cheer', t: 'Stuck? Tap me.', b: 'I live down here. Tap me any time and ask me anything.' },
];

export function startTour(onDone) {
  if (document.querySelector('.tour')) return;
  window.scrollTo(0, 0);
  const ov = document.createElement('div');
  ov.className = 'tour';
  ov.setAttribute('role', 'dialog');
  ov.setAttribute('aria-modal', 'true');
  ov.setAttribute('aria-label', 'Tour of Proof');
  ov.innerHTML = `<div class="tour-hole"></div><div class="tour-card" aria-live="polite"></div>`;
  document.body.appendChild(ov);
  document.body.classList.add('noscroll');
  const hole = ov.querySelector('.tour-hole');
  const card = ov.querySelector('.tour-card');
  let i = 0;

  const finish = async () => {
    window.removeEventListener('resize', place);
    ov.classList.add('out');
    setTimeout(() => { ov.remove(); if (!document.querySelector('.sheet-wrap, .cap')) document.body.classList.remove('noscroll'); }, 300);
    if (S.profile && !S.profile.tourDone) await saveProfile({ ...S.profile, tourDone: true });
    onDone?.();
  };

  function place() {
    const step = TOUR[i];
    const el = step.sel && document.querySelector(step.sel);
    const vh = window.innerHeight, vw = window.innerWidth;
    if (!el) {
      Object.assign(hole.style, { top: `${vh / 2}px`, left: `${vw / 2}px`, width: '0px', height: '0px' });
      card.style.top = ''; card.style.bottom = ''; card.classList.add('mid');
      return;
    }
    card.classList.remove('mid');
    const r = el.getBoundingClientRect(), pad = 8;
    Object.assign(hole.style, { top: `${r.top - pad}px`, left: `${r.left - pad}px`, width: `${r.width + pad * 2}px`, height: `${r.height + pad * 2}px` });
    if (r.top + r.height / 2 > vh / 2) { card.style.top = ''; card.style.bottom = `${vh - r.top + pad + 14}px`; }
    else { card.style.bottom = ''; card.style.top = `${r.bottom + pad + 14}px`; }
  }

  function show() {
    const step = TOUR[i];
    const el = step.sel && document.querySelector(step.sel);
    if (step.sel && !el) { i++; return i < TOUR.length ? show() : finish(); }
    if (el && getComputedStyle(el).position !== 'fixed') el.scrollIntoView({ block: 'center' });
    card.innerHTML = `
      <button class="tour-skip" data-skip>Skip</button>
      <div class="tour-who">${proffSVG(step.pose, 64)}<span>${NAME(12)}</span></div>
      <div class="tour-txt"><b>${step.t}</b><p>${step.b}</p></div>
      <div class="tour-foot">
        <span class="tour-dots" aria-label="Step ${i + 1} of ${TOUR.length}">${TOUR.map((_, j) => `<i class="${j === i ? 'on' : ''}"></i>`).join('')}</span>
        ${i ? '<button class="tour-back" data-prev>Back</button>' : ''}
        <button class="tour-next" data-next>${i === TOUR.length - 1 ? 'Let’s go' : 'Next'}</button>
      </div>`;
    card.classList.remove('in'); void card.offsetWidth; card.classList.add('in');
    card.querySelector('[data-next]').addEventListener('click', () => { haptic(); i++; i < TOUR.length ? show() : finish(); });
    card.querySelector('[data-prev]')?.addEventListener('click', () => { i--; show(); });
    card.querySelector('[data-skip]').addEventListener('click', finish);
    setTimeout(place, el ? 60 : 0);
    card.querySelector('[data-next]').focus({ preventScroll: true });
  }

  window.addEventListener('resize', place);
  show();
}

export const tourNeeded = () => S.profile?.onboarded && !S.profile.tourDone;
