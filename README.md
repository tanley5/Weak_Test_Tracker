# Weak-Area Tracker

Desktop EA exam practice logger (Electron + React + SQLite). Track per-question misses via a floating widget or log batch sessions, then review domain accuracy on a dashboard.

## Features

- **Active exam part** — pick the part you’re drilling; the floating widget always uses that part’s domains
- **Exam part CRUD** — add, rename, or delete parts in **Manage exam parts** (seeded Part 1–3; cannot delete the last part or a part with logged data)
- **Domain list CRUD** — add, rename, and delete domains per active part in **Manage domains** (Part 1 is seeded; renames update historical logs)
- **Batch entry** — domain + correct/total + date → `batch_sessions`
- **Floating widget** — always-on-top Log Q pill; expands on click, focus, or `Ctrl+Shift+Q` (⌘⇧Q on Mac); collapses when focus leaves
- **Close vs quit** — hide the main window and keep the pill, or quit the whole app
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

## Windows & quit behavior

The app runs with two surfaces: the **main window** and the always-on-top **Log Q pill**.

| Action | Result |
| --- | --- |
| Close main window (red X) or Home → **Exit…** | Dialog: **Main window only** (pill stays) / **Quit app** (both close) / **Cancel** |
| Expanded pill → **Open main window** | Brings the dashboard back |
| Dock / taskbar click (macOS activate) | Reopens the main window (pill keeps running) |

While only the pill is open you can keep logging questions without the full UI.

## Develop

```bash
npm test          # Vitest (Node sqlite → tests → restore Electron sqlite)
npm run dev       # Electron app
npm run build     # Production bundle under out/
npm run dist:mac  # Build + package macOS DMG into dist/
```

## Domains & exam parts

- **Manage exam parts** — CRUD for Part 1 / 2 / 3 (and any extras you add). Switching the active part on Home updates the widget immediately.
- **Manage domains** — CRUD for the *active* part’s domain list. Renames rewrite historical attempt/batch labels for that part; deletes remove the domain from dropdowns but keep past logs.

## Tests

Core logic is TDD’d under `tests/`:

- domains, exam parts, stats aggregation, widget expand/collapse (including blur → pill)
- app close dialog choice mapping (main-only vs quit)
- SQLite migrate / CRUD / today stats
- batch form validation
- system theme chart helpers
