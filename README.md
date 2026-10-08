# Weak-Area Tracker

Desktop EA exam practice logger (Electron + React + SQLite). Track per-question misses via a floating widget or log batch sessions, then review domain accuracy on a dashboard.

## Features

- **Active exam part** (1 / 2 / 3) — widget and forms always use the active part’s domain list
- **Domain list CRUD** — add, rename, and delete domains per exam part in **Manage domains** (Part 1 is seeded; Part 2/3 start empty; renames update historical logs)
- **Batch entry** — domain + correct/total + date → `batch_sessions`
- **Floating widget** — always-on-top pill; expands on click, focus, or `Ctrl+Shift+Q` (⌘⇧Q on Mac)
- **Dashboard** — needs-drilling list, heatmap, weekly trend, miss-reason breakdown
- **System theme** — light/dark UI follows macOS (or OS) appearance

## Install (run from source)

**Requirements:** Node.js 20+ (includes npm), macOS / Windows / Linux.

```bash
git clone https://github.com/tanley5/Weak_Test_Tracker.git
cd Weak_Test_Tracker
npm install
npm run dev
```

`npm install` installs dependencies and rebuilds the native SQLite module **for Electron**. Always start with `npm run dev` (it re-runs that Electron rebuild).

To verify the suite after install:

```bash
npm test
```

`npm test` temporarily rebuilds SQLite for Node, then restores the Electron build. If the app opens blank after tests, run `npm run rebuild:electron` then `npm run dev`.

SQLite data is stored in the Electron `userData` directory as `weak-tracker.db`.

## macOS DMG (packaged app)

Build an unsigned `.dmg` installer (output under `dist/`, gitignored):

```bash
npm install
npm run dist:mac
```

That rebuilds SQLite for Electron, bundles the app, and writes e.g. `dist/Weak-Area Tracker-0.1.0-arm64.dmg`. Open the DMG and drag **Weak-Area Tracker** into Applications.

Because the build is unsigned, Gatekeeper may block the first launch: right-click the app → **Open**, or clear the quarantine flag:

```bash
xattr -cr "/Applications/Weak-Area Tracker.app"
```

## Develop

```bash
npm test          # Vitest (rebuilds better-sqlite3 for Node)
npm run dev       # Electron app (rebuilds better-sqlite3 for Electron)
npm run build     # Production bundle under out/
npm run dist:mac  # Build + package macOS DMG into dist/
```

## Domains

Part 1 ships with a seeded list. Use **Manage domains** in the app to add, rename, or delete domains for the active exam part. Renames rewrite historical attempt/batch labels for that part; deletes remove the domain from dropdowns but keep past logs.

## Tests

Core logic is TDD’d under `tests/`:

- domains, stats aggregation, widget expand/collapse state machine
- SQLite migrate / domain CRUD / today stats
- batch form validation
- system theme chart helpers
