import * as vscode from 'vscode'
import { GitState } from './gitRunner'

type ButtonId =
  | 'buildNewProject'
  | 'openDifferentProject'
  | 'takeSnapshot'
  | 'pushToGitHub'
  | 'pullLatest'
  | 'startExperiment'
  | 'finishExperiment'
  | 'abandonExperiment'
  | 'explainError'
  | 'openWalkthrough'

class StatusItem extends vscode.TreeItem {
  constructor(
    label: string,
    collapsible = vscode.TreeItemCollapsibleState.None,
    public readonly buttonId?: ButtonId
  ) {
    super(label, collapsible)
  }
}

export class StatusProvider implements vscode.TreeDataProvider<StatusItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<StatusItem | undefined | void>()
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event

  private state: GitState | null = null
  private hasError = false
  private noRepo = false

  update(state: GitState | null, hasError: boolean): void {
    this.state = state
    this.hasError = hasError
    this.noRepo = state === null
    this._onDidChangeTreeData.fire()
  }

  getTreeItem(element: StatusItem): vscode.TreeItem {
    return element
  }

  getChildren(): StatusItem[] {
    if (this.noRepo) {
      return this.emptyState()
    }
    return [
      ...this.projectSection(),
      ...this.whereYouAreSection(),
      ...this.yourWorkSection(),
      this.separator('── START ──'),
      this.button('🏗️  Build a new project', 'buildNewProject', 'go-git-it.buildNewProject'),
      this.button('📂  Open a different project', 'openDifferentProject', 'go-git-it.openDifferentProject'),
      this.separator('── YOUR WORK ──'),
      this.button('📸  Take a snapshot', 'takeSnapshot', 'go-git-it.takeSnapshot'),
      this.button('☁️   Send to GitHub', 'pushToGitHub', 'go-git-it.pushToGitHub'),
      this.button('⬇️   Get latest from GitHub', 'pullLatest', 'go-git-it.pullLatest'),
      ...this.experimentsSection(),
      ...this.helpSection(),
    ]
  }

  private emptyState(): StatusItem[] {
    const item = new StatusItem("👋 No project open yet")
    item.description = 'Click 🏗️ to build something new, or 📂 to open an existing project.'
    item.contextValue = 'emptyState'
    return [
      item,
      this.separator('── START ──'),
      this.button('🏗️  Build a new project', 'buildNewProject', 'go-git-it.buildNewProject'),
      this.button('📂  Open a different project', 'openDifferentProject', 'go-git-it.openDifferentProject'),
    ]
  }

  private projectSection(): StatusItem[] {
    const folder = vscode.workspace.workspaceFolders?.[0]
    const name = folder ? folder.name : '—'
    const header = new StatusItem('📁 PROJECT')
    header.contextValue = 'sectionHeader'
    const nameItem = new StatusItem(name)
    nameItem.description = 'current project'
    nameItem.contextValue = 'projectName'
    return [header, nameItem]
  }

  private whereYouAreSection(): StatusItem[] {
    const s = this.state!
    const header = new StatusItem('📍 WHERE YOU ARE')
    header.contextValue = 'sectionHeader'
    let label: string
    if (s.currentBranch === 'main' || s.currentBranch === 'master') {
      label = "You're on: Main line"
    } else if (s.currentBranch.startsWith('experiment/')) {
      const name = s.currentBranch.replace('experiment/', '')
      label = `You're experimenting: ${name}`
    } else {
      label = `Branch: ${s.currentBranch}`
    }
    const location = new StatusItem(label)
    location.contextValue = 'location'
    return [header, location]
  }

  private yourWorkSection(): StatusItem[] {
    const s = this.state!
    const header = new StatusItem('💾 YOUR WORK')
    header.contextValue = 'sectionHeader'
    let label: string
    if (!s.hasUpstream) {
      label = "⚠️ Not connected to GitHub"
    } else if (s.isDirty) {
      label = "🟡 You have unsaved changes"
    } else if (s.commits.length > 0 && !s.commits[0].pushed) {
      label = "🔵 Saved here, not on GitHub yet"
    } else {
      label = "✅ Everything saved & backed up"
    }
    const status = new StatusItem(label)
    status.contextValue = 'workStatus'
    return [header, status]
  }

  private experimentsSection(): StatusItem[] {
    const s = this.state!
    const onExperiment = s.currentBranch.startsWith('experiment/')
    const items: StatusItem[] = [
      this.separator('── EXPERIMENTS ──'),
      this.button('🧪  Start a new experiment', 'startExperiment', 'go-git-it.startExperiment'),
    ]
    if (onExperiment) {
      items.push(
        this.button('✅  Finish this experiment', 'finishExperiment', 'go-git-it.finishExperiment'),
        this.button('🗑️  Abandon this experiment', 'abandonExperiment', 'go-git-it.abandonExperiment')
      )
    }
    return items
  }

  private helpSection(): StatusItem[] {
    const items: StatusItem[] = [this.separator('── HELP ──')]
    if (this.hasError) {
      items.push(
        this.button("❓  What's going on?", 'explainError', 'go-git-it.explainError')
      )
    }
    items.push(
      this.button('📖  How does this work?', 'openWalkthrough', 'go-git-it.openWalkthrough')
    )
    return items
  }

  private separator(label: string): StatusItem {
    const item = new StatusItem(label)
    item.contextValue = 'separator'
    return item
  }

  private button(label: string, buttonId: ButtonId, command: string): StatusItem {
    const item = new StatusItem(label, vscode.TreeItemCollapsibleState.None, buttonId)
    item.command = { command, title: label }
    item.contextValue = `button-${buttonId}`
    return item
  }
}
