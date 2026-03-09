"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreeWebviewProvider = void 0;
function relativeDate(iso) {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 2)
        return 'just now';
    if (hours < 1)
        return `${minutes}m ago`;
    if (hours < 24)
        return `${hours}h ago`;
    if (days === 1)
        return 'yesterday';
    if (days < 7)
        return `${days} days ago`;
    return d.toLocaleDateString();
}
function truncate(str, max = 40) {
    return str.length > max ? str.slice(0, max - 1) + '…' : str;
}
function buildWebviewHtml(state, nonce) {
    const isExperiment = state.currentBranch.startsWith('experiment/');
    const experimentName = isExperiment
        ? state.currentBranch.replace('experiment/', '')
        : '';
    const renderNode = (c, col) => {
        const colorClass = c.pushed ? 'node-pushed' : 'node-local';
        const pushedLabel = c.pushed ? '✅ Backed up to GitHub' : '🔵 Only on this computer';
        const branchPointClass = c.isBranchPoint ? ' branch-point' : '';
        return `
      <div class="commit-row${branchPointClass}" data-hash="${c.hash}" data-col="${col}"
           title="${c.message} — ${c.date}\n${pushedLabel}">
        <span class="node-dot ${colorClass}"></span>
        <div class="commit-info">
          <span class="commit-msg">${escapeHtml(truncate(c.message))}</span>
          <span class="commit-date">${relativeDate(c.date)}</span>
        </div>
      </div>`;
    };
    let commitsHtml;
    if (isExperiment) {
        // Find branch point index
        const bpIndex = state.commits.findIndex((c) => c.isBranchPoint);
        const experimentCommits = bpIndex >= 0 ? state.commits.slice(0, bpIndex) : state.commits;
        const sharedCommits = bpIndex >= 0 ? state.commits.slice(bpIndex) : [];
        commitsHtml = `
      <div class="two-col-layout">
        <div class="col-main">
          <div class="col-header col-header-main">🌿 Main line</div>
          ${sharedCommits.map((c) => renderNode(c, 'main')).join('')}
        </div>
        <div class="col-experiment">
          <div class="col-header col-header-experiment">🧪 ${escapeHtml(experimentName)}</div>
          ${experimentCommits.map((c) => renderNode(c, 'experiment')).join('')}
          ${bpIndex >= 0 ? '<div class="branch-connector">⬆ branched from main</div>' : ''}
        </div>
      </div>`;
    }
    else {
        commitsHtml = `<div class="single-col">${state.commits.map((c) => renderNode(c, 'main')).join('')}</div>`;
    }
    const dirtyDot = state.isDirty
        ? `<div class="dirty-indicator">
        <span class="node-dot node-dirty pulse"></span>
        <span class="dirty-label">Unsaved changes ✏️</span>
      </div>`
        : '';
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--vscode-font-family, system-ui, sans-serif);
      font-size: 12px;
      color: var(--vscode-editor-foreground, #334155);
      background: var(--vscode-sideBar-background, #f8fafc);
      padding: 0;
    }
    .header-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      border-bottom: 1px solid var(--vscode-panel-border, #e2e8f0);
      background: var(--vscode-sideBarSectionHeader-background, #f1f5f9);
    }
    .header-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--vscode-descriptionForeground, #94a3b8);
    }
    .branch-badge {
      font-size: 11px;
      background: var(--vscode-badge-background, #e2e8f0);
      color: var(--vscode-badge-foreground, #334155);
      border-radius: 10px;
      padding: 2px 8px;
      font-weight: 600;
    }
    .scroll-area {
      padding: 10px 12px;
      overflow-y: auto;
      max-height: calc(100vh - 48px);
    }
    .dirty-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 10px;
      padding: 6px 10px;
      background: rgba(234, 179, 8, 0.08);
      border-radius: 6px;
      border-left: 3px solid #eab308;
    }
    .dirty-label {
      font-size: 12px;
      color: #a16207;
    }
    .commit-row {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 5px 8px;
      border-radius: 5px;
      cursor: pointer;
      position: relative;
      margin-bottom: 2px;
      transition: background 0.1s;
    }
    .commit-row:hover { background: var(--vscode-list-hoverBackground, rgba(0,0,0,0.05)); }
    .commit-row::before {
      content: '';
      position: absolute;
      left: 14px;
      top: 20px;
      bottom: -8px;
      width: 2px;
      background: var(--vscode-panel-border, #e2e8f0);
    }
    .commit-row:last-child::before { display: none; }
    .node-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      flex-shrink: 0;
      margin-top: 3px;
    }
    .node-pushed  { background: #22c55e; }
    .node-local   { background: #3b82f6; }
    .node-dirty   { background: #eab308; }
    .node-old     { background: #6b7280; }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.6; transform: scale(1.3); }
    }
    .pulse { animation: pulse 1.5s ease-in-out infinite; }
    .commit-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    .commit-msg {
      font-size: 12px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--vscode-editor-foreground);
    }
    .commit-date {
      font-size: 10px;
      color: var(--vscode-descriptionForeground, #94a3b8);
    }
    .two-col-layout {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .col-header {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      padding: 4px 6px 8px;
    }
    .col-header-main { color: #16a34a; }
    .col-header-experiment { color: #0ea5e9; }
    .col-experiment .commit-row .node-pushed,
    .col-experiment .commit-row .node-local { background: #0ea5e9; }
    .branch-connector {
      font-size: 10px;
      color: var(--vscode-descriptionForeground, #94a3b8);
      text-align: center;
      padding: 4px 0;
    }
    .empty-state {
      padding: 24px 12px;
      text-align: center;
      color: var(--vscode-descriptionForeground, #94a3b8);
      font-size: 12px;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="header-bar">
    <span class="header-label">Your timeline</span>
    <span class="branch-badge">${isExperiment ? '🧪 ' + escapeHtml(experimentName) : '🌿 Main line'}</span>
  </div>
  <div class="scroll-area">
    ${dirtyDot}
    ${state.commits.length === 0
        ? '<div class="empty-state">No snapshots yet.<br>Take your first snapshot to start your timeline!</div>'
        : commitsHtml}
  </div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    document.querySelectorAll('.commit-row').forEach(row => {
      row.addEventListener('click', () => {
        vscode.postMessage({ type: 'commitClick', hash: row.dataset.hash });
      });
    });
    window.addEventListener('message', event => {
      const msg = event.data;
      if (msg.type === 'update') {
        vscode.postMessage({ type: 'requestRefresh' });
      }
    });
  </script>
</body>
</html>`;
}
function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
function getNonce() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
class TreeWebviewProvider {
    context;
    _view;
    _state;
    _onCommitClick;
    constructor(context, onCommitClick) {
        this.context = context;
        this._onCommitClick = onCommitClick;
    }
    resolveWebviewView(webviewView) {
        this._view = webviewView;
        webviewView.webview.options = { enableScripts: true };
        webviewView.webview.onDidReceiveMessage((msg) => {
            if (msg.type === 'commitClick' && msg.hash) {
                this._onCommitClick?.(msg.hash);
            }
        }, undefined, this.context.subscriptions);
        if (this._state) {
            this._render(this._state);
        }
        else {
            webviewView.webview.html = this._emptyHtml();
        }
    }
    update(state) {
        this._state = state;
        if (this._view) {
            this._render(state);
        }
    }
    _render(state) {
        if (!this._view)
            return;
        const nonce = getNonce();
        this._view.webview.html = buildWebviewHtml(state, nonce);
    }
    _emptyHtml() {
        return `<!DOCTYPE html><html><body style="padding:16px;font-family:system-ui;font-size:12px;color:#94a3b8">
      Open a project to see your timeline.
    </body></html>`;
    }
}
exports.TreeWebviewProvider = TreeWebviewProvider;
//# sourceMappingURL=treeWebview.js.map