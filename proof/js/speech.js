// Speech to text, from whichever source this browser offers:
//   1. Claude's dictation (when Proof runs as a claude.ai page)
//   2. The browser's own speech recognition (Chrome, Safari, Android)
// Returns null when neither exists; callers then show typing only.

export async function getDictation() {
  // claude.ai hosted page
  if (window.claude?.use) {
    try {
      const d = await window.claude.use('dictation');
      if (d) return wrapClaude(d);
    } catch { /* fall through */ }
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SR) return wrapBrowser(SR);
  return null;
}

function wrapClaude(d) {
  const h = { partial: () => {}, final: () => {}, state: () => {} };
  d.onPartial(({ text }) => h.partial(text));
  d.onFinal(({ text }) => h.final(text));
  d.onState(({ state }) => h.state(state === 'listening' ? 'listening' : 'idle'));
  return {
    // Must be called straight from a click, with nothing awaited first.
    start: () => d.start().catch(() => h.state('denied')),
    stop: () => d.stop().catch(() => {}),
    on: (k, fn) => { h[k] = fn; },
  };
}

function wrapBrowser(SR) {
  const h = { partial: () => {}, final: () => {}, state: () => {} };
  let rec = null;
  return {
    start() {
      try {
        rec = new SR();
        rec.lang = navigator.language || 'en-US';
        rec.continuous = true;
        rec.interimResults = true;
        let done = 0;
        rec.onresult = (e) => {
          let interim = '';
          for (let i = done; i < e.results.length; i++) {
            const r = e.results[i];
            if (r.isFinal) { h.final(r[0].transcript); done = i + 1; } else interim += r[0].transcript;
          }
          h.partial(interim);
        };
        rec.onerror = (e) => h.state(e.error === 'not-allowed' ? 'denied' : 'idle');
        rec.onend = () => h.state('idle');
        rec.start();
        h.state('listening');
      } catch { h.state('denied'); }
    },
    stop() { try { rec?.stop(); } catch { /* already stopped */ } },
    on: (k, fn) => { h[k] = fn; },
  };
}
