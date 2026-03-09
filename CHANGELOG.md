# Changelog

All notable changes to Go Git It are documented here.

---

## [0.2.0] — 2026-03-08

### Changed
- **Replaced the split two-pane sidebar** (TreeView + WebviewView) with a single full-height WebviewView panel — all actions visible without scrolling
- **2×2 button grid** for primary actions (Snapshot, GitHub, Get Latest, Experiment) — always visible at the top of the panel
- Experiment-specific buttons (Merge / Abandon) now appear inline in the panel only when on an experiment branch
- Status line truncates cleanly as the VS Code window resizes

### Fixed
- Commit messages containing `|` characters were breaking timeline parsing — now uses `\x1f` (unit separator) as the field delimiter
- Extension showed "No project open" when Git wasn't on PATH — now shows a clear "Git is not installed" warning
- `.git/HEAD` and `.git/index` are now watched — timeline updates automatically after terminal commits, branch switches, and pulls (not just file saves)
- `defaultBranch` detection failed for locally-initialized repos — now reads `git config init.defaultBranch` first
- `mergeExperiment` discarded the `git pull` result silently — now checks for pull errors before merging
- Removed dead `requestRefresh` message handler in the webview

---

## [0.1.0] — 2026-03-08

### Added
- **Take a snapshot** — stage all changes and commit with a timestamp and optional summary
- **Send to GitHub** — push current branch to origin
- **Get latest** — fetch + pull (refuses if working tree is dirty)
- **Start an experiment** — create and switch to `experiment/<name>` branch
- **Finish experiment** — merge experiment into default branch with `--no-ff`
- **Abandon experiment** — delete experiment branch, return to main line
- **Build a new project** — 3-step wizard: name → location → GitHub; creates folder, git init, README, .gitignore, first commit, optional `gh repo create`
- **Open a different project** — scans ~/Documents, ~/Desktop, ~/Projects, ~/dev for git repos; lists GitHub repos via `gh` CLI; clone-on-select for GitHub-only repos
- **Error explainer** — WebviewPanel with warm plain-English explanations for DIRTY_PULL, MERGE_CONFLICT, NO_UPSTREAM, NOTHING_TO_COMMIT
- **Visual timeline** — WebviewView showing commit history as color-coded dots; click to inspect or rewind
- **Status bar badge** — live `$(git-commit) N snapshots` counter
- **VS Code walkthrough** — 4-step onboarding: snapshot, GitHub, experiments, rewind
- **gh CLI graceful fallback** — modal with link to cli.github.com when `gh` is not installed
