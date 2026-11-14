# AWEZA launch checklist (in order)

Tick these off from top to bottom. "You" = needs your accounts or decisions. "Me" = ask Claude to do it.
Detailed commands are in `docs/DEPLOY.md`; security in `docs/SECURITY.md`; leftovers in `docs/OWNER-TODO.md`.

## A. Business and money (this week)
- [ ] **You:** Register the business if you haven't (a company or sole proprietor), get a **business bank account**, and decide on VAT (needed once turnover passes R1 million in 12 months; you can register earlier).
- [ ] **You:** Sign up for **Yoco** (the online payments / Checkout API, not just a card machine) and finish its business verification. Add your **bank account** for payouts.
- [ ] **You:** In **Printify** (Wallet, then Payments) add a **credit or debit card that can pay in US dollars**, and a small Printify Balance if you like. Orders cannot go to print without it.
- [ ] **You:** Turn on **2-step login (2FA)** on Yoco, Printify, GitHub, Netlify, your email and domain registrar.

## B. Name and web address
- [ ] **You:** Choose and buy the domain (aweza.com and aweza.co.za are taken; getaweza.com and awezaclothing.com were free on 14 Nov 2026). Check the trademark register for the name first. Turn on the registrar's transfer lock.
- [ ] **You:** Create the Instagram, TikTok and Facebook pages and keep the handles.

## C. Put the site online (Netlify)
- [ ] **You:** Create a free Netlify account. Add the site from the GitHub repo (branch `claude/shopify-amboras-cost-chart`, or merge it to `main` first). Base directory `aweza`, no build command, publish directory `.`
- [ ] **You:** Add your domain in Netlify (Domain management) and follow its DNS steps at your registrar. HTTPS is automatic.
- [ ] **You:** In Netlify, Environment variables (mark as secret): `YOCO_SECRET_KEY` (test key first), `YOCO_WEBHOOK_SECRET` (step D), `PRINTIFY_API_TOKEN` (a **new** token, see below), `PRINTIFY_SHOP_ID=29483178`, `SITE_URL=https://your-domain`. Leave `PRINTIFY_AUTO_SEND` unset.
- [ ] **You:** Create a **new Printify token** (Printify, Account, Connections) and delete the old one: the old one was used during the build.
- [ ] **Me:** Set the canonical address, share-image addresses and social links in `index.html` once you tell me the domain. (Also `robots.txt` and `sitemap.xml`.)

## D. Test with fake money (Yoco TEST keys)
- [ ] **You:** Register the Yoco webhook with the test key (the command is in `docs/DEPLOY.md`, section 3) and put the `whsec_...` secret in Netlify. Redeploy.
- [ ] **You:** Place a test order (two tees, one 2XL, a friend-link code). Pay with Yoco's test card. Check: you land on "Paid. Good decision." with an **order number**; the bag empties; Netlify, Functions, `yoco-webhook` shows `printify_order_created`; Printify shows a `TEST-AW...` order with the right shirts and address.
- [ ] **You:** Cancel that test order in Printify (never send it to production). Try the **Cancel** and failure paths on Yoco's page too.
- [ ] **You:** Open **Track your order** with the test order number and email.
- [ ] **You:** Test on a real iPhone and a real Android phone: the rail, swipe to turn, Choose size / Add to bag, checkout with autofill, the friend link.
- [ ] **You:** Look at **every product in Printify** (front, back, sizes, mockups) and approve them. The new arched AWEZA backs were set up by Claude.

## E. Legal and trust pages (before real customers)
- [ ] **You:** Fill in `AW.config.business` in `data/products.js` (name, registration number, VAT number, email, phone, address, city, founder).
- [ ] **You (with an attorney):** Finish the Terms, Returns, Refunds and Privacy pages (the "[...]" placeholders), register the **Information Officer** with the Information Regulator (POPIA), and have the "was R600" and returns wording checked against the Consumer Protection Act. Then remove the "Draft" notice.
- [ ] **You:** Decide about the shirts that could cause complaints (real faces on Sweet Cupcake and Need A Hug, the superhero-style shield on Captain Save, the drink brands on Black Out). Get advice, or change the designs.
- [ ] **You:** Keep screenshots proving the earlier R600 price (the strike-through ends 31 Jan 2027).

## F. Go live
- [ ] **You:** In Yoco (Checkout API, How to connect), add your domain under **Verified Domains** and wait for approval.
- [ ] **You:** Switch Netlify to the **live** Yoco key, register the webhook again with the live key, update `YOCO_WEBHOOK_SECRET`, redeploy.
- [ ] **You:** Buy one real tee yourself. Approve it in Printify (Orders, Send to production). Check the parcel arrives and note the days: tell Claude, who will tune the delivery window.
- [ ] **You:** Keep auto-send off for the first weeks and approve orders by hand each day.
- [ ] **You:** Set the Drop 01 end date (`drop.ends` in `data/products.js`, currently 31 Dec 2026) to what you really want. After it, the shop refuses orders.

## G. Launch and look after it
- [ ] Share the site and the friend link; the referral reward is given by hand when someone sends you their code.
- [ ] Check Printify orders, Yoco payouts and Netlify function logs every day for the first two weeks.
- [ ] Watch margins: a weaker rand (past about R20 per US$) makes a single tee unprofitable. Prices are in `data/products.js`.
- [ ] Keep records for tax (income, Printify costs, Yoco fees) and file your returns.
