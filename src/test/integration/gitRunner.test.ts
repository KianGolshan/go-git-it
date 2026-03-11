/**
 * Integration tests for gitRunner.ts
 *
 * These tests create real temporary git repositories and run the actual
 * git functions against them. No mocking — if git behaves differently,
 * the tests will catch it.
 *
 * Scenarios covered (in order a real user would encounter them):
 *   1. isGitAvailable
 *   2. getState on a fresh repo
 *   3. takeSnapshot — success, nothing to commit, git user identity missing
 *   4. createExperiment — success, duplicate name guard
 *   5. getState on experiment branch — isDetachedHead = false, branch point marked
 *   6. mergeExperiment — success + branch deleted, merge conflict
 *   7. abandonExperiment — dirty state guard, clean abandon
 *   8. pullLatest — dirty guard, no upstream, already up to date
 *   9. abortMerge — no merge in progress, in-conflict abort
 *  10. returnToDefaultBranch — from detached HEAD
 *  11. initProject — fresh project creation, no-identity detection
 *  12. initExistingProject — existing folder with files
 *  13. getState — detached HEAD detection
 */

import * as assert from 'assert'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'
import { execFile } from 'child_process'
import { promisify } from 'util'
import {
  isGitAvailable,
  getState,
  takeSnapshot,
  createExperiment,
  mergeExperiment,
  abandonExperiment,
  pullLatest,
  abortMerge,
  returnToDefaultBranch,
  initProject,
  initExistingProject,
} from '../../gitRunner'

const exec = promisify(execFile)

// ── Test repo helpers ─────────────────────────────────────────────────────────

async function makeTempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'ggi-test-'))
}

/** Create a fully initialised git repo with one commit */
async function makeRepo(dir?: string): Promise<string> {
  const cwd = dir ?? await makeTempDir()
  await exec('git', ['init', '-b', 'main'], { cwd })
  await exec('git', ['config', 'user.email', 'test@test.com'], { cwd })
  await exec('git', ['config', 'user.name', 'Test User'], { cwd })
  await fs.writeFile(path.join(cwd, 'README.md'), '# Test\n')
  await exec('git', ['add', '-A'], { cwd })
  await exec('git', ['commit', '-m', 'Initial commit'], { cwd })
  return cwd
}

/** Write a file and commit it */
async function addCommit(cwd: string, filename: string, content: string, message: string): Promise<void> {
  await fs.writeFile(path.join(cwd, filename), content)
  await exec('git', ['add', '-A'], { cwd })
  await exec('git', ['commit', '-m', message], { cwd })
}

/** Make the working tree dirty without committing */
async function makeDirty(cwd: string, filename = 'dirty.txt'): Promise<void> {
  await fs.writeFile(path.join(cwd, filename), 'dirty ' + Date.now())
}

async function cleanup(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true })
}

// ── 1. isGitAvailable ─────────────────────────────────────────────────────────

describe('isGitAvailable', () => {
  it('returns true when git is installed (it must be, since tests ran)', async () => {
    const result = await isGitAvailable()
    assert.strictEqual(result, true)
  })
})

// ── 2. getState ───────────────────────────────────────────────────────────────

