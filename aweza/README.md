# AWEZA storefront

A mobile-first, black and white storefront for AWEZA, a South African t-shirt brand.

## Run it locally
```
cd aweza
python3 -m http.server 8000
# open http://localhost:8000
```
No build step is needed: it's plain HTML, CSS and JavaScript.

## Files
- `index.html`: the page shell (header, cart drawer, footer)
- `styles.css`: all styling
- `products.js`: the product list, collections, sizes and prices (ZAR). Edit this to change products.
- `app.js`: pages (home, shop, product), the swipe gallery, and the cart

## Still to do
- Replace the placeholder shirt drawings with real Printify mockup images
- Connect checkout to a South African payment gateway (PayFast, Yoco or Paystack)
- Send paid orders to Printify through a small backend. The Printify API key must never go in these browser files.
