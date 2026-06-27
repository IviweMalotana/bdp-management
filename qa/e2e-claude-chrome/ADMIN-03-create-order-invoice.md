# TEST ADMIN-03 — Staff create a B2B order (3-step wizard) + generate invoice

> **Paste this whole file into a fresh Claude-in-Chrome session.**

You are a QA tester driving a real browser against the live **Be Different Packaging**
**admin portal** (staff only). Goal: create an order **on behalf of a B2B client** via the
3-step wizard, verify pricing/shipping are computed, then **generate an invoice** for it.

## ⚠️ Safety rules
- Live admin portal. Create the order against a **test client** (ideally the one approved
  in ADMIN-01). **Do not** create orders against real clients, and **do not email an
  invoice to a real customer** — if "Generate & Send Invoice" sends an email, use a test
  client whose email is your own test inbox.

## Credentials
`<ADMIN_EMAIL>` / `<ADMIN_PASSWORD>`.

## Precondition
At least one B2B **client** exists (the ADMIN-01 approved client, or create one via
`/clients/new` with your own test email as the contact email).

## Steps

1. Sign in. Go to **`/b2b-orders`** → click **"Create Order"** (`/b2b-orders/new`).
   - *Expected:* A 3-step wizard: **1 Select Client → 2 Add Items → 3 Review & Confirm.**

2. **Step 1 — Select Client:** in "Search by company name…", find and select your test
   client. Click **"Next: Add Items"**.
   - *Expected:* A client card shows Company / Payment Terms (Net N) / Credit Limit. Next
     is enabled only after selection.

3. **Step 2 — Add Items:** click **"+ Add Line Item"**. Choose a **Product**, then a
   **Variant**, then a **Quantity** from the preset tiers (e.g. 1000).
   - *Expected:* **Unit Price (ZAR)** auto-populates from the pricing tier; **Estimated
     Shipping** computes; a **Line Total** shows.

4. **Add a logo/customisation** (the "Logo / Customisation" option appears when quantity
   ≥ 100). Select an eligible option (or leave "No logo").
   - *Expected:* If selected, a per-unit logo cost is added to the line. Record it.
   - *Watch:* whether the customisation options offered here match what's available on the
     storefront PDP for the same product/quantity (admin vs storefront consistency).

5. Click **"Add to Order"**. Add a second line item if you like. Then **"Review Order →"**.
   - *Expected:* Step 2 shows an items table with Subtotal / Shipping / Grand Total.

6. **Step 3 — Review & Confirm:** optionally set a Required-By date and Notes. Click
   **"Confirm Order"**.
   - *Expected:* "Creating…" then navigates to the new order detail `/b2b-orders/{id}`.
     Record the order number and grand total.

7. **On the order detail**, verify line items, totals, client, and an **"Update Status"**
   control plus a **"Generate & Send Invoice"** button.

8. **Click "Generate & Send Invoice".**
   - *Expected:* An invoice is created (status badge appears, e.g. Draft/Sent) and an
     **Invoice PDF** download link becomes available. (If it emails, it goes to the test
     client's inbox.)

9. Go to **`/invoices`**, find the new invoice. Open it (`/invoices/{id}`).
   - *Expected:* Invoice detail shows line items, **Subtotal, VAT (15%), Total**, invoice/
     due dates, and actions (Send / Mark Paid / Download PDF). Confirm the **Total = order
     total** and VAT is 15% of subtotal.
   - *Watch:* VAT math, due date = invoice date + client's payment terms (Net 30/60/90),
     totals matching the order.

10. **(Optional) Mark Paid:** click **"Mark Paid"** and confirm the status flips to Paid
    with a Paid-At date. (Safe on a test invoice.)

## Acceptance criteria
- [ ] Order wizard creates a B2B order with correct tier unit price + computed shipping.
- [ ] Customisation can be added at qty ≥ 100 and is costed.
- [ ] Invoice generates with correct Subtotal / VAT 15% / Total matching the order.
- [ ] Due date reflects the client's payment terms.

## Known-risk watch-list
- **Admin vs storefront price/customisation inconsistency** for the same product/qty.
- **Shipping estimate** wildly off or zero.
- **VAT/Total errors** on the invoice; due date not honouring payment terms.
- Order created but invoice generation failing (PDF/email errors).
- Credit-limit check: does creating an order above the client's credit limit warn/block?
  (Try a grand total above R50,000 if using the ADMIN-01 client — record behaviour.)

## Report
```
### ADMIN-03 result: PASS | FAIL | BLOCKED
Environment: <browser>, <date/time>
Client: <company / id>; Order: <#...>, grand total <R..>
Invoice: <#...>, subtotal <R..>, VAT <R..>, total <R..>, due <date>
Steps completed: <x>–<y> of 10
BUGS / ISSUES:
- [SEVERITY] <title> — Step / Expected / Actual / Evidence / Reproducible
Notes (credit-limit behaviour, admin/storefront price parity):
```
