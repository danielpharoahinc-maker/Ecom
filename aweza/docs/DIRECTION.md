# AWEZA v2: Creative Direction

Written by the Head Creative Director. Every specialist follows this file and their brief. If this doc and a brief disagree, the brief wins on scope and this doc wins on look, voice and contracts.

---

## 1. Brand essence

**AWEZA is the loud friend with good taste.** Bold graphic tees from South Africa that say the thing out loud, printed on clean white cotton. The jokes are cheeky; the presentation is not. The joke lives on the shirt, and everything around it is calm, sharp and expensive-looking.

- **Brand line:** **"Time of your life."** It sits under the wordmark (as on the prints), closes the footer, signs off campaigns.
- **Positioning:** PREMIUM streetwear, playful product. A magazine spread that happens to have a sense of humour.
- **Three words:** Bold. Cheeky. Crafted.
- **The tension we design around:** a serious editorial layout (huge serif type, huge imagery, asymmetric grids, confident white space, slow motion) holding irreverent product. That contrast is the brand.
- **Signature asset: THE LIPS.** Red lips, AWEZA on the teeth, "Time Of Your Life" script (`images/brand/art/lips-logo.jpg`). It is the centrepiece of the home hero and returns at key brand moments (intro, signature spotlight, empty bag, 404, footer, page curtain). Show it BIG. Red belongs to the lips.
- **Audience:** mostly young South African MEN (late teens to 30s), also women. Casting, imagery, copy and ads skew male. Mostly on phones and mobile data: fast, legible, thumb-friendly.
- **Not "AI slop".** The site must feel human and art-directed. See §14 (anti-template rules). Every agent reads it.
- **Originality rule:** nothing copied. No other brand's logo, slogans, layouts that are clearly someone's trade dress, or names. Never name another fashion or sportswear brand anywhere on the site. Payment and fulfilment partners (Yoco, Printify) may be named only in legal/help copy where the law or clarity needs it.

## 2. Voice

Short. Confident. A wink, never a shout. Write like a funny friend texting, then edit it like a copywriter.

**Rules**
- Sentences of 2 to 9 words for UI and headlines. Body copy max 3 sentences per block.
- One joke per block. If the headline is funny, the line under it is plain and useful.
- Second person ("you"), present tense. South African, not stereotyped: "Mzansi", "lekker", "sharp" are allowed sparingly (max one per page). No forced slang.
- **No profanity in site copy.** The prints carry the edge; the site stays PG-13 because teens shop here. Never spell out the full wording on adult prints: refer to them by product name.
- Never reference, name or describe any real person, including anyone who may appear in a print. Describe the design ("a very sweet surprise on the back"), never the face.
- No exclamation marks except at most one per page. No em dashes in UI copy; use full stops or colons.
- Functional copy is boring on purpose: "Add to Bag", "Select a size", "Checkout", "Free delivery over R1 500". Clarity beats cleverness on every button.
- Prices always via `AW.rand(n)`: "R649", "R1 500". Never "ZAR 649", never decimals.

**Point of view:** we talk like the sharpest guy at the braai. Dry, self-aware, a bit arrogant about the quality, never about the customer. Banned stock phrases: "elevate your style", "unleash", "level up", "curated", "must-have", "game-changer", "vibes", "wardrobe staple", "look no further". No emoji anywhere on the site.

**Sample lines (use, remix, or match the energy)**
- Brand line: "Time of your life."
- Hero eyebrow: "Designed in South Africa. Printed to order."
- Hero headline: "Say it with your back."
- Hero support: "Heavy cotton. Loud prints. Zero apologies."
- Back-print section: "The front is polite. The back says what you meant."
- Signature: "The lips that started it all."
- Marquee: "BAD DECISIONS · GOOD COTTON · NO FILTER · MADE IN MZANSI · SAY IT WITH YOUR BACK"
- Empty bag: "Your bag is empty. Bold of you." / CTA "Find your statement"
- Free delivery nudge: "You're R351 away from free delivery." / done: "Free delivery unlocked. Sharp."
- Add success (button state): "Added" with a check.
- No size chosen: "Pick a size first. We'll wait."
- 404: "This page made a bad decision." / "Back to the shop"
- Newsletter: "First dibs on new drops. No spam, just statements."
- Size guide intro: "Classic fit. If you like it roomy, size up."
- Payments not live: "Payments are launching soon. Your bag is saved on this device."

**Document titles** (each route sets `document.title`): `"<Page> | AWEZA"`, e.g. "Shop | AWEZA", "CEO of Bad Decisions Tee | AWEZA". Home: "AWEZA | Bold Graphic Tees from South Africa".

**Never hardcode product names, collection names, taglines, prices or badges.** Always read `AW.products`, `AW.collections`, `AW.config`, `AW.priceFor`. The brand agent may rewrite those values. Collection ids (`signature`, `bad-decisions`, `no-filter`) and product ids are fixed.

## 3. Colour system

Black and white lead (95% of every screen). Greys do structure. **Lip Red** is the single accent.

| Role | Token | Value | Notes |
|---|---|---|---|
| Ink (near-black) | `--c-ink` | `#0A0A0A` | Text, primary buttons, dark sections |
| White | `--c-white` | `#FFFFFF` | Page background |
| Tile | `--c-tile` | `#F1F1EE` | Behind every product image (see §6) |
| Grey 100 | `--c-g100` | `#F6F6F4` | Subtle fills, input bg |
| Grey 200 | `--c-g200` | `#E6E6E3` | Hairlines, dividers |
| Grey 300 | `--c-g300` | `#CFCFCB` | Borders, disabled |
| Grey 600 | `--c-g600` | `#5C5C59` | Secondary text on white (AA 6.6:1) |
| Grey 800 | `--c-g800` | `#252524` | Raised surfaces on black |
| Lip Red | `--c-red` | `#D7191F` | Accent. AA on white (5.2:1). White text on red is AA. |
| Red deep | `--c-red-deep` | `#A90F14` | Hover/pressed for red |
| Success | `--c-ok` | `#127A3A` | Form success, "in bag" ticks |

