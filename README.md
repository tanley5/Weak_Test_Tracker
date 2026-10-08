# Weak-Area Tracker

Desktop EA exam practice logger (Electron + React + SQLite). Track per-question misses via a floating widget or log batch sessions, then review domain accuracy on a dashboard.

## Features

- **Active exam part** (1 / 2 / 3) — widget and forms always use the active part’s domain list
- **Batch entry** — domain + correct/total + date → `batch_sessions`
- **Floating widget** — always-on-top pill; expands on click, focus, or `Ctrl+Shift+Q` (⌘⇧Q on Mac)
- **Dashboard** — needs-drilling list, heatmap, weekly trend, miss-reason breakdown

## Develop

```bash
npm install
npm test          # Vitest (rebuilds better-sqlite3 for Node)
npm run dev       # Electron app (rebuilds better-sqlite3 for Electron)
```

SQLite file lives in the Electron `userData` directory (`weak-tracker.db`).

## Domains

Part 1 ships with a seeded list. Use **Manage domains** in the app to add, rename, or delete domains for the active exam part (Part 2/3 start empty). Renames update historical attempt/batch labels for that part.

## Tests

Core logic is TDD’d under `tests/`:

- domains, stats aggregation, widget expand/collapse state machine
- SQLite migrate / CRUD / today stats
- batch form validation