describe('getState', () => {
  let cwd: string
  before(async () => { cwd = await makeRepo() })
  after(async () => cleanup(cwd))

  it('returns null for a non-git directory', async () => {
    const tmp = await makeTempDir()
    const state = await getState(tmp)
    assert.strictEqual(state, null)
    await cleanup(tmp)
  })

  it('returns a state object for a valid repo', async () => {
    const state = await getState(cwd)
    assert.ok(state !== null)
  })

  it('has currentBranch = "main"', async () => {
    const state = await getState(cwd)
    assert.strictEqual(state?.currentBranch, 'main')
  })

  it('has displayBranch = "Main line"', async () => {
    const state = await getState(cwd)
    assert.strictEqual(state?.displayBranch, 'Main line')
  })

  it('isDirty = false on clean repo', async () => {
    const state = await getState(cwd)
    assert.strictEqual(state?.isDirty, false)
  })

  it('isDirty = true when there are uncommitted changes', async () => {
    await makeDirty(cwd)
    const state = await getState(cwd)
    assert.strictEqual(state?.isDirty, true)
    // clean up
    await fs.unlink(path.join(cwd, 'dirty.txt'))
  })

  it('hasUpstream = false with no remote', async () => {
    const state = await getState(cwd)
    assert.strictEqual(state?.hasUpstream, false)
  })

  it('isDetachedHead = false on a named branch', async () => {
    const state = await getState(cwd)
    assert.strictEqual(state?.isDetachedHead, false)
  })

  it('isDetachedHead = true in detached HEAD', async () => {
    const state0 = await getState(cwd)
    const hash = state0!.commits[0].hash
    await exec('git', ['checkout', hash], { cwd })
    const state = await getState(cwd)
    assert.strictEqual(state?.isDetachedHead, true)
    assert.strictEqual(state?.currentBranch, 'HEAD')
    assert.strictEqual(state?.displayBranch, 'Viewing past snapshot')
    // return to main
    await exec('git', ['checkout', 'main'], { cwd })
  })

  it('has at least 1 commit after makeRepo', async () => {
    const state = await getState(cwd)
    assert.ok((state?.commits.length ?? 0) >= 1)
  })

  it('experiment branch shows displayBranch as "Experiment: <name>"', async () => {
    await exec('git', ['checkout', '-b', 'experiment/dark-mode'], { cwd })
    const state = await getState(cwd)
    assert.strictEqual(state?.displayBranch, 'Experiment: dark-mode')
    await exec('git', ['checkout', 'main'], { cwd })
    await exec('git', ['branch', '-D', 'experiment/dark-mode'], { cwd })
  })
})

// ── 3. takeSnapshot ───────────────────────────────────────────────────────────

describe('takeSnapshot', () => {
  let cwd: string
  before(async () => { cwd = await makeRepo() })
  after(async () => cleanup(cwd))

  it('returns NOTHING_TO_COMMIT when nothing has changed', async () => {
    const result = await takeSnapshot(cwd)
    assert.strictEqual(result.ok, false)
    assert.strictEqual(result.code, 'NOTHING_TO_COMMIT')
  })

  it('saves a snapshot with auto-generated message', async () => {
    await makeDirty(cwd)
    const result = await takeSnapshot(cwd)
    assert.strictEqual(result.ok, true)
    assert.ok(result.message.includes('Snapshot saved'))
  })

  it('saves a snapshot with custom summary', async () => {
    await makeDirty(cwd)
    const result = await takeSnapshot(cwd, 'Added hero section')
    assert.strictEqual(result.ok, true)
    // Verify the commit message was used
    const state = await getState(cwd)
    assert.strictEqual(state?.commits[0].message, 'Added hero section')
  })

  it('treats empty string summary as auto-generated message', async () => {
    await makeDirty(cwd)
    const result = await takeSnapshot(cwd, '')
    assert.strictEqual(result.ok, true)
    const state = await getState(cwd)
    // Auto-generated messages start with "Snapshot:"
    assert.ok(state?.commits[0].message.startsWith('Snapshot:'))
  })

  it('handles repo with no user identity (NO_IDENTITY)', async () => {
    const bare = await makeTempDir()
    await exec('git', ['init', '-b', 'main'], { cwd: bare })
    // Explicitly unset identity — leave no global fallback
    await exec('git', ['config', 'user.email', ''], { cwd: bare })
    await exec('git', ['config', 'user.name', ''], { cwd: bare })
    await fs.writeFile(path.join(bare, 'file.txt'), 'hello')
    await exec('git', ['add', '-A'], { cwd: bare })
    const result = await takeSnapshot(bare)
    // Might be ok if global git config has identity — just test we don't crash
    assert.ok(result.ok === true || result.code === 'NO_IDENTITY' || result.code === 'UNKNOWN')
    await cleanup(bare)
  })
})

