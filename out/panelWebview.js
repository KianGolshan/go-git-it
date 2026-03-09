"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PanelWebviewProvider = void 0;
function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function relativeDate(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime()))
        return '';
    const diff = Date.now() - d.getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (m < 2)
        return 'just now';
    if (h < 1)
        return `${m}m ago`;
    if (h < 24)
        return `${h}h ago`;
    if (days === 1)
        return 'yesterday';
    if (days < 7)
        return `${days}d ago`;
    return d.toLocaleDateString();
}
function truncate(s, n = 34) {
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
function getNonce() {
    const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: 32 }, () => c[Math.floor(Math.random() * c.length)]).join('');
}
function buildHtml(state, hasError, nonce) {
    // ── Status values ──────────────────────────────────────────────────────────
    const projectName = state ? '' : 'No project open';
    const isExperiment = state?.currentBranch.startsWith('experiment/') ?? false;
    const experimentName = isExperiment ? state.currentBranch.replace('experiment/', '') : '';
    let branchLabel = '—';
    let statusText = '';
    let statusClass = 'status-neutral';
    if (state) {
        branchLabel = isExperiment ? `🧪 ${experimentName}` : '🌿 Main line';
        if (!state.hasUpstream) {
            statusText = '⚠️ Not connected to GitHub';
            statusClass = 'status-warn';
        }
        else if (state.isDirty) {
            statusText = '🟡 You have unsaved changes';
            statusClass = 'status-dirty';
        }
        else if (state.commits.length > 0 && !state.commits[0].pushed) {
            statusText = '🔵 Saved here, not on GitHub yet';
            statusClass = 'status-local';
        }
        else {
            statusText = '✅ Everything saved & backed up';
            statusClass = 'status-ok';
        }
    }
    // ── Timeline nodes ─────────────────────────────────────────────────────────
    const timelineHtml = !state || state.commits.length === 0
        ? `<div class="timeline-empty">No snapshots yet — take your first one!</div>`
        : state.commits.map(c => {
            const dotClass = isExperiment && !c.isBranchPoint ? 'dot-exp'
                : c.pushed ? 'dot-pushed' : 'dot-local';
            const bpClass = c.isBranchPoint ? ' is-branch-point' : '';
            return `<div class="commit-row${bpClass}" data-hash="${escapeHtml(c.hash)}">
          <span class="dot ${dotClass}${c.isBranchPoint ? '' : ''}"></span>
          <div class="commit-info">
            <span class="commit-msg">${escapeHtml(truncate(c.message))}</span>
            <span class="commit-age">${relativeDate(c.date)}</span>
          </div>
        </div>`;
        }).join('');
    // ── Experiment section (conditional) ──────────────────────────────────────
    const experimentSection = isExperiment ? `
    <div class="section-label">EXPERIMENT</div>
    <div class="exp-actions">
      <button class="btn-exp-merge" data-cmd="finishExperiment">✅ Merge into main</button>
      <button class="btn-exp-abandon" data-cmd="abandonExperiment">🗑️ Abandon</button>
    </div>` : '';
    // ── Error button ───────────────────────────────────────────────────────────
    const errorBtn = hasError
        ? `<button class="btn-error" data-cmd="explainError">❓ What went wrong?</button>`
        : '';
    return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy"
  content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<style>
/* ── Reset & base ──────────────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  height: 100%;
  overflow: hidden;
  font-family: var(--vscode-font-family, system-ui, sans-serif);
  font-size: var(--vscode-font-size, 13px);
  color: var(--vscode-foreground);
  background: var(--vscode-sideBar-background);
  user-select: none;
}

/* ── Layout ────────────────────────────────────────────────────────────── */
#root {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

/* ── Header ────────────────────────────────────────────────────────────── */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px 6px;
  border-bottom: 1px solid var(--vscode-panel-border);
  flex-shrink: 0;
  min-width: 0;
}
.branch-badge {
  font-size: 11px;
  font-weight: 600;
  background: var(--vscode-badge-background);
  color: var(--vscode-badge-foreground);
  border-radius: 10px;
  padding: 2px 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 60%;
}
.header-logo {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .04em;
  color: var(--vscode-descriptionForeground);
  white-space: nowrap;
  text-transform: uppercase;
}

