# TEST — Paystack TEST-MODE payment (completes a real payment, no real money)

> **Paste this whole file into a fresh Claude-in-Chrome session.**
> Run this only after the operator has switched Paystack to **test keys** on Railway
> (`Paystack__SecretKey = sk_test_…`, `Paystack__PublicKey = pk_test_…`) and the API
> has redeployed.

You are a QA tester driving a real browser against the live **Be Different Packaging**
storefront: **https://www.bedifferentpackaging.com**

Goal: complete a full **card payment in Paystack TEST mode** and confirm the order becomes
**paid**, the success page shows, and the **confirmation email arrives** — using a Paystack
**test card** so no real money moves.

## HOW TO OPERATE
Act like a real human shopper: **click** to navigate (don't type URLs except the start one),
one tab, type into fields and Tab/click out, wait for each step, verify before continuing.
If anything looks off, **stop and report exactly what you saw**.

## 🔴 CRITICAL SAFETY GATE — read before paying
This store is normally on LIVE keys. You may **only** enter a card if the Paystack payment
window clearly shows it is in **TEST MODE** (Paystack shows a **"Test Mode"** badge/banner, and
test cards are accepted). 
- **If you do NOT see a clear "Test Mode" indicator on the Paystack window → STOP immediately,
  do NOT enter any card, and report "No test-mode indicator — aborted".** (It would mean the
  test keys aren't active and a real card would be charged.)
- Never enter a real card. Only the Paystack **test card** below.

## Test data
- **Email at checkout:** `iivii.malotana@gmail.com`  (so the confirmation email is visible)
- Address: QA Tester · 12 Test Street · Cape Town · Western Cape · 8001 · South Africa · +27 71 000 0000
- **Paystack TEST card** (per Paystack's "Test cards" page — use these if the window shows Test Mode):
  - Card number: `4084 0840 8408 4081`
  - Expiry: any future date, e.g. `12/34`
  - CVV: `408`
  - If prompted: PIN `0000`, OTP `123456`

## Steps

1. From the homepage, click into an **in-stock bottle**. Set a small quantity (e.g. **10–50**).
   Record the order **total T**. Add to cart → open cart → **Checkout**.
2. Fill the address by typing. Use email **iivii.malotana@gmail.com**. Pick a shipping option.
   Reach **Review**. Record **R_total** (should equal T + shipping).
3. Choose **Card (Paystack)** as the payment method. Click **Pay now** → the **Paystack window**
   opens. Record the **amount shown** — it must equal **R_total**.
4. **SAFETY GATE:** confirm the Paystack window shows **Test Mode**. If not → STOP & report.
5. In Test Mode, pay with the **test card** above (fill card, expiry, CVV; PIN `0000` / OTP `123456`
   if asked). Complete it.
   - *Expected:* you're redirected to **`/checkout/success/{orderId}`** — an order-confirmed page
     with an order number (`SF-…`).
6. Click into the store → **Account → Orders** (log in or reach `/track` by clicking, with the
   order number + email). Open the order.
   - *Expected:* the order shows **PAID** (paid date/state), total = **R_total**, address populated.
7. Check the **iivii.malotana@gmail.com inbox** for the **order-confirmation email**.
   - *Expected:* an email with the order number, line items, and totals matching the order.
   - (If it's not there within a couple of minutes, check spam; then report "no email received".)

## Acceptance (PASS needs all)
- [ ] Paystack window showed **Test Mode** and amount = R_total.
- [ ] Test-card payment completed → redirected to the success page with an order number.
- [ ] Order shows **PAID**, correct total, address populated.
- [ ] Confirmation email received at iivii.malotana@gmail.com, totals match.

## Report
```
### PAYSTACK TEST-MODE result: PASS | FAIL | BLOCKED
Test Mode indicator seen? Y/N   (if N: aborted before entering card)
T=R__  R_total=R__  Paystack amount=R__  (match? Y/N)
Payment completed → success page + order number? Y/N  (SF-…: ______)
Order shows PAID, total matches, address populated? Y/N
Confirmation email received at iivii.malotana@gmail.com? Y/N (subject: ______)
BUGS / ISSUES:
- [SEVERITY] <title> — Step / Expected / Actual / Evidence (error text, network status)
Notes:
```
