# TEST B2B-03 — Bulk order with customisation (printing + colour change)

> **Paste this whole file into a fresh Claude-in-Chrome session.**

You are a QA tester driving a real browser against the live **Be Different Packaging**
storefront. This is the highest-value real-world scenario: an approved B2B customer orders
**bulk quantities with customisation**, including a **printing method AND a colour change
on the same line** (multi-customisation). This is where pricing/MOQ bugs surface most.

## HOW TO OPERATE (read first — applies to the whole session)
Act like a real human shopper:
- **Navigate by clicking** on-page elements (buttons, links, the cart icon) — **never type
  a URL** into the address bar except the one starting URL.
- **Stay in one tab**; don't hard-refresh or use the browser Back button unless told.
- **Type into fields** one at a time and Tab/click out (don't paste or set values via script).
- **Wait** for each action to register ("Adding…" → "Added to cart ✓", page transitions).
- **Verify each step worked** (open the cart and confirm the item is there) before moving on.
- Scroll to find elements below the fold. If a click won't work, stop and report what you saw.

## ⚠️ Safety
- LIVE Paystack — **never enter card details, never complete payment.** STOP at the Paystack
  page. The order is created before payment, so it stays verifiable.

## Precondition
Use the **approved B2B account** (e.g. `qa-b2b01-202606281430@testinbox.com` / `Test1234!`).
If not approved, run as any logged-in customer and note that — the funnel is identical.

## Steps

1. Log in, then click into a bottle product that offers **Silk Screen / Hot Stamping** AND
   **Colour Change**. Set quantity to **2500** (type it, click out). Record the **bottle
   unit price**.

2. **MOQ unlock check:** at 2,500 all customisation options should be **unlocked** (no
   "Available from N units" lock on Silk Screen, Hot Stamping, or Colour Change). Note any
   that are still locked.

3. **Tick BOTH** a printing method (Silk Screen *or* Hot Stamping) **and** Colour Change.
   - *Expected:* both stay ticked — printing and colour change are **independent** (you can
     have a printed *and* colour-changed bottle). Silk and Hot remain mutually exclusive
     (one printing method).
   - Record from the price summary: **P_bottle**, **P_print** (the printing line),
     **P_colour** (the colour-change line), and **P_total** (ORDER TOTAL).
   - Check: **P_total = P_bottle + P_print + P_colour**.

4. **Add to Cart** → wait for "Added ✓" → click the **cart icon** to open the cart. Record
   the **cart subtotal C_sub**.
   - *Expected (the key check):* **C_sub = P_total** — **both** add-ons are included; neither
     printing nor colour change is dropped. (Dropping either is the bug this catches.)

5. Click **Checkout** in the cart. Fill the address by typing (QA Tester, 12 Test Street,
   Cape Town, Western Cape, 8001, South Africa, +27 71 000 0000, a real email). Pick a
   shipping option (note **S**). Reach **step 3 Review**. Record review subtotal **R_sub**
   and total **R_total** (= R_sub + S).
   - *Expected:* **R_sub = C_sub** (both add-ons still included).

6. **Artwork:** if prompted to upload artwork, try it. *(If it errors "Failed to upload
   artwork to cloud storage", record it as a SEPARATE note — that's a known server-config
   item, `GOOGLE_SERVICE_ACCOUNT_JSON` — and continue if the UI allows.)*

7. **Confirm & pay →** step 4. Record the Paystack amount **D** (ZAR). **STOP — do not pay.**
   - *Expected:* **D = R_total**.

8. Open **Account → Orders → the new order**. Record **O_total**.
   - *Expected:* **O_total = D**; the line **itemises both add-ons** (e.g. "Silk Screen +
     Colour Change: +R…"); the line total includes both; and the **delivery address is
     populated** (not blank).

9. **Single-each regression (quick):** add a line with **only printing** and another with
   **only colour change**; confirm each prices correctly on its own.

## Acceptance criteria (PASS requires ALL)
- [ ] At 2,500 every customisation option is unlocked.
- [ ] Printing + colour change can both be selected (independent); silk/hot stay exclusive.
- [ ] **P_total = C_sub = R_sub** — both add-ons survive PDP → cart → review (nothing dropped).
- [ ] **D = R_total = O_total** to the cent, all in ZAR.
- [ ] The order **itemises both** add-ons and shows the populated delivery address.
- [ ] Single-printing-only and single-colour-only lines each price correctly.

## Known-risk watch-list
- **An add-on dropped** between PDP and cart (printing or colour change). Capture all figures.
- **Totals drift** at 2,500 (per-unit rounding magnified across the line — check the cents).
- **Order not itemising** the add-ons, or address blank on the order detail.
- **MOQ vs supplier MOQ** mismatch (should be clear at 2,500).

## Report
```
### B2B-03 result: PASS | FAIL | BLOCKED
Environment: <browser>, <date/time>, currency ZAR
Account: <email> (B2B Approved / other)
Qty 2500: P_bottle=R__ P_print=R__ P_colour=R__ P_total=R__
Cart C_sub=R__ (== P_total? Y/N)
Review R_sub=R__ S=R__ R_total=R__ ; Paystack D=R__ ; Order O_total=R__ (all equal? Y/N)
Both add-ons stayed selected? Y/N ; order itemises both? Y/N ; address populated? Y/N
Single-each regression OK? Y/N ; artwork upload: ok / failed-config
Order created: <SF-...>
BUGS / ISSUES:
- [SEVERITY] <title> — Step / Expected / Actual / Evidence / Reproducible
Notes:
```
