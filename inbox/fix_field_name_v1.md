# Fix result.results → result.records

**Source:** Vogel eval v1 (2026-03-30)
**Status:** SHIP WITH CHANGES (one-line fix)

## Problem

app.js line 50 reads `result.results || []`, but API returns `result.records`. App shows "No items found" despite 48 records existing. Alerts tab (line 210) likely has same bug.

## What to Fix

1. **app.js line 50:** Change `result.results` to `result.records`
2. **Search for other instances:** Grep for `.results` in app.js, fix all occurrences
3. **Test inventory tab loads:** Verify 48 items appear
4. **Test alerts tab:** Verify 10 alerts appear

## Other Issues from Eval

- Empty README (21 bytes) — document what /run-each does, why batch operations showcase server-side processing
- No sample data loader — add button (though 48 items already exist)
- Verify batch operations work after fix — "Run Batch Calculation" should call /run-each and show results

## Filed

2026-03-31 04:00 UTC, Tawni
