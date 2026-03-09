# Go Git It

> Version control for vibe-coders — no Git jargon, just friendly snapshots.

Go Git It is a VS Code extension that wraps Git in plain English. No terminal, no commands, no confusing vocabulary. Just a friendly sidebar that keeps your work safe.

---

## What it does

| You want to… | Go Git It calls it… | Under the hood |
|---|---|---|
| Save your progress | **Take a snapshot** | `git add -A && git commit` |
| Back up online | **Send to GitHub** | `git push` |
| Get someone else's changes | **Get latest** | `git fetch && git pull` |
| Try something risky | **Start an experiment** | `git checkout -b experiment/…` |
| Keep the experiment | **Merge experiment** | `git merge --no-ff` |
| Scrap the experiment | **Abandon experiment** | `git branch -D` |
| Undo to a past moment | **Go back to snapshot** | `git checkout <hash>` |

---

## Installation

### From VSIX (current)
1. Download `go-git-it-0.2.0.vsix` from this repo
2. In VS Code: `Extensions` → `···` menu → `Install from VSIX…`
3. Select the file — done

### From Marketplace *(coming soon)*
Search **"Go Git It"** in the VS Code Extensions panel.

---

## Getting started

1. Open any project folder in VS Code
2. Click the **⎇** icon in the Activity Bar (left sidebar)
3. The Go Git It panel opens — all actions are right there

**First time with a brand new project?**
Click **🏗️ Build a new project** — the wizard creates a folder, sets up Git, writes a README, and optionally connects to GitHub in under a minute.

---

## The sidebar panel

```
┌─────────────────────────┐
│ GO GIT IT  🌿 Main line │  ← current branch
├─────────────────────────┤
│ ✅ Everything saved     │  ← live status
├─────────────────────────┤
│  YOUR WORK              │
│ ┌──────────┬──────────┐ │
│ │ 📸       │ ☁️        │ │
│ │ Snapshot │ GitHub   │ │
│ ├──────────┼──────────┤ │
│ │ ⬇️        │ 🧪       │ │
│ │ Get Latest│Experiment│ │
│ └──────────┴──────────┘ │
│                         │
│  PROJECTS               │
│  🏗️ Build new project   │
│  📂 Open different...   │
│  📖 How does this work? │
├─────────────────────────┤
│  TIMELINE · 3 snapshots │
│  ● Snapshot: 2h ago     │
│  ● Started project      │
└─────────────────────────┘
```

### Status line

| Status | Meaning |
|---|---|
| ✅ Everything saved & backed up | All work committed and pushed |
| 🔵 Saved here, not on GitHub yet | Committed locally, not pushed |
| 🟡 You have unsaved changes | Working tree is dirty |
| ⚠️ Not connected to GitHub | No remote configured |

### Timeline dots

| Color | Meaning |
|---|---|
| 🟢 Green | Committed + pushed to GitHub |
| 🔵 Blue | Committed, not on GitHub yet |
| 🟡 Pulsing yellow | Unsaved changes right now |
| 🔵 Teal | Experiment branch commits |

Click any dot in the timeline to **see what changed** or **go back** to that moment.

---

## Experiments

Experiments let you try risky ideas without touching your main work.

```
Start experiment  →  work freely  →  Merge (keep it) or Abandon (delete it)
```

- While on an experiment, two extra buttons appear: **✅ Merge** and **🗑️ Abandon**
- Merging adds all experiment changes into your main line
- Abandoning deletes the branch — your main work is completely untouched

---

## Error messages

When something goes wrong, Go Git It explains it in plain English — never raw Git output. Click **❓ What went wrong?** in the sidebar for a full explanation and a one-click fix.

| Error | Plain English | Fix |
|---|---|---|
| `DIRTY_PULL` | You have unsaved changes that could get overwritten | Snapshot first, then get latest |
| `MERGE_CONFLICT` | Two changes touched the same spot | Undo the merge and try again |
| `NO_UPSTREAM` | Project isn't connected to GitHub | Connect to GitHub (one-time setup) |
| `NOTHING_TO_COMMIT` | Nothing has changed since last snapshot | Keep working, snapshot later |

---

## Requirements

- **VS Code** ≥ 1.85
- **Git** ≥ 2.0 (must be on PATH — [download](https://git-scm.com))
- **GitHub CLI** *(optional)* — needed for auto repo creation ([download](https://cli.github.com))

---

## FAQ

**Do I need a GitHub account?**
No. All snapshot/experiment features work completely offline. GitHub is only needed for "Send to GitHub."

**What if I already have a Git repo?**
Just open the folder in VS Code — Go Git It detects the `.git` directory and activates automatically.

**Can I still use the terminal alongside this?**
Yes. The timeline refreshes automatically when you commit, switch branches, or pull from the terminal.

**What is an "experiment" technically?**
A Git branch named `experiment/<your-name>`. You can see it with `git branch` if you're curious.

---

## Feedback & issues

Found a bug or have an idea? [Open an issue](https://github.com/kiangolshan/Go-Git-It/issues).
