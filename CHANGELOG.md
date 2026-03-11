# Changelog

All notable changes to Go Git It are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.2.2] — 2026-03-10

### Added
- **Connect to GitHub button** — when a project has no GitHub remote, a "Connect to GitHub" button now appears in the sidebar so users can connect without leaving the extension.

---

## [0.2.1] — 2026-03-09

### Changed
- README installation section updated with live marketplace link and search instructions

---

## [0.2.0] — 2026-03-09

### Added
- **Git not installed detection** — on startup, Go Git It checks whether Git is available. If not, the sidebar shows a clear "Git needs to be installed" message with a **Download Git** button that opens the official download page. A one-time notification also appears so the message isn't repeated on every refresh.
- **Demo walkthrough** — an 8-step interactive demo guides users through the full workflow: starting a project, snapshotting, backing up to GitHub, experimenting, and rewinding.

### Fixed
- **Timeline names** — branch display labels cleaned up for consistency across all states.
- **Refresh after terminal operations** — the timeline now correctly refreshes when commits, branch switches, or pulls happen outside the extension (terminal, Claude Code, etc.).
- **"How does this work?" walkthrough** — correctly opens the onboarding walkthrough from the sidebar link.

### Changed
- **UI streamlined** — sidebar layout tightened; primary action grid always visible without scrolling.

### Removed
- Dead code removed: `statusProvider.ts` and `treeWebview.ts` (unused UI implementations never shown to users).
- Dead function `connectExistingRepo()` removed from `githubSetup.ts` (duplicate of `createGithubRepo()`, never called).
- Unused `promptInput()` helper removed from `uiHelpers.ts`.

### Housekeeping
- Added `.gitignore` — `node_modules/`, `out/`, `.vsix` binaries, and local tool configs are no longer tracked in the repository.
- Fixed `NO_GIT` error explanation — previously described a missing Git repo instead of a missing Git installation.

---

## [0.2.0] — 2026-03-08

### Changed
- **Replaced the split two-pane sidebar** (TreeView + WebviewView) with a single full-height WebviewView panel — all actions visible without scrolling.
- **2×2 button grid** for primary actions (Snapshot, Send to GitHub, Get Latest, Experiment) — always at the top of the panel.
- Experiment-specific buttons (Merge / Abandon) now appear inline only when on an experiment branch.
- Status line truncates cleanly as the VS Code window resizes.

### Fixed
- Commit messages containing `|` characters were breaking timeline parsing — now uses `\x1f` (ASCII unit separator) as the field delimiter, which never appears in commit messages.
- `.git/HEAD` and `.git/index` are now watched directly — timeline updates automatically after terminal commits, branch switches, and pulls, not just on file saves.
- `defaultBranch` detection failed for locally-initialized repos — now reads `git config init.defaultBranch` first, then checks which of `main`/`master` actually exists.
- `mergeExperiment` was silently ignoring `git pull` errors — now correctly surfaces pull failures before attempting the merge.
- Removed a dead `requestRefresh` message handler in the webview that was never triggered.

---

## [0.1.0] — 2026-03-08

### Added
- **Take a snapshot** — stage all changes and commit with a timestamp and optional description.
- **Send to GitHub** — push current branch to origin.
- **Get latest** — fetch and pull from GitHub (refuses if working tree is dirty, with a clear explanation).
- **Start an experiment** — create and switch to an `experiment/<name>` branch.
- **Finish experiment** — merge experiment branch into default branch with `--no-ff`.
- **Abandon experiment** — delete experiment branch and return to main line.
- **Build a new project** — 3-step wizard: name → location → GitHub. Creates folder, initializes Git, writes README and `.gitignore`, makes first commit, optionally creates GitHub repo via `gh` CLI.
- **Open a different project** — scans ~/Documents, ~/Desktop, ~/Projects, ~/dev for Git repos; lists GitHub repos via `gh` CLI; clones GitHub-only repos on select.
- **Error explainer** — plain-English explanations for every error state (DIRTY_PULL, MERGE_CONFLICT, NO_UPSTREAM, NOTHING_TO_COMMIT) with one-click fixes.
- **Visual timeline** — commit history shown as color-coded dots; click any dot to inspect or rewind to that point.
- **Status bar badge** — live snapshot count in the VS Code status bar.
- **VS Code onboarding walkthrough** — 4-step guide: snapshots, GitHub, experiments, rewinding.
- **GitHub CLI graceful fallback** — if `gh` CLI is not installed, shows a clear modal with a setup link instead of an error.
