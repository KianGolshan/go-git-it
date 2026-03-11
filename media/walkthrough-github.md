## Connecting and backing up to GitHub

GitHub stores your entire project — including every snapshot — safely online.

**Why it matters:**
- If your computer breaks or gets lost, your work is 100% safe
- You can access your project from any computer
- It's free for personal projects

---

### First time connecting a project

Click **Connect to GitHub** in the sidebar (or the "Connect GitHub" button in the action grid).

Go Git It will ask for a name for your repo, then create it on GitHub and upload everything automatically.

After connecting, the status line changes to:
> ✅ Everything saved & backed up

---

### Sending snapshots to GitHub

Once connected, click **Send to GitHub** to upload your latest snapshots.

The dots in your timeline turn **green** when a snapshot has been uploaded to GitHub.

---

### How often should I send to GitHub?

After every snapshot, ideally. At minimum: **at the end of every work session.** That way, even if your laptop dies overnight, everything is safe.

---

## Troubleshooting

### "One free tool needed" prompt appears

The GitHub CLI isn't installed on your computer. It's free and takes 1 minute to set up.

Go to the previous step ("Setting up GitHub") for a step-by-step guide, or go to [cli.github.com](https://cli.github.com) to install it directly.

---

### "Log in to GitHub" prompt appears

The GitHub CLI is installed but you haven't logged in yet. Open the terminal and run:

```
gh auth login
```

Choose **Login with a web browser** when prompted. It opens your browser and logs you in automatically. You only do this once.

---

### "Couldn't connect to GitHub" error

A few things to check:

1. **Are you connected to the internet?** Try opening a website to confirm.
2. **Is your login still valid?** Open the terminal and run `gh auth status`. If it says you're not logged in, run `gh auth login` again.
3. **Does a repo with that name already exist?** Try a different name — GitHub doesn't allow two repos with the same name under your account.
4. **No commits yet?** You need to take at least one snapshot before connecting to GitHub. Take a snapshot first, then connect.

---

### The "Connect GitHub" button disappeared but I'm not connected

This can happen if GitHub CLI partially ran but the push failed. Open the terminal and run:

```
gh auth status
```

If you're logged in, try clicking **Connect to GitHub** again in the sidebar.

---

### The dots in my timeline aren't green

Green dots mean the snapshot is on GitHub. If your dots are still grey after sending, click **Send to GitHub** again. If it keeps failing, check the troubleshooting steps above.
