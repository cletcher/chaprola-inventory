# Chaprola Inventory Tracker

Asset inventory management app built on [Chaprola](https://chaprola.org). Tracks IT equipment across locations with depreciation analysis, low stock alerts, and server-side batch processing.

**Live app:** https://chaprola.org/apps/chaprola-inventory/inventory/

## Features

- **Inventory** — Browse 48 assets with search, category/status filtering
- **Reports** — Depreciation analysis (server-side /run), asset value summary, items by location (pivot)
- **Batch Operations** — Server-side depreciation recalculation (/run-each), low stock checks
- **Alerts** — 10 alert types: overdue, low stock, depreciation, audit due, due soon

## Architecture

- **Frontend:** Static HTML/CSS/JS hosted on Chaprola CDN (`frontend/`)
- **Backend:** Chaprola data platform — `items.DA` (48 assets), `alerts.DA` (10 alerts), `transactions.DA`
- **Batch processing:** `/run-each` executes `calc_depreciation` program against all items server-side

## Chaprola userid/project

- **userid:** `chaprola-inventory`
- **project:** `inventory`
