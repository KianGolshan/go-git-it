## Step 3 — Send your work to GitHub

---

Your snapshot is safe on your computer. Now send it to GitHub so it's backed up online.

Click **☁️ Send to GitHub** in the sidebar.

That's it. Go Git It uploads everything to GitHub.

---

### What changes in the sidebar

The status line updates to:

> ✅ Everything saved & backed up

The dots in your timeline turn **green** — green means the snapshot exists on GitHub.

---

### What if it says "Not connected to GitHub"?

Your project needs to be linked to a GitHub repo. Two ways to fix this:

**Option A — Use the GitHub CLI (easiest):**
1. Install it from [cli.github.com](https://cli.github.com)
2. Run `gh auth login` in Terminal
3. Click **☁️ Send to GitHub** again — Go Git It will create the repo automatically

**Option B — Link manually:**
1. Create a repo on [github.com](https://github.com)
2. In Terminal: `git remote add origin https://github.com/you/your-repo.git`
3. Click **☁️ Send to GitHub**

---

### How often should I send to GitHub?

After every snapshot, ideally. But at minimum: **at the end of every work session.** That way even if your laptop dies overnight, everything is safe.

---

**➡️ Next: keep building. Take snapshots as you go.**
