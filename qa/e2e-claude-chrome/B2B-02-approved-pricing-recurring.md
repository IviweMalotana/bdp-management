# TEST B2B-02 — Approved B2B: login, volume-tier pricing, recurring orders

> **Paste this whole file into a fresh Claude-in-Chrome session.**

You are a QA tester driving a real browser against the live **Be Different Packaging**
storefront. Goal: verify an **approved B2B customer's** experience — login, the pricing
they see at volume, and access to **recurring orders** (an approved-only feature).

## Precondition
The account from **B2B-01** must have been **approved by ADMIN-01** first (its badge
should now read **"B2B Approved"**). Use that account's email + `Test1234!`.
If approval hasn't happened yet, this test is **BLOCKED** — report that and stop.

## ⚠️ Safety rules
- LIVE Paystack — **never pay.** Any checkout in this test STOPS at the payment page.

## Steps

1. Go to `/auth/login`, sign in with the approved B2B account.
   - *Expected:* Logged in; `/account` badge reads **"B2B Approved"**. The pending banner
     is gone.

2. **Verify approved-only features unlocked:** `/account` should now show a **"Recurring
   orders"** section with a **"Manage"** link.
   - *Expected:* The section is present (it was hidden while Pending in B2B-01).

3. **Pricing check (volume tiers):** open the **same product/quantity you recorded in
   B2B-01**. Compare the unit price.
   - *Expected / to determine:* The system has **one volume-based price list** (markup
     shrinks with quantity); approved B2B is **not** expected to see a separate secret
     price. Confirm the price at a given quantity **matches** the B2C/pending price for the
     same quantity. **Record both.**
   - *Watch:* If you (or the business) expected special B2B discounts and there are none,
     note that as a **business-requirements gap** (not necessarily a code bug) so it can be
     decided deliberately.

4. **Walk the volume tiers:** on the PDP, step the quantity through the tier pills
   (e.g. 100 → 500 → 1000 → 2500 → 5000). Record the **per-unit price at each tier**.
   - *Expected:* Per-unit price **decreases** as quantity rises (monotonic). Flag any tier
     where it increases or stays flat unexpectedly.

5. **Recurring orders — create one:** go to `/account/recurring` → create. Provide a name,
   frequency, contract start/end dates, and at least one product line.
   - *Expected:* The recurring order is created and listed with status **"Active"** and a
     "next order" date.
   - *Watch:* date validation (end must be after start), required fields, whether a B2B can
     actually reach/use this page.

6. **Pause then resume** the recurring order (if controls exist).
   - *Expected:* Status toggles Active ↔ Paused and persists on reload.

7. **(Optional) Place a normal order** as the B2B account through checkout to the Paystack
   page (then STOP). Confirm it behaves like a standard storefront order and appears in the
   account afterward.

## Acceptance criteria
- [ ] Approved account logs in and shows **"B2B Approved"**.
- [ ] Recurring-orders feature is now accessible (was hidden when Pending).
- [ ] Volume-tier per-unit price decreases monotonically across tiers.
- [ ] A recurring order can be created and paused/resumed.
- [ ] Pricing parity (or documented difference) vs the B2B-01 baseline is recorded.

## Known-risk watch-list
- **Approved-only gating:** confirm recurring orders are genuinely gated to Approved B2B
  (a Pending/B2C should be blocked — cross-check against B2B-01 step 4).
- **Tier monotonicity** breaks.
- **Recurring order date/required-field validation** gaps.
- **No B2B-specific pricing** — record as a requirements decision, not silently.

## Report
```
### B2B-02 result: PASS | FAIL | BLOCKED
Environment: <browser>, <date/time>
Account: <email> (B2B Approved)
Tier prices recorded: 100=<R..> 500=<R..> 1000=<R..> 2500=<R..> 5000=<R..>
Pricing vs B2B-01 baseline: <same/different> (<figures>)
Recurring order created: <id/name>, pause/resume: <worked?>
Steps completed: <x>–<y> of 7
BUGS / ISSUES:
- [SEVERITY] <title> — Step / Expected / Actual / Evidence / Reproducible
Notes:
```
