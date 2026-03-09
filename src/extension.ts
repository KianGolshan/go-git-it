import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs/promises'
import * as os from 'os'

import {
  takeSnapshot,
  pushToRemote,
  pullLatest,
  createExperiment,
  mergeExperiment,
  abandonExperiment,
  getState,
  initProject,
  abortMerge,
  GitResult,
  GitState,
} from './gitRunner'
import {
  isGhCliAvailable,
  createGithubRepo,
  showGhCliMissingModal,
} from './githubSetup'
import { showRepoSwitcher } from './repoSwitcher'
import { StatusProvider } from './statusProvider'
import { TreeWebviewProvider } from './treeWebview'
import { showErrorExplainer } from './errorExplainer'
import { withFriendlyProgress, showSuccess, slugify } from './uiHelpers'

// ── State ─────────────────────────────────────────────────────────────────────

let extensionContext: vscode.ExtensionContext
let lastError: GitResult | undefined
let currentState: GitState | undefined
let statusProvider: StatusProvider
let treeProvider: TreeWebviewProvider
let statusBarItem: vscode.StatusBarItem

function getCwd(): string | undefined {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
}

async function refreshState(): Promise<void> {
  const cwd = getCwd()
  if (!cwd) {
    statusProvider.update(null, false)
    return
  }
  const state = await getState(cwd)
  currentState = state ?? undefined
  if (state) {
    treeProvider.update(state)
    statusBarItem.text = `$(git-commit) ${state.commits.length} snapshot${state.commits.length !== 1 ? 's' : ''}`
    statusBarItem.show()
  } else {
    statusBarItem.hide()
  }
  statusProvider.update(state, !!lastError)
}

function handleResult(result: GitResult): void {
  if (result.ok) {
    lastError = undefined
    showSuccess(result.message)
  } else {
    lastError = result
    statusProvider.update(currentState ?? null, true)
    vscode.window.showWarningMessage(result.message, 'What\'s going on?').then((choice) => {
      if (choice === "What's going on?") {
        vscode.commands.executeCommand('go-git-it.explainError')
      }
    })
  }
}

// ── Activation ────────────────────────────────────────────────────────────────

export function activate(context: vscode.ExtensionContext): void {
  extensionContext = context
  // Status bar badge
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100)
  statusBarItem.command = 'go-git-it.openWalkthrough'
  context.subscriptions.push(statusBarItem)

  // Tree providers
  statusProvider = new StatusProvider()
  treeProvider = new TreeWebviewProvider(context, async (hash) => {
    await handleCommitClick(hash)
  })

  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('go-git-it-status', statusProvider),
    vscode.window.registerWebviewViewProvider('go-git-it-tree', treeProvider)
  )

  // Register commands
  const cmds: [string, () => Promise<void>][] = [
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
    ['go-git-it.connectToGitHub',      cmdConnectToGitHub],
    ['go-git-it.snapshotThenPull',     cmdSnapshotThenPull],
    ['go-git-it.abortMerge',           cmdAbortMerge],
  ]

  for (const [id, handler] of cmds) {
    context.subscriptions.push(vscode.commands.registerCommand(id, handler))
  }

  // Watch workspace changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(() => refreshState()),
    vscode.workspace.onDidSaveTextDocument(() => refreshState())
  )

  // Initial load
  refreshState()
}

export function deactivate(): void {
  // nothing to clean up
}

// ── Command handlers ──────────────────────────────────────────────────────────

async function cmdTakeSnapshot(): Promise<void> {
  const cwd = getCwd()
  if (!cwd) { vscode.window.showWarningMessage('Open a project first.'); return }

  const summary = await vscode.window.showInputBox({
    title: 'Save a Snapshot',
    prompt: 'What did you just do? (optional — press Enter to skip)',
    placeHolder: 'e.g. Added the hero section',
  })
  if (summary === undefined) return // user pressed Escape

  const result = await withFriendlyProgress('Saving your snapshot...', async () =>
    takeSnapshot(cwd, summary || undefined)
  )
  handleResult(result)
  await refreshState()
}

async function cmdPushToGitHub(): Promise<void> {
  const cwd = getCwd()
  if (!cwd) { vscode.window.showWarningMessage('Open a project first.'); return }

  const result = await withFriendlyProgress('Sending to GitHub...', async () =>
    pushToRemote(cwd)
  )
  handleResult(result)
  await refreshState()
}

async function cmdPullLatest(): Promise<void> {
  const cwd = getCwd()
  if (!cwd) { vscode.window.showWarningMessage('Open a project first.'); return }

  const result = await withFriendlyProgress('Getting the latest version...', async () =>
    pullLatest(cwd)
  )
  handleResult(result)
  await refreshState()
}

