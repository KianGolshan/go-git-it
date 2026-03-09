import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs/promises'
import * as os from 'os'

import {
  takeSnapshot, pushToRemote, pullLatest,
  createExperiment, mergeExperiment, abandonExperiment,
  getState, initProject, abortMerge,
  isGitAvailable,
  GitResult, GitState,
} from './gitRunner'
import { isGhCliAvailable, createGithubRepo, showGhCliMissingModal } from './githubSetup'
import { showRepoSwitcher } from './repoSwitcher'
import { PanelWebviewProvider } from './panelWebview'
import { showErrorExplainer } from './errorExplainer'
import { withFriendlyProgress, showSuccess, slugify } from './uiHelpers'

// ── Module-level state ────────────────────────────────────────────────────────

let ctx: vscode.ExtensionContext
let lastError: GitResult | undefined
let currentState: GitState | undefined
let panelProvider: PanelWebviewProvider
let statusBarItem: vscode.StatusBarItem
let gitWatcher: vscode.FileSystemWatcher | undefined

// ── Helpers ───────────────────────────────────────────────────────────────────

function getCwd(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
}

async function refreshState(): Promise<void> {
  const cwd = getCwd()
  if (!cwd) {
    panelProvider.update(null, !!lastError)
    statusBarItem.hide()
    return
  }

  const gitOk = await isGitAvailable()
  if (!gitOk) {
    panelProvider.update(null, false)
    statusBarItem.hide()
    return
  }

  const state = await getState(cwd)
  currentState = state ?? undefined

  if (state) {
    const n = state.commits.length
    statusBarItem.text = `$(git-commit) ${n} snapshot${n !== 1 ? 's' : ''}`
    statusBarItem.tooltip = `Go Git It — ${state.displayBranch}`
    statusBarItem.show()
  } else {
    statusBarItem.hide()
  }

  panelProvider.update(state, !!lastError)
}

function handleResult(result: GitResult): void {
  if (result.ok) {
    lastError = undefined
    showSuccess(result.message)
    panelProvider.update(currentState ?? null, false)
  } else {
    lastError = result
    panelProvider.update(currentState ?? null, true)
    const BTN = "What's going on?"
    vscode.window.showWarningMessage(result.message, BTN).then(choice => {
      if (choice === BTN) vscode.commands.executeCommand('go-git-it.explainError')
    })
  }
}

function watchGitDir(cwd: string): void {
  gitWatcher?.dispose()
  // Watch .git/HEAD and .git/index to catch branch switches and external commits
  const pattern = new vscode.RelativePattern(cwd, '.git/{HEAD,index,COMMIT_EDITMSG}')
  gitWatcher = vscode.workspace.createFileSystemWatcher(pattern, false, false, true)
  gitWatcher.onDidChange(() => refreshState())
  gitWatcher.onDidCreate(() => refreshState())
  ctx.subscriptions.push(gitWatcher)
}

// ── Activation ────────────────────────────────────────────────────────────────

