"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.showErrorExplainer = showErrorExplainer;
const vscode = __importStar(require("vscode"));
const ERROR_SPECS = {
    DIRTY_PULL: {
        emoji: '💾',
        header: 'Your unsaved changes need attention first',
        whatWeTried: 'Get the latest version from GitHub',
        whatHappened: "You have edits that aren't saved as a snapshot yet — downloading new changes could overwrite your work.",
        whatToDoNext: 'Take a snapshot of what you have right now, then we\'ll get the latest.',
        actionLabel: '📸 Snapshot then get latest',
        actionCommand: 'go-git-it.snapshotThenPull',
    },
    MERGE_CONFLICT: {
        emoji: '🤝',
        header: 'Two changes touched the same spot',
        whatWeTried: 'Merge your experiment into your main work',
        whatHappened: "Two sets of changes touched the same part of a file, and we can't automatically decide which to keep. Your work is completely safe.",
        whatToDoNext: "You'll need a little help to sort this out. For now, you can undo the merge attempt and your work goes back to normal.",
        actionLabel: '↩️ Undo the merge',
        actionCommand: 'go-git-it.abortMerge',
    },
    NO_UPSTREAM: {
        emoji: '☁️',
        header: 'This project isn\'t on GitHub yet',
        whatWeTried: 'Back up your work to GitHub',
        whatHappened: "This project isn't connected to a GitHub repository yet.",
        whatToDoNext: 'Your snapshots are safe on this computer. Connecting to GitHub is a one-time setup.',
        actionLabel: '🔗 Connect to GitHub',
        actionCommand: 'go-git-it.connectToGitHub',
    },
    NOTHING_TO_COMMIT: {
        emoji: '✅',
        header: 'Nothing new to save',
        whatWeTried: 'Save a snapshot',
        whatHappened: "There's nothing new to save — your files haven't changed since the last snapshot.",
        whatToDoNext: "You're already up to date! Keep working and take a snapshot when you've made some changes.",
    },
    NO_GIT: {
        emoji: '📁',
        header: 'This folder isn\'t a project yet',
        whatWeTried: 'Access your project history',
        whatHappened: "This folder doesn't have any version history set up yet.",
        whatToDoNext: 'Build a new project to get started with snapshots and backups.',
        actionLabel: '🏗️ Build a new project',
        actionCommand: 'go-git-it.buildNewProject',
    },
    UNKNOWN: {
        emoji: '😅',
        header: 'Something unexpected happened',
        whatWeTried: 'Complete the last operation',
        whatHappened: 'Something went wrong that we didn\'t expect.',
        whatToDoNext: 'Try again in a moment. If it keeps happening, the details below might help.',
    },
};
function buildHtml(spec, rawError) {
    const showDetails = rawError
        ? `<details class="raw-error">
        <summary>Show technical details</summary>
        <pre>${escapeHtml(rawError)}</pre>
      </details>`
        : '';
    const actionBtn = spec.actionCommand
        ? `<button class="btn-primary" onclick="acquireVsCodeApi().postMessage({type:'action', command:'${spec.actionCommand}'})">
        ${escapeHtml(spec.actionLabel ?? 'Fix it')}
      </button>`
        : '';
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
  <title>What's going on?</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--vscode-font-family, system-ui, sans-serif);
      font-size: 14px;
      line-height: 1.6;
      color: var(--vscode-editor-foreground, #1e293b);
      background: var(--vscode-editor-background, #fff);
      padding: 24px;
      min-height: 100vh;
    }
    .card {
      max-width: 560px;
      margin: 0 auto;
    }
    .hero {
      font-size: 48px;
      margin-bottom: 8px;
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 32px;
      color: var(--vscode-editor-foreground, #0f172a);
    }
    .section-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--vscode-descriptionForeground, #94a3b8);
      margin-bottom: 6px;
      margin-top: 24px;
    }
    .section-label:first-of-type { margin-top: 0; }
    .section-body {
      font-size: 15px;
      color: var(--vscode-editor-foreground, #334155);
      margin-bottom: 4px;
    }
    .actions {
      display: flex;
      gap: 12px;
      margin-top: 32px;
      flex-wrap: wrap;
    }
    button {
      min-height: 44px;
      padding: 0 20px;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: none;
    }
    .btn-primary {
      background: var(--vscode-button-background, #16a34a);
      color: var(--vscode-button-foreground, #fff);
    }
    .btn-primary:hover {
      background: var(--vscode-button-hoverBackground, #15803d);
    }
    .btn-secondary {
      background: var(--vscode-button-secondaryBackground, #e2e8f0);
      color: var(--vscode-button-secondaryForeground, #334155);
    }
    .btn-secondary:hover {
      background: var(--vscode-button-secondaryHoverBackground, #cbd5e1);
    }
    details.raw-error {
      margin-top: 24px;
      border: 1px solid var(--vscode-panel-border, #e2e8f0);
      border-radius: 6px;
      overflow: hidden;
    }
    summary {
      padding: 10px 14px;
      cursor: pointer;
      font-size: 12px;
      color: var(--vscode-descriptionForeground, #64748b);
      background: var(--vscode-sideBar-background, #f8fafc);
    }
    pre {
      padding: 12px 14px;
      font-size: 11px;
      font-family: var(--vscode-editor-font-family, monospace);
      overflow-x: auto;
      color: var(--vscode-editor-foreground);
      background: var(--vscode-editor-background);
    }
    hr {
      border: none;
      border-top: 1px solid var(--vscode-panel-border, #e2e8f0);
      margin: 28px 0;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="hero">${spec.emoji}</div>
    <h1>${escapeHtml(spec.header)}</h1>

    <div class="section-label">WHAT WE WERE DOING</div>
    <div class="section-body">${escapeHtml(spec.whatWeTried)}</div>

    <div class="section-label">WHAT HAPPENED</div>
    <div class="section-body">${escapeHtml(spec.whatHappened)}</div>

    <div class="section-label">WHAT TO DO NEXT</div>
    <div class="section-body">${escapeHtml(spec.whatToDoNext)}</div>

    <div class="actions">
      ${actionBtn}
      <button class="btn-secondary" onclick="acquireVsCodeApi().postMessage({type:'dismiss'})">Dismiss</button>
    </div>

    ${showDetails}
  </div>
  <script>
    const vscode = acquireVsCodeApi();
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
function showErrorExplainer(context, lastError) {
    const code = lastError.code ?? 'UNKNOWN';
    const spec = ERROR_SPECS[code] ?? ERROR_SPECS['UNKNOWN'];
    const panel = vscode.window.createWebviewPanel('go-git-it.errorExplainer', "What's going on?", vscode.ViewColumn.Beside, { enableScripts: true, retainContextWhenHidden: true });
    panel.webview.html = buildHtml(spec, lastError.rawError);
    panel.webview.onDidReceiveMessage(async (msg) => {
        if (msg.type === 'dismiss') {
            panel.dispose();
            return;
        }
        if (msg.type === 'action' && msg.command) {
            panel.dispose();
            await vscode.commands.executeCommand(msg.command);
        }
    }, undefined, context.subscriptions);
}
//# sourceMappingURL=errorExplainer.js.map