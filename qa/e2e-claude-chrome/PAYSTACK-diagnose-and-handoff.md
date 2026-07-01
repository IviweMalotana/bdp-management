# TEST — Drive checkout to payment, read the Paystack key, then hand over to me

> **Paste this whole file into a fresh Claude-in-Chrome session.**
> You (the human) will complete the actual card entry. The agent drives the funnel, reports
> two diagnostics, then PAUSES.

You are a QA tester on the live **Be Different Packaging** storefront:
**https://www.bedifferentpackaging.com**

Goal: as a **guest** (no login/register), reach the Paystack payment step for a **small** order,
report two facts, then **STOP and hand control back to the human** to enter the card.

## HOW TO OPERATE
Click to navigate (don't type URLs except the start one). One tab. Type into fields and click out.
**Do not log in or register — guest checkout only. Do NOT enter any card details yourself.**

## Steps
1. Open **DevTools → Network** tab now (so requests are captured). Keep it open.
2. From the homepage, click into an **in-stock bottle**. Set quantity to **20** (small order).
   Add to Cart → open cart → **Checkout**. Continue as **guest**.
3. Fill the address by typing; use email **iivii.malotana@gmail.com**. Pick a shipping option,
   reach **Review**, choose **Card (Paystack)**, and click **Pay**.
4. **DIAGNOSTIC 1 — the API key.** In the Network tab, find the request named **`initiate`**
   (path contains `/api/storefront/checkout/initiate`). Click it → **Response**. Find the
   field **`paystackPublicKey`**. **Report only its prefix**: does it start with
   **`pk_test_`**, **`pk_live_`**, or is it **empty/missing**? (Do not paste the whole key.)
5. **DIAGNOSTIC 2 — the popup mode.** Look at the Paystack popup that opened. Is there an
   **orange "Test Mode" banner**? (Y/N.) Also list the payment options shown (e.g. Card,
   SnapScan, Scan to Pay).
6. **STOP HERE. Do not enter a card.** Tell the human: *"Reached the Paystack payment step.
   paystackPublicKey prefix = <pk_test_ / pk_live_ / empty>; Test Mode banner = <Y/N>. Over to
   you to enter the card."* Then wait — the human will take over the browser to complete or
   cancel payment. Keep the tab and popup open; do not close or refresh.

## What to report back immediately (before handing over)
```
paystackPublicKey prefix (from initiate response): pk_test_ | pk_live_ | empty
Orange Test Mode banner on the popup: Y / N
Payment options shown: ______
Review total that will be charged: R____
(Then paused for the human to enter the card.)
```

## Notes for the human taking over
- If **banner = Yes / prefix = pk_test_** → you're in test mode. Enter the test card
  `4084 0840 8408 4081`, expiry any future date, CVV `408`, OTP `123456` if prompted. No real money.
- If **banner = No / prefix = pk_live_ or empty** → do **NOT** enter a real card unless you
  intend a real charge; this means the live key is still being used and the config needs another look.