async function cmdStartExperiment(): Promise<void> {
  const cwd = getCwd()
  if (!cwd) { vscode.window.showWarningMessage('Open a project first.'); return }

  const name = await vscode.window.showInputBox({
    title: 'Start a New Experiment 🧪',
    prompt: 'What are you going to try?',
    placeHolder: 'e.g. New hero layout, Dark mode, Login flow',
    validateInput: (v) => (v.trim() ? undefined : 'Give it a name so you can find it later'),
  })
  if (!name) return

  const result = await withFriendlyProgress(`Starting experiment: ${name}...`, async () =>
    createExperiment(cwd, name)
  )
  handleResult(result)
  await refreshState()
}

async function cmdFinishExperiment(): Promise<void> {
  const cwd = getCwd()
  if (!cwd) { vscode.window.showWarningMessage('Open a project first.'); return }
  if (!currentState?.currentBranch.startsWith('experiment/')) {
    vscode.window.showWarningMessage("You're not on an experiment right now.")
    return
  }

  const confirm = await vscode.window.showInformationMessage(
    'Merge this experiment into your main work?',
    { modal: true, detail: "This adds all your experiment's changes to your main line." },
    'Yes, merge it in',
    'Not yet'
  )
  if (confirm !== 'Yes, merge it in') return

  const result = await withFriendlyProgress('Merging your experiment...', async () =>
    mergeExperiment(cwd, currentState!.defaultBranch)
  )
  handleResult(result)
  await refreshState()
}

async function cmdAbandonExperiment(): Promise<void> {
  const cwd = getCwd()
  if (!cwd) { vscode.window.showWarningMessage('Open a project first.'); return }
  if (!currentState?.currentBranch.startsWith('experiment/')) {
    vscode.window.showWarningMessage("You're not on an experiment right now.")
    return
  }

  const confirm = await vscode.window.showWarningMessage(
    'Abandon this experiment?',
    {
      modal: true,
      detail: "This permanently deletes the experiment branch. Your main line is untouched.",
    },
    'Yes, delete it',
    'Keep it for now'
  )
  if (confirm !== 'Yes, delete it') return

  const result = await withFriendlyProgress('Deleting experiment...', async () =>
    abandonExperiment(cwd, currentState!.defaultBranch)
  )
  handleResult(result)
  await refreshState()
}

async function cmdExplainError(): Promise<void> {
  if (!lastError) {
    vscode.window.showInformationMessage("Everything looks good — no errors to explain!")
    return
  }
  showErrorExplainer(extensionContext, lastError)
}

async function cmdOpenWalkthrough(): Promise<void> {
  await vscode.commands.executeCommand(
    'workbench.action.openWalkthrough',
    'go-git-it.go-git-it.walkthrough'
  )
}

async function cmdConnectToGitHub(): Promise<void> {
  const cwd = getCwd()
  if (!cwd) return

  const ghAvailable = await isGhCliAvailable()
  if (!ghAvailable) {
    await showGhCliMissingModal()
    return
  }

  const defaultSlug = path.basename(cwd)
  const slug = await vscode.window.showInputBox({
    title: 'Connect to GitHub',
    prompt: 'What should the GitHub repo be called?',
    value: slugify(defaultSlug),
  })
  if (!slug) return

  await withFriendlyProgress('Connecting to GitHub...', async () => {
    const result = await createGithubRepo(cwd, slug)
    if (result.ok) {
      showSuccess(`Connected! Your project is now backed up at github.com.`)
    } else {
      vscode.window.showErrorMessage(`Couldn't connect to GitHub: ${result.error}`)
    }
  })
  await refreshState()
}

async function cmdSnapshotThenPull(): Promise<void> {
  const cwd = getCwd()
  if (!cwd) return

  const snapResult = await withFriendlyProgress('Saving your snapshot first...', async () =>
    takeSnapshot(cwd)
  )
  if (!snapResult.ok && snapResult.code !== 'NOTHING_TO_COMMIT') {
    handleResult(snapResult)
    return
  }

  const pullResult = await withFriendlyProgress('Getting the latest version...', async () =>
    pullLatest(cwd)
  )
  handleResult(pullResult)
  await refreshState()
}

