/* AWEZA "Turn the shirt": a pinned, scroll-scrubbed section on the home page.
   Scrolling turns the Signature Lips tee from front to back, then pushes in on the print,
   while three lines of copy hand over to each other. Built on GSAP + ScrollTrigger.
   Without GSAP, or with reduced motion, it shows front and back side by side (complete at rest). */
(() => {
  const AW = window.AW;
  const PID = "signature-lips";
  const STEPS = [
    "The front is polite.",
    "The back says what you meant.",
    "Read it from across the room.",
  ];
  let mm = null;

  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function markup(p) {
    const esc = AW.esc;
    return `
    <section class="turn" aria-labelledby="turn-title">
      <div class="turn-pin">
        <div class="turn-copy">
          <h2 class="turn-title" id="turn-title">
            ${STEPS.map((s, i) => `<span class="turn-line" data-i="${i}">${esc(s)}</span>`).join("")}
          </h2>
          <div class="turn-meta">
            <a class="turn-link" href="#/product/${p.id}">${esc(p.name)}<span class="turn-price">${AW.rand(p.price)}</span></a>
          </div>
        </div>
        <div class="turn-stage" aria-hidden="true">
          <div class="turn-card">
            <img class="turn-face turn-front" src="images/${PID}/front.jpg" alt="" width="1000" height="1000" loading="lazy" decoding="async">
            <img class="turn-face turn-back" src="images/${PID}/back.jpg" alt="" width="1000" height="1000" loading="lazy" decoding="async">
          </div>
          <div class="turn-shadow"></div>
        </div>
        <div class="turn-progress" aria-hidden="true"><span></span></div>
      </div>
    </section>`;
  }

  function kill() { if (mm) { mm.revert(); mm = null; } }

  function build(root) {
    const G = window.gsap, ST = window.ScrollTrigger;
    const sec = root.querySelector(".turn");
    if (!sec || !G || !ST || reduced()) { sec && sec.classList.add("turn--static"); return; }
    G.registerPlugin(ST);
    sec.classList.add("turn--live");
    mm = G.matchMedia();
    mm.add({ small: "(max-width: 899px)", large: "(min-width: 900px)" }, ctx => {
      const small = ctx.conditions.small;
      const q = s => sec.querySelector(s), qa = s => [...sec.querySelectorAll(s)];
      const lines = qa(".turn-line");
      G.set(lines, { autoAlpha: 0, yPercent: 40 });
      G.set(lines[0], { autoAlpha: 1, yPercent: 0 });
      G.set(q(".turn-back"), { rotationY: -90 });

      const tl = G.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: sec, start: "top top", end: small ? "+=220%" : "+=260%",
          pin: q(".turn-pin"), scrub: 0.6, anticipatePin: 1, invalidateOnRefresh: true,
        },
      });
      // 0 → 1: settle in.  1 → 2: turn.  2 → 3: push in on the print.
      tl.fromTo(q(".turn-card"), { scale: small ? 0.8 : 0.72, y: 40 }, { scale: 1, y: 0, duration: 1 }, 0)
        .to(q(".turn-front"), { rotationY: 90, duration: 0.5, ease: "power1.in" }, 1)
        .to(q(".turn-back"), { rotationY: 0, duration: 0.5, ease: "power1.out" }, 1.5)
        .to(q(".turn-shadow"), { scaleX: 0.55, opacity: 0.35, duration: 0.5, yoyo: true, repeat: 1 }, 1)
        .to(lines[0], { autoAlpha: 0, yPercent: -40, duration: 0.3 }, 1.2)
        .to(lines[1], { autoAlpha: 1, yPercent: 0, duration: 0.3 }, 1.5)
        .to(q(".turn-card"), { scale: small ? 1.55 : 1.8, y: small ? 30 : 60, duration: 1, ease: "power2.inOut" }, 2.1)
        .to(lines[1], { autoAlpha: 0, yPercent: -40, duration: 0.3 }, 2.3)
        .to(lines[2], { autoAlpha: 1, yPercent: 0, duration: 0.3 }, 2.6)
        .fromTo(q(".turn-progress span"), { scaleX: 0 }, { scaleX: 1, duration: 3.1 }, 0);
      return () => tl.scrollTrigger && tl.scrollTrigger.kill(true);
    });
    requestAnimationFrame(() => { ST.sort && ST.sort(); ST.refresh(); });
  }

  AW.on("route", ({ page }) => {
    kill();
    if (page !== "") return;
    const p = AW.byId(PID);
    const after = AW.app.querySelector(".home-marquee") || AW.app.querySelector(".home-cols");
    if (!p || !after) return;
    after.insertAdjacentHTML("afterend", markup(p));
    build(AW.app);
  });
})();