export function activate(context: vscode.ExtensionContext): void {
  ctx = context

  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100)
  statusBarItem.command = 'go-git-it.openWalkthrough'
  ctx.subscriptions.push(statusBarItem)

  panelProvider = new PanelWebviewProvider(
    ctx,
    (cmd) => vscode.commands.executeCommand(`go-git-it.${cmd}`),
    handleCommitClick
  )

  ctx.subscriptions.push(
    vscode.window.registerWebviewViewProvider('go-git-it-panel', panelProvider, {
      webviewOptions: { retainContextWhenHidden: true }
    })
  )

  const commands: [string, () => Promise<void>][] = [
    ['go-git-it.buildNewProject',      cmdBuildNewProject],
    ['go-git-it.openDifferentProject', cmdOpenDifferentProject],
    ['go-git-it.takeSnapshot',         cmdTakeSnapshot],
    ['go-git-it.pushToGitHub',         cmdPushToGitHub],
    ['go-git-it.pullLatest',           cmdPullLatest],
    ['go-git-it.startExperiment',      cmdStartExperiment],
    ['go-git-it.finishExperiment',     cmdFinishExperiment],
    ['go-git-it.abandonExperiment',    cmdAbandonExperiment],
    ['go-git-it.explainError',         cmdExplainError],
    ['go-git-it.openWalkthrough',      cmdOpenWalkthrough],
    ['go-git-it.openDemo',             cmdOpenDemo],
    ['go-git-it.connectToGitHub',      cmdConnectToGitHub],
    ['go-git-it.snapshotThenPull',     cmdSnapshotThenPull],
    ['go-git-it.abortMerge',           cmdAbortMerge],
  ]
  for (const [id, handler] of commands) {
    ctx.subscriptions.push(vscode.commands.registerCommand(id, handler))
  }

  // Watch workspace changes
  ctx.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      const cwd = getCwd()
      if (cwd) watchGitDir(cwd)
      refreshState()
    })
  )

  // Initial refresh
  const cwd = getCwd()
  if (cwd) watchGitDir(cwd)
  refreshState()
}

export function deactivate(): void {
  gitWatcher?.dispose()
}

// ── Command handlers ──────────────────────────────────────────────────────────

async function cmdTakeSnapshot(): Promise<void> {
  const cwd = getCwd()
  if (!cwd) { vscode.window.showWarningMessage('Open a project first.'); return }

  const summary = await vscode.window.showInputBox({
    title: 'Save a Snapshot',
    prompt: 'What did you just work on? (optional)',
    placeHolder: 'e.g. Added the hero section',
  })
  if (summary === undefined) return

  const result = await withFriendlyProgress('Saving your snapshot...', () => takeSnapshot(cwd, summary || undefined))
  handleResult(result)
  await refreshState()
}

async function cmdPushToGitHub(): Promise<void> {
  const cwd = getCwd()
  if (!cwd) { vscode.window.showWarningMessage('Open a project first.'); return }
  const result = await withFriendlyProgress('Sending to GitHub...', () => pushToRemote(cwd))
  handleResult(result)
  await refreshState()
}

async function cmdPullLatest(): Promise<void> {
  const cwd = getCwd()
  if (!cwd) { vscode.window.showWarningMessage('Open a project first.'); return }
  const result = await withFriendlyProgress('Getting the latest version...', () => pullLatest(cwd))
  handleResult(result)
  await refreshState()
}

async function cmdStartExperiment(): Promise<void> {
  const cwd = getCwd()
  if (!cwd) { vscode.window.showWarningMessage('Open a project first.'); return }

  const name = await vscode.window.showInputBox({
    title: 'Start a New Experiment 🧪',
    prompt: 'What are you going to try?',
    placeHolder: 'e.g. Dark mode, New layout, Login flow',
    validateInput: v => v.trim() ? undefined : 'Give it a name',
  })
  if (!name) return

  const result = await withFriendlyProgress(`Starting experiment: ${name}...`, () => createExperiment(cwd, name))
  handleResult(result)
  await refreshState()
}

async function cmdFinishExperiment(): Promise<void> {
  const cwd = getCwd()
  if (!cwd || !currentState?.currentBranch.startsWith('experiment/')) {
    vscode.window.showWarningMessage("You're not on an experiment right now."); return
  }
  const confirm = await vscode.window.showInformationMessage(
    'Merge this experiment into your main work?',
    { modal: true, detail: "This adds your experiment's changes to your main line." },
    'Yes, merge it in'
  )
  if (confirm !== 'Yes, merge it in') return

  const result = await withFriendlyProgress('Merging your experiment...', () => mergeExperiment(cwd, currentState!.defaultBranch))
  handleResult(result)
  await refreshState()
}

