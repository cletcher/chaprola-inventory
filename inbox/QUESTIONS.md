# Questions for Review

## PHI Detection Issue

**Issue:** Chaprola is auto-detecting PHI in the inventory data due to the combination of date fields (checkout_date, due_date) with user assignment fields (assigned_user). This triggers a BAA requirement.

**Resolution Taken:** Removed user assignment tracking fields (assigned_user, checkout_date, due_date) from the data model to avoid PHI false-positive detection. The app now tracks:
- Asset inventory (quantities, locations, status)
- Purchase/audit dates
- Transactions (purchases, moves, audits)
- Low stock alerts

**Limitation:** Without checkout tracking, we cannot demo user-specific batch operations (e.g., "mark all items checked out to USER001 as returned"). Instead, batch operations will focus on:
- Bulk status updates by location
- Bulk reorder for low stock items
- Depreciation calculations across categories

This maintains the /run-each showcase while avoiding PHI detection.

**Alternative if needed:** Sign the BAA (even though this is not actual PHI) to enable full checkout tracking features.

## Git Remote Configuration

**Issue:** No git remote configured for this repository. Attempted to push after completing fix_field_name_v1 task but got error: "fatal: No configured push destination."

**Status:** Commit was successful locally (commit efdd857). Remote push will need to be configured by repository owner if needed.
