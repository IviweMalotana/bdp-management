#!/usr/bin/env python3
"""
BDP E2E results aggregator.

Parses the standard Claude-in-Chrome test reports and rolls them up into a
severity-grouped SUMMARY.md (and prints the same to stdout).

Usage:
    python3 aggregate.py                 # scans ./results/  (or CWD if absent)
    python3 aggregate.py results/        # scan a specific folder
    python3 aggregate.py a.md b.md       # scan specific files

It recognises, anywhere in the text:
  - Result lines:   "### B2C-01 result: PASS|FAIL|BLOCKED"
  - Finding lines:  "- [Critical] title"  or  "- [SEVERITY: High] title"
Severity matching is case-insensitive; the word just has to sit inside the
leading [...]. Lines that are obviously the empty template stub are skipped.

Standard library only.
"""
import re
import sys
from pathlib import Path

SEV_ORDER = ["Critical", "High", "Medium", "Low"]
SEV_ICON = {"Critical": "🔴", "High": "🟠", "Medium": "🟡", "Low": "⚪"}
SEV_LOOKUP = {s.lower(): s for s in SEV_ORDER}

RESULT_RE = re.compile(r"^#{1,6}\s*([A-Za-z0-9\-]+)\s+result:\s*(PASS|FAIL|BLOCKED)",
                       re.IGNORECASE)
# A finding: a bullet whose first bracket contains a severity word.
FINDING_RE = re.compile(r"^[-*]\s*\[([^\]]*)\]\s*(.*)$")
# Stub/placeholder lines from the blank template we should ignore.
STUB_HINTS = ("severity|", "<title>", "severity] <title>", "critical|high|medium|low")


def detect_severity(bracket_text):
    low = bracket_text.lower()
    for key, canon in SEV_LOOKUP.items():
        # whole-word-ish match so "low" doesn't match inside "flow"
        if re.search(r"\b" + re.escape(key) + r"\b", low):
            return canon
    return None


def is_stub(bracket_text, title):
    blob = (bracket_text + " " + title).lower()
    if not title.strip():
        return True
    return any(h in blob for h in STUB_HINTS)


def parse_text(text, source):
    """Return (results, findings).
    results: list of (test_id, status)
    findings: list of dict(test, severity, title, source)
    """
    results, findings = [], []
    current_test = source  # fall back to filename if no header seen yet
    for raw in text.splitlines():
        line = raw.strip()
        m = RESULT_RE.match(line)
        if m:
            current_test = m.group(1).upper()
            results.append((current_test, m.group(2).upper()))
            continue
        fm = FINDING_RE.match(line)
        if fm:
            sev = detect_severity(fm.group(1))
            title = fm.group(2).strip()
            if sev and not is_stub(fm.group(1), title):
                findings.append({
                    "test": current_test,
                    "severity": sev,
                    "title": title,
                    "source": source,
                })
    return results, findings


def collect_inputs(args):
    paths = []
    if not args:
        default = Path("results")
        base = default if default.is_dir() else Path(".")
        paths = sorted(p for p in base.glob("*.md") if p.name not in
                       ("SUMMARY.md", "RESULTS.md", "README.md"))
    else:
        for a in args:
            p = Path(a)
            if p.is_dir():
                paths += sorted(q for q in p.glob("*.md") if q.name not in
                                ("SUMMARY.md", "RESULTS.md", "README.md"))
            elif p.is_file():
                paths.append(p)
            else:
                print(f"warning: skipping {a} (not found)", file=sys.stderr)
    return paths


def build_summary(all_results, all_findings):
    lines = ["# BDP E2E — aggregated summary", ""]

    # Run totals
    counts = {"PASS": 0, "FAIL": 0, "BLOCKED": 0}
    for _, status in all_results:
        counts[status] = counts.get(status, 0) + 1
    sev_totals = {s: 0 for s in SEV_ORDER}
    for f in all_findings:
        sev_totals[f["severity"]] += 1

    lines.append(
        f"**Reports parsed:** {len(all_results)} result line(s) · "
        f"PASS {counts['PASS']} · FAIL {counts['FAIL']} · BLOCKED {counts['BLOCKED']}")
    lines.append("")
    lines.append("**Findings by severity:** " + " · ".join(
        f"{SEV_ICON[s]} {s} {sev_totals[s]}" for s in SEV_ORDER))
    lines.append("")

    # Per-test status table
    lines += ["## Status board", "",
              "| Test | Result | 🔴 | 🟠 | 🟡 | ⚪ |",
              "|------|--------|----|----|----|----|"]
    per_test = {}
    for test, status in all_results:
        per_test.setdefault(test, {"status": status, **{s: 0 for s in SEV_ORDER}})
        per_test[test]["status"] = status
    for f in all_findings:
        per_test.setdefault(f["test"], {"status": "?", **{s: 0 for s in SEV_ORDER}})
        per_test[f["test"]][f["severity"]] += 1
    for test in sorted(per_test):
        row = per_test[test]
        lines.append(f"| {test} | {row['status']} | "
                     f"{row['Critical']} | {row['High']} | {row['Medium']} | {row['Low']} |")
    lines.append("")

    # Severity-grouped findings
    lines += ["## Findings grouped by severity", ""]
    if not all_findings:
        lines.append("_No findings parsed yet._")
    for sev in SEV_ORDER:
        group = [f for f in all_findings if f["severity"] == sev]
        lines.append(f"### {SEV_ICON[sev]} {sev} ({len(group)})")
        if not group:
            lines.append("- _none_")
        else:
            for f in sorted(group, key=lambda x: x["test"]):
                lines.append(f"- **[{f['test']}]** {f['title']}  "
                             f"<sub>({Path(f['source']).name})</sub>")
        lines.append("")

    return "\n".join(lines).rstrip() + "\n"


def main():
    paths = collect_inputs(sys.argv[1:])
    if not paths:
        print("No report files found yet. Save reports as .md files in ./results/ "
              "(or pass paths), then re-run.", file=sys.stderr)
        # Exit 0 so an empty results/ folder doesn't fail CI; there's simply nothing
        # to aggregate until the first report lands.
        return 0

    all_results, all_findings = [], []
    for p in paths:
        text = p.read_text(encoding="utf-8", errors="replace")
        r, f = parse_text(text, str(p))
        all_results += r
        all_findings += f

    summary = build_summary(all_results, all_findings)
    Path("SUMMARY.md").write_text(summary, encoding="utf-8")
    print(summary)
    print(f"\n(Wrote SUMMARY.md · scanned {len(paths)} file(s))", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