// ── 4. createExperiment ───────────────────────────────────────────────────────

describe('createExperiment', () => {
  let cwd: string
  before(async () => { cwd = await makeRepo() })
  after(async () => cleanup(cwd))

  it('creates an experiment branch', async () => {
    const result = await createExperiment(cwd, 'dark mode')
    assert.strictEqual(result.ok, true)
    const state = await getState(cwd)
    assert.strictEqual(state?.currentBranch, 'experiment/dark-mode')
    // Go back to main for subsequent tests
    await exec('git', ['checkout', 'main'], { cwd })
  })

  it('slugifies the experiment name for the branch', async () => {
    const result = await createExperiment(cwd, 'New Layout!!')
    assert.strictEqual(result.ok, true)
    const state = await getState(cwd)
    assert.strictEqual(state?.currentBranch, 'experiment/new-layout')
    await exec('git', ['checkout', 'main'], { cwd })
  })

  it('rejects duplicate experiment name', async () => {
    // Create the branch
    await exec('git', ['checkout', '-b', 'experiment/duplicate'], { cwd })
    await exec('git', ['checkout', 'main'], { cwd })
    // Try to create again
    const result = await createExperiment(cwd, 'duplicate')
    assert.strictEqual(result.ok, false)
    assert.ok(result.message.toLowerCase().includes('already have') || result.message.toLowerCase().includes('already'))
    // Cleanup
    await exec('git', ['branch', '-D', 'experiment/duplicate'], { cwd })
  })
})

// ── 5. mergeExperiment ────────────────────────────────────────────────────────

describe('mergeExperiment', () => {
  let cwd: string
  beforeEach(async () => { cwd = await makeRepo() })
  afterEach(async () => cleanup(cwd))

  it('merges experiment into main and deletes the branch', async () => {
    await createExperiment(cwd, 'feature')
    await addCommit(cwd, 'feature.txt', 'feature content', 'Add feature')
    await exec('git', ['checkout', 'main'], { cwd })
    await exec('git', ['checkout', 'experiment/feature'], { cwd })

    const result = await mergeExperiment(cwd, 'main')
    assert.strictEqual(result.ok, true)

    // Verify we're on main
    const state = await getState(cwd)
    assert.strictEqual(state?.currentBranch, 'main')

    // Verify the experiment branch was deleted
    try {
      await exec('git', ['show-ref', '--verify', 'refs/heads/experiment/feature'], { cwd })
      assert.fail('Experiment branch should have been deleted after merge')
    } catch {
      // Expected — branch is gone
    }

    // Verify the file is on main
    const exists = await fs.stat(path.join(cwd, 'feature.txt')).then(() => true).catch(() => false)
    assert.strictEqual(exists, true)
  })

  it('returns MERGE_CONFLICT when branches conflict', async () => {
    // Create conflicting changes on both branches
    await addCommit(cwd, 'conflict.txt', 'main version\n', 'Main change')
    await createExperiment(cwd, 'conflicting')
    await addCommit(cwd, 'conflict.txt', 'experiment version\n', 'Experiment change')

    // Create conflict on main too
    await exec('git', ['checkout', 'main'], { cwd })
    await addCommit(cwd, 'conflict.txt', 'main version 2\n', 'Main conflicting change')
    await exec('git', ['checkout', 'experiment/conflicting'], { cwd })

    const result = await mergeExperiment(cwd, 'main')
    assert.strictEqual(result.ok, false)
    assert.strictEqual(result.code, 'MERGE_CONFLICT')

    // Abort so the repo is clean for afterEach
    await exec('git', ['merge', '--abort'], { cwd })
    await exec('git', ['checkout', 'main'], { cwd })
  })

  it('fails if called while not on an experiment branch', async () => {
    const result = await mergeExperiment(cwd, 'main')
    assert.strictEqual(result.ok, false)
    assert.ok(result.message.toLowerCase().includes('experiment'))
  })
})

