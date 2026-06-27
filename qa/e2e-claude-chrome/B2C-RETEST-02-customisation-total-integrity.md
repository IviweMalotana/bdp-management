# RETEST B2C-RETEST-02 — Customisation total integrity (printing surcharge)

> **Paste this whole file into a fresh Claude-in-Chrome session.**
> **Run only AFTER the fix is deployed** (branch `claude/revenue-profit-analysis-jyqk7q`
> → Railway API + Vercel storefront).

You are a QA tester on the live **Be Different Packaging** storefront. This is a
**regression test** for a fixed Critical bug: a product with **printing/customisation**
showed the surcharge on the product page, but the cart subtotal and checkout review
**dropped it**, while the order silently added it back — so the buyer was shown ~R44,681
but the order was ~R70,391. Verify the printing surcharge is now **identical** from
product page → cart → checkout → order.

## ⚠️ Safety rules
- LIVE Paystack — **never pay.** STOP at the Paystack page; verify the amount only.

## Test data
- Email: `qa-retest02-<yyyymmddhhmm>@<your-inbox>` (real inbox); Password `Test1234!`
- Standard address: QA Tester, 12 Test Street, Cape Town, Western Cape, 8001, South Africa, +27 71 000 0000

## Steps
1. Register/login a personal account. Open a bottle product that offers **Silk Screen** or
   **Hot Stamping**.
2. Set a quantity that unlocks printing (e.g. **2500**). Record the bottle unit price.
3. Tick **Silk Screen Printing**. Record from the PDP price summary:
   - **P_bottle** = bottle line total
   - **P_print** = the printing line (e.g. "Silk Screen (2500 units)")
   - **P_total** = ORDER TOTAL  (must equal P_bottle + P_print)
4. **Add to Cart → `/cart`.** Record:
   - **C_sub** = cart subtotal.
   - **C_total must equal P_total** — i.e. the cart subtotal **includes the printing
     surcharge**. *(This is the exact thing that was broken — the surcharge must NOT
     disappear here.)*
5. Checkout to **step 3 review**. Record **R_sub** (review subtotal, before shipping) and
   the shipping line **S** and **R_total** = R_sub + S.
   - **R_sub must equal C_sub** (printing still included).
6. Upload an artwork file when prompted (see note below if it errors).
7. **Confirm & pay →** step 4. Record **D** = "Total: R…". Open Paystack; confirm the ZAR
   amount equals **D = R_total**. **STOP — do not pay.**
8. **Verify the order:** `/account/orders` → open the new order. Record **O_total**.
   - **O_total must equal D** (and the customised line + its surcharge are present).

## Acceptance criteria (ALL required)
- [ ] P_total = C_sub = R_sub (printing surcharge present and equal at every step)
- [ ] D (Paystack) = R_total = O_total — to the cent
- [ ] The per-unit printing price shown on the PDP equals the per-unit actually charged
      (compute P_print/qty vs (O_total − bottle − shipping)/qty) — these were ~7% apart
      before the fix and must now match.
- [ ] No step shows a total **lower** than what the order charges.

## FAIL triggers (Critical — capture all figures)
- Cart subtotal or review subtotal **excludes** the printing surcharge (the original bug).
- Order total **>** the review total the customer confirmed.
- PDP printing per-unit ≠ charged printing per-unit (parity gap).

## Artwork upload note
A previous run hit **"Failed to upload artwork to cloud storage."** That is a **server
configuration** issue (Google Drive credentials), tracked separately — it is **not** part
of this pricing retest. If it still errors: record it as a separate finding, then (if the
UI allows) continue to the payment step anyway to complete the pricing checks. If it now
succeeds ("✓ uploaded"), note that too.

## Report
```
### B2C-RETEST-02 result: PASS | FAIL | BLOCKED
Environment: <browser>, <date/time>, currency ZAR
Deployed fix confirmed live? <yes/no/unknown>
Qty <N>: P_bottle=<R..> P_print=<R..> P_total=<R..>
Cart: C_sub=<R..>   Review: R_sub=<R..> S=<R..> R_total=<R..>
Paystack D=<R..>    Order O_total=<R..>
Printing per-unit: PDP=<R..> charged=<R..>
Artwork upload: <ok / failed (config)>
Steps completed: <...> of 8
BUGS / ISSUES:
- [SEVERITY] <title> — Step / Expected / Actual / Evidence / Reproducible
Notes:
```
