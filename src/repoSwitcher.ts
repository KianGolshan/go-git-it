import { execFile } from 'child_process'
import { promisify } from 'util'
import * as vscode from 'vscode'
import * as path from 'path'
import * as fs from 'fs/promises'
import * as os from 'os'

const execFileAsync = promisify(execFile)

// On macOS the extension host runs under a minimal shell without Homebrew on PATH.
// Try known install locations so GitHub repos appear in the switcher.
const GH_CANDIDATES = ['gh', '/opt/homebrew/bin/gh', '/usr/local/bin/gh']

async function findGhBinary(): Promise<string | null> {
  for (const bin of GH_CANDIDATES) {
    try { await execFileAsync(bin, ['--version']); return bin } catch { /* try next */ }
  }
  return null
}

interface RepoItem extends vscode.QuickPickItem {
  itemKind: 'local' | 'github' | 'separator'
  localPath?: string
  cloneUrl?: string
  updatedAt?: Date
}

function relativeDate(date: Date): string {
  const now = Date.now()
  const diff = now - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 2) return 'just now'
  if (hours < 1) return `${minutes} minutes ago`
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return date.toLocaleDateString()
}

/** Recursively scan a directory up to maxDepth for folders containing .git */
async function scanForGitRepos(
  dir: string,
  depth: number,
  maxDepth: number,
  results: Array<{ name: string; localPath: string; updatedAt: Date }>
): Promise<void> {
  if (depth > maxDepth) return
  let entries: string[]
  try {
    entries = await fs.readdir(dir)
  } catch {
    return
  }
  for (const entry of entries) {
    if (entry.startsWith('.')) continue
    const full = path.join(dir, entry)
    try {
      const stat = await fs.stat(full)
      if (!stat.isDirectory()) continue
      const gitDir = path.join(full, '.git')
      try {
        await fs.access(gitDir)
        results.push({ name: entry, localPath: full, updatedAt: stat.mtime })
      } catch {
        // no .git — recurse
        await scanForGitRepos(full, depth + 1, maxDepth, results)
      }
    } catch {
      continue
    }
  }
}

/** Fetch GitHub repos via gh CLI */
async function fetchGithubRepos(): Promise<
  Array<{ name: string; cloneUrl: string; updatedAt: Date }>
> {
  try {
    const gh = await findGhBinary()
    if (!gh) return []
    const { stdout } = await execFileAsync(gh, [
      'repo',
      'list',
      '--limit',
      '20',
      '--json',
      'name,url,updatedAt',
    ])
    const items = JSON.parse(stdout) as Array<{
      name: string
      url: string
      updatedAt: string
    }>
    return items.map((r) => ({
      name: r.name,
      cloneUrl: r.url,
      updatedAt: new Date(r.updatedAt),
    }))
  } catch {
    return []
  }
}

/**
 * Show the "Open a Different Project" picker.
 * Merges recent workspaces, local git repos, and GitHub repos.
 */
