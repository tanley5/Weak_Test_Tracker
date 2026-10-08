# Weak-Area Tracker

Desktop EA exam practice logger (Electron + React + SQLite). Track per-question misses via a floating widget or log batch sessions, then review domain accuracy on a dashboard.

## Features

- **Active exam part** (1 / 2 / 3) — widget and forms always use the active part’s domain list
- **Domain list CRUD** — add, rename, and delete domains per exam part in **Manage domains** (Part 1 is seeded; Part 2/3 start empty; renames update historical logs)
- **Batch entry** — domain + correct/total + date → `batch_sessions`
- **Floating widget** — always-on-top pill; expands on click, focus, or `Ctrl+Shift+Q` (⌘⇧Q on Mac)
- **Dashboard** — needs-drilling list, heatmap, weekly trend, miss-reason breakdown

## Install

**Requirements:** Node.js 20+ (includes npm), macOS / Windows / Linux.

```bash
git clone https://github.com/tanley5/Weak_Test_Tracker.git
cd Weak_Test_Tracker
npm install
npm run dev
```

`npm install` installs dependencies and builds the native SQLite module. `npm run dev` rebuilds that module for Electron and launches the app.

To verify the suite after install:

```bash
npm test
```

SQLite data is stored in the Electron `userData` directory as `weak-tracker.db`.

## Develop

```bash
npm test          # Vitest (rebuilds better-sqlite3 for Node)
npm run dev       # Electron app (rebuilds better-sqlite3 for Electron)
npm run build     # Production bundle under out/
```

## Domains

Part 1 ships with a seeded list. Use **Manage domains** in the app to add, rename, or delete domains for the active exam part. Renames rewrite historical attempt/batch labels for that part; deletes remove the domain from dropdowns but keep past logs.

## Tests

Core logic is TDD’d under `tests/`:

- domains, stats aggregation, widget expand/collapse state machine
- SQLite migrate / domain CRUD / today stats
- batch form validation
