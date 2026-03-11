import { execFile } from 'child_process'
import { promisify } from 'util'
import * as vscode from 'vscode'

const execFileAsync = promisify(execFile)

export interface GhResult {
  ok: boolean
  url?: string
  error?: string
}

export type GhCliStatus = 'ok' | 'not_installed' | 'not_authenticated'

/**
 * Check whether `gh` CLI is installed and authenticated.
 * Returns a 3-way status so callers can give precise guidance.
 */
// On macOS, VS Code's extension host runs under a minimal shell that doesn't
// source ~/.zshrc or ~/.bash_profile, so Homebrew binaries aren't on PATH.
// Try known install locations before falling back to a bare 'gh'.
const GH_CANDIDATES = [
  'gh',
  '/opt/homebrew/bin/gh',  // Apple Silicon Macs
  '/usr/local/bin/gh',     // Intel Macs
]

async function findGhBinary(): Promise<string | null> {
  for (const bin of GH_CANDIDATES) {
    try {
      await execFileAsync(bin, ['--version'])
      return bin
    } catch {
      // try next
    }
  }
  return null
}

export async function checkGhCli(): Promise<GhCliStatus> {
  const gh = await findGhBinary()
  if (!gh) return 'not_installed'
  try {
    await execFileAsync(gh, ['auth', 'status'])
    return 'ok'
  } catch {
    return 'not_authenticated'
  }
}

/**
 * Create a public GitHub repo from the given local path and push all local commits.
 * Assumes `git init` and at least one commit already exist.
 */
export async function createGithubRepo(
  cwd: string,
  slug: string
): Promise<GhResult> {
  try {
    const gh = await findGhBinary() ?? 'gh'
    const { stdout } = await execFileAsync(
      gh,
      ['repo', 'create', slug, '--public', '--source=.', '--remote=origin', '--push'],
      { cwd }
    )
    const urlMatch = stdout.match(/https:\/\/github\.com\/\S+/)
    return { ok: true, url: urlMatch ? urlMatch[0] : undefined }
  } catch (err: unknown) {
    const e = err as { stderr?: string; message?: string }
    return { ok: false, error: e.stderr ?? e.message ?? 'Unknown error' }
  }
}

/**
 * Show the "GitHub CLI not installed" modal with a direct install link.
 */
export async function showGhNotInstalledModal(): Promise<void> {
  const choice = await vscode.window.showInformationMessage(
    'One free tool needed — the GitHub CLI',
    {
      modal: true,
      detail:
        'To connect to GitHub automatically, you need a free tool called the GitHub CLI.\n\n' +
        'It takes about 1 minute to install. After that, connecting any project is one click.',
    },
    'Install the GitHub CLI (free)',
    'Skip for now'
  )
  if (choice === 'Install the GitHub CLI (free)') {
    await vscode.env.openExternal(vscode.Uri.parse('https://cli.github.com'))
  }
}

/**
 * Show the "GitHub CLI installed but not logged in" modal.
 * Opens a terminal so the user can run `gh auth login`.
 */
export async function showGhNotAuthenticatedModal(): Promise<void> {
  const choice = await vscode.window.showInformationMessage(
    'Log in to GitHub (one-time setup)',
    {
      modal: true,
      detail:
        'The GitHub CLI is installed — great! You just need to log in once.\n\n' +
        'Click "Open Terminal" below, then run this command:\n\n' +
        '    gh auth login\n\n' +
        'Follow the prompts — it opens your browser and logs you in automatically.',
    },
    'Open Terminal',
    'Skip for now'
  )
  if (choice === 'Open Terminal') {
    await vscode.commands.executeCommand('workbench.action.terminal.new')
  }
}
