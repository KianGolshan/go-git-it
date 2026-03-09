import * as vscode from 'vscode'
import { GitState } from './gitRunner'

class StatusItem extends vscode.TreeItem {
  constructor(
    label: string,
    collapsible = vscode.TreeItemCollapsibleState.None,
    command?: string
  ) {
    super(label, collapsible)
    if (command) {
      this.command = { command, title: label }
      this.contextValue = `button-${command.replace('go-git-it.', '')}`
    }
  }
}

function separator(label: string): StatusItem {
  const item = new StatusItem(label)
  item.contextValue = 'separator'
  item.tooltip = ''
  return item
}

function button(label: string, command: string): StatusItem {
  return new StatusItem(label, vscode.TreeItemCollapsibleState.None, command)
}

function startSection(): StatusItem[] {
  return [
    separator('── START ──'),
    button('🏗️  Build a new project',      'go-git-it.buildNewProject'),
    button('📂  Open a different project',  'go-git-it.openDifferentProject'),
  ]
}

export class StatusProvider implements vscode.TreeDataProvider<StatusItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<StatusItem | undefined | void>()
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event

  private state: GitState | null = null
  private hasError = false
  private noRepo = true
  private gitMissing = false

  update(state: GitState | null, hasError: boolean, gitMissing = false): void {
    this.state = state
    this.hasError = hasError
    this.noRepo = state === null
    this.gitMissing = gitMissing
    this._onDidChangeTreeData.fire()
  }

  getTreeItem(el: StatusItem): vscode.TreeItem { return el }

  getChildren(): StatusItem[] {
    if (this.gitMissing) return this.gitMissingState()
    if (this.noRepo)     return this.emptyState()
    return [
      ...this.statusSection(),
      ...startSection(),
      separator('── YOUR WORK ──'),
      button('📸  Take a snapshot',          'go-git-it.takeSnapshot'),
      button('☁️   Send to GitHub',           'go-git-it.pushToGitHub'),
      button('⬇️   Get latest from GitHub',   'go-git-it.pullLatest'),
      ...this.experimentsSection(),
      ...this.helpSection(),
    ]
  }

  private gitMissingState(): StatusItem[] {
    const item = new StatusItem('⚠️ Git is not installed')
    item.description = 'Install Git to use Go Git It'
    item.tooltip = 'Download Git from https://git-scm.com'
    return [item, ...startSection()]
  }

  private emptyState(): StatusItem[] {
    const item = new StatusItem('👋 No git project open')
    item.description = 'Open or build a project to get started'
    return [item, ...startSection()]
  }

  private statusSection(): StatusItem[] {
    const s = this.state!
    const items: StatusItem[] = []

    // Branch
    let branchLabel: string
    if (s.currentBranch === 'main' || s.currentBranch === 'master') {
      branchLabel = '📍 Main line'
    } else if (s.currentBranch.startsWith('experiment/')) {
      branchLabel = `🧪 Experiment: ${s.currentBranch.replace('experiment/', '')}`
    } else {
      branchLabel = `📍 ${s.currentBranch}`
    }
    const branch = new StatusItem(branchLabel)
    branch.contextValue = 'status-branch'
    items.push(branch)

    // Work status
    let workLabel: string
    if (!s.hasUpstream) {
      workLabel = '⚠️ Not connected to GitHub'
    } else if (s.isDirty) {
      workLabel = '🟡 Unsaved changes'
    } else if (s.commits.length > 0 && !s.commits[0].pushed) {
      workLabel = '🔵 Saved here, not on GitHub yet'
    } else {
      workLabel = '✅ Everything saved & backed up'
    }
    const work = new StatusItem(workLabel)
    work.contextValue = 'status-work'
    items.push(work)

    return items
  }

  private experimentsSection(): StatusItem[] {
    const onExperiment = this.state!.currentBranch.startsWith('experiment/')
    const items: StatusItem[] = [
      separator('── EXPERIMENTS ──'),
      button('🧪  Start a new experiment', 'go-git-it.startExperiment'),
    ]
    if (onExperiment) {
      items.push(button('✅  Finish this experiment',   'go-git-it.finishExperiment'))
      items.push(button('🗑️  Abandon this experiment',  'go-git-it.abandonExperiment'))
    }
    return items
  }

  private helpSection(): StatusItem[] {
    const items: StatusItem[] = [separator('── HELP ──')]
    if (this.hasError) {
      items.push(button("❓  What's going on?", 'go-git-it.explainError'))
    }
    items.push(button('📖  How does this work?', 'go-git-it.openWalkthrough'))
    return items
  }
}
