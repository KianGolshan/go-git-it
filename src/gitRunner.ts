import { execFile } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'
import * as fs from 'fs/promises'

const execFileAsync = promisify(execFile)

// ── Types ─────────────────────────────────────────────────────────────────────

export type ErrorCode =
  | 'DIRTY_PULL'
  | 'MERGE_CONFLICT'
  | 'NO_UPSTREAM'
  | 'NO_GIT'
  | 'NOTHING_TO_COMMIT'
  | 'UNKNOWN'

export interface GitResult {
  ok: boolean
  message: string
  code?: ErrorCode
  rawError?: string
}

export interface CommitNode {
  hash: string
  shortHash: string
  message: string
  date: string
  branch: string
  pushed: boolean
  isBranchPoint?: boolean
}

export interface GitState {
  currentBranch: string
  displayBranch: string
  isDirty: boolean
  hasUpstream: boolean
  defaultBranch: string
  commits: CommitNode[]
  lastError?: GitResult
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function git(
  args: string[],
  cwd: string
): Promise<{ stdout: string; stderr: string; failed: boolean }> {
  try {
    const { stdout, stderr } = await execFileAsync('git', args, { cwd })
    return { stdout: stdout.trim(), stderr: stderr.trim(), failed: false }
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; message?: string }
    return {
      stdout: (e.stdout ?? '').trim(),
      stderr: (e.stderr ?? e.message ?? '').trim(),
      failed: true,
    }
  }
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Stage all changes and commit with an auto-generated message.
 * Returns NOTHING_TO_COMMIT if the working tree is clean.
 */
export async function takeSnapshot(
  cwd: string,
  summary?: string
): Promise<GitResult> {
  const status = await git(['status', '--porcelain'], cwd)
  if (status.failed) {
    return { ok: false, message: 'Could not check your files.', code: 'UNKNOWN', rawError: status.stderr }
  }
  if (!status.stdout) {
    return {
      ok: false,
      message: "There's nothing new to save — your files haven't changed since the last snapshot.",
      code: 'NOTHING_TO_COMMIT',
    }
  }

  await git(['add', '-A'], cwd)

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
  const msg = summary ? `Snapshot: ${now} — ${summary}` : `Snapshot: ${now}`

  const commit = await git(['commit', '-m', msg], cwd)
  if (commit.failed) {
    return {
      ok: false,
      message: 'Something went wrong while saving your snapshot.',
      code: 'UNKNOWN',
      rawError: commit.stderr,
    }
  }

  return {
    ok: true,
    message: 'Snapshot saved ✅ — if something breaks, you can always come back to this point.',
  }
}

/**
 * Push current branch to the configured remote.
 * Returns NO_UPSTREAM when no remote tracking branch is set.
 */
export async function pushToRemote(cwd: string): Promise<GitResult> {
  const result = await git(['push'], cwd)
  if (result.failed) {
    const stderr = result.stderr.toLowerCase()
    if (
      stderr.includes('no upstream') ||
      stderr.includes('has no upstream') ||
      stderr.includes('set-upstream') ||
      stderr.includes('does not have a local changes')
    ) {
      return {
        ok: false,
        message: "This project isn't connected to a GitHub repository yet.",
        code: 'NO_UPSTREAM',
        rawError: result.stderr,
      }
    }
    return {
      ok: false,
      message: 'Something went wrong while sending to GitHub.',
      code: 'UNKNOWN',
      rawError: result.stderr,
    }
  }
  return { ok: true, message: 'Your work is now backed up on GitHub ☁️' }
}

/**
 * Fetch + pull latest from remote. Refuses to pull if working tree is dirty.
 */
export async function pullLatest(cwd: string): Promise<GitResult> {
  const status = await git(['status', '--porcelain'], cwd)
  if (status.failed) {
    return { ok: false, message: 'Could not check your files.', code: 'UNKNOWN', rawError: status.stderr }
  }
  if (status.stdout) {
    return {
      ok: false,
      message:
        "You have unsaved changes — downloading new changes now could overwrite your work. Take a snapshot first!",
      code: 'DIRTY_PULL',
    }
  }

  await git(['fetch'], cwd)
  const pull = await git(['pull'], cwd)

  if (pull.failed) {
    return {
      ok: false,
      message: 'Something went wrong while getting the latest version.',
      code: 'UNKNOWN',
      rawError: pull.stderr,
    }
  }

  if (
    pull.stdout.toLowerCase().includes('already up to date') ||
    pull.stdout.toLowerCase().includes('already up-to-date')
  ) {
    return { ok: true, message: "You already have everything — nothing new on GitHub." }
  }

  return { ok: true, message: 'Got the latest — your files are up to date ⬇️' }
}

/**
 * Create and switch to a new experiment branch.
 */
export async function createExperiment(
  cwd: string,
  name: string
): Promise<GitResult> {
  const branchName = `experiment/${slugify(name)}`
  const result = await git(['checkout', '-b', branchName], cwd)
  if (result.failed) {
    return {
      ok: false,
      message: 'Could not start the experiment. Try a different name.',
      code: 'UNKNOWN',
      rawError: result.stderr,
    }
  }
  return {
    ok: true,
    message:
      "You're now experimenting safely 🧪 — nothing here affects your main work until you're ready.",
  }
}

/**
 * Merge the current experiment branch into the default branch.
 * Returns MERGE_CONFLICT if Git cannot auto-resolve conflicts.
 */
export async function mergeExperiment(
  cwd: string,
  defaultBranch: string
): Promise<GitResult> {
  const branchResult = await git(['rev-parse', '--abbrev-ref', 'HEAD'], cwd)
  if (branchResult.failed || !branchResult.stdout.startsWith('experiment/')) {
    return {
      ok: false,
      message: "You don't seem to be on an experiment branch right now.",
      code: 'UNKNOWN',
    }
  }
  const experimentBranch = branchResult.stdout
  const experimentName = experimentBranch.replace('experiment/', '')

  const checkout = await git(['checkout', defaultBranch], cwd)
  if (checkout.failed) {
    return {
      ok: false,
      message: 'Could not switch back to your main line.',
      code: 'UNKNOWN',
      rawError: checkout.stderr,
    }
  }

  await git(['pull'], cwd)

  const merge = await git(
    ['merge', experimentBranch, '--no-ff', '-m', `Merged experiment: ${experimentName}`],
    cwd
  )
  if (merge.failed) {
    const stderr = merge.stderr.toLowerCase()
    if (stderr.includes('conflict') || merge.stdout.toLowerCase().includes('conflict')) {
      return {
        ok: false,
        message:
          "Two sets of changes touched the same part of a file, and we can't automatically decide which to keep. Your work is completely safe.",
        code: 'MERGE_CONFLICT',
        rawError: merge.stderr,
      }
    }
    return {
      ok: false,
      message: 'Something went wrong during the merge.',
      code: 'UNKNOWN',
      rawError: merge.stderr,
    }
  }

  return { ok: true, message: 'Experiment merged into your main line ✅' }
}

/**
 * Abandon the current experiment: switch to default branch and delete the experiment branch.
 */
export async function abandonExperiment(
  cwd: string,
  defaultBranch: string
): Promise<GitResult> {
  const branchResult = await git(['rev-parse', '--abbrev-ref', 'HEAD'], cwd)
  if (branchResult.failed || !branchResult.stdout.startsWith('experiment/')) {
    return {
      ok: false,
      message: "You don't seem to be on an experiment branch right now.",
      code: 'UNKNOWN',
    }
  }
  const experimentBranch = branchResult.stdout

  const checkout = await git(['checkout', defaultBranch], cwd)
  if (checkout.failed) {
    return {
      ok: false,
      message: 'Could not switch back to your main line.',
      code: 'UNKNOWN',
      rawError: checkout.stderr,
    }
  }

  const del = await git(['branch', '-D', experimentBranch], cwd)
  if (del.failed) {
    return {
      ok: false,
      message: 'Could not delete the experiment branch.',
      code: 'UNKNOWN',
      rawError: del.stderr,
    }
  }

  return { ok: true, message: 'Experiment deleted — your main work is untouched.' }
}

/**
 * Read all relevant Git state for the current workspace.
 */
export async function getState(cwd: string): Promise<GitState | null> {
  // Verify this is a git repo
  const revParse = await git(['rev-parse', '--git-dir'], cwd)
  if (revParse.failed) return null

  // Current branch
  const branchResult = await git(['rev-parse', '--abbrev-ref', 'HEAD'], cwd)
  const currentBranch = branchResult.failed ? 'unknown' : branchResult.stdout

  // Display name
  let displayBranch: string
  if (currentBranch === 'main' || currentBranch === 'master') {
    displayBranch = 'Main line'
  } else if (currentBranch.startsWith('experiment/')) {
    displayBranch = `Experiment: ${currentBranch.replace('experiment/', '')}`
  } else {
    displayBranch = currentBranch
  }

  // Dirty?
  const statusResult = await git(['status', '--porcelain'], cwd)
  const isDirty = !statusResult.failed && statusResult.stdout.length > 0

  // Remote?
  const remoteResult = await git(['remote'], cwd)
  const hasUpstream = !remoteResult.failed && remoteResult.stdout.length > 0

  // Default branch
  let defaultBranch = 'main'
  const headResult = await git(
    ['symbolic-ref', 'refs/remotes/origin/HEAD'],
    cwd
  )
  if (!headResult.failed && headResult.stdout) {
    const match = headResult.stdout.match(/refs\/remotes\/origin\/(.+)$/)
    if (match) defaultBranch = match[1]
  } else {
    // Fallback: check if 'master' exists
    const masterCheck = await git(['show-ref', '--verify', '--quiet', 'refs/heads/master'], cwd)
    if (!masterCheck.failed) defaultBranch = 'master'
  }

  // Commits (last 20)
  const logResult = await git(
    ['log', '--oneline', '--decorate', '--max-count=20', '--format=%H|%h|%s|%ci|%D'],
    cwd
  )

  const commits: CommitNode[] = []
  if (!logResult.failed && logResult.stdout) {
    // Get list of hashes pushed to remote
    const remoteHashesResult = await git(
      ['log', '--remotes', '--format=%H', '--max-count=100'],
      cwd
    )
    const remoteHashes = new Set(
      remoteHashesResult.failed ? [] : remoteHashesResult.stdout.split('\n').filter(Boolean)
    )

    for (const line of logResult.stdout.split('\n')) {
      if (!line.trim()) continue
      const parts = line.split('|')
      if (parts.length < 5) continue
      const [hash, shortHash, message, date, refs] = parts

      // Determine which branch this commit belongs to
      let branch = currentBranch
      if (refs && refs.includes('origin/')) {
        const remoteRef = refs.match(/origin\/(\S+)/)
        if (remoteRef) branch = remoteRef[1]
      }

      commits.push({
        hash,
        shortHash,
        message,
        date,
        branch,
        pushed: remoteHashes.has(hash),
      })
    }

    // Mark branch point: first commit that appears in both experiment and main log
    if (currentBranch.startsWith('experiment/')) {
      const mainLogResult = await git(
        ['log', defaultBranch, '--format=%H', '--max-count=100'],
        cwd
      )
      const mainHashes = new Set(
        mainLogResult.failed ? [] : mainLogResult.stdout.split('\n').filter(Boolean)
      )
      let marked = false
      for (const c of commits) {
        if (!marked && mainHashes.has(c.hash)) {
          c.isBranchPoint = true
          marked = true
        }
      }
    }
  }

  return {
    currentBranch,
    displayBranch,
    isDirty,
    hasUpstream,
    defaultBranch,
    commits,
  }
}

/**
 * Initialize a new git project at the given path.
 * Creates README.md and .gitignore, then makes the initial commit.
 */
export async function initProject(
  projectPath: string,
  name: string
): Promise<GitResult> {
  const init = await git(['init'], projectPath)
  if (init.failed) {
    return {
      ok: false,
      message: 'Could not create the project folder.',
      code: 'UNKNOWN',
      rawError: init.stderr,
    }
  }

  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  await fs.writeFile(
    path.join(projectPath, 'README.md'),
    `# ${name}\n\nCreated on ${date}. Happy building! 🚀\n`
  )

  await fs.writeFile(
    path.join(projectPath, '.gitignore'),
    [
      '# Dependencies',
      'node_modules/',
      '.pnp',
      '.pnp.js',
      '',
      '# Build output',
      'dist/',
      'out/',
      'build/',
      '.next/',
      '',
      '# Environment',
      '.env',
      '.env.local',
      '.env.*.local',
      '',
      '# OS',
      '.DS_Store',
      'Thumbs.db',
      '',
      '# Editor',
      '.vscode/',
      '*.suo',
      '*.ntvs*',
      '*.njsproj',
      '*.sln',
      '*.sw?',
    ].join('\n') + '\n'
  )

  await git(['add', '-A'], projectPath)

  const commit = await git(['commit', '-m', `🎉 Started ${name}`], projectPath)
  if (commit.failed) {
    return {
      ok: false,
      message: 'Files created, but could not save the first snapshot.',
      code: 'UNKNOWN',
      rawError: commit.stderr,
    }
  }

  return { ok: true, message: 'Project created! Your first snapshot is saved.' }
}

/**
 * Abort an in-progress merge (used by error explainer for MERGE_CONFLICT).
 */
export async function abortMerge(cwd: string): Promise<GitResult> {
  const result = await git(['merge', '--abort'], cwd)
  if (result.failed) {
    return {
      ok: false,
      message: 'Could not undo the merge attempt.',
      code: 'UNKNOWN',
      rawError: result.stderr,
    }
  }
  return { ok: true, message: 'Merge undone — your main work is back to normal.' }
}
