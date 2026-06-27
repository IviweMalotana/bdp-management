# TEST ADMIN-02 — Staff walk a storefront order through the status pipeline

> **Paste this whole file into a fresh Claude-in-Chrome session.**

You are a QA tester driving a real browser against the live **Be Different Packaging**
**admin portal** (staff only). Goal: find a **storefront (B2C) order**, move it through the
status pipeline (**Placed → Processing → … → Delivered**), confirm the **Customisation
Accepted** stage appears only for customised orders, and that **Cancelled** is available.

## ⚠️ Safety rules
- Live admin portal. **Only manipulate a TEST order** you created (e.g. from B2C-01/02/
  B2B-03). **Never change the status of a real customer's order.** Match by the test email
  / `SF-…` number you recorded.

## Important context for the tester (two order vocabularies)
The app has **two order status sets**:
- **Storefront/B2C orders** use: `Placed → Processing → [Customisation Accepted] →
  Ready to Ship → Shipped → Delivered` (+ `Cancelled`). These appear under the
  **"Legacy Orders" / `/orders`** section of the admin.
- **B2B admin orders** use a different set (`Draft → Confirmed → InProduction → Shipped →
  Delivered`) under **`/b2b-orders`**.
For THIS test, work with a **storefront order under `/orders`**. If you can't find your
order there, also check `/b2b-orders` and **report where it actually lives** (a misfiled
order is itself a finding).

## Credentials
`<ADMIN_EMAIL>` / `<ADMIN_PASSWORD>`.

## Precondition
A test order exists. Ideal: one **with customisation** (from B2C-02 or B2B-03) so you can
verify the conditional "Customisation Accepted" stage, plus optionally one **without**
customisation (from B2C-01) to confirm that stage is absent.

## Steps

1. Sign in at `/login`. Go to **`/orders`** (Legacy / storefront orders).
   - *Expected:* Orders list with status filter pills (All / Placed / Processing /
     Customisation Accepted / Ready to Ship / Shipped / Delivered / Cancelled), date
     filters, and rows with order #, status, total, paid badge.

2. **Locate your test order** (by `SF-…` / email / total). Open it (`/orders/{id}`).
   - *Expected:* Order detail shows items, totals, customer, current status, and a way to
     change status (status control / pipeline).

3. **For a CUSTOMISED order:** confirm the pipeline includes a **"Customisation Accepted"**
   stage. Move the order: **Placed → Processing → Customisation Accepted → Ready to Ship →
   Shipped → Delivered**, one step at a time.
   - *Expected:* Each click updates the status; the badge/colour changes; the change
     persists on reload. Record any stage that fails to set.

4. **For a NON-customised order** (open a B2C-01-style order):
   - *Expected:* The **"Customisation Accepted"** stage is **absent** (it should only show
     when the order has customised items). Confirm the pipeline is `Placed → Processing →
     Ready to Ship → Shipped → Delivered`.

5. **Cancel path:** on a test order, set status to **"Cancelled"**.
   - *Expected:* Status becomes Cancelled (distinct colour). Confirm it persists. Note
     whether Cancelled can be set from any prior stage.

6. **Re-open / forward-after-cancel:** try moving a Cancelled order back to an active
   status.
   - *Expected / to determine:* record whether the app allows un-cancelling and whether
     that's desirable. (No strict server-side sequence enforcement exists, so the UI is the
     only guard — note gaps.)

7. **Paid/shipping fields:** if you mark **Shipped**, see whether a tracking number/carrier
   is required or recorded, and whether the customer-facing `/track` would reflect it
   (cross-check via B2C-05 if desired).

## Acceptance criteria
- [ ] A storefront order can be advanced through every pipeline stage, persisting each time.
- [ ] "Customisation Accepted" appears **only** for customised orders.
- [ ] "Cancelled" can be applied and is visually distinct.
- [ ] Status changes survive a page reload.

## Known-risk watch-list
- **Customisation Accepted shown for non-customised orders** (or missing for customised
  ones) — the conditional logic is a key check.
- **No sequence guard:** since the API doesn't enforce order, the UI might allow illogical
  jumps (e.g. Delivered → Processing). Record any nonsensical transitions allowed.
- **Order filed under the wrong section** (`/b2b-orders` vs `/orders`) for a storefront
  purchase.
- Status set in admin **not** reflected on the customer `/track` or `/account` view.

## Report
```
### ADMIN-02 result: PASS | FAIL | BLOCKED
Environment: <browser>, <date/time>
Orders used: customised <SF-...>, non-customised <SF-...>
Pipeline walk: <stages that worked / failed>
Customisation Accepted conditional correct? <yes/no>
Steps completed: <x>–<y> of 7
BUGS / ISSUES:
- [SEVERITY] <title> — Step / Expected / Actual / Evidence / Reproducible
Notes (any illogical transitions allowed):
```
