# TEST B2C-04 — Cart editing, MOQ enforcement & validation/empty states

> **Paste this whole file into a fresh Claude-in-Chrome session.**

You are a QA tester driving a real browser against the live **Be Different Packaging**
storefront. Goal: stress the **quantity/MOQ rules, cart editing, and form validation** —
the guardrails that stop bad orders. No payment is involved in this test.

## ⚠️ Safety rules
- Do not complete any payment. This test ends before payment.

## Steps — Part A: MOQ on the product page

1. Open a bottle product. Record its **MOQ** ("Quantity (min N)") and unit price.

2. **Enter quantity = MOQ − 1** (e.g. 99 if min is 100).
   - *Expected:* "Add to Cart" is **disabled** and/or a red message **"Minimum order is N
     units"** appears. The item cannot be added.

3. **Enter quantity = 0** and then a **negative** value and then a **non-numeric** value
   (type letters).
   - *Expected:* Control clamps to a valid value or blocks the input; never allows 0/
     negative/NaN to be added. Record exactly what each produces.

4. **Use the −/+ steppers** and the tier breakpoint pills (e.g. "100+", "500+") if present.
   - *Expected:* Clicking a tier pill sets that quantity and the **unit price updates to
     that tier's per-unit** price (volume discount). Record one tier's before/after price.

5. **Set quantity back to a valid value ≥ MOQ** and **Add to Cart**. Confirm it adds.

## Steps — Part B: cart editing

6. Open `/cart`. **Increase** the quantity using the cart's quantity control.
   - *Expected:* Line total and subtotal recompute correctly; the **per-unit price may
     change** if you cross a volume tier (note whether the cart re-prices by tier or keeps
     the old unit price — record which).

7. **Decrease** the quantity **below the product MOQ** within the cart.
   - *Expected (decide which the app does):* either it blocks/clamps to MOQ, or it warns,
     or it silently allows a sub-MOQ cart. **Record the actual behaviour** — a cart that
     allows below-MOQ quantities is a finding (the order may fail or under-charge later).

8. **Add a second, different product** to the cart, then **"Remove"** the first item.
   - *Expected:* Item is removed, subtotal updates, the remaining item stays. Cart badge
     count is correct.

9. **Remove all items.**
   - *Expected:* Empty state shows **"Your cart is empty."** with a **"Browse packaging →"**
     link. No leftover subtotal.

## Steps — Part C: checkout form validation

10. Add a valid item again, go to `/checkout` step 1. **Click "Continue →" with the form
    empty.**
    - *Expected:* Inline validation errors under required fields (Email, Recipient,
      Address line 1, City, Province, Postal code, Phone). Cannot advance.

11. Enter an **invalid email** (`abc`) and a **too-short postal code** (`1`), submit.
    - *Expected:* Specific field errors (invalid email; postal code min length). Record the
      exact messages.

12. Fix all fields with valid data and **Continue** to confirm the form then advances.

## Acceptance criteria
- [ ] Cannot add below MOQ from the PDP.
- [ ] Quantity control rejects 0 / negative / non-numeric.
- [ ] Tier pills change the per-unit price.
- [ ] Cart remove + empty state behave correctly.
- [ ] Checkout step 1 enforces required fields and email/postal formats.

## Known-risk watch-list
- **Sub-MOQ allowed in cart** after editing down (step 7) — does checkout later block it?
  If you can, try to proceed with a sub-MOQ cart and see if the server rejects it.
- **Tier re-pricing inconsistency** between PDP and cart (PDP shows tier price but cart
  keeps a higher/lower unit price).
- **Validation gaps** (advancing with blank/invalid fields).
- **Cart persistence** across reloads (refresh `/cart` — do items survive?).

## Report
```
### B2C-04 result: PASS | FAIL | BLOCKED
Environment: <browser>, <date/time>
Product/MOQ used: <SKU>, MOQ <N>
Steps completed: <x>–<y> of 12
BUGS / ISSUES:
- [SEVERITY] <title> — Step / Expected / Actual / Evidence / Reproducible
Notes (esp. step 7 sub-MOQ behaviour, step 6 cart re-pricing):
```
