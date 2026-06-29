# TEST — PayJustNow checkout (SANDBOX)

> **Paste this whole file into a fresh Claude-in-Chrome session.**
> **Run only after the PayJustNow SANDBOX env vars are set on Railway** (see precondition).

You are a QA tester driving a real browser against the live **Be Different Packaging**
storefront. Goal: verify the **PayJustNow "pay in 3"** payment option end to end in
**sandbox** — the option appears, the customer is redirected to PayJustNow, a sandbox
payment completes, and the order is marked paid; plus the cancel path leaves the order
unpaid.

## HOW TO OPERATE (read first)
Act like a real human shopper:
- **Navigate by clicking** on-page elements — **never type a URL** into the address bar
  except the one starting URL. Stay in **one tab**; don't hard-refresh.
- **Type into fields** one at a time and Tab/click out (don't paste or script values).
- **Wait** for each action (spinners, redirects) and **verify each step** before the next.
- If a click won't work, stop and report exactly what you saw (button text, any error,
  the failing network request).

## ⚠️ Safety
- This is **sandbox** PayJustNow — **no real money**. Do **not** enter any real card
  anywhere. Only use PayJustNow's sandbox test details.

## Precondition (the operator sets these on Railway → bdp-api, then redeploys)
```
PayJustNow__MerchantId   = 7008
PayJustNow__ApiKey       = <merchant api key>
PayJustNow__BaseUrl      = https://sandbox.payjustnow.com
PayJustNow__CallbackSecret = <a long random string>   # optional but recommended
```
If the **PayJustNow option does not appear** at step 3 (step 2 below), the env vars
aren't set/propagated yet — **stop and report that** (it's the first thing to confirm).

## Steps

1. Add an in-stock bottle to the cart — a **normal order** with a total in a sensible
   range (roughly **R300–R10,000**, within PayJustNow's limits). Go to checkout, fill the
   address by typing (QA Tester, 12 Test Street, Cape Town, Western Cape, 8001, South
   Africa, +27 71 000 0000, a real email), pick a shipping option, reach **step 3 Review**.
   Record the **Review total (C)**.

2. **Confirm the option is live:** at step 3 a **"Payment method"** section should now show
   two choices — **Card** and **PayJustNow — pay in 3 interest-free instalments**.
   - *If it's missing:* env vars aren't applied yet → stop and report.

3. **Select PayJustNow.** The confirm button should read **"Continue to PayJustNow →"** —
   click it.
   - *Expected:* the browser is redirected to the **PayJustNow sandbox** page. Record the
     **amount shown there** — it must equal **C**.

4. **Complete the sandbox payment** using PayJustNow's sandbox test flow (their test
   customer details / OTP — use whatever the sandbox page provides or PayJustNow's sandbox
   test instructions).
   - *Expected:* on success you're redirected back to **`/checkout/success/{orderId}`** — an
     "order confirmed" page with an order number.

5. **Verify it settled:** click through to **Account → Orders** (or use `/track` with the
   order number + email — but reach it by clicking, not typing the URL). Open the order.
   - *Expected:* the order shows **paid** (a paid date/state), total = **C**.

6. **Cancel path:** start another PayJustNow checkout (steps 1–3) but **cancel / abandon**
   on the PayJustNow sandbox page instead of paying.
   - *Expected:* you return to the storefront checkout (a `payment=failed` state), and that
     order is **NOT** marked paid.

## Acceptance criteria
- [ ] PayJustNow option appears at step 3 (proves config is live).
- [ ] PayJustNow page amount = Review total **C**.
- [ ] Completing sandbox payment redirects to the success page and the order is **paid**.
- [ ] Cancelling leaves the order **unpaid**.
- [ ] Card checkout still works as before (quick sanity: the "Card" option still reaches
      the Paystack page — stop there, don't pay).

## Watch-list
- Option missing → env vars not applied.
- Redirect fails / 502 "Could not start PayJustNow checkout" → credentials wrong or
  PayJustNow rejected the request (record the on-screen text + any failed network call).
- Order **not** paid after a successful sandbox payment → the callback didn't reconcile.
  *If you set `PayJustNow__CallbackSecret`, a mismatch would cause exactly this* — note
  whether the secret is set.
- PayJustNow amount ≠ C.

## Report
```
### PAYJUSTNOW SANDBOX result: PASS | FAIL | BLOCKED
Env vars set/propagated (option visible)? Y/N
Review total C = R__ ; PayJustNow page amount = R__ ; match? Y/N
Sandbox payment → success page → order PAID? Y/N
Cancel path → order stays UNPAID? Y/N
Card option still reaches Paystack? Y/N
CallbackSecret set? Y/N
BUGS:
- [SEVERITY] <title> — Step / Expected / Actual / Evidence (error text, network status)
Notes (the exact sandbox test steps/details used):
```
