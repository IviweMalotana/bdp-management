# Drop session reports here

Save each completed test's report as its own `.md` file in this folder
(e.g. `B2C-01.md`, `ADMIN-02.md`), then from `qa/e2e-claude-chrome/` run:

    python3 aggregate.py

It writes `SUMMARY.md` with the status board + findings grouped by severity.
Files named README.md / SUMMARY.md / RESULTS.md are ignored by the scanner.
