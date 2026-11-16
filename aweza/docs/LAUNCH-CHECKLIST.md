# AWEZA launch checklist (in order)

Tick these off from top to bottom. "You" = needs your accounts or decisions. "Me" = ask Claude to do it.
Detailed commands are in `docs/DEPLOY.md`; security in `docs/SECURITY.md`; leftovers in `docs/OWNER-TODO.md`.

## A. Business and money (this week)
- [ ] **You:** Register the business if you haven't (a company or sole proprietor), get a **business bank account**, and decide on VAT (needed once turnover passes R1 million in 12 months; you can register earlier).
- [ ] **You:** Sign up for **Paystack** (the online payments / Checkout API, not just a card machine) and finish its business verification. Add your **bank account** for payouts.
- [ ] **You:** In **Printify** (Wallet, then Payments) add a **credit or debit card that can pay in US dollars**, and a small Printify Balance if you like. Orders cannot go to print without it.
- [ ] **You:** Turn on **2-step login (2FA)** on Paystack, Printify, GitHub, Netlify, your email and domain registrar.

## B. Name and web address
- [ ] **You:** Choose and buy the domain (aweza.com and aweza.co.za are taken; getaweza.com and awezaclothing.com were free on 14 Nov 2026). Check the trademark register for the name first. Turn on the registrar's transfer lock.
- [ ] **You:** Create the Instagram, TikTok and Facebook pages and keep the handles.

## C. Put the site online (Netlify)
- [ ] **You:** Create a free Netlify account. Add the site from the GitHub repo (branch `claude/shopify-amboras-cost-chart`, or merge it to `main` first). Base directory `aweza`, no build command, publish directory `.`
- [ ] **You:** Add your domain in Netlify (Domain management) and follow its DNS steps at your registrar. HTTPS is automatic.
- [ ] **You:** In Netlify, Environment variables (mark as secret): `PAYSTACK_SECRET_KEY` (test key first), `PRINTIFY_API_TOKEN` (a **new** token, see below), `PRINTIFY_SHOP_ID=29483178`, `SITE_URL=https://your-domain`. Leave `PRINTIFY_AUTO_SEND` unset.
- [ ] **You:** Create a **new Printify token** (Printify, Account, Connections) and delete the old one: the old one was used during the build.
- [ ] **Me:** Set the canonical address, share-image addresses and social links in `index.html` once you tell me the domain. (Also `robots.txt` and `sitemap.xml`.)

## D. Test with fake money (Paystack TEST keys)
- [ ] **You:** Paste the webhook URL into the Paystack dashboard (Settings, API Keys & Webhooks, Test webhook URL; see `docs/DEPLOY.md`, section 3). No extra secret is needed. Redeploy.
- [ ] **You:** Place a test order (two tees, one 2XL, a friend-link code). Pay with Paystack's test card. Check: you land on "Paid. Good decision." with an **order number**; the bag empties; Netlify, Functions, `paystack-webhook` shows `printify_order_created`; Printify shows a `TEST-AW...` order with the right shirts and address.
- [ ] **You:** Cancel that test order in Printify (never send it to production). Try the **Cancel** and failure paths on Paystack's page too.
- [ ] **You:** Open **Track your order** with the test order number and email.
- [ ] **You:** Test on a real iPhone and a real Android phone: the rail, swipe to turn, Choose size / Add to bag, checkout with autofill, the friend link.
- [ ] **You:** Look at **every product in Printify** (front, back, sizes, mockups) and approve them. The new arched AWEZA backs were set up by Claude.

## D2. Customer emails and tracking (do this after the domain is connected)
- [ ] **You:** Make a free **Resend** account (resend.com), add your domain, add the DNS records it shows at your registrar, and click Verify.
- [ ] **You:** In Resend create an API key. In Netlify add `RESEND_API_KEY` and `MAIL_FROM` (e.g. `AWEZA <orders@your-domain.com>`). Redeploy.
- [ ] **You:** On your computer run `node scripts/register-printify-webhooks.mjs https://your-domain.com` (with `PRINTIFY_API_TOKEN` set). Copy the `PRINTIFY_WEBHOOK_SECRET` it prints into Netlify. Redeploy.
- [ ] **You:** Place a test order with your own email: you should get the "Paid. Good decision." email and its **Track your order** button should open the tracking page with no typing.
- [ ] **You:** With your first real order, approve it in Printify and check you receive the "On its way" email with the tracking number, then the "Delivered" one.
- [ ] **You:** Once you've received our emails, set `PRINTIFY_NOTIFY_CUSTOMER=false` in Netlify so customers don't get Printify's shipping email as well.

## E. Legal and trust pages (before real customers)
- [ ] **You:** Fill in `AW.config.business` in `data/products.js` (name, registration number, VAT number, email, phone, address, city, founder).
- [ ] **You (with an attorney):** Finish the Terms, Returns, Refunds and Privacy pages (the "[...]" placeholders), register the **Information Officer** with the Information Regulator (POPIA), and have the "was R600" and returns wording checked against the Consumer Protection Act. Then remove the "Draft" notice.
- [ ] **You:** Decide about the shirts that could cause complaints (real faces on Sweet Cupcake and Need A Hug, the superhero-style shield on Captain Save, the drink brands on Black Out). Get advice, or change the designs.
- [ ] **You:** Keep screenshots proving the earlier R600 price (the strike-through ends 31 Jan 2027).

## F. Go live
- [ ] **You:** In Paystack (Checkout API, How to connect), add your domain under **Verified Domains** and wait for approval.
- [ ] **You:** Switch Netlify to the **live** Paystack key, set the live webhook URL in the Paystack dashboard, redeploy.
- [ ] **You:** Buy one real tee yourself. Approve it in Printify (Orders, Send to production). Check the parcel arrives and note the days: tell Claude, who will tune the delivery window.
- [ ] **You:** Keep auto-send off for the first weeks and approve orders by hand each day.
- [ ] **You:** Set the Drop 01 end date (`drop.ends` in `data/products.js`, currently 31 Dec 2026) to what you really want. After it, the shop refuses orders.

## G. Launch and look after it
- [ ] Share the site and the friend link; the referral reward is given by hand when someone sends you their code.
- [ ] Check Printify orders, Paystack payouts and Netlify function logs every day for the first two weeks.
- [ ] Watch margins: a weaker rand (past about R20 per US$) makes a single tee unprofitable. Prices are in `data/products.js`.
- [ ] Keep records for tax (income, Printify costs, Paystack fees) and file your returns.
