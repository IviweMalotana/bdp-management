# TEST — Complete a Paystack TEST-mode payment (guest, no login, no real money)

> **Paste this whole file into a fresh Claude-in-Chrome session.**
> Precondition: the operator has set **Vercel storefront** `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY = pk_test_…`
> AND redeployed the storefront, and Railway `Paystack__PublicKey`/`Paystack__SecretKey` are `pk_test_`/`sk_test_`.

You are a QA tester on the live **Be Different Packaging** storefront:
**https://www.bedifferentpackaging.com**

Goal: as a **guest** (no account, no login), place a **small** order and **complete the card
payment in Paystack TEST mode**, then confirm the order is **PAID** and the confirmation email
was sent — using a Paystack **test card**, so no real money moves.

## HOW TO OPERATE
Act like a real human shopper: **click** to navigate (don't type URLs except the start one),
one tab, type into fields and click out, wait for each step. **Do not log in or register.**
If something looks off, stop and report exactly what you saw.

## 🔴 CRITICAL SAFETY GATE — the whole point of this run
When the Paystack popup opens, it **must** show an **orange "Test Mode" banner**.
- **If you see the orange "Test Mode" banner** → good, continue and pay with the test card.
- **If there is NO orange "Test Mode" banner** (or you see live options like "SnapScan" / "Scan to Pay"
  and no test badge) → **STOP. Do NOT enter any card.** Report: *"No Test Mode banner — aborted."*
  It means the storefront redeploy with the test key hasn't taken effect yet (try a hard refresh /
  wait for the Vercel deploy, then rerun). Never enter a card without the Test Mode banner.

## Test data
- **Checkout email:** `iivii.malotana@gmail.com`
- Guest details: QA Tester · 12 Test Street · Cape Town · Western Cape · 8001 · South Africa · +27 71 000 0000
- **Paystack TEST card:** number `4084 0840 8408 4081` · expiry any future date e.g. `12/34` ·
  CVV `408` · if asked: PIN `0000`, OTP `123456`

## Steps
1. From the homepage, click into an **in-stock bottle**. Set quantity to **20** (keep the order
   small — a few hundred rand). Record the order total **T**.
2. **Add to Cart** → open the cart → **Checkout**. Continue as **guest** (no login/register).
3. Fill the address by typing; use email **iivii.malotana@gmail.com**. Pick a shipping option.
   Reach **Review**, then choose **Card (Paystack)** and click **Pay**. Record the Paystack
   amount (should equal the review total).
4. **SAFETY GATE:** is the orange **"Test Mode"** banner showing?
   - **No** → STOP, do not enter a card, report "No Test Mode banner — aborted."
   - **Yes** → continue.
5. Pay with the **test card** above (card number, expiry, CVV; PIN `0000` / OTP `123456` if prompted).
   Complete it.
   - *Expected:* redirect to **`/checkout/success/{orderId}`** — an order-confirmed page. **Record the
     order number `SF-…`** shown there.
6. **Verify PAID (no login):** click to the **Track Order** page, type the **SF-…** number and
   **iivii.malotana@gmail.com**, submit.
   - *Expected:* the order shows **PAID**, total = the amount you paid, address populated.
7. Note that a confirmation email should now be sent to iivii.malotana@gmail.com (the owner checks
   that inbox). Record the SF-… number so it can be matched.

## Report
```
### PAYSTACK TESTMODE FINAL: PASS | FAIL | BLOCKED
Orange Test Mode banner shown? Y/N   (if N: aborted, did not enter card)
Order total T = R__ ; Paystack amount = R__ (match? Y/N)
Payment completed → success page? Y/N ; Order number: SF-________
Track Order shows PAID + correct total + address populated? Y/N
BUGS / ISSUES:
- [SEVERITY] <title> — Step / Expected / Actual / Evidence (exact on-screen text)
Notes:
```