**Where red is allowed (and nowhere else):**
1. Bag count badge in the header.
2. Product badges with tone red ("New", "Bestseller").
3. Free-delivery progress bar fill.
4. The lips glyph (logo mark, marquee separators, loader).
5. Form error text and error borders.
6. One editorial word per page maximum (e.g. one word in a headline wrapped in `<em class="t-red">`).

Red is never a page or section background, never a primary button, never body text. Red on black only for graphics/large type (3.8:1). **"One kiss per screen":** if two red things compete in one viewport, remove one.

**Dark sections:** any element with `data-theme="dark"` flips semantic tokens (defined in tokens.css below). Components must use semantic tokens (`--c-bg`, `--c-fg`, `--c-muted`, `--c-line`, `--c-surface`) so they work on both. Product image tiles stay light (`--c-tile`) even inside dark sections.

## 4. Fonts

Loaded once, via `@import` at the top of `css/tokens.css` (nobody else loads fonts):

```css
@import url("https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Archivo:wght@400;500;600;700;800&display=swap");
```

The real AWEZA logo is a bold, high-contrast Clarendon/Century-style SERIF wordmark (black, sometimes red, sometimes italic), often with ™ and "Time of your life" under it. The display type echoes it.
- **DM Serif Display** (`--font-display`): high-contrast bold serif. The logo, headlines, collection names, PDP product name, giant wordmarks, marquee, big prices. Set display headlines in UPPERCASE for statements/wordmarks (like the logo) and in Sentence case for editorial lines; leading 0.92, tracking `--ls-tight`. Never below 22px.
- **DM Serif Display Italic** (`--font-accent`): the wink, echoing the italic logo. Taglines, "Time of your life", pull quotes, one or two words inside a headline ("Say it with your *back*."). Max ~1 use per section.
- **Archivo** (`--font-body`): everything else. 400 body, 500 UI labels/card names, 600 prices and buttons, 800 for rare blunt sans statements (the "CEO OF BAD DECISIONS"-style shouty print voice, e.g. marquee or a sticker label).
- Eyebrows/labels: Archivo 600, `--fs-xs`, uppercase, `--ls-caps`.
- **Logo on site:** `AW.ui.logo()` renders the wordmark as live text "AWEZA" in DM Serif Display (with a small superscript ™) and optional "Time of your life" in the italic below. The brand agent also ships `images/brand/logo.svg` (traced/recreated, original) for favicon/social. The JPG logos in `images/brand/art/` are reference and may appear in editorial blocks with multiply blend.

## 5. Tokens (EXACT: agent 01 pastes this into css/tokens.css; everyone else uses only these names)

```css
:root {
  /* colour: raw */
  --c-ink: #0A0A0A;  --c-white: #FFFFFF;  --c-tile: #F1F1EE;
  --c-g100: #F6F6F4; --c-g200: #E6E6E3;  --c-g300: #CFCFCB;
  --c-g600: #5C5C59; --c-g800: #252524;
  --c-red: #D7191F;  --c-red-deep: #A90F14; --c-ok: #127A3A;
  /* colour: semantic (flip in dark) */
  --c-bg: var(--c-white);   --c-fg: var(--c-ink);
  --c-muted: var(--c-g600); --c-line: var(--c-g200);
  --c-surface: var(--c-g100);              /* inputs, chips, quiet panels */
  --c-inverse-bg: var(--c-ink); --c-inverse-fg: var(--c-white);
  --c-focus: var(--c-ink);
  --c-scrim: rgba(10,10,10,.48);

  /* type */
  --font-display: "DM Serif Display", "Century Schoolbook", Georgia, serif;
  --font-body: "Archivo", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-accent: "DM Serif Display", Georgia, serif;   /* always with font-style: italic */
  --grain: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.5'/%3E%3C/svg%3E");
  --fs-mega: clamp(4.5rem, 19vw, 17rem);   /* footer wordmark, intro */
  --fs-d1:  clamp(3.25rem, 11vw, 9rem);    /* hero/collection names */
  --fs-d2:  clamp(2.5rem, 7vw, 5.5rem);    /* section statements */
  --fs-h1:  clamp(2rem, 4.2vw, 3.5rem);    /* page titles, PDP name */
  --fs-h2:  clamp(1.5rem, 2.6vw, 2.25rem);
  --fs-h3:  1.25rem;
  --fs-lg:  1.125rem; --fs-body: 1rem; --fs-sm: .875rem;
  --fs-xs:  .75rem;   --fs-micro: .6875rem;
  --lh-display: .9; --lh-snug: 1.2; --lh-body: 1.55;
  --ls-display: .005em; --ls-caps: .14em; --ls-tight: -.01em;
  --fw-regular: 400; --fw-medium: 500; --fw-semi: 600; --fw-bold: 700;

  /* space (4px base) */
  --sp-1: .25rem; --sp-2: .5rem; --sp-3: .75rem; --sp-4: 1rem;
  --sp-5: 1.5rem; --sp-6: 2rem;  --sp-7: 3rem;   --sp-8: 4rem;
  --sp-9: 6rem;   --sp-10: 8rem;
  --gutter: clamp(16px, 4vw, 56px);
  --section-y: clamp(64px, 11vw, 168px);
  --grid-gap-x: clamp(8px, 1.2vw, 20px);
  --grid-gap-y: clamp(28px, 3vw, 48px);
  --maxw: 1680px; --maxw-text: 66ch;

  /* layout */
  --promo-h: 36px; --header-h: 56px;
  --nav-offset: var(--header-h);  /* nav.js updates to 0px when header hides */
  --buybar-h: 72px; --drawer-w: min(440px, 100vw);
  --tap: 44px;                     /* minimum touch target */

  /* radii: crisp edges, pill actions */
  --r-0: 0; --r-xs: 2px; --r-sm: 4px; --r-md: 8px; --r-pill: 999px;

  /* shadows */
  --sh-1: 0 1px 2px rgba(10,10,10,.06);
  --sh-2: 0 10px 30px rgba(10,10,10,.10);
  --sh-3: 0 30px 80px rgba(10,10,10,.22);

  /* z layers */
  --z-base: 1; --z-raised: 10; --z-sticky: 100; --z-header: 200;
  --z-buybar: 250; --z-scrim: 400; --z-drawer: 500; --z-modal: 600;
  --z-toast: 700; --z-curtain: 800; --z-skip: 900;

  /* motion */
  --ease-out: cubic-bezier(.16, 1, .3, 1);      /* default: expo out */
  --ease-in-out: cubic-bezier(.65, 0, .35, 1);
  --ease-in: cubic-bezier(.7, 0, .84, 0);
  --ease-spring: cubic-bezier(.34, 1.56, .64, 1); /* tiny overshoot: badges, ticks */
  --dur-1: 120ms; --dur-2: 240ms; --dur-3: 420ms; --dur-4: 720ms; --dur-5: 1100ms;
  --stagger: 70ms;
}
@media (min-width: 1024px) { :root { --header-h: 72px; } }
[data-theme="dark"] {
  --c-bg: var(--c-ink); --c-fg: var(--c-white);
  --c-muted: #A6A6A2; --c-line: rgba(255,255,255,.16);
  --c-surface: var(--c-g800); --c-focus: var(--c-white);
  --c-inverse-bg: var(--c-white); --c-inverse-fg: var(--c-ink);
  background: var(--c-bg); color: var(--c-fg);
}
@media (prefers-reduced-motion: reduce) {
  :root { --dur-1: 1ms; --dur-2: 1ms; --dur-3: 1ms; --dur-4: 1ms; --dur-5: 1ms; --stagger: 0ms; }
}
```

