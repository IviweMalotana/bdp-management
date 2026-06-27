# BDP E2E — Results aggregation & severity judge

One place to collect all 12 session reports, judge severity consistently, and roll
everything up into a prioritized fix list.

There are two ways to roll up:
- **Manual:** fill in the status table + triage board below by hand.
- **Automatic:** drop each raw session report into `results/` as a `.md` file and run
  `python3 aggregate.py` — it parses the standard report format and prints (and writes
  `SUMMARY.md`) a severity-grouped board for you. See "Automatic roll-up" at the bottom.

---

## 1. Severity judge (rubric)

Rate every finding with this decision order — **stop at the first line that matches**:

| Severity | Use when… | Examples | Triage |
|----------|-----------|----------|--------|
| **🔴 Critical** | Purchase is blocked, money/data is lost, or privacy/auth is breached | Can't reach the payment page; Paystack amount ≠ order total; order not created after reaching payment; `/track` reveals another customer's order with the wrong email; staff login bypass; approving a B2B creates no client | **Block launch — fix now** |
| **🟠 High** | A price/total/quantity/data value is **wrong**, or a core step is broken but has a workaround | Printing surcharge dropped between PDP and cart; MOQ not enforced → under-charge; tier price non-monotonic; order status won't persist; "B2B Approved" doesn't unlock recurring orders; invoice VAT/total wrong | **Fix before launch** |
| **🟡 Medium** | Confusing UX, missing validation, or a non-blocking functional gap | Weak/missing field validation; customisation lock message wrong but blocked correctly; currency selector hard to find; "Customisation Accepted" stage shown for a non-customised order | **Backlog — soon** |
| **⚪ Low** | Cosmetic only, no functional impact | Copy typos, alignment, a harmless console warning, inconsistent capitalisation | **Nice to have** |

**Tie-breakers:**
- *Wrong money* (any total/price the customer or business would actually be charged) is
  **never** below **High**. If the customer is charged the wrong amount → **Critical**.
- *Data exposure* of anyone else's data → **Critical**, regardless of how minor it looks.
- If a finding could be High **or** Medium, ask: *"Would a real customer lose money,
  abandon the purchase, or get wrong goods?"* Yes → High. No → Medium.
- A **BLOCKED** test (couldn't run due to a precondition) is **not** a bug by itself —
  record why it was blocked; only the underlying cause may be a bug.

---

## 2. Status board — one row per test

Fill PASS / FAIL / BLOCKED and the count of findings by severity.

| Test | Result | 🔴 | 🟠 | 🟡 | ⚪ | Owner | Notes |
|------|--------|----|----|----|----|-------|-------|
| B2C-01 guest checkout | | | | | | | |
| B2C-02 customisation purchase | | | | | | | |
| B2C-03 multi-currency | | | | | | | |
| B2C-04 cart/MOQ validation | | | | | | | |
| B2C-05 order tracking | | | | | | | |
| B2B-01 registration | | | | | | | |
| B2B-02 approved pricing/recurring | | | | | | | |
| B2B-03 bulk customisation order | | | | | | | |
| ADMIN-01 approve B2B | | | | | | | |
| ADMIN-02 status pipeline | | | | | | | |
| ADMIN-03 create order + invoice | | | | | | | |
| **Totals** | | | | | | | |

---

## 3. Triage board — findings grouped by severity

Paste each finding as one line: `[TEST-ID] <title> — <one-line note>`. Highest first.

### 🔴 Critical (block launch)
- 

### 🟠 High (fix before launch)
- 

### 🟡 Medium (backlog soon)
- 

### ⚪ Low (nice to have)
- 

---

## 4. Raw reports

Paste each session's full report here (or, preferred, save them as files in `results/`
and use the aggregator). Keep the standard format so the script can parse them.

<details><summary>B2C-01</summary>

```
(paste report)
```
</details>

<!-- repeat <details> blocks per test as needed -->

---

## 5. Automatic roll-up

The aggregator turns raw reports into the boards above automatically.

**Steps:**
1. For each completed session, save its report as a file in `qa/e2e-claude-chrome/results/`
   — e.g. `results/B2C-01.md`. One report per file is cleanest, but the script also handles
   several reports in one file.
2. Run it:
   ```bash
   cd qa/e2e-claude-chrome
   python3 aggregate.py            # prints to screen + writes SUMMARY.md
   python3 aggregate.py results/   # explicit folder
   ```
3. Open `SUMMARY.md` for the rolled-up status table + severity-grouped findings.

**What it parses** (the standard report shape the test packs already emit):
- Result line: `### B2C-01 result: PASS` / `FAIL` / `BLOCKED`
- Finding lines: `- [Critical] <title>` **or** `- [SEVERITY: High] <title>` (case-insensitive;
  the severity word just needs to be inside the leading `[...]`).

No dependencies — standard-library Python 3 only.
