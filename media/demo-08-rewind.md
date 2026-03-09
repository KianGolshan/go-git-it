## Step 8 — Go back if something breaks

---

Something broke. You're not sure what changed. You just want it to work again like it did yesterday.

**Look at the timeline in the sidebar.** Every dot is a snapshot — a moment you can go back to.

---

### How to rewind

Click any dot in the timeline. A menu appears:

- **👁 See what changed in this snapshot** — shows a summary of every file that was different at this point
- **↩️ Go back to this snapshot** — rewinds your project to that exact moment

---

### Before going back

If you have unsaved changes right now (🟡 pulsing dot), Go Git It asks:

> **📸 Take snapshot first** — saves your current state before rewinding, so you don't lose it

> **↩️ Go back anyway** — rewinds immediately, current unsaved work is gone

If what you have right now is broken and you don't want it, choose "Go back anyway." If you might want it later, take a snapshot first.

---

### Reading the timeline dots

| Dot color | Meaning |
|---|---|
| 🟡 Pulsing yellow | Your current unsaved changes |
| 🔵 Blue | Snapshot saved on your computer only |
| 🟢 Green | Snapshot backed up to GitHub |
| 🔵 Teal | Snapshot inside an experiment |

---

### Example rewind scenario

You've been working all morning and everything was fine at 10am. It's now noon and something is broken. You scroll your timeline to the dot labeled "10:02 AM — Nav working" and click it. VS Code opens a terminal and rewinds your files to that exact state.

From there you can compare, figure out what went wrong, and start fresh.

---

### The full loop

Here's the complete everyday cycle with Go Git It:

```
Build something
   → 📸 Snapshot
   → ☁️ Send to GitHub
   → Build more
   → 📸 Snapshot
   → Want to try something risky?
       → 🧪 Start experiment
       → Build, snapshot freely
       → ✅ Merge  OR  🗑️ Abandon
   → Something broke?
       → Click timeline dot → ↩️ Go back
```

That's all of it. You've seen the whole tool. Go build something great.
