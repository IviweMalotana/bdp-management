# POST-DEPLOY VERIFICATION — checkout integrity (all fixes in one pass)

> **Paste this whole file into a fresh Claude-in-Chrome session.**
> Fixes are now deployed to production. This one session verifies them all.

You are a QA tester driving a real browser against the live **Be Different Packaging**
storefront (https://www.bedifferentpackaging.com). Execute every step in order, record
the figures, and finish with the PASS/FAIL report at the bottom. Be literal — report any
mismatch to the cent.

## ⚠️ Safety
- LIVE Paystack — **never enter card details, never complete a payment.** Stop at the
  Paystack page and read the amount only. Orders are created *before* payment, so you can
  still verify everything.

## Standard test data
- Email: `qa-postdeploy-<yyyymmddhhmm>@<your-inbox>` (a real inbox)
- Address: QA Tester, 12 Test Street, Cape Town, Western Cape, 8001, South Africa, +27 71 000 0000

---

## PART 1 — Checkout step 1 actually advances (fixed blocker)

1. Add any in-stock bottle (qty = its MOQ) to the cart, go to `/checkout`.
2. **Click "Continue →" with the form blank.**
   - *Expected (fix):* a red banner **"Please complete all required fields highlighted
     below."** appears and the page scrolls up; required fields show inline errors. (Before
     the fix it silently did nothing.)
3. Fill all fields **by typing** (recipient, address, city, province, postal, phone, email).
   Leave "Billing address same as shipping" ticked. Click **"Continue →"**.
   - *Expected:* advances to **step 2 "Choose shipping"** with shipping option cards.
4. **Billing path check:** go back, untick "Billing address same as shipping", fill the
   billing recipient/address/city/province/postal, Continue.
   - *Expected (fix):* it now advances (previously this path could never submit). Re-tick
     before continuing if you like.

## PART 2 — Totals reconcile: shipping fix (no customisation)

Do this twice — **Pass A: qty = MOQ** (anchor), **Pass B: an odd non-anchor qty** (e.g.
if tiers are 100/250 use 175; if MOQ 10/next 50 use 37). For each pass record:

| # | Figure | Where |
|---|--------|-------|
| A | PDP order total | product page |
| B | Cart subtotal | `/cart` |
| S | Selected shipping price | step 2 (record which option) |
| C | Review total | step 3 |
| D | Paystack amount (ZAR) | step 4 + modal |

- *Expected:* **A = B**, **C = B + S**, **D = C to the cent**, D is in **ZAR**.
- The shipping charged (**D − B**) must equal the **option price S you selected** — not a
  bigger surprise number. (This was the R65 shown vs R683 charged bug.)
- **STOP at the Paystack page; do not pay.**

## PART 3 — Totals reconcile: printing surcharge (customisation)

5. Open a product offering **Silk Screen / Hot Stamping**. Set a qty that unlocks printing
   (e.g. **2500**). Record bottle unit price.
6. Tick **Silk Screen Printing**. From the PDP summary record:
   **P_bottle**, **P_print** (the printing line), **P_total** (= P_bottle + P_print).
7. **Add to cart → `/cart`.** Record cart subtotal **C_sub**.
   - *Expected (fix):* **C_sub = P_total** — the printing surcharge is **included** in the
     cart (before the fix it vanished here).
8. Checkout to **step 3**. Record review subtotal **R_sub** (before shipping) + shipping
   **S2** → **R_total**.
   - *Expected:* **R_sub = C_sub** (printing still included).
9. Upload an artwork file if prompted. *(If it errors with "Failed to upload artwork to
   cloud storage", record it as a SEPARATE finding — that's a known server-config item, not
   this pricing test — and continue if the UI lets you.)*
10. **Confirm & pay →** step 4. Record **D2** = "Total: R…"; confirm Paystack shows the same
    **ZAR** amount. **STOP — do not pay.**
11. Open `/account/orders` → the new order. Record **O_total**.
    - *Expected:* **O_total = D2 = R_total**, and the customised line is present.
12. **Printing parity:** confirm the **per-unit printing** shown on the PDP equals the
    per-unit actually charged: `P_print/qty` vs `(O_total − P_bottle − S2)/qty`. They were
    ~7% apart before the fix and must now match.

## PART 4 — Quantity validation (quick)

13. On a product page, type a quantity **below MOQ** (e.g. MOQ−1), then `0`, then a letter.
    - *Expected (fix):* the **"Minimum order is N units"** error shows and **"Add to Cart"
      stays disabled** for sub-MOQ; on clicking away (blur) the field **clamps back to the
      minimum** and never rests on 0/negative/empty.

---

## PASS/FAIL — the whole session PASSES only if ALL hold
- [ ] Step 1 advances; blank submit shows the error banner; billing-unticked path submits.
- [ ] Part 2: A=B, C=B+S, D=C (both Pass A and Pass B); shipping charged = option selected.
- [ ] Part 3: C_sub = P_total (printing in cart); O_total = D2 = R_total; PDP printing
      per-unit = charged per-unit.
- [ ] Part 4: sub-MOQ blocked + field clamps.
- [ ] Every amount the customer is charged is in ZAR and never exceeds the review total.

## Report
```
### POST-DEPLOY result: PASS | FAIL | BLOCKED
Environment: <browser>, <date/time>, currency ZAR
Part 1 (step 1 advance / banner / billing path): <pass/fail + notes>
Part 2 Pass A (qty <N>):  A=<R..> B=<R..> S=<R..> C=<R..> D=<R..>  reconciles? <y/n>
Part 2 Pass B (qty <N>):  A=<R..> B=<R..> S=<R..> C=<R..> D=<R..>  reconciles? <y/n>
Part 3 (qty <N>): P_total=<R..> C_sub=<R..> R_total=<R..> D2=<R..> O_total=<R..>
        printing per-unit: PDP=<R..> charged=<R..>; artwork upload: <ok/failed-config>
Part 4 (qty validation): <pass/fail>
BUGS / ISSUES:
- [SEVERITY] <title> — Step / Expected / Actual / Evidence / Reproducible
Notes:
```
