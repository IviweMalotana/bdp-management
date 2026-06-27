# RETEST B2C-RETEST-01 — Checkout total integrity (charged == shown)

> **Paste this whole file into a fresh Claude-in-Chrome session.**
> **Run this only AFTER the fix has been deployed** to the live storefront + API
> (the fix is on branch `claude/revenue-profit-analysis-jyqk7q`; it must be merged/
> deployed to Railway + Vercel first, or it won't be live yet).

You are a QA tester driving a real browser against the live **Be Different Packaging**
storefront. This is a **regression test** for a fixed Critical bug: the Paystack amount
previously exceeded the order review total (e.g. review R271,49 but Paystack R683,57)
because checkout charged a different shipping figure (and unit price) than the customer
was shown. Verify the charged amount now equals the shown amount **to the cent**.

## ⚠️ Safety rules
- LIVE Paystack — **never enter card details, never complete payment.** STOP at the
  Paystack page; verify the amount only. The order is created before payment, so coverage
  is complete without paying.

## What changed (so you know what "fixed" looks like)
- Shipping charged at checkout now equals the shipping **option you selected** in step 2
  (same YunExpress price you were shown), not a different back-end calculation.
- The per-unit price charged now matches the cart/PDP for **any** quantity, including
  quantities that aren't a round tier (it's interpolated the same way on both sides).

## Test — run the funnel TWICE, once per quantity below

You will do two passes to catch both fixed defects:
- **Pass A — anchor quantity:** use exactly the product MOQ (a round tier, e.g. 10 or 100).
- **Pass B — NON-anchor quantity:** use a deliberately odd number between tiers
  (e.g. if tiers are 100/250, use **175**; if MOQ 10 and next tier 50, use **37**). This
  is what exposed the unit-price divergence.

For **each** pass, record four figures and they must reconcile:

| Figure | Where | Must equal |
|--------|-------|-----------|
| **A. PDP order total** | product page price summary | = unit × qty (no customisation) |
| **B. Cart subtotal** | `/cart` | = A |
| **C. Review total** | checkout step 3 | = B + selected shipping |
| **D. Paystack amount** | step 4 + Paystack modal (ZAR) | = C, to the cent |

### Steps (repeat for Pass A, then Pass B)
1. Open a bottle product. Record MOQ + unit price.
2. Set the quantity for this pass (anchor for A; non-anchor for B). Record **A (PDP total)**
   and the **per-unit price shown**.
3. Add to cart → `/cart`. Record **B (cart subtotal)**. **B must equal A.**
4. Proceed to checkout. Step 1: fill the standard test address (QA Tester, 12 Test Street,
   Cape Town, Western Cape, 8001, South Africa, +27 71 000 0000). Continue.
5. Step 2: **record every shipping option's name + price.** Select one (note which) — call
   its price **S**.
6. Step 3 review: record **C (review total)**. **C must equal B + S** exactly.
7. Step 4: record the **"Total: R…"**. Click "Pay now with Paystack →"; record the
   **Paystack modal amount D** (must be **ZAR**). **D must equal C, to the cent.**
   **STOP — do not pay. Close the modal.**
8. (Pass B only) Confirm the **per-unit price** on the PDP/cart for the odd quantity is
   what was actually charged: D − S should equal (per-unit × qty) from step 2.

## ⚠️ If "Continue →" on step 1 seems to do nothing
This was a fixed bug. After the fix, a failed step-1 submit shows a **red banner**
("Please complete all required fields highlighted below.") and scrolls you to the top with
the offending field outlined. If you see that banner, a required field didn't register —
**re-enter it by actually typing (and pressing Tab/click out)** rather than pasting/JS-
setting the value, since programmatic value-setting can bypass the form's change handlers.
Then click Continue again. Also verify the **"Billing address same as shipping"** box is
ticked (the unticked billing path was previously un-submittable — confirm it now works too
by unticking, filling billing recipient/address/city/province/postal, and submitting).

## Acceptance criteria (PASS requires ALL)
- [ ] Pass A: A = B = C − S = D − S, and D is in ZAR. (totals reconcile at an anchor qty)
- [ ] Pass B: same reconciliation at a **non-anchor** quantity (interpolated price holds).
- [ ] The shipping charged (D − B) equals the **option price S you selected** in step 2 —
      not a larger surprise figure.
- [ ] No step shows a total greater than C.

## FAIL triggers (report immediately, Critical)
- Paystack amount **>** review total (the original bug — capture all four figures).
- Shipping charged ≠ the option you selected.
- Per-unit price charged (Pass B) ≠ the per-unit price shown on the PDP/cart.

## Also re-verify (quick, from the earlier round)
- **Cart persistence (was reported High):** during checkout step 1, change the **Country**
  dropdown to "United States", then navigate back to `/cart`. **Expected:** the cart still
  holds your item (it must NOT empty). Report if the cart clears. *(Note: the Country field
  is a shipping-address field, not a currency switch — it should not affect prices or cart
  contents.)*
- **Currency (was reframed to Medium):** confirm there is no customer-facing price in a
  non-ZAR currency that then gets charged in ZAR without indication. All prices and the
  Paystack amount should be ZAR (R). Note whether any "charged in ZAR" wording is present.

## Report
```
### B2C-RETEST-01 result: PASS | FAIL | BLOCKED
Environment: <browser>, <date/time>, currency ZAR
Deployed fix confirmed live? <yes/no/unknown>
Pass A (anchor qty <N>):    A=<R..> B=<R..> S=<R..> C=<R..> D=<R..>  reconciles? <yes/no>
Pass B (non-anchor qty <N>): A=<R..> B=<R..> S=<R..> C=<R..> D=<R..>  reconciles? <yes/no>
Cart persisted on country change? <yes/no>
Steps completed: <...>
BUGS / ISSUES:
- [SEVERITY] <title> — Step / Expected / Actual / Evidence / Reproducible
Notes:
```