**Breakpoints** (mobile-first `min-width` only): `600px` (large phone/small tablet), `900px` (tablet landscape), `1024px` (desktop nav), `1440px` (wide). Custom properties can't be used in media queries, so use these literal values.

## 6. Imagery treatment

All photos are **1000x1000 square JPGs**: white tees, red/black prints, pure white backgrounds on `front`, `back`, `person-1`, `person-2`, `folded`, `duo`; grey studio backgrounds on `lifestyle` and `hanging-1`. Most graphics are on the **back** (products whose `images[0]` is `back`).

**Male-first imagery (owner directive).** The integrator is adding male-model photos of the real tees as `images/<product-id>/male-*.jpg` (e.g. `male-1.jpg`, `male-2.jpg`) and will update `images` arrays in data/products.js. Code must never assume filenames beyond what `product.images` lists. Use `AW.ui.modelShot(product)` (agent 01) to pick the model image: first `male-*` in `product.images`, else `person-1`, else `images[0]`. The female Printify mockups (`person-*`, `lifestyle`, `duo`) are secondary: never in hero/marketing areas, allowed only deeper in PDP galleries. Wherever this doc says `person-1` or `duo` below, read "`AW.ui.modelShot(product)`".

**Print artwork** (`images/brand/art/`, cropped JPGs on white, show with `mix-blend-mode: multiply` on light surfaces so the white disappears; on dark sections place them on a `--c-tile` or white panel):
- `lips-logo.jpg` (724x644): THE hero centrepiece and recurring signature.
- `ceo-print.jpg`, `zero-exes-print.jpg`, `need-a-hug-print.jpg`, `sweet-cupcake-print.jpg`, `captain-save-sheet.jpg`: "The print" detail slide on PDPs and editorial blocks. Map: `ceo-of-bad-decisions`→ceo-print, `zero-exes`→zero-exes-print, `need-a-hug`→need-a-hug-print, `sweet-cupcake`→sweet-cupcake-print, `captain-save`→captain-save-sheet, `signature-lips`→lips-logo. `AW.ui.artFor(productId) -> src|null` (agent 01) holds this map.
- `hotdog-print.jpg`: a NEW design, not a product yet. Use only as a "Next drop / Coming soon" teaser (home), never with a price or Add to Bag.
- `logo-*.jpg`: reference for the wordmark; may appear in an editorial "about" block.
- **Real faces rule:** `need-a-hug` and `sweet-cupcake` prints contain real people's faces. Never use those prints or their product images in the hero, collection panels, marquee, marketing blocks, social share image or ads. They appear only on their own product page, in shop/related grids as normal cards, and in the bag. For those two, cards show the `front`/`back` that doesn't feature the face as primary where possible (`need-a-hug`: `back`; `sweet-cupcake`: `front`).

**Texture:** a subtle film grain (`--grain`, opacity .06 to .1, `mix-blend-mode: multiply` on light, `screen` on dark) on hero and dark editorial sections only, as a `::after` pseudo-element. It makes flat mockups feel printed. Never on product tiles in grids.

**The tile trick (makes cheap mockups look like a studio shoot):** every product image sits in a `.media` box with `background: var(--c-tile)` and the `<img>` uses `mix-blend-mode: multiply`. Pure white becomes the warm off-white tile, so every shot looks like one consistent grey-white studio set, and letterboxing is invisible.
- **Contain shots** (`front`, `back`, `folded`): `object-fit: contain` with `padding: 6%` inside the tile, so sleeves are never clipped and the tee "floats".
- **Cover shots** (`person-1`, `person-2`, `duo`, `lifestyle`, `hanging-1`): `object-fit: cover`, `object-position: 50% 20%` (keep faces/chests in frame).
- `AW.ui.fitFor(src)` returns `"contain"` or `"cover"` by filename. Everyone uses it.
- Tiles keep their light colour even in dark sections. On black, a light tile reads like a framed print. That's intended.
- Never add drop shadows, borders or rounded corners to product images. Radius `--r-0`. Edges are crisp.

