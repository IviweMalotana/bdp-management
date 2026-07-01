# TEST — Guest checkout + completed Paystack TEST payment (no login, no real money)

> **Paste this whole file into a fresh Claude-in-Chrome session.**
> Run only after the operator has set Paystack **test keys** on Railway
> (`Paystack__SecretKey = sk_test_…`, `Paystack__PublicKey = pk_test_…`) and the API redeployed.

You are a QA tester on the live **Be Different Packaging** storefront:
**https://www.bedifferentpackaging.com**

Goal: as a **guest** (no account, no login, no registration), place an order and **complete the
card payment in Paystack TEST mode**, then confirm the order is **paid** and the **confirmation
email arrives** — all with a Paystack **test card**, so no real money moves.

## HOW TO OPERATE
Act like a real human shopper: **click** to navigate (don't type URLs except the start one),
one tab, type into fields and Tab/click out, wait for each step, verify before continuing.
**Never create an account or log in** — use guest checkout only. If anything looks off, **stop
and report exactly what you saw** (button text, on-screen error, failing request + status).

## 🔴 CRITICAL SAFETY GATE
Only enter a card if the Paystack window clearly shows **Test Mode** (a "Test Mode" badge/banner).
- **No clear Test-Mode indicator → STOP, do NOT enter a card, report "No test-mode indicator — aborted".**
- Never enter a real card. Only the test card below.

## Test data
- **Checkout email:** `iivii.malotana@gmail.com`  (so the confirmation email is visible to the owner)
- Guest details: QA Tester · 12 Test Street · Cape Town · Western Cape · 8001 · South Africa · +27 71 000 0000
- **Paystack TEST card:** number `4084 0840 8408 4081` · expiry any future e.g. `12/34` · CVV `408`
  · if prompted PIN `0000`, OTP `123456`

---

## PART 1 — Guest order, completed test payment (the main event)

1. From the homepage, click into an **in-stock bottle**. Set quantity to **50**. Record unit price
   **U** and order total **T** (roughly T ≈ U × 50).
2. **Add to Cart** → open the cart → record subtotal **C**. **Check: C = T.**
3. Click **Checkout**. Choose/continue as **guest** (do NOT log in or register). Fill the address by
   typing; use email **iivii.malotana@gmail.com**. Pick a shipping option (record **S**). Reach
   **Review**; record **R_sub** and **R_total** (= R_sub + S). **Check: R_sub = C.**
4. Choose **Card (Paystack)**. Click **Pay now** → the Paystack window opens. Record the **amount** —
   it must equal **R_total**.
5. **SAFETY GATE:** confirm **Test Mode**. If not shown → STOP & report.
6. Pay with the **test card** (card, expiry, CVV; PIN `0000` / OTP `123456` if asked). Complete it.
   - *Expected:* redirect to **`/checkout/success/{orderId}`** — an order-confirmed page. **Read and
     record the order number `SF-…` shown on this page** (this is how you'll verify — no inbox needed).
7. **Verify paid (no login):** click to the **Track Order** page (in the header/footer). Type the
   **SF-… order number** and **iivii.malotana@gmail.com**, submit.
   - *Expected:* the order shows **PAID** (paid state/date), total = **R_total**, address populated,
     line item(s) correct.
8. **Email:** note that a confirmation email should now be sent to iivii.malotana@gmail.com (the owner
   will check that inbox). You don't need inbox access — just report that payment completed so the
   send was triggered, and record the **SF-…** number so it can be matched to the email.

## PART 2 — Customisation charge reconciles (read-only, no need to complete)

9. Open a bottle offering **Silk Screen / Hot Stamping** + **Colour Change**. Set quantity **2500**.
   Tick a **printing** option **and Colour Change**. Record the PDP **ORDER TOTAL P_total**.
10. Add to cart → open cart → record cart line/subtotal **C2**. **Check: C2 = P_total to the cent.**
    - *(A prior run saw a ~R0.05 gap here — capture both numbers exactly, to the cent.)*
11. Checkout as guest to the **Review** step; record **R2_total**. Continue to the **Paystack** window
    and record the **amount D2**. **STOP here — do NOT pay this one.** **Check: D2 = R2_total = C2.**
    - This tells us the *charged* amount for a customised order, to the cent.

## Acceptance
- [ ] Part 1: guest payment completed in Test Mode → success page with `SF-…`; order shows **PAID**,
      total = R_total, via Track Order (no login).
- [ ] Paystack amount = R_total (Part 1) to the cent.
- [ ] Part 2: P_total, C2, R2_total and Paystack D2 all recorded — note any cent-level mismatch.

## Report
```
### GUEST TESTPAY result: PASS | FAIL | BLOCKED
Test Mode indicator seen? Y/N
PART 1: U=R__ T=R__ C=R__ R_sub=R__ S=R__ R_total=R__ Paystack=R__  (all match where they should? Y/N)
  Payment completed → success page? Y/N   Order number: SF-________
  Track Order shows PAID + correct total + address? Y/N
PART 2: P_total=R__ ; cart C2=R__ (== P_total? Y/N, Δ=R__) ; R2_total=R__ ; Paystack D2=R__ (all equal? Y/N)
BUGS / ISSUES:
- [SEVERITY] <title> — Step / Expected / Actual / Evidence
Notes (anything odd):
```
