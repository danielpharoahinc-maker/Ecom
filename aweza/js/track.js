/* AWEZA: track your order (#/track). Asks the track-order function, which looks the order up in Printify by its
   order number and checks the email, then shows where it is: received, printing, on its way, delivered. */
(() => {
  const AW = window.AW;
  if (!AW) return;
  const esc = AW.esc;
  const ENDPOINT = "/.netlify/functions/track-order";
  const STEPS = [["Order received", "We have it"], ["Being printed", "Made just for you"], ["On its way", "With the courier"], ["Delivered", "At your door"]];
  const REF_RE = /^AW[A-Z0-9]{6,12}$/;
  const saved = () => { try { return JSON.parse(localStorage.getItem("aweza-last-order") || "{}") || {}; } catch (e) { return {}; } };
  const fmtDate = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); if (!m) return ""; const mo = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]; return `${+m[3]} ${mo[+m[2] - 1]} ${m[1]}`; };

  const formHTML = (ref, email) => `
    <section class="tk">
      <p class="tk-eyebrow">Track your order</p>
      <h1 class="tk-title">Where's my <em>tee?</em></h1>
      <p class="tk-lede">Enter your order number and the email you ordered with. Your order number is on the confirmation page after you pay and starts with AW.</p>
      <form class="tk-form" novalidate>
        <label class="tk-field"><span>Order number</span>
          <input name="ref" value="${esc(ref)}" placeholder="AW1A2B3C4D" autocomplete="off" autocapitalize="characters" spellcheck="false" required></label>
        <label class="tk-field"><span>Email</span>
          <input name="email" type="email" value="${esc(email)}" placeholder="you@example.com" autocomplete="email" inputmode="email" autocapitalize="off" spellcheck="false" required></label>
        <p class="tk-error" role="alert" hidden></p>
        <button type="submit" class="btn btn--primary btn--lg btn--block tk-go"><span class="btn-label">Track my order</span></button>
      </form>
      <div class="tk-result" aria-live="polite"></div>
    </section>`;

  const resultHTML = r => {
    const timeline = r.stage < 0 ? `<p class="tk-cancel">${esc(r.title)}</p>` : `<ol class="tk-steps">${STEPS.map((s, i) => `
      <li class="${i < r.stage ? "is-done" : i === r.stage ? "is-now" : ""}"${i === r.stage ? ' aria-current="step"' : ""}>
        <span class="tk-dot" aria-hidden="true"></span><span class="tk-step-t">${esc(s[0])}</span><span class="tk-step-d">${esc(s[1])}</span>
      </li>`).join("")}</ol>`;
    const ships = (r.shipments || []).map(s => `
      <li class="tk-ship">
        <p class="tk-ship-c">${esc(s.carrier)}${s.deliveredAt ? ` · delivered ${esc(fmtDate(s.deliveredAt))}` : ""}</p>
        ${s.number ? `<p class="tk-ship-n">Tracking number <b>${esc(s.number)}</b></p>` : ""}
        ${s.url && /^https:\/\//.test(s.url) ? `<a class="btn btn--primary tk-ship-a" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer"><span class="btn-label">Track the parcel</span></a>` : ""}
      </li>`).join("");
    const items = (r.items || []).map(i => `<li>${i.qty} × ${esc(i.name)}${i.size ? `, size ${esc(i.size)}` : ""}</li>`).join("");
    return `
      <div class="tk-card${r.issue ? " is-issue" : ""}">
        <p class="tk-order">Order <b>${esc(r.ref)}</b>${r.placedAt ? ` · placed ${esc(fmtDate(r.placedAt))}` : ""}</p>
        <h2 class="tk-status">${esc(r.title)}</h2>
        <p class="tk-detail">${esc(r.detail)}</p>
        ${timeline}
        ${ships ? `<ul class="tk-ships">${ships}</ul>` : ""}
        ${items ? `<ul class="tk-items" aria-label="In this order">${items}</ul>` : ""}
      </div>`;
  };

  async function lookup(form) {
    const err = form.querySelector(".tk-error"), out = form.parentElement.querySelector(".tk-result"), go = form.querySelector(".tk-go");
    const ref = form.elements.ref.value.trim().toUpperCase().replace(/\s+/g, ""), email = form.elements.email.value.trim();
    out.innerHTML = ""; err.hidden = true;
    if (!REF_RE.test(ref)) { err.textContent = "That doesn't look like an order number. It starts with AW and is on your confirmation page."; err.hidden = false; form.elements.ref.focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) { err.textContent = "Enter the email you ordered with."; err.hidden = false; form.elements.email.focus(); return; }
    go.disabled = true; go.setAttribute("aria-busy", "true"); go.querySelector(".btn-label").textContent = "Looking it up...";
    try {
      const res = await fetch(ENDPOINT, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ref, email }), cache: "no-store" });
      let data = null; try { data = await res.json(); } catch (e) { data = null; }
      if (res.ok && data && typeof data.stage === "number") {
        out.innerHTML = resultHTML(data);
        try { localStorage.setItem("aweza-last-order", JSON.stringify({ ref, email })); } catch (e) { /* ignore */ }
        out.scrollIntoView({ block: "start", behavior: "smooth" });
      } else {
        err.textContent = (data && data.error) || "We couldn't look that up right now. Please try again in a moment."; err.hidden = false;
      }
    } catch (e) {
      err.textContent = navigator.onLine === false ? "You seem to be offline. Check your connection and try again." : "Tracking is temporarily unavailable. Please try again in a few minutes."; err.hidden = false;
    } finally {
      go.disabled = false; go.removeAttribute("aria-busy"); go.querySelector(".btn-label").textContent = "Track my order";
    }
  }

  AW.route("track", (app, arg) => {
    document.title = "Track your order | AWEZA";
    const s = saved();
    app.innerHTML = formHTML(s.ref || "", s.email || "");
    const form = app.querySelector(".tk-form");
    form.addEventListener("submit", e => { e.preventDefault(); lookup(form); });
    // "#/track/go" (from the order-confirmed page) or "#/track/AWREF" looks it up straight away when we know both.
    if (arg && REF_RE.test(String(arg).toUpperCase())) form.elements.ref.value = String(arg).toUpperCase();
    if ((arg === "go" || (arg && REF_RE.test(String(arg).toUpperCase()))) && form.elements.ref.value && form.elements.email.value) lookup(form);
  });
})();