export async function showRepoSwitcher(): Promise<void> {
  const qp = vscode.window.createQuickPick<RepoItem>()
  qp.title = 'Open a Project'
  qp.placeholder = 'Search your projects...'
  qp.matchOnDescription = true
  qp.matchOnDetail = true
  qp.busy = true
  qp.show()

  const items: RepoItem[] = []
  const seenPaths = new Set<string>()

  // 1. Recent VS Code workspaces
  const recent = (
    await vscode.commands.executeCommand<{ workspaces: vscode.Uri[] }>(
      'vscode.getRecentlyOpenedWorkspaces'
    ).then(
      (r) => r?.workspaces ?? [],
      () => []
    )
  )

  for (const uri of recent) {
    const p = uri instanceof vscode.Uri ? uri.fsPath : String(uri)
    if (!p || seenPaths.has(p)) continue
    seenPaths.add(p)
    try {
      const stat = await fs.stat(p)
      items.push({
        itemKind: 'local',
        localPath: p,
        label: `$(git-branch)  ${path.basename(p)}`,
        description: p,
        detail: `Last opened: ${relativeDate(stat.mtime)}`,
        updatedAt: stat.mtime,
      })
    } catch {
      continue
    }
  }

  // 2. Scan local directories
  const scanDirs = [
    path.join(os.homedir(), 'Documents'),
    path.join(os.homedir(), 'Desktop'),
    path.join(os.homedir(), 'Projects'),
    path.join(os.homedir(), 'dev'),
    path.join(os.homedir(), 'Dev'),
  ]
  const localResults: Array<{ name: string; localPath: string; updatedAt: Date }> = []
  await Promise.all(scanDirs.map((d) => scanForGitRepos(d, 0, 3, localResults)))

  const localSep: RepoItem = {
    itemKind: 'local',
    label: '── On this computer ──',
    description: '',
    detail: '',
    alwaysShow: true,
  } as RepoItem & { alwaysShow: boolean }

  const localItems: RepoItem[] = []
  for (const r of localResults) {
    if (seenPaths.has(r.localPath)) continue
    seenPaths.add(r.localPath)
    localItems.push({
      itemKind: 'local',
      localPath: r.localPath,
      label: `$(git-branch)  ${r.name}`,
      description: r.localPath,
      detail: `Last modified: ${relativeDate(r.updatedAt)}`,
      updatedAt: r.updatedAt,
    })
  }
  localItems.sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0))
  if (localItems.length > 0) items.push(localSep, ...localItems)

  // 3. GitHub repos
  const githubResults = await fetchGithubRepos()
  const githubItems: RepoItem[] = []
  const githubSep: RepoItem = {
    itemKind: 'github',
    label: '── On GitHub (click to clone) ──',
    description: '',
    detail: '',
  }

  for (const r of githubResults) {
    githubItems.push({
      itemKind: 'github',
      cloneUrl: r.cloneUrl,
      label: `$(github)  ${r.name}`,
      description: 'On GitHub',
      detail: `Last updated: ${relativeDate(r.updatedAt)}`,
      updatedAt: r.updatedAt,
    })
  }
  if (githubItems.length > 0) items.push(githubSep, ...githubItems)

  // Empty state
  if (items.filter((i) => i.itemKind !== undefined && !i.label.startsWith('──')).length === 0) {
    items.push({
      itemKind: 'local',
      label: '$(add) Build a new project instead',
      description: "You don't have any projects yet",
      detail: 'Click to start something new',
    })
  }

  qp.items = items
  qp.busy = false

  qp.onDidAccept(async () => {
    const selected = qp.selectedItems[0]
    qp.hide()
    if (!selected) return

    if (selected.label === '$(add) Build a new project instead') {
      await vscode.commands.executeCommand('go-git-it.buildNewProject')
      return
    }

    // Separator items — ignore
    if (selected.label.startsWith('──')) return

    if (selected.itemKind === 'local' && selected.localPath) {
      await vscode.commands.executeCommand(
        'vscode.openFolder',
        vscode.Uri.file(selected.localPath)
      )
      return
    }

    if (selected.itemKind === 'github' && selected.cloneUrl) {
      const repoName = selected.cloneUrl.split('/').pop() ?? 'repo'
      const defaultPath = path.join(os.homedir(), 'Documents', repoName)

      const inputUri = await vscode.window.showInputBox({
        title: 'Where should we download this project?',
        prompt: 'We\'ll save it here:',
        value: defaultPath,
      })
      if (!inputUri) return

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Downloading ${repoName} from GitHub...`,
          cancellable: false,
        },
        async () => {
          try {
            await execFileAsync('git', ['clone', selected.cloneUrl!, inputUri])
            await vscode.commands.executeCommand(
              'vscode.openFolder',
              vscode.Uri.file(inputUri)
            )
          } catch (err: unknown) {
            const e = err as { message?: string }
            vscode.window.showErrorMessage(
              `Couldn't download the project: ${e.message ?? 'Unknown error'}`
            )
          }
        }
      )
    }
  })

  qp.onDidHide(() => qp.dispose())
}
