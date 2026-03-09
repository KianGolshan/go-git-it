"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreeWebviewProvider = void 0;
function relativeDate(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime()))
        return '';
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
        return `${days}d ago`;
    return d.toLocaleDateString();
}
function truncate(str, max = 38) {
    return str.length > max ? str.slice(0, max - 1) + '…' : str;
}
function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function getNonce() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
function renderNode(c, isExperimentCol = false) {
    const colorClass = isExperimentCol ? 'node-experiment' : c.pushed ? 'node-pushed' : 'node-local';
    const pushedLabel = c.pushed ? '✅ Backed up to GitHub' : '🔵 Only on this computer';
    const bpClass = c.isBranchPoint ? ' branch-point' : '';
    return `<div class="commit-row${bpClass}" data-hash="${escapeHtml(c.hash)}"
    title="${escapeHtml(c.message)}\n${pushedLabel}">
    <span class="dot ${colorClass}"></span>
    <div class="commit-body">
      <span class="commit-msg">${escapeHtml(truncate(c.message))}</span>
      <span class="commit-date">${relativeDate(c.date)}</span>
    </div>
  </div>`;
}
function buildHtml(state, nonce) {
    const isExperiment = state.currentBranch.startsWith('experiment/');
    const experimentName = isExperiment ? state.currentBranch.replace('experiment/', '') : '';
    const branchLabel = isExperiment ? `🧪 ${escapeHtml(experimentName)}` : '🌿 Main line';
    const dirtyDot = state.isDirty
        ? `<div class="dirty-row"><span class="dot node-dirty pulse"></span><span class="dirty-label">Unsaved changes ✏️</span></div>`
        : '';
    let commitsHtml;
    if (isExperiment) {
        const bpIndex = state.commits.findIndex(c => c.isBranchPoint);
        const expCommits = bpIndex >= 0 ? state.commits.slice(0, bpIndex) : state.commits;
        const mainCommits = bpIndex >= 0 ? state.commits.slice(bpIndex) : [];
        commitsHtml = `<div class="two-col">
      <div class="col">
        <div class="col-hdr main-hdr">🌿 Main</div>
        ${mainCommits.map(c => renderNode(c, false)).join('')}
      </div>
      <div class="col">
        <div class="col-hdr exp-hdr">🧪 ${escapeHtml(experimentName)}</div>
        ${expCommits.map(c => renderNode(c, true)).join('')}
        ${bpIndex >= 0 ? '<div class="branch-connector">↑ branched from main</div>' : ''}
      </div>
    </div>`;
    }
    else {
        commitsHtml = state.commits.length === 0
            ? `<div class="empty">No snapshots yet.<br>Take your first snapshot to start your timeline!</div>`
            : state.commits.map(c => renderNode(c)).join('');
    }
    return `<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--vscode-font-family,system-ui);font-size:12px;
  color:var(--vscode-editor-foreground);background:var(--vscode-sideBar-background)}
.header{display:flex;align-items:center;justify-content:space-between;
  padding:7px 11px;border-bottom:1px solid var(--vscode-panel-border);
  background:var(--vscode-sideBarSectionHeader-background)}
.header-label{font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;
  color:var(--vscode-descriptionForeground)}
.branch-badge{font-size:11px;background:var(--vscode-badge-background);
  color:var(--vscode-badge-foreground);border-radius:10px;padding:2px 8px;font-weight:600}
.scroll{padding:8px 10px;overflow-y:auto;max-height:calc(100vh - 40px)}
.dirty-row{display:flex;align-items:center;gap:8px;margin-bottom:8px;padding:5px 8px;
  background:rgba(234,179,8,.08);border-radius:5px;border-left:3px solid #eab308}
.dirty-label{font-size:11px;color:#a16207}
.commit-row{display:flex;align-items:flex-start;gap:8px;padding:4px 7px;border-radius:5px;
  cursor:pointer;position:relative;margin-bottom:1px;transition:background .1s}
.commit-row:hover{background:var(--vscode-list-hoverBackground)}
.commit-row:not(:last-child)::before{content:'';position:absolute;left:13px;top:18px;
  bottom:-6px;width:2px;background:var(--vscode-panel-border)}
.dot{width:11px;height:11px;border-radius:50%;flex-shrink:0;margin-top:3px}
.node-pushed    {background:#22c55e}
.node-local     {background:#3b82f6}
.node-dirty     {background:#eab308}
.node-experiment{background:#0ea5e9}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(1.3)}}
.pulse{animation:pulse 1.5s ease-in-out infinite}
.commit-body{display:flex;flex-direction:column;gap:1px;min-width:0}
.commit-msg{font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
  color:var(--vscode-editor-foreground)}
.commit-date{font-size:10px;color:var(--vscode-descriptionForeground)}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.col-hdr{font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;
  padding:3px 5px 6px}
.main-hdr{color:#16a34a}.exp-hdr{color:#0ea5e9}
.branch-connector{font-size:10px;color:var(--vscode-descriptionForeground);text-align:center;padding:3px 0}
.empty{padding:20px 10px;text-align:center;color:var(--vscode-descriptionForeground);
  font-size:12px;line-height:1.6}
</style></head><body>
<div class="header">
  <span class="header-label">Your timeline</span>
  <span class="branch-badge">${branchLabel}</span>
</div>
<div class="scroll">
  ${dirtyDot}
  ${commitsHtml}
</div>
<script nonce="${nonce}">
const vscode = acquireVsCodeApi();
document.querySelectorAll('.commit-row').forEach(row => {
  row.addEventListener('click', () => vscode.postMessage({type:'commitClick', hash: row.dataset.hash}));
});
</script>
</body></html>`;
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
            if (msg.type === 'commitClick' && msg.hash)
                this._onCommitClick(msg.hash);
        }, undefined, this.context.subscriptions);
        if (this._state) {
            this._render(this._state);
        }
        else {
            webviewView.webview.html = `<body style="padding:16px;font-size:12px;color:var(--vscode-descriptionForeground)">Open a project to see your timeline.</body>`;
        }
    }
    update(state) {
        this._state = state;
        if (this._view?.visible)
            this._render(state);
    }
    _render(state) {
        if (!this._view)
            return;
        this._view.webview.html = buildHtml(state, getNonce());
    }
}
exports.TreeWebviewProvider = TreeWebviewProvider;
//# sourceMappingURL=treeWebview.js.map