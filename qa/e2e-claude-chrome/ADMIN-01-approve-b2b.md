# TEST ADMIN-01 — Staff approve a pending B2B application

> **Paste this whole file into a fresh Claude-in-Chrome session.**

You are a QA tester driving a real browser against the live **Be Different Packaging**
**admin portal** (staff only). Goal: approve the pending B2B application created by
**B2B-01**, setting a credit limit and payment terms, and confirm the applicant flips to
**Approved**.

## ⚠️ Safety rules
- This is the **live** admin portal. **Only approve the specific test application** created
  by B2B-01 (match the unique company name / email). **Do not touch any other client or
  application.**
- Do not reject/alter real businesses.

## Credentials
Log in with the staff account provided to you: `<ADMIN_EMAIL>` / `<ADMIN_PASSWORD>`.

## Precondition
B2B-01 has been run and produced a pending application. You need its **company name** and
**applicant email** (e.g. `QA Test Co <timestamp>` / `qa-b2b01-…@…`).

## Steps

1. Go to https://admin.bedifferentpackaging.com → you should land on **`/login`**.
   - *Expected:* Login form with **"Email address"** and **"Password"** fields and a
     **"Sign in"** button.

2. **Sign in** with the staff credentials.
   - *Expected:* Redirects to the dashboard (`/`). On failure, the page shows
     "Invalid email or password." (test that separately only if you want — don't lock the
     account).

3. Navigate to **B2B Applications** → `/b2b/pending` ("B2B Applications" / "Pending
   Applications").
   - *Expected:* A list of pending applications as cards, each with a **"Pending Review"**
     badge, company details, contact, requested payment terms, and **"Approve" / "Reject"**
     buttons.

4. **Locate the B2B-01 application** by its unique company name / email. Verify the shown
   details match what B2B-01 submitted (company, contact, VAT, requested terms).
   - *Watch:* missing/garbled fields vs what was submitted.

5. Click **"Approve"** on that card.
   - *Expected:* An inline form appears with **"Credit limit (ZAR)"** (number) and
     **"Payment terms (days)"** (pre-filled with the requested terms).

6. Enter **Credit limit = `50000`** and **Payment terms = `30`**. Click **"Confirm
   approval"**.
   - *Expected:* Button shows "Approving…", then the application disappears from the
     pending list (success).

7. **Verify the new client exists:** go to `/clients`, search the company name.
   - *Expected:* The company appears as a client with **status "Active"**. Open it
     (`/clients/{id}`) and confirm Credit Limit = R50,000 and Payment Terms = Net 30.

8. **Cross-system verification (hand back to B2B-02):** the applicant's storefront account
   should now read **"B2B Approved"**. (The B2B-02 session will confirm from the customer
   side.)

## Acceptance criteria
- [ ] Pending application is listed with correct submitted details.
- [ ] Approve flow accepts credit limit + payment terms.
- [ ] After approval, the application leaves the pending list and a matching **Active**
      client exists with the entered credit limit / terms.

## Known-risk watch-list
- Submitted application fields not matching what the customer entered in B2B-01.
- Approve succeeding but **no client created** / wrong credit limit saved.
- Payment-terms field not pre-filling the requested value.
- Reject flow wording (don't execute reject on the real test unless you intend to — if you
  do test reject, use a throwaway second application, never a real business).

## ▶ Handoff
Print the **client id, company name, credit limit, terms**, and confirm approval succeeded
so **B2B-02 / B2B-03** can use the now-approved account.

## Report
```
### ADMIN-01 result: PASS | FAIL | BLOCKED
Environment: <browser>, <date/time>
Approved: company "<...>", client id <...>, credit R50000, Net 30
Steps completed: <x>–<y> of 8
BUGS / ISSUES:
- [SEVERITY] <title> — Step / Expected / Actual / Evidence / Reproducible
Notes (field-mapping accuracy between application and saved client):
```
