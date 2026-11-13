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

## 6. The struck-through "was R600" price
The tee pages show R600 struck through next to the real R450, because the tees were advertised to customers at R600 before the price was lowered. To keep that honest:
- **Keep the evidence:** screenshots of the messages, posts or pictures where you quoted R600, with dates. If a customer or the Advertising Regulatory Board ever asks, that is your proof the earlier price was real.
- **It switches itself off on 31 January 2027** (`AW.config.was.until` in `data/products.js`). A reference price should not stay on a product for ever. Do not extend it unless you genuinely still sell or advertise at R600.
- **Only for tees you actually advertised at R600.** Black Out Or Back Out and Time of Your Life were added later: if they were never advertised at R600, add `noWas: true` to them in `data/products.js` and the strike-through disappears for those two.
- Bigger sizes show the matching "was" price (R640 for 2XL, R670 for 3XL to 5XL). The bag, checkout and card total always use the real prices.

## 7. Need A Hug back print: check the colour in Printify
On 13 November 2026 the back print in Printify (`IMG_0319.jpeg`, large arched AWEZA) shows as **light grey with no stripes** in Printify's own mockup. The website shows it **black with thin white stripes** (3D shirt and the back photo), as requested. The shirt Printify prints follows the print file, not the website, so open the product in Printify, check the file's colour and add the stripes there, or the shirts customers receive will not match the site.
