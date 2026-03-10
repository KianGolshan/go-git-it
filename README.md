# Go Git It

**Version control for people who just want to build things.**

Go Git It wraps Git in plain English — no terminal, no jargon, no learning curve. A friendly sidebar panel keeps your work safe with snapshots, GitHub backups, and risk-free experiments.

---

## Why Go Git It?

Most developers take version control for granted. Everyone else either skips it entirely (and loses work), or spends hours learning Git commands that feel like a foreign language.

Go Git It fixes that. It's Git — but every action has a name you actually understand.

| You want to… | Go Git It calls it… |
|---|---|
| Save your progress | **Take a snapshot** |
| Back up online | **Send to GitHub** |
| Get someone else's changes | **Get latest** |
| Try something risky | **Start an experiment** |
| Keep the experiment | **Finish experiment** |
| Scrap the experiment | **Abandon experiment** |
| Undo to a past moment | **Go back to this snapshot** |

---

## Installation

### From the VS Code Marketplace *(coming soon)*
Search **"Go Git It"** in the VS Code Extensions panel and click **Install**.

### From VSIX (current)
1. Download `go-git-it-0.2.0.vsix` from the [Releases](../../releases) page
2. In VS Code: open the Extensions panel → click the `···` menu → **Install from VSIX…**
3. Select the downloaded file — done

---

## Requirements

- **VS Code** 1.85 or newer
- **Git** — free, must be installed ([download here](https://git-scm.com/downloads))
- **GitHub CLI** *(optional)* — needed only for automatic GitHub repo creation ([download here](https://cli.github.com))

> Don't have Git? Go Git It detects this on startup and walks you through installing it.

---

## Getting Started

1. Open any folder in VS Code
2. Click the **⎇** branch icon in the Activity Bar (left sidebar)
3. The Go Git It panel opens — everything is right there

**Starting a brand new project?**
Click **🏗️ Build a new project** — the wizard creates your folder, sets up version control, writes a README, and optionally connects to GitHub in under a minute.

---

## The Sidebar Panel

```
┌─────────────────────────────┐
│  GO GIT IT    🌿 Main line  │  ← current branch
├─────────────────────────────┤
│  ✅ Everything saved         │  ← live status
├─────────────────────────────┤
│  YOUR WORK                  │
│  ┌───────────┬───────────┐  │
│  │    📸     │    ☁️      │  │
│  │ Snapshot  │  GitHub   │  │
│  ├───────────┼───────────┤  │
│  │    ⬇️     │    🧪     │  │
│  │ Get Latest│ Experiment│  │
│  └───────────┴───────────┘  │
│                             │
│  PROJECTS                   │
│  🏗️ Build a new project     │
│  📂 Open a different project│
│  📖 How does this work?     │
├─────────────────────────────┤
│  TIMELINE · 3 snapshots     │
│  ● Added the hero section   │
│  ● Fixed nav links          │
│  ● 🎉 Started My Portfolio  │
└─────────────────────────────┘
```

### Status indicators

| Status | Meaning |
|---|---|
| ✅ Everything saved & backed up | All work committed and pushed to GitHub |
| 🔵 Saved here, not on GitHub yet | Committed locally, not pushed |
| 🟡 You have unsaved changes | Files changed since last snapshot |
| ⚠️ Not connected to GitHub | No remote configured yet |

### Timeline dots

| Color | Meaning |
|---|---|
| 🟢 Green | Committed and backed up to GitHub |
| 🔵 Blue | Committed, not on GitHub yet |
| 🟡 Pulsing yellow | Unsaved changes right now |
| 🔵 Teal | Commits on an experiment branch |

Click any dot to **see what changed** at that point, or **go back** to that exact moment.

---

## Snapshots

A snapshot saves your project at this exact moment — like a save point in a video game.

- Take one whenever something is working
- Add an optional note like "Added the contact form"
- They stack up in the timeline so you can always go back

The timeline updates automatically whenever you save, commit from the terminal, switch branches, or pull from GitHub.

---

## Experiments

Experiments let you try risky ideas without touching your main work.

```
Start experiment → work freely → Finish (keep it) or Abandon (delete it)
```

- While on an experiment, **Finish** and **Abandon** buttons appear in the panel
- **Finish** merges all experiment changes into your main line
- **Abandon** deletes the branch entirely — your main work is completely untouched
- You can take snapshots inside an experiment just like normal

---

## Error Explanations

When something goes wrong, Go Git It never shows raw Git output. Every error has a plain-English explanation and a one-click fix.

| Situation | Plain English | Fix |
|---|---|---|
| Unsaved changes before getting latest | Your edits could get overwritten | Snapshot first, then get latest |
| Merge conflict | Two changes touched the same spot | Undo the merge and try again |
| Not connected to GitHub | Project isn't linked to a repo yet | Connect to GitHub (one-time setup) |
| Nothing changed since last snapshot | Nothing new to save | Keep working, snapshot later |
| Git not installed | Git isn't on this computer | Download Git (link provided) |

---

## FAQ

**Do I need a GitHub account?**
No. Snapshot and experiment features work completely offline. GitHub is only needed for "Send to GitHub."

**Do I need to know Git?**
No. Go Git It is designed specifically for people who don't know (or don't want to know) Git.

**What if I already have a Git repo?**
Just open the folder in VS Code — Go Git It detects it automatically and shows your existing commit history in the timeline.

**Can I still use the terminal alongside this?**
Yes. The timeline refreshes automatically when you run Git commands in the terminal.

**What is an "experiment" under the hood?**
A Git branch named `experiment/<your-name>`. If you're curious, you can see it with `git branch` in the terminal.

**What if Git isn't installed?**
Go Git It detects this on startup, shows a clear message, and gives you a direct link to download Git.

---

## Feedback & Issues

Found a bug or have an idea? [Open an issue on GitHub](../../issues) — all feedback is welcome.
