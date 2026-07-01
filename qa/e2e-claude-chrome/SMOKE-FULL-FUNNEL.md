# SMOKE TEST — full funnel + this week's changes

> **Paste this whole file into a fresh Claude-in-Chrome session.**
> Goal: prove the storefront still works end to end after a batch of changes, and
> confirm each specific change landed. ~10–15 minutes.

You are a QA tester driving a real browser against the live **Be Different Packaging**
storefront: **https://www.bedifferentpackaging.com**

## HOW TO OPERATE (read first)
Act like a real human shopper:
- **Navigate by clicking** on-page elements — do **not** type URLs (except the one start URL).
- Stay in **one tab**; don't hard-refresh unless told.
- **Type into fields** one character-set at a time and click/Tab out (don't paste/script values).
- **Wait** for each action (spinners, redirects) and **verify each step** before the next.
- If something won't work, **stop and report exactly what you saw** (button text, on-screen error,
  the failing network request + status). Don't guess or push past it.

## ⚠️ SAFETY — READ
- The store uses **LIVE Paystack**. **Never enter card details, never complete a payment.**
- Every purchase check **STOPS at the Paystack page** and only reads the amount. The order is
  created *before* payment, so it stays verifiable without paying.
- Do **not** modify or cancel any real orders/customers.

## Test data
- Unique email: `qa-smoke-<today's date+time>@<an inbox you control>`
- Password (if you make an account): `Test1234!`
- Address: QA Tester · 12 Test Street · Cape Town · Western Cape · 8001 · South Africa · +27 71 000 0000

---

## PART A — Core purchase funnel (the money path)

1. From the homepage, **click** "Shop" (or a category) and open an **in-stock bottle** product.
2. On the product page, set quantity to **250** (use the − / + or type it).
   - Record **U** = unit price shown, and **T** = the order total in the price summary.
   - Check the arithmetic roughly: T ≈ U × 250.
3. **Add to Cart** → wait for the confirmation → open the **cart**.
   - Record **C** = cart subtotal. **Check: C = T** (the PDP total carried into the cart).
4. **Checkout.** Fill the address by typing. Pick a shipping option (record **S**). Reach the
   **Review** step. Record **R_sub** (subtotal) and **R_total** (= R_sub + S).
   - **Check: R_sub = C.**
5. **Confirm & pay** → you reach the **Paystack** page. Record **D** = the amount shown. **STOP.**
   - **Check: D = R_total**, to the cent, in ZAR.
6. Go back into the store (click the logo). Open **Account → Orders** (log in or use `/track` by
   clicking, with the order number + email) and open the new order.
   - **Check:** order total = **D**, and the **delivery address is populated** (not blank).

> PASS for Part A = **T = C = R_sub**, and **R_total = D = order total**, all in ZAR to the cent.

---

## PART B — Customisation carries through (printing surcharge)

7. Open a bottle that offers **Silk Screen / Hot Stamping** and/or **Colour Change**. Set quantity
   to **2500** (type it, click out).
   - **Check (MOQ):** at 2,500 the customisation options are **unlocked** (no "Available from N
     units" lock). Note any still locked.
8. Tick a **printing** option (and Colour Change if offered). Record **P_total** (order total with
   the add-on). Add to cart → open cart → record **C2**.
   - **Check: C2 = P_total** — the customisation surcharge is **included**, not dropped.
9. (If both printing + colour change were available and ticked) confirm **both** appear on the line
   and both are in the total.

---

## PART C — This week's specific changes

10. **Quantity box (mobile):** narrow the window to phone width (or use a phone). On a product page,
    the quantity selector should be a **compact `−  10  +` box** — **not** a wide box stretched
    across the screen with empty space.
11. **Slider gone:** on the product page there should be **no drag slider** under the quantity
    (the − / + stepper and the volume-tier buttons stay).
12. **Log out visible:** log in (or register). In the **header**, a **"Log out"** control should now
    be visible (next to your name on desktop; in the menu on mobile). Click it → you're logged out
    and returned to the homepage; the header shows "Account" again.
13. **Customisation minimum copy:** the **Customise** page and the product customisation options
    should say the minimum is **2,500 units** (not 100 or 1,000). Note any place still showing a
    different number.
14. **Copy sanity:** skim the **About**, a **category** page, and one **blog** article. They should
    read like a person wrote them — **no repeated "premium"/"elevate"/"luxurious"**. Note any that
    still sound like marketing/AI filler.
15. **Images:** on the shop grid and a product page, are the product photos **sharp**, or still
    grainy/blurry? (If they're still grainy, the image re-sync may not have been run yet — just
    report which.)

---

## Report (return exactly this)
```
### SMOKE result: PASS | FAIL | BLOCKED
Environment: <browser>, <date/time>, currency ZAR
Account/order used: <email> / <SF-… order number>

PART A (funnel):  U=R__  T=R__  C=R__  R_sub=R__  S=R__  R_total=R__  Paystack D=R__  Order total=R__
  → all equal where they should be? Y/N   Address populated on order? Y/N

PART B (customisation): options unlocked at 2500? Y/N ; P_total=R__ ; cart C2=R__ (== P_total? Y/N)
  both add-ons survived (if applicable)? Y/N

PART C (changes):
  10 Quantity box compact on mobile? Y/N
  11 Slider removed? Y/N
  12 Log out in header + works? Y/N
  13 Customisation minimum shows 2,500? Y/N (where not: ____)
  14 Copy reads human (no "premium" spam)? Y/N (worst offender: ____)
  15 Product images sharp? Y/N (or "still grainy — sync not run")

BUGS / ISSUES:
- [SEVERITY: Critical|High|Medium|Low] <title> — Step / Expected / Actual / Evidence (error text, network status)
Notes:
```