**Which angle where**
| Context | Primary | Secondary |
|---|---|---|
| Product card (4:5) | `images[0]` (contain: the print side) | hover/focus swap to `person-1` (cover) |
| PDP gallery (1:1) | all `images` in order | none |
| Home collection panels | see map below | none |
| Bag line / search result (1:1, small) | `images[0]` (contain) | none |
| Social share / OG | brand agent composes | none |

**Home collection panel map** (by product id, stable):
- `signature` → `signature-lips` `back.jpg` (contain, the lips, big) with `duo.jpg` as the desktop hover image
- `bad-decisions` → `ceo-of-bad-decisions` `back.jpg` (contain), hover `duo.jpg`
- `no-filter` → `captain-save` `person-1.jpg` (cover), hover `front.jpg`

**Ratios:** cards `4/5`, PDP and thumbs `1/1`, editorial `3/4` (mobile) / `4/5` or `1/1` (desktop). Always set `aspect-ratio` on `.media` (no layout shift), plus `width="1000" height="1000"` on every `<img>`.

**Loading:** `loading="lazy" decoding="async"` everywhere except the first collection panel image on home and the first PDP image (`loading="eager" fetchpriority="high"`). Images fade in when loaded (`.media img` opacity 0 → 1 over `--dur-3` once `.is-loaded` is added by ui.js). Hover images are lazy and only load near the viewport.

## 7. Layout

- **Container:** `.container` = `max-width: var(--maxw); margin-inline: auto; padding-inline: var(--gutter)`.
- **Sections:** `.section` = `padding-block: var(--section-y)`. Big empty space between sections is part of the look. Don't fill it.
- **Product grid** (`.product-grid`, owned by agent 01, used by home/shop/pdp): 2 columns < 900px, 3 columns 900 to 1439px, 4 columns ≥ 1440px. Gaps `--grid-gap-x` / `--grid-gap-y`. On phones products flow **downward** in 2 columns: no horizontal product carousels anywhere on mobile.
- **Display type is allowed to be huge** and to touch the gutters. Headlines in Anton may wrap word-by-word on phones; that's fine. Never let a single word overflow at 375px: test the longest collection name ("BAD DECISIONS CLUB") at `--fs-d1`.
- **Hairlines** (`1px solid var(--c-line)`) organise everything: no boxes, no cards with shadows.
- No horizontal page scroll at 375px, ever. Use `overflow-x: clip` on wide decorative elements (marquee, mega wordmark), never on `body`.

## 8. Shared components (agent 01 builds, everyone uses)

All return **HTML strings** unless stated. All escape their own text inputs with `AW.esc`.

```
AW.ui.img(src, { alt, ratio = "1/1", fit = AW.ui.fitFor(src), eager = false, className = "", sizes }) -> string
    <div class="media media--{fit} {className}" style="aspect-ratio:{ratio}"><img ... width=1000 height=1000></div>
AW.ui.fitFor(src) -> "contain" | "cover"
AW.ui.altFor(product, src) -> "CEO of Bad Decisions Tee, back view"   (front|back|on model|lifestyle|folded|hanging|two models)
AW.ui.card(product, { size = "md" | "lg", eager = false, quickAdd = true, index = 0 }) -> string
AW.ui.btn(label, { href, variant = "primary"|"secondary"|"ghost"|"inverse"|"link", size = "sm"|"md"|"lg",
                   icon, iconAfter, block = false, attrs = "" }) -> string   (<a> if href, else <button type="button">)
AW.ui.icon(name, { size = 20, label }) -> inline SVG string (aria-hidden unless label)
    names: bag, search, menu, close, arrow-right, arrow-left, arrow-up-right, chevron-down, chevron-left,
           chevron-right, plus, minus, check, truck, return, shield, ruler, zoom, lips, instagram, tiktok,
           facebook, whatsapp, mail, trash, lock
AW.ui.price(product, size?) -> '<span class="price">R649</span>' (uses AW.priceFor; adds data-price)
AW.ui.badge(text, { tone = "red" | "ink" | "white" }) -> string
AW.ui.chip(label, { active = false, attrs = "" }) -> string      (<button class="chip" aria-pressed>)
AW.ui.eyebrow(text) -> string
AW.ui.sectionHead({ eyebrow, title, accent, link: { label, href } }) -> string
AW.ui.logo({ size = "md" }) -> string   (AWEZA wordmark in Anton + optional lips glyph)
AW.ui.lockScroll(on: boolean)           (reference-counted body scroll lock; safe for nested drawers)
AW.ui.trapFocus(containerEl) -> release()  (Tab cycles inside; returns function to undo)
AW.ui.toast(msg)                        (alias of AW.toast; renderer listens on AW.on("toast"))
```

Primitives in base.css: `.btn` (+ `--primary|--secondary|--ghost|--inverse|--link`, `--sm|--lg`, `--block`, `.is-loading`, `.is-done`), `.chip`, `.card`, `.media`, `.price`, `.badge`, `.eyebrow`, `.container`, `.section`, `.product-grid`, `.visually-hidden`, `.skip-link`, `.t-display`, `.t-accent`, `.t-red`, `.field` (label + input + error), `.select`, `.accordion` (styles for native `<details class="accordion">`).

**Buttons:** pill (`--r-pill`), min-height 52px (`lg` 60px), Archivo 600 `--fs-sm` uppercase `--ls-caps`. Primary = ink bg / white text; hover: background stays ink, a white sheen sweeps across (pseudo-element translateX, `--dur-4`), arrow icon nudges 4px right. Pressed: scale(.98). Inverse = white on dark sections. Focus: 2px `--c-focus` outline offset 3px on everything.

