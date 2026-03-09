# Architecture

How Go Git It is structured and why.

---

## Data flow

```
VS Code workspace opens
        │
        ▼
extension.ts: activate()
  ├── registers PanelWebviewProvider  →  sidebar UI
  ├── registers all commands
  ├── sets up .git file watcher       →  auto-refresh on git changes
  └── calls refreshState()
              │
              ▼
        getState(cwd)                 ←  gitRunner.ts
              │
         GitState | null
              │
              ▼
        panelProvider.update(state)
              │
              ▼
        buildHtml(state)              ←  panelWebview.ts
              │
              ▼
        webview.html = …              →  rendered in sidebar
```

---

## Module responsibilities

### `extension.ts`
The orchestrator. Owns all mutable state (`currentState`, `lastError`). Every command handler follows the same pattern:

```
get cwd → call gitRunner fn → handleResult() → refreshState()
```

Never contains business logic — delegates to `gitRunner.ts` for Git and `panelWebview.ts` for UI.

### `gitRunner.ts`
Pure Git subprocess wrapper. **No VS Code imports.** Every function:
- Takes `cwd: string` as first argument
- Returns `Promise<GitResult>` — never throws
- Stores raw stderr in `rawError` but only surfaces it on request

The `getState()` function is the read path — called after every operation to rebuild the full `GitState` snapshot.

### `panelWebview.ts`
Builds the entire sidebar HTML as a string from a `GitState` object. Stateless — the same `state` always produces the same HTML. User interactions post messages back to `extension.ts` via the VS Code webview message API.

### `githubSetup.ts`
Thin wrapper around the `gh` CLI. Two responsibilities: detect if `gh` is available (`isGhCliAvailable()`), and run `gh repo create` (`createGithubRepo()`). Falls back gracefully — never required.

### `repoSwitcher.ts`
Aggregates three sources into one QuickPick:
1. Recent VS Code workspaces
2. Local filesystem scan (max depth 3, looks for `.git` dirs)
3. `gh repo list` output (if `gh` is available)

### `errorExplainer.ts`
Maps `ErrorCode` → human copy. Opens a `WebviewPanel` beside the editor (not a notification) so there's room to explain clearly without truncation.

### `uiHelpers.ts`
Three tiny helpers used everywhere:
- `withFriendlyProgress()` — wraps any async op in a `ProgressLocation.Notification`
- `showSuccess()` — `showInformationMessage` wrapper
- `slugify()` — converts display names to git/filesystem-safe strings

---

## State machine

```
┌─────────────┐
│  No .git    │  ──── Build new project ────▶  ┌──────────────┐
│  (no repo)  │                                │  main (clean) │
└─────────────┘  ◀─── Open different project ──└──────────────┘
                                                      │  │
                               edit files ────────────┘  │
                                    ▼                     │
                             ┌─────────────┐              │
                             │ main (dirty) │              │
                             └─────────────┘              │
                                    │                     │
                          take snapshot ──────────────────┘
                                    ▼
                          ┌──────────────────┐
                          │ main (committed)  │
                          └──────────────────┘
                                    │  │
                         push ──────┘  │  start experiment
                           ▼           ▼
                    ┌──────────┐  ┌──────────────────────┐
                    │  main    │  │  experiment/* branch  │
                    │ (pushed) │  └──────────────────────┘
                    └──────────┘         │          │
                          ▲              │ merge    │ abandon
                          │             ▼          ▼
                          └─────────────┘   (branch deleted,
                           (merged back)     back to main)
```

---

## Error handling philosophy

1. **Never show raw Git output** — all errors go through `errorExplainer.ts` which maps them to plain English
2. **Never throw** — `gitRunner.ts` catches all subprocess errors and returns typed `GitResult` objects
3. **ErrorCode is the contract** — the code (not the message) determines what action to offer the user
4. **Optimistic UI** — operations run immediately; if they fail, `lastError` is set and the "What went wrong?" button appears

---

## Why a WebviewView instead of a TreeView

The original implementation used a `TreeDataProvider` for the action buttons. TreeView has significant limitations:

- Can't control button height, padding, or layout
- No two-column grid — everything is a single vertical list
- Separators take up as much space as real items
- No CSS — appearance is entirely controlled by VS Code's theme

Switching to a single `WebviewViewProvider` gives full HTML/CSS control, enabling the 2×2 button grid, the status bar, the inline timeline, and proper responsive truncation.

The tradeoff is that the webview re-renders the full HTML on state changes (rather than incremental DOM patches). Given the small payload (~5KB HTML) and the low frequency of state changes, this is acceptable.

---

## Security

All webview HTML uses:
- `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-{nonce}'`
- A fresh random nonce on every render
- No external network requests from the webview
- `escapeHtml()` applied to all dynamic content (commit messages, branch names, project names)

Git subprocess calls use `execFile` (not `exec`) — arguments are passed as an array, never interpolated into a shell string, eliminating command injection risk.
