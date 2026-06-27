# TEST B2C-03 — Multi-currency price display integrity

> **Paste this whole file into a fresh Claude-in-Chrome session.**

You are a QA tester driving a real browser against the live **Be Different Packaging**
storefront. Goal: verify that switching display currency converts prices consistently and
that **payment still settles in ZAR** without misleading the customer.

## ⚠️ Safety rules
- LIVE Paystack — **never pay.** STOP at the payment page.

## Background the tester needs
Prices are stored in **ZAR** and converted client-side for display. Checkout/payment is
**always in ZAR**. The currency selector may be hidden in the desktop header by design but
present in the **mobile menu** (Currency pills: ZAR, GBP, USD, EUR, AUD). Detection is
IP-based with a manual selector fallback.

## Steps

1. Open https://www.bedifferentpackaging.com . Note the **default currency** shown on
   product prices (symbol/code). Record it.

2. **Find the currency selector.** Try the desktop header first; if not visible, open the
   **mobile menu** (narrow the window or use the hamburger) and look for a **"Currency"**
   group with pills (ZAR / GBP / USD / EUR / AUD).
   - *Watch:* If there is **no usable way** for a customer to change currency anywhere,
     record that as a finding (Medium) and note the default behaviour, then continue using
     whatever currency is shown.

3. Open a product detail page. **Record the unit price in the current currency.**

4. **Switch currency to USD** (or GBP). 
   - *Expected:* The displayed unit price updates to the new currency symbol and a
     plausibly converted value (not the same number with a new symbol). Record old → new.

5. **Verify conversion is plausible:** the converted value should be markedly smaller than
   the ZAR figure for USD/GBP/EUR (ZAR is weaker). E.g. R150 → roughly $8 / £7, not $150.
   - *Watch:* identical number with only the symbol changed = **High** bug (no conversion).

6. **Add the item to cart** and open `/cart`.
   - *Expected:* Cart subtotal shows in the selected currency, consistent with the PDP.

7. **Proceed through checkout to step 4 (payment).** Observe the currency at each step
   (cart → review → "ready to pay").
   - *Expected behaviour to confirm:* at some point the amount is presented in **ZAR** for
     payment (the "Total: R …" on the ready-to-pay step and the Paystack amount must be in
     Rand). Record where the currency switches from the display currency back to ZAR.

8. **Click "Pay now with Paystack →"**, confirm the Paystack amount is in **ZAR**, then
   **STOP — do not pay.**

9. **Switch currency back to the default and reload** a product page.
   - *Expected:* Price returns to the default-currency value; selection persists across
     a reload (or resets predictably — note which).

## Acceptance criteria
- [ ] A customer can select at least one non-ZAR currency somewhere in the UI.
- [ ] Non-ZAR prices are genuinely converted (different magnitude), not just re-symboled.
- [ ] Conversion is consistent PDP → cart (same currency, proportional values).
- [ ] Payment amount is **ZAR**, and the transition from display currency to ZAR is not
      misleading (the customer can tell what they'll actually be charged).

## Known-risk watch-list
- **No conversion** (symbol swapped, number unchanged).
- **Display/charge mismatch with no warning:** customer sees "$8.00" then is charged
  "R150" at Paystack with no indication the charge is in ZAR → **High** (potential
  chargeback/complaint risk). Note whether any "charged in ZAR" disclaimer is shown.
- **Selector hidden/unreachable** for real customers.
- **Rounding** weirdness (e.g. $0.00 or NaN) at small quantities.

## Report
```
### B2C-03 result: PASS | FAIL | BLOCKED
Environment: <browser>, <date/time>
Default currency: <...>; tested switch: <ZAR -> USD/GBP/...>
Figures: PDP <orig> -> <converted>; cart <...>; ready-to-pay <R..>; paystack <R..>
Steps completed: <x>–<y> of 9
BUGS / ISSUES:
- [SEVERITY] <title> — Step / Expected / Actual / Evidence / Reproducible
Notes (where currency flips to ZAR, any disclaimer text):
```
