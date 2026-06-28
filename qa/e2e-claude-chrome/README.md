# BDP E2E Test Suite — Claude-in-Chrome

End-to-end, browser-driven test packs for the **Be Different Packaging** funnel.
Each file in this folder is **self-contained**: open it, copy the whole thing, and
paste it into a fresh Claude-in-Chrome session. Run them in parallel sessions and
collect the bug reports.

---

## The systems under test

| System | URL | Who uses it |
|--------|-----|-------------|
| Storefront (customer shop) | https://www.bedifferentpackaging.com | Public + B2C + B2B customers |
| Admin portal (staff only) | https://admin.bedifferentpackaging.com | Internal staff (login required) |
| API | https://bdp-api-production.up.railway.app | Backend (referenced for verification only) |

---

## ⚠️ GLOBAL SAFETY RULES — read before running any test

1. **The storefront uses LIVE Paystack keys.** Real cards are charged. **Never enter
   real card details and never complete a payment.** Every purchase test is designed
   to **STOP at the Paystack payment page** and verify the amount only.
2. **You do not need to pay to test the funnel.** The order is created in the system
   *before* payment (status `Placed`, unpaid). Reaching the Paystack page = the order
   already exists and is verifiable in the customer account, `/track`, and the admin
   portal.
3. **Do not delete, cancel, or modify real customer orders or real B2B clients** in the
   admin portal. Only act on records *you* created during the test.
4. **Use a real email inbox you control** for any registration/checkout — the system
   sends confirmation/approval emails you may need to verify.

---

## Test data conventions

- **Unique email per run** so records never collide and you can find yours:
  `qa-<scenario>-<yyyymmddhhmm>@<your-inbox>` e.g. `qa-b2c01-202606271430@you.com`
- **Password** for any account you create: `Test1234!` (≥8 chars, satisfies the API rule)
- **Shipping address** (use this everywhere unless told otherwise):
  - Recipient: `QA Tester`
  - Address line 1: `12 Test Street`
  - City: `Cape Town`
  - Province: `Western Cape`
  - Postal code: `8001`
  - Country: `South Africa`
  - Phone: `+27 71 000 0000`
- **Order number format** to look for: `SF-YYYYMMDD-XXXXXX` (e.g. `SF-20260627-AB12CD`)
- For tests needing **staff login** or an **approved B2B login**, use the credentials
  provided to you separately (shown as `<ADMIN_EMAIL>` / `<ADMIN_PASSWORD>` etc.).

---

## Test index

| ID | Persona | Scenario | Pairs with |
|----|---------|----------|-----------|
| **B2C-01** | Guest | Browse → cart → guest checkout → reach payment (no customisation) | — |
| **B2C-02** | Registered customer | Account + product **with printing** → checkout → artwork upload → see order in account | — |
| **B2C-03** | Any visitor | Multi-currency price display integrity through the funnel | — |
| **B2C-04** | Guest | Cart editing + MOQ / quantity validation + empty states | — |
| **B2C-05** | Customer | Public order tracking (`/track`) by order number + email | runs after B2C-01/02 |
| **B2B-01** | Prospective business | B2B registration application → "Pending" state | ADMIN-01 |
| **B2B-02** | Approved B2B | Login → volume-tier pricing → recurring-orders access | needs ADMIN-01 done |
| **B2B-03** | Approved B2B | Bulk order with **printing + colour change together** → checkout | needs ADMIN-01 done |
| **ADMIN-01** | Staff | Approve a pending B2B application | B2B-01 |
| **ADMIN-02** | Staff | Walk a storefront order through the status pipeline (+ Cancelled) | needs a placed order |
| **ADMIN-03** | Staff | Create a B2B order via the 3-step wizard + generate invoice | — |

**Recommended run order across sessions:** B2C-01, B2C-02 and B2B-01 first (they create
data). Then ADMIN-01 (approve the B2B-01 applicant), then B2B-02 / B2B-03 (use the
approved account), ADMIN-02 (use an order from B2C-01/02), B2C-05 (track a created order).
B2C-03, B2C-04, ADMIN-03 are independent and can run anytime.

---

## Bug report format (every session returns this)

End each session with a report in exactly this shape so results are comparable:

```
### <TEST-ID> result: PASS | FAIL | BLOCKED
Environment: <browser>, <date/time>, <currency if relevant>
Account/data used: <email / order number / client created>

Steps completed: <e.g. 1–7 of 9>

BUGS / ISSUES:
- [SEVERITY: Critical|High|Medium|Low] <one-line title>
  - Step: <which step>
  - Expected: <what should have happened>
  - Actual: <what happened>
  - Evidence: <URL, screenshot note, exact on-screen text, console error if any>
  - Reproducible: <yes/no/intermittent>

Notes / observations: <anything odd that isn't strictly a bug>
```

Severities: **Critical** = blocks purchase or loses money/data; **High** = wrong price/
data or broken core step with a workaround; **Medium** = confusing UX or minor functional
gap; **Low** = cosmetic.
