# Troubleshooting

Common problems and how to fix them.

---

## The sidebar shows "No git project found"

**Cause:** The folder you opened doesn't contain a `.git` directory at its root.

**Fix options:**
- Click **🏗️ Build a new project** to initialize Git in the current folder
- Open a different folder that already has Git set up (`File → Open Folder`)
- Run `git init` in the terminal if you want to set up Git manually

---

## The sidebar shows "Git is not installed"

**Cause:** Git isn't on your system PATH.

**Fix:**
1. Download Git from [git-scm.com](https://git-scm.com)
2. Install it (accept all defaults)
3. Restart VS Code completely
4. The sidebar should detect Git automatically

**macOS shortcut:** Run `xcode-select --install` in Terminal — this installs the Xcode Command Line Tools which include Git.

---

## "Send to GitHub" shows ⚠️ Not connected to GitHub

**Cause:** Your project hasn't been linked to a GitHub repository.

**Fix:**
1. Make sure the [GitHub CLI](https://cli.github.com) is installed: run `gh --version` in Terminal
2. Authenticate: `gh auth login`
3. Click **📂 Open a different project**, select your project, and it will offer to connect
4. Or run `gh repo create <name> --public --source=. --remote=origin --push` in Terminal

---

## "Get latest" is blocked — says I have unsaved changes

**Cause:** Go Git It won't pull when you have uncommitted changes, because pulling could overwrite your work.

**Fix:** Click **📸 Snapshot** first to save your current state, then **⬇️ Get Latest**. If the error explainer is open, click **"Snapshot then get latest"** to do both in one step.

---

## Merge conflict after "Finish experiment"

**Cause:** Your experiment and your main line both changed the same lines in a file.

**Fix:**
1. Click **❓ What went wrong?** in the sidebar
2. Click **"Undo the merge"** — this safely aborts and returns your main line to normal
3. Open the conflicting file, manually decide which version to keep
4. Take a snapshot of your main line
5. Try the merge again, or incorporate changes manually

---

## The timeline isn't updating

**Cause:** The `.git` watcher may not have picked up the change.

**Fix:** Click any button in the sidebar — this triggers a state refresh. If the timeline is still stale, run `Developer: Reload Window` from the Command Palette (`Cmd+Shift+P`).

---

## The extension isn't showing up in the Activity Bar

**Cause:** The extension may not have activated yet, or VS Code needs a reload after installation.

**Fix:**
1. Press `Cmd+Shift+P` → type `Developer: Reload Window` → press Enter
2. Look for the **⎇ branch icon** in the left Activity Bar
3. If it's still missing, check `Extensions` panel and confirm "Go Git It" is installed and enabled

---

## "Build a new project" fails when choosing a custom folder

**Cause:** The selected folder may not have write permissions, or the path contains unusual characters.

**Fix:**
- Choose a folder inside your home directory (~/Documents is safest)
- Avoid folder names with special characters or spaces
- Check that you have write access to the selected location

---

## gh CLI not found — GitHub features don't work

**Cause:** The GitHub CLI (`gh`) is not installed or not on PATH.

**Fix:**
1. Install from [cli.github.com](https://cli.github.com)
2. Run `gh auth login` in Terminal and follow the prompts
3. Restart VS Code

**Note:** `gh` is only required for:
- Auto-creating GitHub repos from "Build a new project"
- Listing your GitHub repos in "Open a different project"

All snapshot/experiment features work without it.

---

## Getting detailed error information

If something goes wrong and the plain-English explanation isn't enough:

1. Click **❓ What went wrong?** in the sidebar
2. In the error panel, click **"Show technical details"** at the bottom
3. This reveals the raw Git stderr output

For extension-level errors, open the VS Code Developer Tools:
- `Help → Toggle Developer Tools → Console tab`
- Look for lines prefixed with `[Go Git It]`
