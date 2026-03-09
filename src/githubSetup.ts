import { execFile } from 'child_process'
import { promisify } from 'util'
import * as vscode from 'vscode'

const execFileAsync = promisify(execFile)

export interface GhResult {
  ok: boolean
  url?: string
  error?: string
}

/** Returns true if the `gh` CLI is installed and authenticated. */
export async function isGhCliAvailable(): Promise<boolean> {
  try {
    await execFileAsync('gh', ['auth', 'status'])
    return true
  } catch {
    return false
  }
}

/**
 * Create a public GitHub repo from the given local path and push the initial commit.
 * Assumes `git init` and first commit already done.
 */
export async function createGithubRepo(
  cwd: string,
  slug: string
): Promise<GhResult> {
  try {
    const { stdout } = await execFileAsync(
      'gh',
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
 * Show the "gh CLI not installed" fallback modal.
 * Returns true if the user clicked "Open Setup Guide".
 */
export async function showGhCliMissingModal(): Promise<boolean> {
  const choice = await vscode.window.showInformationMessage(
    'One quick setup needed',
    {
      modal: true,
      detail:
        'To connect to GitHub automatically, we need a small free tool called the GitHub CLI. It only takes a minute to set up.',
    },
    'Open Setup Guide',
    'Skip for now'
  )
  if (choice === 'Open Setup Guide') {
    await vscode.env.openExternal(vscode.Uri.parse('https://cli.github.com'))
    return true
  }
  return false
}

/**
 * Connect an existing local repo to a GitHub repo by setting the remote.
 */
export async function connectExistingRepo(
  cwd: string,
  slug: string
): Promise<GhResult> {
  try {
    // gh repo create with --source will add remote and push
    const { stdout } = await execFileAsync(
      'gh',
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
