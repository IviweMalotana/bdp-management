# TEST B2B-01 — B2B registration / business-account application

> **Paste this whole file into a fresh Claude-in-Chrome session.**

You are a QA tester driving a real browser against the live **Be Different Packaging**
storefront. Goal: verify a prospective business can **apply for a B2B account** and lands
in a **"Pending"** state awaiting staff approval. This test creates data that **ADMIN-01**
will then approve — record everything precisely.

## ⚠️ Safety rules
- No payment in this test. Use a real inbox (an approval email may be sent later).

## Test data — RECORD THESE, ADMIN-01 needs them
- Email: `qa-b2b01-<yyyymmddhhmm>@<your-inbox>`  ← **write this down**
- Password: `Test1234!`
- Company name: `QA Test Co <yyyymmddhhmm>`  ← unique so staff can find it
- VAT number: `4560123456`
- Contact person: `QA Tester`
- Billing address: `12 Test Street, Cape Town, 8001`
- Industry: `Spa` (or any offered)
- Requested payment terms: `30 days`

There are **two possible entry points**; test the one that applies:
- **(A)** Brand-new business signs up via `/auth/register` → "Business" tab.
- **(B)** Existing personal account applies via `/account/apply-business`.
Do **path A** as the primary; note in your report if path B exists and differs.

## Steps — Path A (register as Business)

1. Go to `/auth/register`. Click the **"Business"** tab.
   - *Expected:* The form expands with extra fields: Company name, VAT number (optional),
     Contact person name, Billing address, Industry (Hotel/Spa/Salon/Other), Requested
     payment terms (30 days / 60 days) — in addition to first/last name, email, password.

2. Fill **all** fields with the test data above. Click **"Create account"**.
   - *Expected:* Account created and you're logged in. No error.

3. Go to **`/account`**.
   - *Expected:* The account-type badge reads **"B2B Pending"**, and a banner explains the
     application is under review (e.g. *"Your business account application is under review.
     We'll be in touch within 2 business days."*).

4. **Confirm B2B-only features are locked while Pending:** look for "Recurring orders".
   - *Expected:* Recurring orders management is **not** available to a Pending account
     (it should appear only once **Approved**). Record what's shown.

5. **Confirm you can still shop as a normal customer** while pending: open a product, add
   to cart.
   - *Expected:* Shopping works (pending B2B = effectively a customer until approved).
   - *Watch:* Do prices look like standard volume-tier prices (no special B2B pricing yet)?
     Record a unit price at some quantity for later comparison in **B2B-02**.

## Steps — Path B (optional, if you have/create a Personal account)

6. From a **Personal** account `/account`, find the **"Apply"** CTA ("Trade with BDP").
   Open `/account/apply-business`, fill the form (Company, VAT, Contact, Billing,
   Industry, Terms), click **"Submit application"**.
   - *Expected:* Returns to account showing **"B2B Pending"** as in step 3.

## Acceptance criteria
- [ ] Business registration form exposes all company fields.
- [ ] After submit, account shows **"B2B Pending"** with an under-review banner.
- [ ] Pending account cannot access approved-only features (recurring orders).
- [ ] Pending account can still browse/add to cart.

## Known-risk watch-list
- Required-field validation on the business fields (try submitting with Company name blank).
- Whether a Pending B2B is **wrongly** granted approved-only features.
- Whether the confirmation/"under review" messaging actually appears.
- Duplicate-email handling if you re-submit (should error, not create a second account).

## ▶ Handoff to ADMIN-01
At the end, clearly print the **Company name, applicant email, and time applied** so the
ADMIN-01 session can locate and approve this exact application.

## Report
```
### B2B-01 result: PASS | FAIL | BLOCKED
Environment: <browser>, <date/time>
Created: company "<...>", email <...>, applied-at <time>
Recorded baseline price: <product/qty> = <R..> (for B2B-02 comparison)
Steps completed: <x>–<y>
BUGS / ISSUES:
- [SEVERITY] <title> — Step / Expected / Actual / Evidence / Reproducible
Notes:
```