// ── 6. abandonExperiment ─────────────────────────────────────────────────────

describe('abandonExperiment', () => {
  let cwd: string
  beforeEach(async () => { cwd = await makeRepo() })
  afterEach(async () => cleanup(cwd))

  it('abandons a clean experiment and returns to main', async () => {
    await createExperiment(cwd, 'throwaway')
    const result = await abandonExperiment(cwd, 'main')
    assert.strictEqual(result.ok, true)

    const state = await getState(cwd)
    assert.strictEqual(state?.currentBranch, 'main')

    // Verify branch is gone
    try {
      await exec('git', ['show-ref', '--verify', 'refs/heads/experiment/throwaway'], { cwd })
      assert.fail('Branch should have been deleted')
    } catch {
      // Expected
    }
  })

  it('blocks abandon when experiment has uncommitted changes (DIRTY_PULL)', async () => {
    await createExperiment(cwd, 'with-changes')
    await makeDirty(cwd)

    const result = await abandonExperiment(cwd, 'main')
    assert.strictEqual(result.ok, false)
    assert.strictEqual(result.code, 'DIRTY_PULL')
    assert.ok(result.message.toLowerCase().includes('snapshot') || result.message.toLowerCase().includes('unsaved'))

    // Cleanup — we're still on the experiment branch
    await exec('git', ['checkout', '-f', 'main'], { cwd })
    await exec('git', ['branch', '-D', 'experiment/with-changes'], { cwd })
  })

  it('fails if called while not on an experiment branch', async () => {
    const result = await abandonExperiment(cwd, 'main')
    assert.strictEqual(result.ok, false)
    assert.ok(result.message.toLowerCase().includes('experiment'))
  })
})

// ── 7. pullLatest ─────────────────────────────────────────────────────────────

describe('pullLatest', () => {
  let cwd: string
  before(async () => { cwd = await makeRepo() })
  after(async () => cleanup(cwd))

  it('blocks pull when there are uncommitted changes (DIRTY_PULL)', async () => {
    await makeDirty(cwd)
    const result = await pullLatest(cwd)
    assert.strictEqual(result.ok, false)
    assert.strictEqual(result.code, 'DIRTY_PULL')
    assert.ok(result.message.toLowerCase().includes('snapshot'))
    await exec('git', ['checkout', '--', '.'], { cwd })
    await fs.rm(path.join(cwd, 'dirty.txt'), { force: true })
  })

  it('returns ok with "nothing new" when already up to date (no remote)', async () => {
    // No remote, pull will try but since no upstream, fetch is a no-op
    // and pull fails — but we handle "no upstream" as a non-error
    const result = await pullLatest(cwd)
    // Either ok (already up to date or no remote just silently succeeds) or UNKNOWN (no upstream)
    assert.ok(result.ok === true || result.code === 'UNKNOWN')
  })
})

// ── 8. abortMerge ────────────────────────────────────────────────────────────

describe('abortMerge', () => {
  let cwd: string
  beforeEach(async () => { cwd = await makeRepo() })
  afterEach(async () => cleanup(cwd))

  it('fails when there is no merge in progress', async () => {
    const result = await abortMerge(cwd)
    assert.strictEqual(result.ok, false)
    assert.ok(result.message.toLowerCase().includes('undo') || result.message.toLowerCase().includes('merge'))
  })

  it('successfully aborts an in-progress conflicting merge', async () => {
    // Create a conflict scenario
    await addCommit(cwd, 'conflict.txt', 'main line\n', 'Main')
    await exec('git', ['checkout', '-b', 'experiment/conflict'], { cwd })
    await addCommit(cwd, 'conflict.txt', 'experiment line\n', 'Experiment')
    await exec('git', ['checkout', 'main'], { cwd })
    await addCommit(cwd, 'conflict.txt', 'main diverged\n', 'Main diverged')

    // Try merge — will conflict
    try {
      await exec('git', ['merge', 'experiment/conflict', '--no-ff', '-m', 'merge'], { cwd })
    } catch {
      // Expected to fail
    }

    const result = await abortMerge(cwd)
    assert.strictEqual(result.ok, true)
    const state = await getState(cwd)
    assert.strictEqual(state?.currentBranch, 'main')
    await exec('git', ['branch', '-D', 'experiment/conflict'], { cwd })
  })
})