async function cmdAbortMerge(): Promise<void> {
  const cwd = getCwd()
  if (!cwd) return
  const result = await withFriendlyProgress('Undoing the merge...', async () =>
    abortMerge(cwd)
  )
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
    title: 'Step 1 of 4 — Name Your Project',
    prompt: 'What are you building? Give it a name.',
    placeHolder: 'e.g. My Portfolio, Recipe App, Landing Page',
    validateInput: (v) => {
      if (!v.trim()) return 'Give your project a name'
      if (/[<>:"/\\|?*]/.test(v)) return 'Avoid special characters like < > : " / \\ | ? *'
      return undefined
    },
  })
  if (!projectName) return

  // Step 2 — Location
  const locationChoice = await vscode.window.showQuickPick(
    [
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
    ],
    { title: 'Step 2 of 4 — Where Should We Save It?' }
  )
  if (!locationChoice) return

  let parentDir: string
  if (locationChoice.value === 'documents') {
    parentDir = path.join(os.homedir(), 'Documents')
  } else {
    const picked = await vscode.window.showOpenDialog({
      canSelectFolders: true,
      canSelectFiles: false,
      openLabel: 'Save project here',
      title: 'Choose a folder for your project',
    })
    if (!picked || picked.length === 0) return
    parentDir = picked[0].fsPath
  }

  // Step 3 — GitHub
  const githubChoice = await vscode.window.showQuickPick(
    [
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
    ],
    { title: 'Step 3 of 4 — Back Up to GitHub?' }
  )
  if (!githubChoice) return
  const connectGitHub = githubChoice.value === 'yes'

  // Step 4 — Confirm
  const slug = slugify(projectName)
  const projectPath = path.join(parentDir, slug)
  const confirm = await vscode.window.showQuickPick(
    [
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
    ],
    { title: 'Step 4 of 4 — Ready to Build!' }
  )

  if (!confirm || confirm.value === 'cancel' || confirm.value === 'info') return
  if (confirm.value !== 'go' && confirm.value !== 'confirm') return

  // Execute
  await withFriendlyProgress('Building your project...', async (progress) => {
    progress.report({ message: 'Creating folder...' })
    try {
      await fs.mkdir(projectPath, { recursive: true })
    } catch (err: unknown) {
      const e = err as { message?: string }
      vscode.window.showErrorMessage(`Couldn't create the folder: ${e.message}`)
      return
    }

    progress.report({ message: 'Setting up your project...' })
    const initResult = await initProject(projectPath, projectName)
    if (!initResult.ok) {
      vscode.window.showErrorMessage(initResult.message)
      return
    }

    if (connectGitHub) {
      progress.report({ message: 'Connecting to GitHub...' })
      const ghAvailable = await isGhCliAvailable()
      if (!ghAvailable) {
        await showGhCliMissingModal()
      } else {
        const ghResult = await createGithubRepo(projectPath, slug)
        if (ghResult.ok) {
          showSuccess("✅ Your project is live on GitHub!")
        } else {
          vscode.window.showWarningMessage(
            `Project created, but couldn't connect to GitHub: ${ghResult.error}`
          )
        }
      }
    }

    progress.report({ message: 'Opening your project...' })
    await vscode.commands.executeCommand(
      'vscode.openFolder',
      vscode.Uri.file(projectPath)
    )
  })
}

// ── Commit node click ──────────────────────────────────────────────────────────

async function handleCommitClick(hash: string): Promise<void> {
  const cwd = getCwd()
  if (!cwd) return

  const action = await vscode.window.showQuickPick(
    [
      { label: '$(eye) See what changed in this snapshot', value: 'show' },
      { label: '$(history) Go back to this snapshot', value: 'checkout' },
      { label: '', kind: vscode.QuickPickItemKind.Separator, value: '' },
      { label: '$(close) Cancel', value: 'cancel' },
    ],
    { title: 'What would you like to do?' }
  )
  if (!action || action.value === 'cancel' || action.value === '') return

  if (action.value === 'show') {
    const terminal = vscode.window.createTerminal('Snapshot diff')
    terminal.sendText(`git show ${hash} --stat`)
    terminal.show()
    return
  }

  if (action.value === 'checkout') {
    const isDirty = currentState?.isDirty
    const choice = await vscode.window.showWarningMessage(
      'Go back to this snapshot?',
      {
        modal: true,
        detail: isDirty
          ? 'Your current unsaved work will be lost. Take a snapshot first if you want to keep it.'
          : 'Your project will look exactly as it did at this point in time.',
      },
      ...(isDirty ? ['📸 Take snapshot first', '↩️ Go back anyway'] : ['↩️ Go back']),
      'Cancel'
    )
    if (!choice || choice === 'Cancel') return
    if (choice === '📸 Take snapshot first') {
      const snap = await withFriendlyProgress('Saving snapshot...', async () =>
        takeSnapshot(cwd)
      )
      handleResult(snap)
      if (!snap.ok) return
    }
    const terminal = vscode.window.createTerminal('Go Git It')
    terminal.sendText(`git checkout ${hash}`)
    terminal.show()
    await refreshState()
  }
}
