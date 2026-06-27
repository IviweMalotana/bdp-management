# BDP E2E test-suite helpers.
# Run from qa/e2e-claude-chrome/  (e.g. `make summary`).

PY ?= python3

.PHONY: help summary watch clean list

help:                ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
	  | sort | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-10s\033[0m %s\n",$$1,$$2}'

summary:             ## Aggregate results/*.md into SUMMARY.md
	@$(PY) aggregate.py results/

watch:               ## Re-aggregate whenever a report changes (needs entr; falls back to a poll loop)
	@command -v entr >/dev/null 2>&1 \
	  && ls results/*.md 2>/dev/null | entr -c $(PY) aggregate.py results/ \
	  || { echo "entr not found — polling every 5s (Ctrl-C to stop)"; \
	       while true; do $(PY) aggregate.py results/ >/dev/null 2>&1; sleep 5; done; }

list:                ## List the report files that will be aggregated
	@ls -1 results/*.md 2>/dev/null | grep -vE '/(README|SUMMARY|RESULTS)\.md$$' || echo "(no reports yet)"

clean:               ## Remove the generated SUMMARY.md
	@rm -f SUMMARY.md && echo "removed SUMMARY.md"
