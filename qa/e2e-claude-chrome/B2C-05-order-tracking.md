# TEST B2C-05 — Public order tracking (`/track`)

> **Paste this whole file into a fresh Claude-in-Chrome session.**

You are a QA tester driving a real browser against the live **Be Different Packaging**
storefront. Goal: verify the **public order-tracking** page works with a valid order +
email, rejects bad input cleanly, and renders the status timeline.

## Precondition
You need a **real order number** (`SF-…`) and the **email** used on it. Get one by running
**B2C-01** or **B2C-02** first (the order is created even though payment isn't completed),
or use a known test order. Record the order number + email before starting.

## Steps

1. Go to `/track` (or click **"Track Order"** in the header).
   - *Expected:* "Track your order" heading, an **Order number** field (placeholder like
     `e.g. SF-20260601-ABC123`) and an **Email address** field, and a **"Track order"**
     button.

2. **Submit empty.**
   - *Expected:* Validation: "Order number is required" / "Email address is required".

3. **Enter a malformed email** (`abc`) with any order number, submit.
   - *Expected:* "Enter a valid email address".

4. **Enter a wrong/nonexistent order number** with a valid-format email, submit.
   - *Expected:* Friendly not-found message: **"Order not found. Check your order number
     and email."** (no crash, no raw error).

5. **Enter the correct order number + matching email** (from precondition), submit.
   - *Expected:* Tracking result renders: order number, a **status badge**, "Placed
     {date}", and a **status timeline** (Placed → Processing → Ready to Ship → Shipped →
     Delivered). Items are listed (product name, SKU, × quantity).

6. **Check the timeline state** matches the order's real status (a freshly placed, unpaid
   order should show at/near "Placed"/"Processing", earlier stages filled, later ones not).

7. **Case sensitivity:** repeat step 5 with the **email in different case** (e.g. UPPER).
   - *Expected:* Still found (matching is case-insensitive). Record if it fails.

8. If the order has a tracking number/carrier (likely not yet), confirm those sections are
   simply absent rather than showing empty/broken boxes.

9. Click **"Track another order"** (reset link).
   - *Expected:* Returns to the empty search form.

## Acceptance criteria
- [ ] Empty + malformed inputs are validated with clear messages.
- [ ] Wrong order/email → clean "Order not found" message.
- [ ] Correct order/email → full tracking view with timeline + items.
- [ ] Email matching is case-insensitive.
- [ ] No tracking number ⇒ tracking section gracefully hidden (not broken).

## Known-risk watch-list
- **Information leak:** does a correct order number with the *wrong* email reveal any
  order details? It should NOT. Test: correct order number + a different valid-format
  email → must be "not found", never partial data. **(Critical if it leaks.)**
- Timeline showing the wrong current stage vs the actual order status.
- Reset link not clearing previous results.

## Report
```
### B2C-05 result: PASS | FAIL | BLOCKED
Environment: <browser>, <date/time>
Order tracked: <SF-...>, email <...>
Steps completed: <x>–<y> of 9
BUGS / ISSUES:
- [SEVERITY] <title> — Step / Expected / Actual / Evidence / Reproducible
Notes (esp. the wrong-email leak check):
```
