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
const statusProvider_1 = require("./statusProvider");
const treeWebview_1 = require("./treeWebview");
const errorExplainer_1 = require("./errorExplainer");
const uiHelpers_1 = require("./uiHelpers");
// ── State ─────────────────────────────────────────────────────────────────────
let extensionContext;
let lastError;
let currentState;
let statusProvider;
let treeProvider;
let statusBarItem;
function getCwd() {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
}
async function refreshState() {
    const cwd = getCwd();
    if (!cwd) {
        statusProvider.update(null, false);
        return;
    }
    const state = await (0, gitRunner_1.getState)(cwd);
    currentState = state ?? undefined;
    if (state) {
        treeProvider.update(state);
        statusBarItem.text = `$(git-commit) ${state.commits.length} snapshot${state.commits.length !== 1 ? 's' : ''}`;
        statusBarItem.show();
    }
    else {
        statusBarItem.hide();
    }
    statusProvider.update(state, !!lastError);
}
function handleResult(result) {
    if (result.ok) {
        lastError = undefined;
        (0, uiHelpers_1.showSuccess)(result.message);
    }
    else {
        lastError = result;
        statusProvider.update(currentState ?? null, true);
        vscode.window.showWarningMessage(result.message, 'What\'s going on?').then((choice) => {
            if (choice === "What's going on?") {
                vscode.commands.executeCommand('go-git-it.explainError');
            }
        });
    }
}
// ── Activation ────────────────────────────────────────────────────────────────
function activate(context) {
    extensionContext = context;
    // Status bar badge
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = 'go-git-it.openWalkthrough';
    context.subscriptions.push(statusBarItem);
    // Tree providers
    statusProvider = new statusProvider_1.StatusProvider();
    treeProvider = new treeWebview_1.TreeWebviewProvider(context, async (hash) => {
        await handleCommitClick(hash);
    });
    context.subscriptions.push(vscode.window.registerTreeDataProvider('go-git-it-status', statusProvider), vscode.window.registerWebviewViewProvider('go-git-it-tree', treeProvider));
    // Register commands
    const cmds = [
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
        ['go-git-it.connectToGitHub', cmdConnectToGitHub],
        ['go-git-it.snapshotThenPull', cmdSnapshotThenPull],
        ['go-git-it.abortMerge', cmdAbortMerge],
    ];
    for (const [id, handler] of cmds) {
        context.subscriptions.push(vscode.commands.registerCommand(id, handler));
    }
    // Watch workspace changes
    context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(() => refreshState()), vscode.workspace.onDidSaveTextDocument(() => refreshState()));
    // Initial load
    refreshState();
}
function deactivate() {
    // nothing to clean up
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
        prompt: 'What did you just do? (optional — press Enter to skip)',
        placeHolder: 'e.g. Added the hero section',
    });
    if (summary === undefined)
        return; // user pressed Escape
    const result = await (0, uiHelpers_1.withFriendlyProgress)('Saving your snapshot...', async () => (0, gitRunner_1.takeSnapshot)(cwd, summary || undefined));
    handleResult(result);
    await refreshState();
}
async function cmdPushToGitHub() {
    const cwd = getCwd();
    if (!cwd) {
        vscode.window.showWarningMessage('Open a project first.');
        return;
    }
    const result = await (0, uiHelpers_1.withFriendlyProgress)('Sending to GitHub...', async () => (0, gitRunner_1.pushToRemote)(cwd));
    handleResult(result);
    await refreshState();
}
async function cmdPullLatest() {
    const cwd = getCwd();
    if (!cwd) {
        vscode.window.showWarningMessage('Open a project first.');
        return;
    }
    const result = await (0, uiHelpers_1.withFriendlyProgress)('Getting the latest version...', async () => (0, gitRunner_1.pullLatest)(cwd));
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
        placeHolder: 'e.g. New hero layout, Dark mode, Login flow',
        validateInput: (v) => (v.trim() ? undefined : 'Give it a name so you can find it later'),
    });
    if (!name)
        return;
    const result = await (0, uiHelpers_1.withFriendlyProgress)(`Starting experiment: ${name}...`, async () => (0, gitRunner_1.createExperiment)(cwd, name));
    handleResult(result);
    await refreshState();
}
async function cmdFinishExperiment() {
    const cwd = getCwd();
    if (!cwd) {
        vscode.window.showWarningMessage('Open a project first.');
        return;
    }
    if (!currentState?.currentBranch.startsWith('experiment/')) {
        vscode.window.showWarningMessage("You're not on an experiment right now.");
        return;
    }
    const confirm = await vscode.window.showInformationMessage('Merge this experiment into your main work?', { modal: true, detail: "This adds all your experiment's changes to your main line." }, 'Yes, merge it in', 'Not yet');
    if (confirm !== 'Yes, merge it in')
        return;
    const result = await (0, uiHelpers_1.withFriendlyProgress)('Merging your experiment...', async () => (0, gitRunner_1.mergeExperiment)(cwd, currentState.defaultBranch));
    handleResult(result);
    await refreshState();
}
async function cmdAbandonExperiment() {
    const cwd = getCwd();
    if (!cwd) {
        vscode.window.showWarningMessage('Open a project first.');
        return;
    }
    if (!currentState?.currentBranch.startsWith('experiment/')) {
        vscode.window.showWarningMessage("You're not on an experiment right now.");
        return;
    }
    const confirm = await vscode.window.showWarningMessage('Abandon this experiment?', {
        modal: true,
        detail: "This permanently deletes the experiment branch. Your main line is untouched.",
    }, 'Yes, delete it', 'Keep it for now');
    if (confirm !== 'Yes, delete it')
        return;
    const result = await (0, uiHelpers_1.withFriendlyProgress)('Deleting experiment...', async () => (0, gitRunner_1.abandonExperiment)(cwd, currentState.defaultBranch));
    handleResult(result);
    await refreshState();
}
async function cmdExplainError() {
    if (!lastError) {
        vscode.window.showInformationMessage("Everything looks good — no errors to explain!");
        return;
    }
    (0, errorExplainer_1.showErrorExplainer)(extensionContext, lastError);
}
async function cmdOpenWalkthrough() {
    await vscode.commands.executeCommand('workbench.action.openWalkthrough', 'go-git-it.go-git-it.walkthrough');
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
    const defaultSlug = path.basename(cwd);
    const slug = await vscode.window.showInputBox({
        title: 'Connect to GitHub',
        prompt: 'What should the GitHub repo be called?',
        value: (0, uiHelpers_1.slugify)(defaultSlug),
    });
    if (!slug)
        return;
    await (0, uiHelpers_1.withFriendlyProgress)('Connecting to GitHub...', async () => {
        const result = await (0, githubSetup_1.createGithubRepo)(cwd, slug);
        if (result.ok) {
            (0, uiHelpers_1.showSuccess)(`Connected! Your project is now backed up at github.com.`);
        }
        else {
            vscode.window.showErrorMessage(`Couldn't connect to GitHub: ${result.error}`);
        }
    });
    await refreshState();
}
async function cmdSnapshotThenPull() {
    const cwd = getCwd();
    if (!cwd)
        return;
    const snapResult = await (0, uiHelpers_1.withFriendlyProgress)('Saving your snapshot first...', async () => (0, gitRunner_1.takeSnapshot)(cwd));
    if (!snapResult.ok && snapResult.code !== 'NOTHING_TO_COMMIT') {
        handleResult(snapResult);
        return;
    }
    const pullResult = await (0, uiHelpers_1.withFriendlyProgress)('Getting the latest version...', async () => (0, gitRunner_1.pullLatest)(cwd));
    handleResult(pullResult);
    await refreshState();
}
async function cmdAbortMerge() {
    const cwd = getCwd();
    if (!cwd)
        return;
    const result = await (0, uiHelpers_1.withFriendlyProgress)('Undoing the merge...', async () => (0, gitRunner_1.abortMerge)(cwd));
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
        title: 'Step 1 of 4 — Name Your Project',
        prompt: 'What are you building? Give it a name.',
        placeHolder: 'e.g. My Portfolio, Recipe App, Landing Page',
        validateInput: (v) => {
            if (!v.trim())
                return 'Give your project a name';
            if (/[<>:"/\\|?*]/.test(v))
                return 'Avoid special characters like < > : " / \\ | ? *';
            return undefined;
        },
    });
    if (!projectName)
        return;
    // Step 2 — Location
    const locationChoice = await vscode.window.showQuickPick([
        {
            label: '$(folder) In my Documents folder',
            description: 'Recommended for most people',
            value: 'documents',
        },
        {
            label: '$(search) Let me pick a folder',
            description: 'Choose somewhere specific',
            value: 'custom',
        },
    ], { title: 'Step 2 of 4 — Where Should We Save It?' });
    if (!locationChoice)
        return;
    let parentDir;
    if (locationChoice.value === 'documents') {
        parentDir = path.join(os.homedir(), 'Documents');
    }
    else {
        const picked = await vscode.window.showOpenDialog({
            canSelectFolders: true,
            canSelectFiles: false,
            openLabel: 'Save project here',
            title: 'Choose a folder for your project',
        });
        if (!picked || picked.length === 0)
            return;
        parentDir = picked[0].fsPath;
    }
    // Step 3 — GitHub
    const githubChoice = await vscode.window.showQuickPick([
        {
            label: '$(github) Yes, connect to GitHub',
            description: 'Your work will be safely backed up online. Recommended.',
            value: 'yes',
        },
        {
            label: '$(device-desktop) Just on my computer for now',
            description: 'You can connect later',
            value: 'no',
        },
    ], { title: 'Step 3 of 4 — Back Up to GitHub?' });
    if (!githubChoice)
        return;
    const connectGitHub = githubChoice.value === 'yes';
    // Step 4 — Confirm
    const slug = (0, uiHelpers_1.slugify)(projectName);
    const projectPath = path.join(parentDir, slug);
    const confirm = await vscode.window.showQuickPick([
        {
            label: `$(check) Create project: ${projectName}`,
            description: projectPath,
            value: 'confirm',
        },
        {
            label: `$(github) Will connect to GitHub: ${connectGitHub ? 'Yes' : 'No'}`,
            description: '',
            value: 'info',
        },
        { label: '$(rocket) Let\'s go!', description: 'Click to create your project', value: 'go' },
        { label: '$(x) Cancel', description: '', value: 'cancel' },
    ], { title: 'Step 4 of 4 — Ready to Build!' });
    if (!confirm || confirm.value === 'cancel' || confirm.value === 'info')
        return;
    if (confirm.value !== 'go' && confirm.value !== 'confirm')
        return;
    // Execute
    await (0, uiHelpers_1.withFriendlyProgress)('Building your project...', async (progress) => {
        progress.report({ message: 'Creating folder...' });
        try {
            await fs.mkdir(projectPath, { recursive: true });
        }
        catch (err) {
            const e = err;
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
                if (ghResult.ok) {
                    (0, uiHelpers_1.showSuccess)("✅ Your project is live on GitHub!");
                }
                else {
                    vscode.window.showWarningMessage(`Project created, but couldn't connect to GitHub: ${ghResult.error}`);
                }
            }
        }
        progress.report({ message: 'Opening your project...' });
        await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(projectPath));
    });
}
// ── Commit node click ──────────────────────────────────────────────────────────
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
    if (!action || action.value === 'cancel' || action.value === '')
        return;
    if (action.value === 'show') {
        const terminal = vscode.window.createTerminal('Snapshot diff');
        terminal.sendText(`git show ${hash} --stat`);
        terminal.show();
        return;
    }
    if (action.value === 'checkout') {
        const isDirty = currentState?.isDirty;
        const choice = await vscode.window.showWarningMessage('Go back to this snapshot?', {
            modal: true,
            detail: isDirty
                ? 'Your current unsaved work will be lost. Take a snapshot first if you want to keep it.'
                : 'Your project will look exactly as it did at this point in time.',
        }, ...(isDirty ? ['📸 Take snapshot first', '↩️ Go back anyway'] : ['↩️ Go back']), 'Cancel');
        if (!choice || choice === 'Cancel')
            return;
        if (choice === '📸 Take snapshot first') {
            const snap = await (0, uiHelpers_1.withFriendlyProgress)('Saving snapshot...', async () => (0, gitRunner_1.takeSnapshot)(cwd));
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