**Card anatomy** (`.card`): `<article class="card" data-reveal="up">` → `<a class="card-link" href="#/product/{id}">` → `.card-media` (4:5 tile, primary image + `.card-img-alt` hover image, badge top-left, desktop "Quick add" size strip slides up from the bottom of the image on hover/focus-within) → `.card-info`: name (Archivo 500 `--fs-sm`, 2 lines max), collection name (muted `--fs-xs`), price (Archivo 600). Hover (only `@media (hover:hover)`): primary fades out, alt fades in with scale 1.04 → 1 over `--dur-4 --ease-out`. Quick add buttons have `data-quick-add="{id}" data-size="{size}"`; ui.js handles them with one delegated listener (calls `AW.cart.add`, then `AW.motion?.flyToBag(imgEl)`), and they `stopPropagation` so they don't follow the link. No quick add on touch devices.

## 9. Motion

**Principles**
1. **Confident, not bouncy.** Default `--ease-out`, durations `--dur-3`/`--dur-4`. Spring only on tiny things (badge pop, tick).
2. **Reveal once.** Things rise 24px and fade in as they enter, once. Nothing re-animates on scroll back.
3. **Type is the hero.** Big headlines rise line-by-line from behind a mask. Images unveil with a clip-path wipe plus a 1.08 → 1 scale.
4. **Never block content.** HTML is fully visible by default. Hidden states apply only under `html.mo-ready`, which motion.js adds after it's running. If JS fails, the site is static and complete.
5. **Reduced motion = no movement.** With `prefers-reduced-motion: reduce`: no transforms, no parallax, no marquee movement, no curtain, no fly-to-bag; opacity fades ≤ 120ms at most. motion.js adds `html.mo-reduced` and never adds `mo-ready` hiding.
6. **Cheap.** Only `transform`, `opacity`, `clip-path`. IntersectionObserver for reveals, one rAF loop for parallax that only runs while a parallax element is in view. No scroll listeners doing layout reads.

**Libraries (now allowed, loaded only by the integrator in index.html):** GSAP 3.12.5 + ScrollTrigger (`https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js`, `.../3.12.5/ScrollTrigger.min.js`) and Lenis 1.1.13 (`https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js`), as `window.gsap`, `window.ScrollTrigger`, `window.Lenis`. Rules:
- Always feature-detect (`const G = window.gsap, ST = window.ScrollTrigger;`) and fall back to CSS/IO/WAAPI. The site must work fully without them.
- **motion.js owns** Lenis setup (smooth wheel on fine pointers only; native touch scroll on phones; off in reduced motion), `gsap.registerPlugin(ScrollTrigger)`, wiring Lenis to ScrollTrigger (`lenis.on("scroll", ScrollTrigger.update)` + gsap ticker), and `ScrollTrigger.refresh()` after each route render and after images load. It exposes `AW.motion.lenis` (or null), `AW.motion.scrollTo(target)`, `AW.motion.stop()/start()` (drawers call these to freeze smooth scroll while open; `AW.ui.lockScroll` calls them automatically).
- **Page agents** may create their own ScrollTriggers/timelines for signature moments, but must collect them and kill them on `AW.on("route")` (`trigger.kill()`, `tl.kill()`), and must use `gsap.matchMedia()` so pinned/horizontal effects run only ≥1024px and never under reduced motion.
- Expected signature scroll moments: pinned home hero where the lips scale/reveal (03), desktop horizontal-scroll product rail (03), split text rising (07 via `data-reveal="lines"`), image clip-path reveals (07), magnetic buttons (07), fly-to-bag (07).

**Data-attribute contract (other agents put these in their markup; motion.js does the rest)**

