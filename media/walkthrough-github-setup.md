## Setting up GitHub — one time only

You only do this once. After that, connecting any project to GitHub takes one click.

---

### Step 1 — Create a free GitHub account

Go to [github.com/signup](https://github.com/signup) and create an account.

GitHub is free for personal use. It stores your project online so it's always backed up.

---

### Step 2 — Install the GitHub CLI

The GitHub CLI is a free tool that lets Go Git It create and connect GitHub repos for you automatically — no terminal commands needed later.

Download it from [cli.github.com](https://cli.github.com) and run the installer.

> **Mac users:** You can also install it with Homebrew: `brew install gh`

---

### Step 3 — Log in to GitHub

Open the Terminal in VS Code (**Terminal → New Terminal** from the menu) and run:

```
gh auth login
```

Follow the prompts — it opens your browser and logs you in. You only need to do this once per computer.

---

### That's it — you're set up!

Now go to the next step to connect your project to GitHub with one click.

---

### Troubleshooting

**"command not found: gh"** — The GitHub CLI isn't installed yet. Download it from [cli.github.com](https://cli.github.com).

**The terminal opened but I'm not sure what to type** — Type `gh auth login` and press Enter. Use the arrow keys to select options, and press Enter to confirm.

**It's asking for a token** — Choose "Login with a web browser" instead. That's easier and doesn't require copying tokens.