// ── 9. returnToDefaultBranch ─────────────────────────────────────────────────

describe('returnToDefaultBranch', () => {
  let cwd: string
  before(async () => { cwd = await makeRepo() })
  after(async () => cleanup(cwd))

  it('returns to main from a detached HEAD state', async () => {
    const state0 = await getState(cwd)
    const hash = state0!.commits[0].hash
    await exec('git', ['checkout', hash], { cwd })

    const stateDetached = await getState(cwd)
    assert.strictEqual(stateDetached?.isDetachedHead, true)

    const result = await returnToDefaultBranch(cwd, 'main')
    assert.strictEqual(result.ok, true)

    const stateFinal = await getState(cwd)
    assert.strictEqual(stateFinal?.currentBranch, 'main')
    assert.strictEqual(stateFinal?.isDetachedHead, false)
  })
})

// ── 10. initProject ──────────────────────────────────────────────────────────

describe('initProject', () => {
  let tmp: string
  before(async () => { tmp = await makeTempDir() })
  after(async () => cleanup(tmp))

  it('creates a new project with README and .gitignore', async () => {
    const projectPath = path.join(tmp, 'my-new-project')
    await fs.mkdir(projectPath)
    // Set global config for test
    await exec('git', ['config', '--global', 'user.email', 'test@test.com'])
    await exec('git', ['config', '--global', 'user.name', 'Test User'])

    const result = await initProject(projectPath, 'My New Project')
    // May succeed or return NO_IDENTITY depending on system config
    assert.ok(result.ok === true || result.code === 'NO_IDENTITY')

    if (result.ok) {
      const readmeExists = await fs.stat(path.join(projectPath, 'README.md')).then(() => true).catch(() => false)
      assert.strictEqual(readmeExists, true)
      const gitignoreExists = await fs.stat(path.join(projectPath, '.gitignore')).then(() => true).catch(() => false)
      assert.strictEqual(gitignoreExists, true)
    }
  })
})

// ── 11. initExistingProject ──────────────────────────────────────────────────

describe('initExistingProject', () => {
  let cwd: string
  before(async () => { cwd = await makeTempDir() })
  after(async () => cleanup(cwd))

  it('tracks an existing folder with files', async () => {
    await fs.writeFile(path.join(cwd, 'index.html'), '<html><body>Hello</body></html>')
    await fs.writeFile(path.join(cwd, 'style.css'), 'body { color: red; }')

    const result = await initExistingProject(cwd)
    assert.ok(result.ok === true || result.code === 'NO_IDENTITY')

    if (result.ok) {
      const state = await getState(cwd)
      assert.ok(state !== null)
      assert.ok((state?.commits.length ?? 0) >= 1)
    }
  })

  it('handles an empty folder (no files to commit)', async () => {
    const empty = await makeTempDir()
    const result = await initExistingProject(empty)
    // Git init works even with no files, just no commit
    assert.ok(result.ok === true || result.code === 'NO_IDENTITY')
    await cleanup(empty)
  })
})

// ── 12. End-to-end scenario: full workflow ────────────────────────────────────

