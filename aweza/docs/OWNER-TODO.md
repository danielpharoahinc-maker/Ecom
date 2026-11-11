# Owner to-do list (things only you can decide or provide)

Found in the 11 November 2026 audit. None of these can be guessed by the developer, and several are legal.

## 1. Fill in your business details (5 minutes)
Open `data/products.js` and fill in `AW.config.business`: `name`, `regNo`, `vatNo` (if registered), `email`, `phone`, `address`, `city`, `founder`.
The Help, Terms and Privacy pages then show the real details instead of "[Email]", "[Registered business name]" and so on.

## 2. Decisions the legal pages are waiting on (they still show as placeholders)
- Returns: how many days to report a problem, who pays return delivery, how long refunds take, and whether exchanges are offered. South African consumer law (CPA) rules apply: have an attorney check.
- Who the Information Officer is, and registering with the Information Regulator (POPIA).
- The courier names, the print method (for example direct-to-garment) and your fulfilment partner's details.
- Whether you are VAT registered (prices and the VAT wording depend on it).
- The "Draft" sticker on the legal pages stays until these are done.

## 3. Domain: do this when the site gets its real web address
- In `index.html` set `<link rel="canonical">`, `og:url`, and make `og:image`, `twitter:image` and the JSON-LD URLs absolute (WhatsApp and Facebook ignore relative images). The comment in the file shows where.
- Set the `SITE_URL` environment variable on Netlify.
- Add `robots.txt` and `sitemap.xml`.
- Share links (refer a friend) only work as real links once the site is on its domain.
- Fill in the Instagram, TikTok and Facebook links in the JSON-LD block (they still say REPLACE_ME).

## 4. Things on the shirts that could get you a complaint (your call)
- **Sweet Cupcake** shows a real, recognisable person's face (a public figure) on a cupcake.
- **Need A Hug** shows a real face on the front.
- **Captain Save A Ho** uses a shield that closely resembles a famous superhero emblem.
- **Black Out Or Back Out** shows two real drinks brands (a vodka and a beer).
Personality rights, trademark and (for alcohol imagery) advertising rules can all apply. Printify can also refuse or remove products. Get advice before spending on ads.

## 5. Before launch
- Place one real test order end to end (Yoco test mode, then a Printify order) and check tracking, the confirmation page and the Printify email to the customer.
- Decide whether to set `PRINTIFY_AUTO_SEND=true` so paid orders go straight to print (otherwise you approve each one in Printify).
- Log delivery times of the first 10 orders and tune `shipping.days` in `data/products.js`.
