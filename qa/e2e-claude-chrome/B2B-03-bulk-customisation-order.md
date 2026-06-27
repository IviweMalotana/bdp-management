# TEST B2B-03 — Approved B2B bulk order WITH customisation at volume

> **Paste this whole file into a fresh Claude-in-Chrome session.**

You are a QA tester driving a real browser against the live **Be Different Packaging**
storefront. Goal: the highest-value real-world scenario — an approved B2B customer orders
**bulk quantities with printing**, where customisation MOQs actually matter. This is where
pricing/MOQ bugs surface most clearly.

## Precondition
Use the **approved B2B account** (from B2B-01 + ADMIN-01). If not approved yet, run as any
logged-in customer but note that in the report (the funnel is the same; only the account
type differs).

## ⚠️ Safety rules
- LIVE Paystack — **never pay.** STOP at the payment page. The order is created before
  payment, so it remains verifiable afterward.

## Steps

1. Log in (approved B2B). Open a bottle product that offers printing.

2. **Set a genuinely bulk quantity — 2,500** (a common customisation MOQ anchor). Record
   the bottle's per-unit price at 2,500.

3. **Open the customisation panel.** At 2,500 units, **all** printing options
   (Silk Screen, Hot Stamping) and **Colour Change** should be **unlocked** (no
   "Available from N units" lock).
   - *Watch:* If any option is still locked at 2,500, record its stated minimum.

4. **Tick Silk Screen Printing.** Record the **+R…/unit** and confirm the price summary
   adds a `Silk Screen (2500 units)` line. Compute expected surcharge = per-unit × 2500.
   - *Expected:* ORDER TOTAL = `(bottle unit × 2500) + (print unit × 2500)`.

5. **Also tick Colour Change** (its MOQ ~2,500 should now be met). Record its **+R…/unit**.
   - *Expected:* A third line appears; ORDER TOTAL increases by (colour unit × 2500).
   - *Watch:* Colour Change is a **flat per-unit** fee — confirm the charged figure matches
     what the UI states (suspected discrepancy between displayed and charged amount).

6. **Add to cart → `/cart`.** Confirm the cart subtotal equals the PDP ORDER TOTAL
   (bottle + silk screen + colour change, all × 2500). Record all figures.
   - *Watch (KNOWN RISK):* customisation surcharge being dropped or recalculated to a
     different value between PDP and cart/server — capture exact numbers.

7. **Checkout** to **step 3 review**. Confirm the **"Artwork / logo files"** section
   appears (because the order is customised) and **upload an artwork file** for the line.

8. **Confirm & pay →** to **step 4**. Record **"Total: R …"** and confirm it equals the
   review total. Open Paystack, confirm the **ZAR** amount matches, then **STOP — no pay.**

9. **Verify** the created order in `/account/orders`: correct bulk quantity, both
   customisations present, and total including all surcharges.

## Acceptance criteria
- [ ] At 2,500 units all customisation options are unlocked.
- [ ] Each customisation surcharge = stated per-unit × quantity, and the sum is identical
      across PDP → cart → review → Paystack.
- [ ] Colour Change flat fee charged matches the displayed figure.
- [ ] Artwork upload works; the bulk customised order is created and visible in the account.

## Known-risk watch-list (this test's whole point)
- **MOQ vs supplier MOQ mismatch:** the PDP customisation minimum (often shown as "from
  100") may differ from the **supplier-level** MOQ enforced server-side (e.g. 2,500 for
  some suppliers). At 2,500 you should be safely above both — but if the server still
  zeroes the customisation cost or rejects it, that's a **High** bug. Capture the server
  total vs the displayed total.
- **Surcharge dropped/changed** between PDP and cart (prime suspected bug).
- **Colour Change displayed-vs-charged** mismatch.
- **Totals drift** at large quantities (rounding across 2,500 units magnifies per-unit
  errors — check the cents).

## Report
```
### B2B-03 result: PASS | FAIL | BLOCKED
Environment: <browser>, <date/time>
Account: <email> (B2B Approved / other)
Qty: 2500; bottle unit=<R..>; silk screen/unit=<R..>; colour change/unit=<R..>
Figures: PDP total=<R..> cart=<R..> review=<R..> paystack=<R..>
Order created: <SF-...>
Steps completed: <x>–<y> of 9
BUGS / ISSUES:
- [SEVERITY] <title> — Step / Expected / Actual / Evidence / Reproducible
Notes:
```