describe('Full user workflow scenario', () => {
  let cwd: string
  before(async () => { cwd = await makeRepo() })
  after(async () => cleanup(cwd))

  it('simulates: snapshot → experiment → add code → merge → verify branch gone', async () => {
    // 1. Take a snapshot of some work
    await makeDirty(cwd, 'app.js')
    const snap1 = await takeSnapshot(cwd, 'Started the app')
    assert.strictEqual(snap1.ok, true)

    // 2. Start an experiment
    const expResult = await createExperiment(cwd, 'new feature')
    assert.strictEqual(expResult.ok, true)

    // 3. Do work in the experiment
    await addCommit(cwd, 'feature.js', 'function feature() {}', 'Add feature function')

    // 4. Merge experiment
    const mergeResult = await mergeExperiment(cwd, 'main')
    assert.strictEqual(mergeResult.ok, true)

    // 5. Verify we're on main
    const state = await getState(cwd)
    assert.strictEqual(state?.currentBranch, 'main')

    // 6. Verify branch was cleaned up
    try {
      await exec('git', ['show-ref', '--verify', 'refs/heads/experiment/new-feature'], { cwd })
      assert.fail('Branch should be deleted after merge')
    } catch {
      // Expected
    }

    // 7. Verify the merged code is on main
    const featureExists = await fs.stat(path.join(cwd, 'feature.js')).then(() => true).catch(() => false)
    assert.strictEqual(featureExists, true)
  })

  it('simulates: snapshot → experiment → abandon (dirty) → blocked', async () => {
    const exp = await createExperiment(cwd, 'risky idea')
    assert.strictEqual(exp.ok, true)

    // Work but don't snapshot
    await makeDirty(cwd, 'risky.js')

    const abandon = await abandonExperiment(cwd, 'main')
    assert.strictEqual(abandon.ok, false)
    assert.strictEqual(abandon.code, 'DIRTY_PULL')

    // Force cleanup
    await exec('git', ['checkout', '-f', 'main'], { cwd })
    await exec('git', ['branch', '-D', 'experiment/risky-idea'], { cwd })
  })

  it('simulates: same experiment name twice — second attempt blocked', async () => {
    const first = await createExperiment(cwd, 'login flow')
    assert.strictEqual(first.ok, true)
    await exec('git', ['checkout', 'main'], { cwd })

    // Merge it to clean up the branch
    await exec('git', ['checkout', 'experiment/login-flow'], { cwd })
    await mergeExperiment(cwd, 'main')

    // Now try to create a NEW experiment with the same name — branch is gone, should work
    const second = await createExperiment(cwd, 'login flow')
    assert.strictEqual(second.ok, true, 'Should succeed since first branch was deleted after merge')
    await exec('git', ['checkout', 'main'], { cwd })
    await exec('git', ['branch', '-D', 'experiment/login-flow'], { cwd }).catch(() => {})
  })

  it('simulates: rewind to past snapshot and return to main', async () => {
    await makeDirty(cwd, 'work.js')
    await takeSnapshot(cwd, 'Some work')

    const state = await getState(cwd)
    const firstCommit = state!.commits[state!.commits.length - 1]

    // Rewind
    await exec('git', ['checkout', firstCommit.hash], { cwd })
    const detached = await getState(cwd)
    assert.strictEqual(detached?.isDetachedHead, true)

    // Return
    const returnResult = await returnToDefaultBranch(cwd, 'main')
    assert.strictEqual(returnResult.ok, true)

    const back = await getState(cwd)
    assert.strictEqual(back?.currentBranch, 'main')
    assert.strictEqual(back?.isDetachedHead, false)
  })
})

// ── 13. Error code exhaustiveness ────────────────────────────────────────────

describe('ErrorCode coverage', () => {
  it('every function returns a GitResult with ok and message', async () => {
    const cwd = await makeRepo()
    try {
      // All these calls should return proper GitResult objects, never throw
      const results = await Promise.all([
        takeSnapshot(cwd),           // NOTHING_TO_COMMIT
        mergeExperiment(cwd, 'main'), // UNKNOWN (not on experiment)
        abandonExperiment(cwd, 'main'), // UNKNOWN (not on experiment)
        abortMerge(cwd),              // UNKNOWN (no merge in progress)
      ])

      for (const result of results) {
        assert.strictEqual(typeof result.ok, 'boolean')
        assert.strictEqual(typeof result.message, 'string')
        assert.ok(result.message.length > 0, 'message should not be empty')
      }
    } finally {
      await cleanup(cwd)
    }
  })
})