/* ── Status bar ────────────────────────────────────────────────────────── */
.status-bar {
  font-size: 12px;
  padding: 5px 12px;
  border-bottom: 1px solid var(--vscode-panel-border);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
}
.status-ok     { color: #4ade80; }
.status-local  { color: #60a5fa; }
.status-dirty  { color: #fbbf24; }
.status-warn   { color: #f97316; }
.status-neutral{ color: var(--vscode-descriptionForeground); }

/* ── Scrollable body ───────────────────────────────────────────────────── */
.body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 10px 10px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}

/* ── Section labels ────────────────────────────────────────────────────── */
.section-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .07em;
  text-transform: uppercase;
  color: var(--vscode-descriptionForeground);
  padding: 2px 0 4px;
}

/* ── Primary action grid (2 columns) ───────────────────────────────────── */
.actions-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
.btn-action {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 10px 6px;
  border-radius: 6px;
  border: 1px solid var(--vscode-button-border, transparent);
  background: var(--vscode-button-secondaryBackground);
  color: var(--vscode-button-secondaryForeground);
  cursor: pointer;
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  text-align: center;
  overflow: hidden;
  transition: background 0.12s, opacity 0.12s;
  min-height: 52px;
}
.btn-action:hover {
  background: var(--vscode-button-secondaryHoverBackground);
}
.btn-action:active { opacity: .8; }
.btn-icon { font-size: 18px; line-height: 1; }
.btn-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
  text-align: center;
}

/* ── Secondary (full-width) buttons ───────────────────────────────────── */
.btn-secondary {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  padding: 7px 10px;
  border-radius: 5px;
  border: none;
  background: transparent;
  color: var(--vscode-foreground);
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  text-align: left;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  transition: background 0.1s;
}
.btn-secondary:hover { background: var(--vscode-list-hoverBackground); }
.btn-secondary .icon { font-size: 14px; flex-shrink: 0; }

/* ── Experiment actions ────────────────────────────────────────────────── */
.exp-actions {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 6px;
}
.btn-exp-merge {
  padding: 7px 10px;
  border-radius: 5px;
  border: none;
  background: var(--vscode-button-background);
  color: var(--vscode-button-foreground);
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: background 0.1s;
}
.btn-exp-merge:hover { background: var(--vscode-button-hoverBackground); }
.btn-exp-abandon {
  padding: 7px 10px;
  border-radius: 5px;
  border: 1px solid var(--vscode-inputValidation-errorBorder, #f87171);
  background: transparent;
  color: var(--vscode-errorForeground, #f87171);
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  white-space: nowrap;
  transition: background 0.1s;
}
.btn-exp-abandon:hover { background: rgba(248, 113, 113, 0.1); }

/* ── Error button ──────────────────────────────────────────────────────── */
.btn-error {
  width: 100%;
  padding: 7px 10px;
  border-radius: 5px;
  border: 1px solid var(--vscode-inputValidation-warningBorder, #fbbf24);
  background: rgba(251, 191, 36, 0.08);
  color: var(--vscode-foreground);
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  text-align: left;
  transition: background 0.1s;
}
.btn-error:hover { background: rgba(251, 191, 36, 0.16); }

/* ── Divider ───────────────────────────────────────────────────────────── */
.divider {
  height: 1px;
  background: var(--vscode-panel-border);
  flex-shrink: 0;
}

/* ── Timeline ──────────────────────────────────────────────────────────── */
.timeline-wrap {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.timeline-empty {
  font-size: 11px;
  color: var(--vscode-descriptionForeground);
  text-align: center;
  padding: 12px 0;
}
.commit-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 4px 6px;
  border-radius: 4px;
  cursor: pointer;
  position: relative;
  transition: background 0.1s;
  min-width: 0;
}
.commit-row:hover { background: var(--vscode-list-hoverBackground); }
.commit-row:not(:last-child)::before {
  content: '';
  position: absolute;
  left: 11px;
  top: 16px;
  bottom: -5px;
  width: 2px;
  background: var(--vscode-panel-border);
}
.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4px;
}
.dot-pushed { background: #22c55e; }
.dot-local  { background: #3b82f6; }
.dot-exp    { background: #0ea5e9; }
.is-branch-point .dot { box-shadow: 0 0 0 2px var(--vscode-sideBar-background), 0 0 0 3px #16a34a; }
.commit-info { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.commit-msg {
  font-size: 12px;
  color: var(--vscode-foreground);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.commit-age {
  font-size: 10px;
  color: var(--vscode-descriptionForeground);
}

/* ── Empty / no-repo state ─────────────────────────────────────────────── */
.no-repo-msg {
  font-size: 12px;
  color: var(--vscode-descriptionForeground);
  line-height: 1.5;
  padding: 4px 0 8px;
}

/* ── Dirty pulse ───────────────────────────────────────────────────────── */
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: .6; transform: scale(1.4); }
}
.dot-dirty { background: #eab308; animation: pulse 1.5s ease-in-out infinite; }
</style>
</head>
<body>
<div id="root">
  <!-- Header -->
  <div class="header">
    <span class="header-logo">Go Git It</span>
    <span class="branch-badge">${escapeHtml(branchLabel)}</span>
  </div>

  <!-- Status -->
  <div class="status-bar ${statusClass}">${escapeHtml(statusText || (state ? '' : '👋 Open or build a project'))}</div>

  <!-- Body -->
  <div class="body">

    ${!state ? `
      <p class="no-repo-msg">No git project found in this folder.</p>
      <div class="section-label">GET STARTED</div>
      <button class="btn-action" data-cmd="buildNewProject" style="grid-column:1/-1;flex-direction:row;justify-content:flex-start;padding:10px 12px">
        <span class="btn-icon">🏗️</span><span class="btn-label" style="text-align:left">Build a new project</span>
      </button>
      <button class="btn-secondary" data-cmd="openDifferentProject">
        <span class="icon">📂</span> Open a different project
      </button>
    ` : `
      <!-- Primary actions -->
      <div>
        <div class="section-label">YOUR WORK</div>
        <div class="actions-grid">
          <button class="btn-action" data-cmd="takeSnapshot">
            <span class="btn-icon">📸</span>
            <span class="btn-label">Snapshot</span>
          </button>
          <button class="btn-action" data-cmd="pushToGitHub">
            <span class="btn-icon">☁️</span>
            <span class="btn-label">Send to GitHub</span>
          </button>
          <button class="btn-action" data-cmd="pullLatest">
            <span class="btn-icon">⬇️</span>
            <span class="btn-label">Get Latest</span>
          </button>
          <button class="btn-action" data-cmd="startExperiment">
            <span class="btn-icon">🧪</span>
            <span class="btn-label">Experiment</span>
          </button>
        </div>
      </div>

      ${experimentSection}

      ${errorBtn}

      <!-- Secondary actions -->
      <div>
        <div class="section-label">PROJECTS</div>
        <button class="btn-secondary" data-cmd="buildNewProject">
          <span class="icon">🏗️</span> Build a new project
        </button>
        <button class="btn-secondary" data-cmd="openDifferentProject">
          <span class="icon">📂</span> Open a different project
        </button>
        <button class="btn-secondary" data-cmd="openWalkthrough">
          <span class="icon">📖</span> How does this work?
        </button>
      </div>

      <div class="divider"></div>

      <!-- Timeline -->
      <div>
        <div class="section-label">TIMELINE · ${state.commits.length} snapshot${state.commits.length !== 1 ? 's' : ''}</div>
        <div class="timeline-wrap">
          ${state.isDirty ? `
            <div class="commit-row" style="cursor:default">
              <span class="dot dot-dirty"></span>
              <div class="commit-info">
                <span class="commit-msg">Unsaved changes ✏️</span>
                <span class="commit-age">right now</span>
              </div>
            </div>` : ''}
          ${timelineHtml}
        </div>
      </div>
    `}

  </div>
</div>

<script nonce="${nonce}">
const vscode = acquireVsCodeApi();

document.querySelectorAll('[data-cmd]').forEach(el => {
  el.addEventListener('click', () => {
    const cmd = el.getAttribute('data-cmd');
    vscode.postMessage({ type: 'command', command: cmd });
  });
});

document.querySelectorAll('.commit-row[data-hash]').forEach(el => {
  el.addEventListener('click', () => {
    vscode.postMessage({ type: 'commitClick', hash: el.getAttribute('data-hash') });
  });
});
</script>
</body></html>`;
}
class PanelWebviewProvider {
    context;
    _view;
    _state = null;
    _hasError = false;
    _onCommand;
    _onCommitClick;
    constructor(context, onCommand, onCommitClick) {
        this.context = context;
        this._onCommand = onCommand;
        this._onCommitClick = onCommitClick;
    }
    resolveWebviewView(view) {
        this._view = view;
        view.webview.options = { enableScripts: true };
        view.webview.onDidReceiveMessage((msg) => {
            if (msg.type === 'command' && msg.command)
                this._onCommand(msg.command);
            if (msg.type === 'commitClick' && msg.hash)
                this._onCommitClick(msg.hash);
        }, undefined, this.context.subscriptions);
        this._render();
    }
    update(state, hasError) {
        this._state = state;
        this._hasError = hasError;
        if (this._view)
            this._render();
    }
    _render() {
        if (!this._view)
            return;
        this._view.webview.html = buildHtml(this._state, this._hasError, getNonce());
    }
}
exports.PanelWebviewProvider = PanelWebviewProvider;
//# sourceMappingURL=panelWebview.js.map