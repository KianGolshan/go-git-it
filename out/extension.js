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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
const os = __importStar(require("os"));
const gitRunner_1 = require("./gitRunner");
const githubSetup_1 = require("./githubSetup");
const repoSwitcher_1 = require("./repoSwitcher");
const panelWebview_1 = require("./panelWebview");
const errorExplainer_1 = require("./errorExplainer");
const uiHelpers_1 = require("./uiHelpers");
// ── Module-level state ────────────────────────────────────────────────────────
let ctx;
let lastError;
let currentState;
let panelProvider;
let statusBarItem;
let gitWatcher;
// ── Helpers ───────────────────────────────────────────────────────────────────
function getCwd() {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}
async function refreshState() {
    const cwd = getCwd();
    if (!cwd) {
        panelProvider.update(null, !!lastError);
        statusBarItem.hide();
        return;
    }
    const gitOk = await (0, gitRunner_1.isGitAvailable)();
    if (!gitOk) {
        panelProvider.update(null, false);
        statusBarItem.hide();
        return;
    }
    const state = await (0, gitRunner_1.getState)(cwd);
    currentState = state ?? undefined;
    if (state) {
        const n = state.commits.length;
        statusBarItem.text = `$(git-commit) ${n} snapshot${n !== 1 ? 's' : ''}`;
        statusBarItem.tooltip = `Go Git It — ${state.displayBranch}`;
        statusBarItem.show();
    }
    else {
        statusBarItem.hide();
    }
    panelProvider.update(state, !!lastError);
}
function handleResult(result) {
    if (result.ok) {
        lastError = undefined;
        (0, uiHelpers_1.showSuccess)(result.message);
        panelProvider.update(currentState ?? null, false);
    }
    else {
        lastError = result;
        panelProvider.update(currentState ?? null, true);
        const BTN = "What's going on?";
        vscode.window.showWarningMessage(result.message, BTN).then(choice => {
            if (choice === BTN)
                vscode.commands.executeCommand('go-git-it.explainError');
        });
    }
}
function watchGitDir(cwd) {
    gitWatcher?.dispose();
    // Watch .git/HEAD and .git/index to catch branch switches and external commits
    const pattern = new vscode.RelativePattern(cwd, '.git/{HEAD,index,COMMIT_EDITMSG}');
    gitWatcher = vscode.workspace.createFileSystemWatcher(pattern, false, false, true);
    gitWatcher.onDidChange(() => refreshState());
    gitWatcher.onDidCreate(() => refreshState());
    ctx.subscriptions.push(gitWatcher);
}
// ── Activation ────────────────────────────────────────────────────────────────
function activate(context) {
    ctx = context;
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = 'go-git-it.openWalkthrough';
    ctx.subscriptions.push(statusBarItem);
    panelProvider = new panelWebview_1.PanelWebviewProvider(ctx, (cmd) => vscode.commands.executeCommand(`go-git-it.${cmd}`), handleCommitClick);
    ctx.subscriptions.push(vscode.window.registerWebviewViewProvider('go-git-it-panel', panelProvider, {
        webviewOptions: { retainContextWhenHidden: true }
    }));
    const commands = [
        ['go-git-it.buildNewProject', cmdBuildNewProject],
        ['go-git-it.openDifferentProject', cmdOpenDifferentProject],
        ['go-git-it.takeSnapshot', cmdTakeSnapshot],
        ['go-git-it.pushToGitHub', cmdPushToGitHub],
        ['go-git-it.pullLatest', cmdPullLatest],
        ['go-git-it.startExperiment', cmdStartExperiment],
        ['go-git-it.finishExperiment', cmdFinishExperiment],
        ['go-git-it.abandonExperiment', cmdAbandonExperiment],
        ['go-git-it.explainError', cmdExplainError],
        ['go-git-it.openWalkthrough', cmdOpenWalkthrough],
        ['go-git-it.openDemo', cmdOpenDemo],
        ['go-git-it.connectToGitHub', cmdConnectToGitHub],
        ['go-git-it.snapshotThenPull', cmdSnapshotThenPull],
        ['go-git-it.abortMerge', cmdAbortMerge],
    ];
    for (const [id, handler] of commands) {
        ctx.subscriptions.push(vscode.commands.registerCommand(id, handler));
    }
    // Watch workspace changes
    ctx.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(() => {
        const cwd = getCwd();
        if (cwd)
            watchGitDir(cwd);
        refreshState();
    }));
    // Initial refresh
    const cwd = getCwd();
    if (cwd)
        watchGitDir(cwd);
    refreshState();
}
function deactivate() {
    gitWatcher?.dispose();
}
// ── Command handlers ──────────────────────────────────────────────────────────
async function cmdTakeSnapshot() {
    const cwd = getCwd();
    if (!cwd) {
        vscode.window.showWarningMessage('Open a project first.');
        return;
    }
    const summary = await vscode.window.showInputBox({
        title: 'Save a Snapshot',
        prompt: 'What did you just work on? (optional)',
        placeHolder: 'e.g. Added the hero section',
    });
    if (summary === undefined)
        return;
    const result = await (0, uiHelpers_1.withFriendlyProgress)('Saving your snapshot...', () => (0, gitRunner_1.takeSnapshot)(cwd, summary || undefined));
    handleResult(result);
    await refreshState();
}
async function cmdPushToGitHub() {
    const cwd = getCwd();
    if (!cwd) {
        vscode.window.showWarningMessage('Open a project first.');
        return;
    }
    const result = await (0, uiHelpers_1.withFriendlyProgress)('Sending to GitHub...', () => (0, gitRunner_1.pushToRemote)(cwd));
    handleResult(result);
    await refreshState();
}
async function cmdPullLatest() {
    const cwd = getCwd();
    if (!cwd) {
        vscode.window.showWarningMessage('Open a project first.');
        return;
    }
    const result = await (0, uiHelpers_1.withFriendlyProgress)('Getting the latest version...', () => (0, gitRunner_1.pullLatest)(cwd));
    handleResult(result);
    await refreshState();
}
async function cmdStartExperiment() {
    const cwd = getCwd();
    if (!cwd) {
        vscode.window.showWarningMessage('Open a project first.');
        return;
    }
    const name = await vscode.window.showInputBox({
        title: 'Start a New Experiment 🧪',
        prompt: 'What are you going to try?',
        placeHolder: 'e.g. Dark mode, New layout, Login flow',
        validateInput: v => v.trim() ? undefined : 'Give it a name',
    });
    if (!name)
        return;
    const result = await (0, uiHelpers_1.withFriendlyProgress)(`Starting experiment: ${name}...`, () => (0, gitRunner_1.createExperiment)(cwd, name));
    handleResult(result);
    await refreshState();
}
async function cmdFinishExperiment() {
    const cwd = getCwd();
    if (!cwd || !currentState?.currentBranch.startsWith('experiment/')) {
        vscode.window.showWarningMessage("You're not on an experiment right now.");
        return;
    }
    const confirm = await vscode.window.showInformationMessage('Merge this experiment into your main work?', { modal: true, detail: "This adds your experiment's changes to your main line." }, 'Yes, merge it in');
    if (confirm !== 'Yes, merge it in')
        return;
    const result = await (0, uiHelpers_1.withFriendlyProgress)('Merging your experiment...', () => (0, gitRunner_1.mergeExperiment)(cwd, currentState.defaultBranch));
    handleResult(result);
    await refreshState();
}
async function cmdAbandonExperiment() {
    const cwd = getCwd();
    if (!cwd || !currentState?.currentBranch.startsWith('experiment/')) {
        vscode.window.showWarningMessage("You're not on an experiment right now.");
        return;
    }
    const confirm = await vscode.window.showWarningMessage('Abandon this experiment?', { modal: true, detail: 'This permanently deletes the experiment. Your main line is untouched.' }, 'Yes, delete it');
    if (confirm !== 'Yes, delete it')
        return;
    const result = await (0, uiHelpers_1.withFriendlyProgress)('Deleting experiment...', () => (0, gitRunner_1.abandonExperiment)(cwd, currentState.defaultBranch));
    handleResult(result);
    await refreshState();
}
async function cmdExplainError() {
    if (!lastError) {
        vscode.window.showInformationMessage("Everything looks good — no errors to explain!");
        return;
    }
    (0, errorExplainer_1.showErrorExplainer)(ctx, lastError);
}
async function cmdOpenWalkthrough() {
    await vscode.commands.executeCommand('workbench.action.openWalkthrough', 'kiangolshan.go-git-it#go-git-it.walkthrough');
}
async function cmdOpenDemo() {
    await vscode.commands.executeCommand('workbench.action.openWalkthrough', 'kiangolshan.go-git-it#go-git-it.demo');
}
async function cmdConnectToGitHub() {
    const cwd = getCwd();
    if (!cwd)
        return;
    const ghAvailable = await (0, githubSetup_1.isGhCliAvailable)();
    if (!ghAvailable) {
        await (0, githubSetup_1.showGhCliMissingModal)();
        return;
    }
    const slug = await vscode.window.showInputBox({
        title: 'Connect to GitHub',
        prompt: 'What should the GitHub repo be called?',
        value: (0, uiHelpers_1.slugify)(path.basename(cwd)),
    });
    if (!slug)
        return;
    await (0, uiHelpers_1.withFriendlyProgress)('Connecting to GitHub...', async () => {
        const result = await (0, githubSetup_1.createGithubRepo)(cwd, slug);
        if (result.ok)
            (0, uiHelpers_1.showSuccess)('Connected! Your project is now on GitHub.');
        else
            vscode.window.showErrorMessage(`Couldn't connect to GitHub: ${result.error}`);
    });
    await refreshState();
}
async function cmdSnapshotThenPull() {
    const cwd = getCwd();
    if (!cwd)
        return;
    const snap = await (0, uiHelpers_1.withFriendlyProgress)('Saving your snapshot first...', () => (0, gitRunner_1.takeSnapshot)(cwd));
    if (!snap.ok && snap.code !== 'NOTHING_TO_COMMIT') {
        handleResult(snap);
        return;
    }
    const pull = await (0, uiHelpers_1.withFriendlyProgress)('Getting the latest version...', () => (0, gitRunner_1.pullLatest)(cwd));
    handleResult(pull);
    await refreshState();
}
async function cmdAbortMerge() {
    const cwd = getCwd();
    if (!cwd)
        return;
    const result = await (0, uiHelpers_1.withFriendlyProgress)('Undoing the merge...', () => (0, gitRunner_1.abortMerge)(cwd));
    handleResult(result);
    await refreshState();
}
async function cmdOpenDifferentProject() {
    await (0, repoSwitcher_1.showRepoSwitcher)();
}
// ── Build New Project wizard ──────────────────────────────────────────────────
async function cmdBuildNewProject() {
    // Step 1 — Name
    const projectName = await vscode.window.showInputBox({
        title: 'Step 1 of 3 — Name Your Project',
        prompt: 'What are you building?',
        placeHolder: 'e.g. My Portfolio, Recipe App, Landing Page',
        validateInput: v => {
            if (!v.trim())
                return 'Give your project a name';
            if (/[<>:"/\\|?*]/.test(v))
                return 'Avoid special characters';
            return undefined;
        },
    });
    if (!projectName)
        return;
    // Step 2 — Location
    const locationChoice = await vscode.window.showQuickPick([
        { label: '$(folder) In my Documents folder', description: 'Recommended', value: 'documents' },
        { label: '$(search) Let me pick a folder', description: 'Choose somewhere specific', value: 'custom' },
    ], { title: 'Step 2 of 3 — Where Should We Save It?' });
    if (!locationChoice)
        return;
    let parentDir;
    if (locationChoice.value === 'documents') {
        parentDir = path.join(os.homedir(), 'Documents');
    }
    else {
        const picked = await vscode.window.showOpenDialog({
            canSelectFolders: true, canSelectFiles: false, openLabel: 'Save project here',
        });
        if (!picked?.length)
            return;
        parentDir = picked[0].fsPath;
    }
    // Step 3 — GitHub
    const githubChoice = await vscode.window.showQuickPick([
        { label: '$(github) Yes, connect to GitHub', description: 'Recommended — backs up your work online', value: 'yes' },
        { label: '$(device-desktop) Just on my computer for now', description: 'You can connect later', value: 'no' },
    ], { title: 'Step 3 of 3 — Back Up to GitHub?' });
    if (!githubChoice)
        return;
    const connectGitHub = githubChoice.value === 'yes';
    // Confirm
    const slug = (0, uiHelpers_1.slugify)(projectName);
    const projectPath = path.join(parentDir, slug);
    const confirm = await vscode.window.showInformationMessage(`Create "${projectName}"?`, {
        modal: true,
        detail: `📁 Location: ${projectPath}\n${connectGitHub ? '☁️  Will connect to GitHub' : '💻  Local only (no GitHub)'}`,
    }, "Let's go! 🚀");
    if (confirm !== "Let's go! 🚀")
        return;
    let success = false;
    await (0, uiHelpers_1.withFriendlyProgress)('Building your project...', async (progress) => {
        progress.report({ message: 'Creating folder...' });
        try {
            await fs.mkdir(projectPath, { recursive: true });
        }
        catch (e) {
            vscode.window.showErrorMessage(`Couldn't create the folder: ${e.message}`);
            return;
        }
        progress.report({ message: 'Setting up your project...' });
        const initResult = await (0, gitRunner_1.initProject)(projectPath, projectName);
        if (!initResult.ok) {
            vscode.window.showErrorMessage(initResult.message);
            return;
        }
        if (connectGitHub) {
            progress.report({ message: 'Connecting to GitHub...' });
            const ghAvailable = await (0, githubSetup_1.isGhCliAvailable)();
            if (!ghAvailable) {
                await (0, githubSetup_1.showGhCliMissingModal)();
            }
            else {
                const ghResult = await (0, githubSetup_1.createGithubRepo)(projectPath, slug);
                if (ghResult.ok)
                    (0, uiHelpers_1.showSuccess)('✅ Your project is live on GitHub!');
                else
                    vscode.window.showWarningMessage(`Project created, but couldn't connect to GitHub: ${ghResult.error}`);
            }
        }
        success = true;
    });
    if (success) {
        await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(projectPath));
    }
}
// ── Commit click handler ──────────────────────────────────────────────────────
async function handleCommitClick(hash) {
    const cwd = getCwd();
    if (!cwd)
        return;
    const action = await vscode.window.showQuickPick([
        { label: '$(eye) See what changed in this snapshot', value: 'show' },
        { label: '$(history) Go back to this snapshot', value: 'checkout' },
        { label: '', kind: vscode.QuickPickItemKind.Separator, value: '' },
        { label: '$(close) Cancel', value: 'cancel' },
    ], { title: 'What would you like to do?' });
    if (!action || action.value === 'cancel' || !action.value)
        return;
    if (action.value === 'show') {
        const terminal = vscode.window.createTerminal('Snapshot diff');
        terminal.sendText(`git show ${hash} --stat`);
        terminal.show();
        return;
    }
    if (action.value === 'checkout') {
        const isDirty = currentState?.isDirty ?? false;
        const choices = isDirty
            ? ['📸 Take snapshot first', '↩️ Go back anyway', 'Cancel']
            : ['↩️ Go back', 'Cancel'];
        const choice = await vscode.window.showWarningMessage('Go back to this snapshot?', {
            modal: true,
            detail: isDirty
                ? 'You have unsaved changes. Take a snapshot first to keep them.'
                : 'Your project will look exactly as it did at this moment.',
        }, ...choices);
        if (!choice || choice === 'Cancel')
            return;
        if (choice === '📸 Take snapshot first') {
            const snap = await (0, uiHelpers_1.withFriendlyProgress)('Saving snapshot...', () => (0, gitRunner_1.takeSnapshot)(cwd));
            handleResult(snap);
            if (!snap.ok)
                return;
        }
        const terminal = vscode.window.createTerminal('Go Git It');
        terminal.sendText(`git checkout ${hash}`);
        terminal.show();
        await refreshState();
    }
}
//# sourceMappingURL=extension.js.map