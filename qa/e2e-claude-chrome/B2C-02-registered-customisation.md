# TEST B2C-02 — Registered customer buys a product WITH printing/customisation

> **Paste this whole file into a fresh Claude-in-Chrome session.**

You are a QA tester driving a real browser against the live **Be Different Packaging**
storefront. Execute every step in order, record what actually happens, and produce a bug
report at the end. This test specifically stresses **customisation (printing) pricing and
the artwork-upload step**, which is the highest-risk area of the funnel.

## ⚠️ Safety rules
- LIVE Paystack — **never enter card details, never complete payment.** STOP at the
  Paystack page.
- The order is created before payment, so you can still verify it in the account afterward.

## Persona & objective
A customer **creates a personal account**, then buys bottles **with silk-screen or
hot-stamp printing** applied. Goal: verify customisation can be selected, that the
**add-on price is reflected consistently** from PDP → cart → checkout → payment, that the
**artwork upload** appears, and that the finished (unpaid) order shows in the account.

## Test data
- Email: `qa-b2c02-<yyyymmddhhmm>@<your-inbox>` (real inbox)
- Password: `Test1234!`
- Name: QA Tester
- Shipping: QA Tester, 12 Test Street, Cape Town, Western Cape, 8001, South Africa, +27 71 000 0000
- A small image file to use as "artwork" (PNG/JPG/PDF, under 20 MB). A plain logo PNG is fine.

## Steps

1. **Register:** go to `/auth/register`. Ensure the **"Personal"** tab is selected. Fill
   First name, Last name, Email, Password (`Test1234!`), Phone optional. Click
   **"Create account"**.
   - *Expected:* Account is created and you are logged in (header shows your first name;
     `/account` is reachable). Account type badge reads **"Personal"**.

2. **Go to Shop** and open a bottle product whose customisation is available.
   - *Expected:* PDP loads with a **"Personalise your order"** panel containing a
     **"Printing method (choose one)"** group (Silk Screen Printing / Hot Stamping) and a
     **"Colour"** group (Colour Change).

3. **Read the MOQ/availability notes** on each customisation option. Record:
   - The bottle's own MOQ ("Quantity (min N)").
   - For each printing option: any **"Available from N units"** lock message and the
     stated **"+R…/unit"**.
   - The Colour Change line: its **"+R…/unit"** and lock threshold.

4. **Set quantity** to a value that the printing options say they support (e.g. if Silk
   Screen says "Available from 100 units", set 100; if a higher number, use that). Then
   **tick "Silk Screen Printing"** (or Hot Stamping).
   - *Expected:* The checkbox enables and the **price summary** now lists a
     `Silk Screen (N units)` line plus the bottle line, and the **ORDER TOTAL increases**
     by (printing per-unit × quantity). Record every line and the ORDER TOTAL.

5. **Verify the printing math:** ORDER TOTAL should equal
   `(unit × qty) + (printing-per-unit × qty)` (+ colour change if ticked).
   - *Watch:* If the displayed per-unit add-on doesn't multiply out, that's a **High** bug.

6. **Click "Add to Cart"** → open `/cart`.
   - *Expected:* The cart line reflects the customised item. **Critically:** the cart
     subtotal should include the printing cost (i.e. match the PDP ORDER TOTAL). Record
     the cart subtotal.
   - *Watch (KNOWN RISK):* If the cart subtotal **drops the printing surcharge** (e.g.
     shows only bottle × qty), record exact figures — this is the prime suspected bug.

7. **Proceed to checkout.** Complete step 1 (contact/shipping already? you're logged in —
   email may be pre-filled), step 2 (pick shipping), to **step 3 "Review your order"**.
   - *Expected:* Review shows the item, subtotal **including printing**, shipping, and a
     Total. Because the order contains a customised item, an **"Artwork / logo files"**
     section appears with an upload box: *"Click or drag to upload artwork (PDF, AI, EPS,
     PNG, JPG, SVG. Max 20 MB)"*.

8. **Upload the artwork file** into the upload box for the customised item.
   - *Expected:* State changes to **"✓ {fileName} uploaded."** with a "replace" link. No
     error.
   - *Watch:* upload failures, wrong file-type rejection of an allowed type, or the
     Confirm button staying disabled after a successful upload.

9. **Click "Confirm & pay →"** → **step 4 "ready to pay"**. Record the **"Total: R …"**.
   - *Expected:* Total equals the step-7 review Total (bottle + printing + shipping).

10. **Click "Pay now with Paystack →"**, confirm the Paystack amount matches in **ZAR**,
    then **STOP — do not pay. Close the modal.**

11. **Verify the order was created:** navigate to `/account` → "Recent orders" (or
    `/account/orders`).
    - *Expected:* A new order appears with an `SF-…` number, the correct total
      (including printing), status around **"Placed"/"Processing"**, and marked unpaid
      (or with no payment). Open it and confirm the customised line item is present.

## Acceptance criteria
- [ ] Customisation can be selected only at/above its stated minimum quantity.
- [ ] Printing surcharge is included and **identical** across PDP total, cart subtotal,
      review total, and Paystack amount.
- [ ] Artwork upload succeeds and shows the "✓ uploaded" state.
- [ ] The created (unpaid) order is visible in the customer account with the customised
      line and correct total.

## Known-risk watch-list
- **Printing price dropped between PDP and cart/checkout** (suspected). Capture all figures.
- **MOQ mismatch:** the PDP may *offer* printing at 100 units while the backend requires a
  higher supplier MOQ; the server quote could then charge **R0** for customisation while
  the UI showed a surcharge → totals disagree. Report any such disagreement precisely.
- **Colour Change price:** verify the actual per-unit charged (UI may say one figure while
  the charged amount differs). If you can, tick Colour Change too and check the line.
- **Artwork step missing** even though a customised item is in the order.

## Report
```
### B2C-02 result: PASS | FAIL | BLOCKED
Environment: <browser>, <date/time>, currency ZAR
Account/data used: email <...>, order <SF-...>, printing type <...>, qty <...>
Figures: PDP total=<R..> cart=<R..> review=<R..> paystack=<R..> (printing per-unit=<R..>)
Steps completed: <x>–<y> of 11
BUGS / ISSUES:
- [SEVERITY] <title> — Step / Expected / Actual / Evidence / Reproducible
Notes:
```