async function cmdAbandonExperiment(): Promise<void> {
  const cwd = getCwd()
  if (!cwd || !currentState?.currentBranch.startsWith('experiment/')) {
    vscode.window.showWarningMessage("You're not on an experiment right now."); return
  }
  const confirm = await vscode.window.showWarningMessage(
    'Abandon this experiment?',
    { modal: true, detail: 'This permanently deletes the experiment. Your main line is untouched.' },
    'Yes, delete it'
  )
  if (confirm !== 'Yes, delete it') return

  const result = await withFriendlyProgress('Deleting experiment...', () => abandonExperiment(cwd, currentState!.defaultBranch))
  handleResult(result)
  await refreshState()
}

async function cmdExplainError(): Promise<void> {
  if (!lastError) {
    vscode.window.showInformationMessage("Everything looks good — no errors to explain!")
    return
  }
  showErrorExplainer(ctx, lastError)
}

async function cmdOpenWalkthrough(): Promise<void> {
  await vscode.commands.executeCommand('workbench.action.openWalkthrough', 'kiangolshan.go-git-it#go-git-it.walkthrough')
}

async function cmdOpenDemo(): Promise<void> {
  await vscode.commands.executeCommand('workbench.action.openWalkthrough', 'kiangolshan.go-git-it#go-git-it.demo')
}

async function cmdConnectToGitHub(): Promise<void> {
  const cwd = getCwd()
  if (!cwd) return

  const ghAvailable = await isGhCliAvailable()
  if (!ghAvailable) { await showGhCliMissingModal(); return }

  const slug = await vscode.window.showInputBox({
    title: 'Connect to GitHub',
    prompt: 'What should the GitHub repo be called?',
    value: slugify(path.basename(cwd)),
  })
  if (!slug) return

  await withFriendlyProgress('Connecting to GitHub...', async () => {
    const result = await createGithubRepo(cwd, slug)
    if (result.ok) showSuccess('Connected! Your project is now on GitHub.')
    else vscode.window.showErrorMessage(`Couldn't connect to GitHub: ${result.error}`)
  })
  await refreshState()
}

async function cmdSnapshotThenPull(): Promise<void> {
  const cwd = getCwd()
  if (!cwd) return
  const snap = await withFriendlyProgress('Saving your snapshot first...', () => takeSnapshot(cwd))
  if (!snap.ok && snap.code !== 'NOTHING_TO_COMMIT') { handleResult(snap); return }
  const pull = await withFriendlyProgress('Getting the latest version...', () => pullLatest(cwd))
  handleResult(pull)
  await refreshState()
}

async function cmdAbortMerge(): Promise<void> {
  const cwd = getCwd()
  if (!cwd) return
  const result = await withFriendlyProgress('Undoing the merge...', () => abortMerge(cwd))
  handleResult(result)
  await refreshState()
}

async function cmdOpenDifferentProject(): Promise<void> {
  await showRepoSwitcher()
}

// ── Build New Project wizard ──────────────────────────────────────────────────

