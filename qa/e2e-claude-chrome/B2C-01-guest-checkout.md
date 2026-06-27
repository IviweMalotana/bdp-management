# TEST B2C-01 — Guest checkout, happy path (no customisation)

> **Paste this whole file into a fresh Claude-in-Chrome session.**

You are a QA tester driving a real browser against the live **Be Different Packaging**
storefront. Execute every step in order, record what actually happens at each step, and
produce a bug report at the end. Be literal and skeptical — report anything that differs
from "Expected", however small.

## ⚠️ Safety rules (do not violate)
- The storefront uses **LIVE Paystack** payment keys. **Never enter card details and
  never complete a payment.** This test **STOPS at the Paystack payment page.**
- The order is created *before* payment, so stopping there still fully tests the funnel.
- Do not modify or cancel any order.

## Persona & objective
A first-time visitor (not logged in) buys bottles with **no printing/customisation**,
as a **guest**. Goal: confirm the path browse → product → cart → guest checkout →
shipping → review → payment page works and that prices/totals stay consistent.

## Test data
- Email: `qa-b2c01-<yyyymmddhhmm>@<your-inbox>` (a real inbox you control)
- Shipping: QA Tester, 12 Test Street, Cape Town, Western Cape, 8001, South Africa, +27 71 000 0000
- Currency: leave as default (ZAR / R).

## Steps

1. **Open** https://www.bedifferentpackaging.com .
   - *Expected:* Homepage loads, header shows nav (Shop, Customise, For Business, About,
     Contact, Track Order), a cart icon, and an Account link. No console-blocking errors.

2. **Click "Shop"** (or go to `/shop`).
   - *Expected:* A product grid loads (up to ~18 products). Left sidebar has a "Search…"
     box and a "CATEGORY" filter; top-right has a "SORT" dropdown.

3. **Open any in-stock bottle product** (click a product card → `/product/{slug}`).
   - *Expected:* Product detail page shows image gallery, product name, a variant
     selector (Size / Body Colour / Lid or Size / Colour / Finish), a **"Quantity
     (min N)"** control, a per-unit price, and an **"Add to Cart"** button. Note the
     stated **MOQ (min N)** and the **unit price**.

4. **Select a variant** (pick a Size, Colour/Body, Lid/Finish if offered).
   - *Expected:* A SKU updates; unit price may update per variant. Record the SKU.

5. **Set quantity to exactly the MOQ** shown (e.g. if it says "min 100", enter 100).
   Do **not** open the customisation/printing panel.
   - *Expected:* "Add to Cart" is **enabled**; the price summary shows `qty × unit =
     line total` and an **ORDER TOTAL** with no customisation lines. Record the ORDER TOTAL.

6. **Click "Add to Cart".**
   - *Expected:* Button shows "Adding…" then "Added to cart ✓"; the header cart badge
     increments to 1.

7. **Open the cart** (cart icon → drawer, then "View cart" or go to `/cart`).
   - *Expected:* Cart shows the item with correct SKU, quantity, unit price, and a line
     total **matching step 5**. "Order summary" shows Subtotal = line total, Shipping =
     "Calculated at checkout". A **"Proceed to checkout →"** button is present.

8. **Click "Proceed to checkout →"** (`/checkout`, step 1 Contact & address).
   - *Expected:* A form with Email, Shipping address fields, Country (default South
     Africa), Province (ZA dropdown), and a checked "Billing address same as shipping".

9. **Fill contact + shipping** with the test data, leave billing-same-as-shipping
   checked, click **"Continue →"**.
   - *Expected:* Advances to **step 2 "Choose shipping"** showing the destination and
     unit count, then one or more shipping option cards (name, transit days, price).
   - *Watch:* If shipping cards fail to load, record the exact error and STOP (this is a
     finding).

10. **Select a shipping option**, click **"Continue →"**.
    - *Expected:* **Step 3 "Review your order"**: item lines, Subtotal, the chosen
      Shipping line, and a **Total = Subtotal + Shipping**. Confirm the shipping address
      shown matches what you entered. (No artwork-upload section should appear, since
      there's no customisation.)

11. **Click "Confirm & pay →".**
    - *Expected:* **Step 4 "ready to pay"** with **"Total: R …"** equal to the step-10
      Total, and a **"Pay now with Paystack →"** button.

12. **Click "Pay now with Paystack →"** — then **STOP**.
    - *Expected:* A Paystack payment page/modal opens (email pre-filled) showing an
      amount that **matches the order Total in Rand**.
    - **Do NOT enter card details. Do NOT pay. Close the modal here.**

## Acceptance criteria (all must hold)
- [ ] Unit price × quantity = line total on the PDP, and that line total is unchanged in
      cart, review, and on the Paystack amount (plus shipping where applicable).
- [ ] MOQ control prevents adding below the stated minimum (verify: try setting quantity
      to MOQ−1 in step 5 — "Add to Cart" should disable and/or show "Minimum order is N
      units"). Restore to MOQ before continuing.
- [ ] Guest reached the payment page without being forced to log in.
- [ ] The Rand amount on the Paystack page equals the review-step Total.

## Known-risk watch-list (look hard here)
- **Total drift:** any mismatch between PDP ORDER TOTAL, cart subtotal, review Total, and
  the Paystack amount. Report the exact figures.
- **Shipping step failures** / empty shipping options for a ZA address.
- **Guest cart loss** when navigating between pages (item disappears from cart).
- **Currency:** the Paystack amount must be in **ZAR**; flag if any other currency shows.

## Report
Produce the standard bug report (see format below). Include the **SKU, quantity, and the
four figures** (PDP total, cart subtotal, review total, Paystack amount).

```
### B2C-01 result: PASS | FAIL | BLOCKED
Environment: <browser>, <date/time>, currency ZAR
Account/data used: guest, email <...>, SKU <...>, qty <...>
Figures: PDP=<R..> cart=<R..> review=<R..> paystack=<R..>
Steps completed: <x>–<y> of 12
BUGS / ISSUES:
- [SEVERITY] <title>
  - Step / Expected / Actual / Evidence / Reproducible
Notes:
```
