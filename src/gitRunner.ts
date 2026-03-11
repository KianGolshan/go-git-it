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
  | 'NO_IDENTITY'
  | 'ALREADY_CONNECTED'
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
  isDetachedHead: boolean
  commits: CommitNode[]
  lastError?: GitResult
}

// ── Internal helpers ──────────────────────────────────────────────────────────

// Use unit-separator (0x1f) as field delimiter — never appears in git output
const SEP = '\x1f'

async function git(
  args: string[],
  cwd: string
): Promise<{ stdout: string; stderr: string; failed: boolean; notFound: boolean }> {
  try {
    const { stdout, stderr } = await execFileAsync('git', args, { cwd })
    return { stdout: stdout.trim(), stderr: stderr.trim(), failed: false, notFound: false }
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; message?: string; code?: string }
    const notFound = e.code === 'ENOENT'
    return {
      stdout: (e.stdout ?? '').trim(),
      stderr: (e.stderr ?? e.message ?? '').trim(),
      failed: true,
      notFound,
    }
  }
}

import { slugify } from './utils'
export { slugify }

/** Detect "Please tell me who you are" from git commit failure */
function isNoIdentityError(stderr: string): boolean {
  return stderr.toLowerCase().includes('please tell me who you are') ||
    stderr.toLowerCase().includes('user.email') && stderr.toLowerCase().includes('config')
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function takeSnapshot(cwd: string, summary?: string): Promise<GitResult> {
  const status = await git(['status', '--porcelain'], cwd)
  if (status.notFound) {
    return { ok: false, message: "Git isn't installed on this computer.", code: 'NO_GIT' }
  }
  if (status.failed) {
    return { ok: false, message: 'Could not check your files.', code: 'UNKNOWN', rawError: status.stderr }
  }
  if (!status.stdout) {
    return {
      ok: false,
      message: "Nothing new to save — your files haven't changed since the last snapshot.",
      code: 'NOTHING_TO_COMMIT',
    }
  }

  await git(['add', '-A'], cwd)

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
  const msg = summary ? summary : `Snapshot: ${now}`
  const commit = await git(['commit', '-m', msg], cwd)
  if (commit.failed) {
    if (isNoIdentityError(commit.stderr)) {
      return {
        ok: false,
        message: 'Git needs your name and email before saving your first snapshot.',
        code: 'NO_IDENTITY',
        rawError: commit.stderr,
      }
    }
    return { ok: false, message: 'Could not save the snapshot.', code: 'UNKNOWN', rawError: commit.stderr }
  }

  return { ok: true, message: 'Snapshot saved ✅ — you can always come back to this point.' }
}

export async function pushToRemote(cwd: string): Promise<GitResult> {
  const result = await git(['push'], cwd)
  if (result.notFound) {
    return { ok: false, message: "Git isn't installed on this computer.", code: 'NO_GIT' }
  }
  if (result.failed) {
    const s = result.stderr.toLowerCase()
    if (s.includes('no upstream') || s.includes('set-upstream') || s.includes('has no upstream')) {
      return {
        ok: false,
        message: "This project isn't connected to a GitHub repository yet.",
        code: 'NO_UPSTREAM',
        rawError: result.stderr,
      }
    }
    return { ok: false, message: 'Could not send to GitHub.', code: 'UNKNOWN', rawError: result.stderr }
  }
  return { ok: true, message: 'Your work is now backed up on GitHub ☁️' }
}

export async function pullLatest(cwd: string): Promise<GitResult> {
  const status = await git(['status', '--porcelain'], cwd)
  if (status.notFound) {
    return { ok: false, message: "Git isn't installed on this computer.", code: 'NO_GIT' }
  }
  if (status.failed) {
    return { ok: false, message: 'Could not check your files.', code: 'UNKNOWN', rawError: status.stderr }
  }
  if (status.stdout) {
    return {
      ok: false,
      message: 'You have unsaved changes — take a snapshot first before getting the latest.',
      code: 'DIRTY_PULL',
    }
  }

  await git(['fetch'], cwd)
  const pull = await git(['pull'], cwd)
  if (pull.failed) {
    const combined = (pull.stderr + pull.stdout).toLowerCase()
    // Merge conflict during pull
    if (combined.includes('conflict') || combined.includes('merge conflict')) {
      return {
        ok: false,
        message: "Two changes touched the same spot — can't merge automatically. Your work is safe.",
        code: 'MERGE_CONFLICT',
        rawError: pull.stderr,
      }
    }
    return { ok: false, message: 'Could not get the latest version.', code: 'UNKNOWN', rawError: pull.stderr }
  }

  const s = pull.stdout.toLowerCase()
  if (s.includes('already up to date') || s.includes('already up-to-date')) {
    return { ok: true, message: "You already have everything — nothing new on GitHub." }
  }
  return { ok: true, message: 'Got the latest — your files are up to date ⬇️' }
}

export async function createExperiment(cwd: string, name: string): Promise<GitResult> {
  const branchName = `experiment/${slugify(name)}`

  // Check if the branch already exists
  const existing = await git(['show-ref', '--verify', '--quiet', `refs/heads/${branchName}`], cwd)
  if (!existing.failed) {
    return {
      ok: false,
      message: `You already have an experiment called "${name}". Try a different name.`,
      code: 'UNKNOWN',
    }
  }

  const result = await git(['checkout', '-b', branchName], cwd)
  if (result.failed) {
    return { ok: false, message: 'Could not start the experiment.', code: 'UNKNOWN', rawError: result.stderr }
  }
  return {
    ok: true,
    message: "You're now experimenting safely 🧪 — your main work is untouched until you're ready.",
  }
}

export async function mergeExperiment(cwd: string, defaultBranch: string): Promise<GitResult> {
  const branchResult = await git(['rev-parse', '--abbrev-ref', 'HEAD'], cwd)
  if (branchResult.failed || !branchResult.stdout.startsWith('experiment/')) {
    return { ok: false, message: "You don't seem to be on an experiment branch.", code: 'UNKNOWN' }
  }
  const experimentBranch = branchResult.stdout
  const experimentName = experimentBranch.replace('experiment/', '')

  const checkout = await git(['checkout', defaultBranch], cwd)
  if (checkout.failed) {
    return { ok: false, message: 'Could not switch back to your main line.', code: 'UNKNOWN', rawError: checkout.stderr }
  }

  // Only pull if there's actually a remote configured — avoids confusing
  // "no tracking information" errors on local-only repos.
  const remoteCheck = await git(['remote'], cwd)
  if (!remoteCheck.failed && remoteCheck.stdout.length > 0) {
    const pull = await git(['pull'], cwd)
    if (pull.failed) {
      const s = pull.stderr.toLowerCase()
      const isNoUpstream = s.includes('no upstream') || s.includes('no tracking') ||
        s.includes('specify which branch') || s.includes('set-upstream')
      if (!isNoUpstream) {
        return { ok: false, message: 'Could not get latest before merging.', code: 'UNKNOWN', rawError: pull.stderr }
      }
    }
  }

  const merge = await git(['merge', experimentBranch, '--no-ff', '-m', `Merged experiment: ${experimentName}`], cwd)
  if (merge.failed) {
    const s = merge.stderr.toLowerCase() + merge.stdout.toLowerCase()
    if (s.includes('conflict')) {
      return {
        ok: false,
        message: "Two changes touched the same spot — can't merge automatically. Your work is safe.",
        code: 'MERGE_CONFLICT',
        rawError: merge.stderr,
      }
    }
    return { ok: false, message: 'Something went wrong during the merge.', code: 'UNKNOWN', rawError: merge.stderr }
  }

  // Clean up: delete the experiment branch now that it's merged
  await git(['branch', '-d', experimentBranch], cwd)

  return { ok: true, message: 'Experiment merged into your main line ✅' }
}

export async function abandonExperiment(cwd: string, defaultBranch: string): Promise<GitResult> {
  const branchResult = await git(['rev-parse', '--abbrev-ref', 'HEAD'], cwd)
  if (branchResult.failed || !branchResult.stdout.startsWith('experiment/')) {
    return { ok: false, message: "You don't seem to be on an experiment branch.", code: 'UNKNOWN' }
  }
  const experimentBranch = branchResult.stdout

  // Refuse if there are uncommitted changes — git checkout would fail anyway and the error is confusing
  const statusResult = await git(['status', '--porcelain'], cwd)
  if (!statusResult.failed && statusResult.stdout.length > 0) {
    return {
      ok: false,
      message: 'Take a snapshot first — you have unsaved changes on this experiment that would be lost.',
      code: 'DIRTY_PULL',
    }
  }

  const checkout = await git(['checkout', defaultBranch], cwd)
  if (checkout.failed) {
    return { ok: false, message: 'Could not switch back to your main line.', code: 'UNKNOWN', rawError: checkout.stderr }
  }

  const del = await git(['branch', '-D', experimentBranch], cwd)
  if (del.failed) {
    return { ok: false, message: 'Could not delete the experiment branch.', code: 'UNKNOWN', rawError: del.stderr }
  }

  return { ok: true, message: 'Experiment deleted — your main work is untouched.' }
}

export async function getState(cwd: string): Promise<GitState | null> {
  const revParse = await git(['rev-parse', '--git-dir'], cwd)
  if (revParse.notFound || revParse.failed) return null

  const branchResult = await git(['rev-parse', '--abbrev-ref', 'HEAD'], cwd)
  const currentBranch = branchResult.failed ? 'unknown' : branchResult.stdout

  // Detached HEAD: git outputs the literal string "HEAD"
  const isDetachedHead = currentBranch === 'HEAD'

  let displayBranch: string
  if (isDetachedHead) {
    displayBranch = 'Viewing past snapshot'
  } else if (currentBranch === 'main' || currentBranch === 'master') {
    displayBranch = 'Main line'
  } else if (currentBranch.startsWith('experiment/')) {
    displayBranch = `Experiment: ${currentBranch.replace('experiment/', '')}`
  } else {
    displayBranch = currentBranch
  }

  const statusResult = await git(['status', '--porcelain'], cwd)
  const isDirty = !statusResult.failed && statusResult.stdout.length > 0

  const remoteResult = await git(['remote'], cwd)
  const hasUpstream = !remoteResult.failed && remoteResult.stdout.length > 0

  // Determine default branch: check config, then what local branches exist
  let defaultBranch = 'main'
  const configResult = await git(['config', 'init.defaultBranch'], cwd)
  if (!configResult.failed && configResult.stdout) {
    defaultBranch = configResult.stdout
  } else {
    const mainCheck = await git(['show-ref', '--verify', '--quiet', 'refs/heads/main'], cwd)
    const masterCheck = await git(['show-ref', '--verify', '--quiet', 'refs/heads/master'], cwd)
    if (!mainCheck.failed) defaultBranch = 'main'
    else if (!masterCheck.failed) defaultBranch = 'master'
  }

  // Use 0x1f as separator to avoid splitting on | in commit messages
  const fmt = `%H${SEP}%h${SEP}%s${SEP}%ci${SEP}%D`
  const logResult = await git(['log', `--format=${fmt}`, '--max-count=20'], cwd)

  const commits: CommitNode[] = []
  if (!logResult.failed && logResult.stdout) {
    const remoteHashesResult = await git(['log', '--remotes', '--format=%H', '--max-count=100'], cwd)
    const remoteHashes = new Set(
      remoteHashesResult.failed ? [] : remoteHashesResult.stdout.split('\n').filter(Boolean)
    )

    for (const line of logResult.stdout.split('\n')) {
      if (!line.trim()) continue
      const parts = line.split(SEP)
      if (parts.length < 5) continue
      const [hash, shortHash, message, date, refs] = parts

      let branch = currentBranch
      const remoteRef = refs?.match(/origin\/(\S+?)(?:,|$)/)
      if (remoteRef) branch = remoteRef[1]

      commits.push({ hash, shortHash, message, date, branch, pushed: remoteHashes.has(hash) })
    }

    // Mark branch point for experiment branches
    if (currentBranch.startsWith('experiment/')) {
      const mainLogResult = await git(['log', defaultBranch, '--format=%H', '--max-count=100'], cwd)
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

  return { currentBranch, displayBranch, isDirty, hasUpstream, defaultBranch, isDetachedHead, commits }
}

export async function initProject(projectPath: string, name: string): Promise<GitResult> {
  const init = await git(['init'], projectPath)
  if (init.failed) {
    return { ok: false, message: 'Could not create the project.', code: 'UNKNOWN', rawError: init.stderr }
  }

  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  await fs.writeFile(path.join(projectPath, 'README.md'), `# ${name}\n\nCreated on ${date}. Happy building! 🚀\n`)
  await fs.writeFile(
    path.join(projectPath, '.gitignore'),
    [
      '# Dependencies', 'node_modules/', '.pnp', '',
      '# Build output', 'dist/', 'out/', 'build/', '.next/', '',
      '# Environment', '.env', '.env.local', '.env.*.local', '',
      '# OS', '.DS_Store', 'Thumbs.db', '',
      '# Editor', '.vscode/', '*.suo', '*.sw?',
    ].join('\n') + '\n'
  )

  await git(['add', '-A'], projectPath)
  const commit = await git(['commit', '-m', `🎉 Started ${name}`], projectPath)
  if (commit.failed) {
    if (isNoIdentityError(commit.stderr)) {
      return {
        ok: false,
        message: 'Project created! One more step: Git needs your name and email before you can take snapshots.',
        code: 'NO_IDENTITY',
        rawError: commit.stderr,
      }
    }
    return { ok: false, message: 'Files created, but could not save the first snapshot.', code: 'UNKNOWN', rawError: commit.stderr }
  }

  return { ok: true, message: 'Project created! Your first snapshot is saved.' }
}

/**
 * Initialize git tracking on an existing folder without overwriting any files.
 * Runs `git init`, stages everything, and makes the first commit.
 */
export async function initExistingProject(projectPath: string): Promise<GitResult> {
  const init = await git(['init'], projectPath)
  if (init.failed) {
    return { ok: false, message: 'Could not set up version control in this folder.', code: 'UNKNOWN', rawError: init.stderr }
  }

  await git(['add', '-A'], projectPath)
  const status = await git(['status', '--porcelain'], projectPath)
  const hasFiles = !status.failed && status.stdout.length > 0

  if (hasFiles) {
    const commit = await git(['commit', '-m', '🎉 Start tracking this project'], projectPath)
    if (commit.failed) {
      if (isNoIdentityError(commit.stderr)) {
        return {
          ok: false,
          message: 'Folder set up! One more step: Git needs your name and email before you can take snapshots.',
          code: 'NO_IDENTITY',
          rawError: commit.stderr,
        }
      }
      return { ok: false, message: 'Folder set up, but could not save the first snapshot.', code: 'UNKNOWN', rawError: commit.stderr }
    }
  }

  return { ok: true, message: 'This folder is now being tracked. Your work is safe!' }
}

export async function abortMerge(cwd: string): Promise<GitResult> {
  const result = await git(['merge', '--abort'], cwd)
  if (result.failed) {
    return { ok: false, message: 'Could not undo the merge.', code: 'UNKNOWN', rawError: result.stderr }
  }
  return { ok: true, message: 'Merge undone — your main work is back to normal.' }
}

export async function returnToDefaultBranch(cwd: string, defaultBranch: string): Promise<GitResult> {
  const result = await git(['checkout', defaultBranch], cwd)
  if (result.failed) {
    return { ok: false, message: `Could not return to your main line.`, code: 'UNKNOWN', rawError: result.stderr }
  }
  return { ok: true, message: `Back on your main line.` }
}

/** Check if git is available on PATH */
export async function isGitAvailable(): Promise<boolean> {
  const r = await git(['--version'], process.cwd())
  return !r.notFound
}