async function cmdBuildNewProject(): Promise<void> {
  // Step 1 — Name
  const projectName = await vscode.window.showInputBox({
    title: 'Step 1 of 3 — Name Your Project',
    prompt: 'What are you building?',
    placeHolder: 'e.g. My Portfolio, Recipe App, Landing Page',
    validateInput: v => {
      if (!v.trim()) return 'Give your project a name'
      if (/[<>:"/\\|?*]/.test(v)) return 'Avoid special characters'
      return undefined
    },
  })
  if (!projectName) return

  // Step 2 — Location
  const locationChoice = await vscode.window.showQuickPick(
    [
      { label: '$(folder) In my Documents folder', description: 'Recommended', value: 'documents' },
      { label: '$(search) Let me pick a folder',   description: 'Choose somewhere specific', value: 'custom' },
    ],
    { title: 'Step 2 of 3 — Where Should We Save It?' }
  )
  if (!locationChoice) return

  let parentDir: string
  if (locationChoice.value === 'documents') {
    parentDir = path.join(os.homedir(), 'Documents')
  } else {
    const picked = await vscode.window.showOpenDialog({
      canSelectFolders: true, canSelectFiles: false, openLabel: 'Save project here',
    })
    if (!picked?.length) return
    parentDir = picked[0].fsPath
  }

  // Step 3 — GitHub
  const githubChoice = await vscode.window.showQuickPick(
    [
      { label: '$(github) Yes, connect to GitHub', description: 'Recommended — backs up your work online', value: 'yes' },
      { label: '$(device-desktop) Just on my computer for now', description: 'You can connect later', value: 'no' },
    ],
    { title: 'Step 3 of 3 — Back Up to GitHub?' }
  )
  if (!githubChoice) return
  const connectGitHub = githubChoice.value === 'yes'

  // Confirm
  const slug = slugify(projectName)
  const projectPath = path.join(parentDir, slug)
  const confirm = await vscode.window.showInformationMessage(
    `Create "${projectName}"?`,
    {
      modal: true,
      detail: `📁 Location: ${projectPath}\n${connectGitHub ? '☁️  Will connect to GitHub' : '💻  Local only (no GitHub)'}`,
    },
    "Let's go! 🚀"
  )
  if (confirm !== "Let's go! 🚀") return

  let success = false
  await withFriendlyProgress('Building your project...', async progress => {
    progress.report({ message: 'Creating folder...' })
    try {
      await fs.mkdir(projectPath, { recursive: true })
    } catch (e: unknown) {
      vscode.window.showErrorMessage(`Couldn't create the folder: ${(e as Error).message}`)
      return
    }

    progress.report({ message: 'Setting up your project...' })
    const initResult = await initProject(projectPath, projectName)
    if (!initResult.ok) { vscode.window.showErrorMessage(initResult.message); return }

    if (connectGitHub) {
      progress.report({ message: 'Connecting to GitHub...' })
      const ghAvailable = await isGhCliAvailable()
      if (!ghAvailable) {
        await showGhCliMissingModal()
      } else {
        const ghResult = await createGithubRepo(projectPath, slug)
        if (ghResult.ok) showSuccess('✅ Your project is live on GitHub!')
        else vscode.window.showWarningMessage(`Project created, but couldn't connect to GitHub: ${ghResult.error}`)
      }
    }

    success = true
  })

  if (success) {
    await vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(projectPath))
  }
}

// ── Commit click handler ──────────────────────────────────────────────────────

async function handleCommitClick(hash: string): Promise<void> {
  const cwd = getCwd()
  if (!cwd) return

  const action = await vscode.window.showQuickPick(
    [
      { label: '$(eye) See what changed in this snapshot', value: 'show' },
      { label: '$(history) Go back to this snapshot',      value: 'checkout' },
      { label: '', kind: vscode.QuickPickItemKind.Separator, value: '' },
      { label: '$(close) Cancel', value: 'cancel' },
    ],
    { title: 'What would you like to do?' }
  )
  if (!action || action.value === 'cancel' || !action.value) return

  if (action.value === 'show') {
    const terminal = vscode.window.createTerminal('Snapshot diff')
    terminal.sendText(`git show ${hash} --stat`)
    terminal.show()
    return
  }

  if (action.value === 'checkout') {
    const isDirty = currentState?.isDirty ?? false
    const choices: string[] = isDirty
      ? ['📸 Take snapshot first', '↩️ Go back anyway', 'Cancel']
      : ['↩️ Go back', 'Cancel']

    const choice = await vscode.window.showWarningMessage(
      'Go back to this snapshot?',
      {
        modal: true,
        detail: isDirty
          ? 'You have unsaved changes. Take a snapshot first to keep them.'
          : 'Your project will look exactly as it did at this moment.',
      },
      ...choices
    )
    if (!choice || choice === 'Cancel') return

    if (choice === '📸 Take snapshot first') {
      const snap = await withFriendlyProgress('Saving snapshot...', () => takeSnapshot(cwd))
      handleResult(snap)
      if (!snap.ok) return
    }

    const terminal = vscode.window.createTerminal('Go Git It')
    terminal.sendText(`git checkout ${hash}`)
    terminal.show()
    await refreshState()
  }
}
