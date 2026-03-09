# Development Guide

How to build, run, and modify Go Git It locally.

---

## Prerequisites

- Node.js ≥ 18
- VS Code ≥ 1.85
- Git ≥ 2.0

---

## Setup

```bash
git clone https://github.com/kiangolshan/Go-Git-It.git
cd Go-Git-It
npm install
```

---

## Project structure

```
Go-Git-It/
├── src/
│   ├── extension.ts        # Entry point — activation, command wiring, state
│   ├── gitRunner.ts        # All Git calls — no VS Code deps, returns GitResult
│   ├── panelWebview.ts     # Full sidebar UI — HTML/CSS/JS rendered in webview
│   ├── githubSetup.ts      # GitHub repo creation via gh CLI
│   ├── repoSwitcher.ts     # "Open a different project" QuickPick
│   ├── errorExplainer.ts   # Error WebviewPanel with plain-English copy
│   └── uiHelpers.ts        # withFriendlyProgress, showSuccess, slugify
├── media/
│   └── tree.css            # (Legacy — webview styles now live in panelWebview.ts)
├── out/                    # Compiled JS (git-ignored)
├── docs/                   # This folder
├── package.json
├── tsconfig.json
└── CHANGELOG.md
```

---

## Development workflow

### Run in VS Code (hot reload)

```bash
npm run watch          # starts tsc in watch mode
```

Then in VS Code press **F5** — this opens an Extension Development Host window with your extension loaded. Every time you save a `.ts` file, it recompiles; press **Ctrl+Shift+P → Developer: Reload Window** in the host to pick up changes.

### Build once

```bash
npm run compile
```

### Type-check without emitting

```bash
npx tsc --noEmit
```

---

## Package and install locally

```bash
# Install vsce if you don't have it
npm install -g @vscode/vsce

# Package
vsce package --no-dependencies

# Install into VS Code
code --install-extension go-git-it-0.2.0.vsix --force
```

Then restart VS Code.

---

## Key architectural decisions

### gitRunner.ts has zero VS Code imports

Every function in `gitRunner.ts` takes a `cwd: string` and returns a `GitResult`. This makes it testable in isolation without mocking the VS Code API.

```typescript
// Good — no vscode import needed
const result = await takeSnapshot('/path/to/project', 'Added hero section')
if (result.ok) console.log(result.message)
```

### Never throw — always return GitResult

All git functions catch errors internally and return `{ ok: false, code, message, rawError }`. The `message` field is always plain English for the user. `rawError` stores the original stderr and is only shown if the user explicitly requests technical details.

### Single WebviewView for the entire sidebar

The sidebar is one `WebviewViewProvider` (`panelWebview.ts`) that renders full HTML. This gives complete layout control — no TreeView API constraints. State flows one way:

```
getState() → panelProvider.update(state) → _render() → webview.html = buildHtml(state)
```

User interactions flow back via `postMessage`:

```
webview click → postMessage({ type: 'command', command: 'takeSnapshot' })
  → extension.ts onMessage → vscode.commands.executeCommand('go-git-it.takeSnapshot')
```

### Git file watcher for live updates

A `FileSystemWatcher` on `.git/{HEAD,index,COMMIT_EDITMSG}` calls `refreshState()` whenever Git changes something — so the panel updates even when you use the terminal.

---

## Adding a new action button

1. **Add the git operation** in `gitRunner.ts` — return a `GitResult`
2. **Register the command** in `extension.ts`:
   ```typescript
   ['go-git-it.myNewAction', cmdMyNewAction],
   ```
3. **Add the command handler** in `extension.ts`:
   ```typescript
   async function cmdMyNewAction(): Promise<void> {
     const cwd = getCwd()
     if (!cwd) { vscode.window.showWarningMessage('Open a project first.'); return }
     const result = await withFriendlyProgress('Doing the thing...', () => myNewAction(cwd))
     handleResult(result)
     await refreshState()
   }
   ```
4. **Add the button** in `panelWebview.ts` inside `buildHtml()`:
   ```html
   <button class="btn-secondary" data-cmd="myNewAction">
     <span class="icon">✨</span> My new action
   </button>
   ```
5. **Register in `package.json`** under `contributes.commands`
6. Recompile: `npm run compile`

---

## Debugging

Open the Extension Development Host (`F5`), then in that window:

- **Extension logs**: `Help → Toggle Developer Tools → Console`
- **Webview logs**: right-click the sidebar panel → `Open Webview Developer Tools`
- **Git state**: add `console.log` in `gitRunner.ts` — output appears in the Extension Host's Debug Console in your main VS Code window

---

## Releasing

1. Bump version in `package.json`
2. Add entry to `CHANGELOG.md`
3. `npm run compile`
4. `vsce package --no-dependencies`
5. Attach the `.vsix` to the GitHub release