| Attribute | Values | Effect |
|---|---|---|
| `data-reveal` | `up` (default), `fade`, `scale`, `left`, `right`, `img`, `lines` | Element starts hidden (under `.mo-ready`), gets class `is-in` when 15% visible. `img`: clip-path `inset(100% 0 0 0)` → `inset(0)` and inner img scale 1.08 → 1. `lines`: text split into lines/words wrapped in masks; each rises from 100% with stagger. |
| `data-reveal-delay` | ms, e.g. `"120"` | Extra delay before this element animates. |
| `data-stagger` | on a parent; optional ms step (default 70) | Children with `data-reveal` get incremental delays in DOM order (capped at 8 steps so long grids don't lag). |
| `data-split` | `words` \| `chars` | Used with `data-reveal="lines"` on headings. motion.js splits text nodes only (keeps inner `<em>` etc.), sets `aria-label` with the original text and `aria-hidden` on the pieces. `chars` only for ≤ 12-character words (wordmarks). |
| `data-parallax` | factor, e.g. `"0.12"` (−0.3 to 0.3) | translateY = (element centre − viewport centre) × factor. Disabled < 600px wide if factor > 0.15, and in reduced motion. |
| `data-marquee` | speed px/s (default 60) | Children duplicated to fill 2× width; infinite translateX loop via WAAPI; pauses on hover, on `focus-within`, offscreen, and in reduced motion. Duplicates get `aria-hidden`. |
| `data-magnetic` | strength 0 to 1 (default .3) | Fine pointers only: element eases toward cursor within its bounds, springs back on leave. For hero CTAs and the PDP Add to Bag. |
| `data-bag-target` | (no value) | Put on the header bag button by nav.js. Destination for fly-to-bag. |
| `data-count-to` | number | Counts up from 0 when revealed (formatted with `AW.rand` if `data-count-format="rand"`). |

Classes motion.js sets: `html.mo-ready`, `html.mo-reduced`, `.is-in` on revealed elements, `.mo-split-*` internals. Other agents never write transitions for these; they only add attributes. Agents may still write their own hover/state transitions in their own CSS using the motion tokens.

**JS API** (`AW.motion`, always call defensively: `AW.motion && AW.motion.flyToBag(img)`):
```
AW.motion.refresh(root = document)    // scan root for new [data-*]; called automatically by a MutationObserver
AW.motion.flyToBag(fromEl) -> Promise // clone of fromEl (image) arcs to [data-bag-target], 480ms; resolves immediately if reduced/no target
AW.motion.reduced -> boolean
```

**Page transitions (signature moment):** motion.js intercepts same-origin clicks on `a[href^="#/"]` (no modifier keys, not `target=_blank`, not the current hash). It plays a **curtain**: a full-screen ink panel `.mo-curtain` (with a small red lips glyph centred) wipes up from the bottom (`--dur-2`, `--ease-in`), then sets `location.hash`. On `AW.on("route")` the curtain wipes off the top (`--dur-3`, `--ease-out`) while `#app` fades/rises in 16px. Total navigation overhead ≤ 300ms before new content. Back/forward buttons (hashchange without click) skip the curtain and just do the enter animation. Reduced motion: no curtain, instant.

**First-visit intro (once per session, sessionStorage `aw-intro`):** ink screen, "AWEZA" in `--fs-mega` Anton rises letter by letter (chars split, 40ms stagger), red lips glyph pops (spring), then the whole panel slides up revealing the home collections, ≤ 1.4s total, skippable by any tap/key, never shown on reduced motion or on non-home routes.

**Micro-interactions (owned by the named agent, using motion tokens):**
- Bag count bumps (scale 1 → 1.35 → 1, `--ease-spring`) on `cart:added` (nav).
- Add to Bag button: label slides up, replaced by check + "Added" for 1.6s (pdp).
- Size buttons: selected state fills ink with a 120ms press (pdp).
- Drawer lines stagger in (bag).
- Accordion chevron rotates 180° (base).
- Link underline draws left-to-right on hover (base: `.link-draw`).

## 10. Page-by-page layout

### Global chrome
- **Promo bar** (nav): ink, `--promo-h` tall, white `--fs-xs` caps. Three messages cross-fade every 4s (pause on hover/focus): "Free delivery over R1 500" (value from `AW.config.freeDeliveryOver`), "Printed to order. Shipped across South Africa.", "Sizes XS to 5XL". Scrolls away with the page.
- **Header** (nav): sticky, white, `--header-h`. Mobile: menu button left · AWEZA wordmark centred · search + bag right. Desktop ≥1024: wordmark left · links centre ("Shop All", then each collection name from `AW.collections`) · search + bag right. Hairline bottom border appears after 8px scroll. Hides on scroll down past 240px, reappears on scroll up (translateY, `--dur-3`); updates `--nav-offset` on `<html>`. Never hides while a drawer is open or on the checkout route.
- **Bag button:** icon + count badge (red circle, white Archivo 600 micro, hidden at 0). `aria-label="Bag, 2 items"`. Click → `AW.emit("cart:open")`.
- **Footer** (pages): ink (`data-theme="dark"`), see §10 Footer.

### Home (`#/`)
1. **Lips hero (signature moment).** White, grain overlay. `lips-logo.jpg` HUGE (mobile: ~92vw wide, desktop: ~62vw, multiply blend), slightly off-centre right; headline "Say it with your *back*." in DM Serif Display `--fs-d1` set asymmetrically top-left, overlapping the lips; eyebrow, brand line "Time of your life." in italic, CTA "Shop the drop". Desktop (GSAP, ≥1024): section pins for ~120% of viewport height; on scroll the lips scale from 0.82 to 1.25 and drift, the headline splits apart (lines move in opposite directions), then the lips "open" onto the collections (clip-path circle shrink or wipe). Mobile: no pin; lips scale gently with a light parallax (`data-parallax`), headline lines rise in. The collections begin within the first 1.2 screens on phones (owner: front page opens on collections).
2. **Collections.** One panel per collection, in `AW.collections` order, numbered 01/02/03. Asymmetric: panels are not equal boxes (vary image size/offset, name alignment left/right).
   - Mobile: panels stack **downward**, each ~78svh (so the next one peeks). Panel = full-width tile with the mapped image, giant collection name in Anton `--fs-d1` overlapping the image bottom, index numeral, tagline in Instrument Serif, "Shop the collection →" link, product count ("3 tees"). Panel 02 uses `data-theme="dark"` (ink background, image sits in an inset tile) to create rhythm: light / dark / light.
   - Desktop ≥1024: the three panels sit side by side as tall columns (height `calc(100svh - var(--header-h) - var(--promo-h))`, min 620px). Hover/focus a column: it grows (flex 1 → 1.7, `--dur-4 --ease-out`), its image swaps to the hover image, the others dim slightly (opacity .55 on their images). Whole column is one link.
   - Load: columns rise in with stagger, images clip-reveal, names split-rise.
3. **Marquee band** (ink, Archivo 800 uppercase `--fs-h1`, white, red lips glyph separators, `data-marquee`).
4. **The Rail:** all products. Desktop ≥1024: pinned horizontal-scroll rail (GSAP), large cards of varying width, a big counter "01/07", the section title fixed at left. Mobile (and no-GSAP fallback): normal 2-column `.product-grid` flowing downward (owner rule: no sideways product carousels on phones).
5. **The Back Story** (editorial, asymmetric): `ceo-print.jpg` artwork huge and cropped off the edge (multiply), beside sticky text: "The front is polite. The back says what you meant." + a vertical list of back-print tees as big serif text links with a hover image preview following the cursor on desktop. (Only non-face prints: ceo, zero-exes, signature.)
6. **Signature spotlight** (dark, grain): the lips again on a white panel, cropped tight to the teeth, "The lips that started it all." price, link to PDP and the Signature Line.
7. **Next drop teaser:** `hotdog-print.jpg` tall on the right, "Next drop. Cooking." style line (brand agent may refine), "Get first dibs" scrolls to the footer newsletter. No price, no Add to Bag.
8. **Promise strip:** 4 items with icons, hairline-separated, left-aligned: Printed to order · Delivery across SA · Secure checkout · Sizes XS–5XL.

### Shop (`#/shop`, `#/shop/<collection-id>`, `#/shop/all`)
- Header block: eyebrow (count, e.g. "7 tees"), title in Anton `--fs-d1` (collection name or "SHOP ALL"), tagline in accent italic.
- Sticky toolbar under the header (`top: var(--nav-offset)`): horizontally scrollable collection chips (All + each collection; navigates), Sort select (Featured / Newest / Price low–high / Price high–low), Filter button opening a size filter sheet (sizes from all products; shows products available in the chosen size). Count updates live.
- Grid: `.product-grid`; after the 4th card on "all", insert one **editorial tile** (dark, spans 1 cell on mobile, 2 on desktop) with a cheeky line and link to a collection.
- Changing sort/filter re-renders the grid with a quick fade (cards keep `data-reveal`).
- Empty state: "Nothing in that size yet. Bold request." + clear filters.

### Product (`#/product/<id>`)
- **Mobile:** full-bleed square gallery (scroll-snap, swipe sideways), counter pill "1 / 8" bottom-right, progress dashes bottom, **Front/Back toggle pill** top-left that jumps to the front or back slide. Under the gallery: collection eyebrow (link), name in Anton `--fs-h1`, price (updates with size upcharge), summary, size grid, size-guide link, Add to Bag (full width, `data-magnetic`), accordions (Details incl. `fit`, Delivery, Returns, Care), trust row. **Sticky buy bar** slides up from the bottom when the main Add button leaves the viewport: thumb, name, price, Add to Bag (if no size: scrolls to sizes and shakes them).
- **Desktop ≥1024:** two columns. Left (≈ 58%): main square image with arrow buttons + keyboard arrows, vertical thumbnail rail to its left. Right (≈ 42%): sticky info panel (`top: calc(var(--nav-offset) + var(--sp-6))`).
- **Zoom:** tap/click main image → full-screen viewer in `#overlay-root` (ink background), image at 2× with pan following pointer/drag, swipe/arrow between images, Esc/close button, focus trapped.
- **Related:** "Complete the statement": same collection first, then others, max 4, `.product-grid`.

### Bag drawer (`#cart-root`)
- Right-side drawer `--drawer-w` (full width on phones), scrim `--c-scrim` with fade; panel slides in `translateX(100%) → 0` over `--dur-4 --ease-out`; lines stagger in. Esc, scrim click and close button close it; focus trapped; focus returns to opener.
- Header: "YOUR BAG" in Anton + count. Free-delivery progress (red fill animates to new width). Lines: 1:1 thumb (contain), name, size, colour, qty stepper (−/+, 44px targets), remove (trash icon), line total. Footer (sticky in panel): subtotal, delivery ("Free" or price), total, **Checkout** (primary, block), "Keep shopping" (link). Small "You might also like" (2 products not in the bag, compact cards) when there's room.
- Empty: Anton "YOUR BAG IS EMPTY." + accent "Bold of you." + collection chips.

### Checkout (`#/checkout`, plus `#/checkout/success`, `#/checkout/cancelled`, `#/checkout/failed`)
- Calm, focused, no promo noise. Mobile: collapsible "Show order summary · R1 298" bar on top, then the form. Desktop: form left (max 640px), summary right (sticky, tile background).
- Form sections: Contact (email, mobile), Delivery address (first name, last name, street address, apartment/complex (optional), suburb, city, province `<select>` of the 9 provinces, postal code 4 digits), delivery notes (optional). Inline validation on blur, error text in red with an icon, `autocomplete` attributes set.
- Pay button: "Pay R1 298" with lock icon. Calls `window.AW_PAY(order)` if defined (shows loading state); otherwise shows the "Payments are launching soon" panel. The order shape is fixed in §11.

### Footer (`#footer-root`, dark)
- Top: newsletter (headline "FIRST DIBS ON NEW DROPS.", email field + button; no backend: show success toast and keep nothing; note TODO). Columns (accordions on mobile, columns on desktop): Shop (collections from data), Help (Delivery, Returns, Size guide, FAQ), AWEZA (About, Terms, Privacy), Follow (icons, links `#` placeholders). Business info block (ECT Act placeholders). Bottom: **mega wordmark "AWEZA"** in Anton `--fs-mega`, edge to edge, clipped by its line box, lips glyph in red; © year, "Prices include VAT where applicable" (placeholder note for owner).

### Content pages (`#/about`, `#/help`, `#/size-guide`, `#/terms`, `#/privacy`, `#/returns`, `#/404`)
Editorial template: Anton page title `--fs-d1`, accent subtitle, `--maxw-text` body, hairline-separated sections, sticky side index on desktop for long pages. Legal pages carry a visible "DRAFT: for owner review" banner.

## 11. Cross-module contracts

**Events** (core bus, `AW.on` / `AW.emit`): core's `route`, `cart`, `cart:added`, `toast`, `cart:open`, plus these agreed additions:
- `cart:close`: anyone may request the bag to close.
- `search:open`: open the search overlay (nav owns it).
- On `route`, every overlay owner closes its overlay (bag, menu, search, zoom).

**Add-to-bag choreography:** caller runs `AW.cart.add(id, size)` then `AW.motion && AW.motion.flyToBag(imgEl)`. cart.js opens the drawer on `cart:added` after a 420ms delay (0 in reduced motion). nav bumps the count. No toast on add.

**`#overlay-root` is shared and append-only.** Each module appends its own container (`.ui-toasts`, `.pdp-zoom`, `.nav-search`...) and never clears or re-renders `#overlay-root` itself.

**Scroll lock:** only through `AW.ui.lockScroll(true|false)` (reference-counted). Fallback if missing: toggle `document.documentElement.style.overflow`.

**Order object** passed to `window.AW_PAY(order)` (agent 06 builds it, agent 10 consumes it; server recomputes all money):
```js
{
  lines: [{ id: "zero-exes", size: "L", qty: 1 }],          // AW.cart.lines()
  customer: { email, phone, firstName, lastName },
  address: { line1, line2, suburb, city, province, postalCode, country: "ZA" },
  notes: "",
  totals: { subtotal, delivery, total, currency: "ZAR" }   // display only, in Rand (integers)
}
```
`AW_PAY` returns a Promise: on success it redirects the browser (never resolves meaningfully); on failure it rejects with `Error(userFacingMessage)`, which the checkout shows inline. Yoco return URLs: `<origin>/#/checkout/success`, `#/checkout/cancelled`, `#/checkout/failed`. The success route empties the bag.
Province values are the full names: Eastern Cape, Free State, Gauteng, KwaZulu-Natal, Limpopo, Mpumalanga, Northern Cape, North West, Western Cape.

## 12. Class-prefix map and ownership

| # | Agent | Files | Prefix |
|---|---|---|---|
| 01 | Design system | css/tokens.css, css/base.css, js/ui.js | primitives (`.btn .chip .card .media .price .badge .field .accordion .container .section .product-grid .t-*`) and `.ui-*` |
| 02 | Navigation | js/nav.js, css/nav.css | `.nav-*` |
| 03 | Home | js/home.js, css/home.css | `.home-*` |
| 04 | Shop | js/shop.js, css/shop.css | `.shop-*` |
| 05 | Product page | js/product.js, css/product.css | `.pdp-*` |
| 06 | Bag & checkout | js/cart.js, css/cart.css | `.bag-*`, `.co-*` |
| 07 | Motion | js/motion.js, css/motion.css | `.mo-*` |
| 08 | Footer & pages | js/pages.js, css/pages.css | `.ft-*`, `.pg-*` |
| 09 | Brand/SEO/copy | HEAD-META block, images/brand/*, site.webmanifest, values in data/products.js, docs/BRAND.md | none (no CSS) |
| 10 | Commerce backend | netlify.toml, netlify/functions/*, scripts/*, js/pay.js, docs/DEPLOY.md | none |

Integrator only: js/core.js, js/boot.js, index.html (except HEAD-META), mount points. Old v1 files (app.js, styles.css, products.js at root) are reference only and will be deleted; never link to them.

## 13. Shared engineering rules

- Vanilla JS, classic scripts, each file one IIFE: `(() => { const AW = window.AW; ... })();`. No modules, imports, frameworks, libraries, external scripts, npm.
- Use only token custom properties for colour, type, spacing, radius, shadow, z-index, easing and duration. Literal values only for 1px hairlines, percentages and the breakpoints above.
- Scope every selector with your prefix. Only agent 01 styles bare elements and primitives. Never style another agent's classes.
- Defensive coding: other modules may be missing while you build. `const ui = AW.ui || {}`; fall back to minimal local markup if a helper is absent. Never create or edit another agent's files.
- Render pages by setting `app.innerHTML` once, then binding events (prefer delegation on your root). Clean up global listeners you add per page (or guard them so re-renders don't stack).
- Accessibility: real `<button>`/`<a>`, visible focus, `aria-label` on icon buttons, `aria-expanded`/`aria-controls` on toggles, dialogs with `role="dialog" aria-modal="true"` + focus trap + Esc + focus return, alt text on every image (`AW.ui.altFor`), AA contrast, touch targets ≥ `--tap`.
- Performance: lazy images (except the one hero/first PDP image), `aspect-ratio` on media, IntersectionObserver/rAF only, passive listeners for touch/scroll. Keep each JS file under ~30KB and each CSS file under ~25KB unminified.
- Responsive: verify at 375, 390, 768, 1024 and 1440 wide. No horizontal page scroll at 375px.
- Verify with Playwright (see your brief): `python3 -m http.server <your port>` from /home/user/Ecom/aweza, `require('playwright')`, `chromium.launch()`, viewports 390x844 and 1440x900, zero console errors from your files, screenshots in your scratchpad folder, look at them, iterate until it looks premium. Kill only the server PID you started.
- No git commits. Finish with a report: files changed, what you built, contract needs for the integrator, known issues.

## 14. Anti-template rules (owner: "it must not look like AI slop")

- **No generic gradients**, glassmorphism, neon glows, emoji, sparkle icons, rounded "SaaS" cards with soft shadows, or three-equal-columns-of-icons as a main feature.
- **Not centred-everything.** Default alignment is left. Use asymmetric 12-column compositions on desktop (e.g. image spans cols 1–7, text cols 9–12 offset down by `--sp-9`). Break the grid on purpose once per section (an image bleeding off the edge, a headline overlapping an image).
- **Vary rhythm.** No two consecutive sections share the same layout. Grids may mix card sizes (`AW.ui.card(p, {size:"lg"})` spanning 2 cells) instead of identical tiles.
- **Huge type, real close-ups.** Use the print artwork and tight crops of the print (`object-position` on the chest/back graphic) as editorial imagery, not only full flat-lays.
- **Tactile details:** grain on hero/dark sections, hairline rules with small Archivo labels ("Fig. 01", "Drop 01 / 2026", "Printed in small batches"), numbered sections, the ™ on the wordmark, a hand-placed rotated sticker label (Archivo 800 on red, max one per page) like a price tag on the Signature spotlight.
- **Copy has a point of view** (see §2). If a line could appear on any other store, rewrite it.
- **Space is confidence.** Fewer elements, larger. When in doubt, remove.
