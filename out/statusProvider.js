"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatusProvider = void 0;
const vscode = __importStar(require("vscode"));
class StatusItem extends vscode.TreeItem {
    constructor(label, collapsible = vscode.TreeItemCollapsibleState.None, command) {
        super(label, collapsible);
        if (command) {
            this.command = { command, title: label };
            this.contextValue = `button-${command.replace('go-git-it.', '')}`;
        }
    }
}
function separator(label) {
    const item = new StatusItem(label);
    item.contextValue = 'separator';
    item.tooltip = '';
    return item;
}
function button(label, command) {
    return new StatusItem(label, vscode.TreeItemCollapsibleState.None, command);
}
function startSection() {
    return [
        separator('── START ──'),
        button('🏗️  Build a new project', 'go-git-it.buildNewProject'),
        button('📂  Open a different project', 'go-git-it.openDifferentProject'),
    ];
}
class StatusProvider {
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    state = null;
    hasError = false;
    noRepo = true;
    gitMissing = false;
    update(state, hasError, gitMissing = false) {
        this.state = state;
        this.hasError = hasError;
        this.noRepo = state === null;
        this.gitMissing = gitMissing;
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(el) { return el; }
    getChildren() {
        if (this.gitMissing)
            return this.gitMissingState();
        if (this.noRepo)
            return this.emptyState();
        return [
            ...this.statusSection(),
            ...startSection(),
            separator('── YOUR WORK ──'),
            button('📸  Take a snapshot', 'go-git-it.takeSnapshot'),
            button('☁️   Send to GitHub', 'go-git-it.pushToGitHub'),
            button('⬇️   Get latest from GitHub', 'go-git-it.pullLatest'),
            ...this.experimentsSection(),
            ...this.helpSection(),
        ];
    }
    gitMissingState() {
        const item = new StatusItem('⚠️ Git is not installed');
        item.description = 'Install Git to use Go Git It';
        item.tooltip = 'Download Git from https://git-scm.com';
        return [item, ...startSection()];
    }
    emptyState() {
        const item = new StatusItem('👋 No git project open');
        item.description = 'Open or build a project to get started';
        return [item, ...startSection()];
    }
    statusSection() {
        const s = this.state;
        const items = [];
        // Branch
        let branchLabel;
        if (s.currentBranch === 'main' || s.currentBranch === 'master') {
            branchLabel = '📍 Main line';
        }
        else if (s.currentBranch.startsWith('experiment/')) {
            branchLabel = `🧪 Experiment: ${s.currentBranch.replace('experiment/', '')}`;
        }
        else {
            branchLabel = `📍 ${s.currentBranch}`;
        }
        const branch = new StatusItem(branchLabel);
        branch.contextValue = 'status-branch';
        items.push(branch);
        // Work status
        let workLabel;
        if (!s.hasUpstream) {
            workLabel = '⚠️ Not connected to GitHub';
        }
        else if (s.isDirty) {
            workLabel = '🟡 Unsaved changes';
        }
        else if (s.commits.length > 0 && !s.commits[0].pushed) {
            workLabel = '🔵 Saved here, not on GitHub yet';
        }
        else {
            workLabel = '✅ Everything saved & backed up';
        }
        const work = new StatusItem(workLabel);
        work.contextValue = 'status-work';
        items.push(work);
        return items;
    }
    experimentsSection() {
        const onExperiment = this.state.currentBranch.startsWith('experiment/');
        const items = [
            separator('── EXPERIMENTS ──'),
            button('🧪  Start a new experiment', 'go-git-it.startExperiment'),
        ];
        if (onExperiment) {
            items.push(button('✅  Finish this experiment', 'go-git-it.finishExperiment'));
            items.push(button('🗑️  Abandon this experiment', 'go-git-it.abandonExperiment'));
        }
        return items;
    }
    helpSection() {
        const items = [separator('── HELP ──')];
        if (this.hasError) {
            items.push(button("❓  What's going on?", 'go-git-it.explainError'));
        }
        items.push(button('📖  How does this work?', 'go-git-it.openWalkthrough'));
        return items;
    }
}
exports.StatusProvider = StatusProvider;
//# sourceMappingURL=statusProvider.js.map