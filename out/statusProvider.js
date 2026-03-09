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
    buttonId;
    constructor(label, collapsible = vscode.TreeItemCollapsibleState.None, buttonId) {
        super(label, collapsible);
        this.buttonId = buttonId;
    }
}
class StatusProvider {
    _onDidChangeTreeData = new vscode.EventEmitter();
    onDidChangeTreeData = this._onDidChangeTreeData.event;
    state = null;
    hasError = false;
    noRepo = false;
    update(state, hasError) {
        this.state = state;
        this.hasError = hasError;
        this.noRepo = state === null;
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren() {
        if (this.noRepo) {
            return this.emptyState();
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
        ];
    }
    emptyState() {
        const item = new StatusItem("👋 No project open yet");
        item.description = 'Click 🏗️ to build something new, or 📂 to open an existing project.';
        item.contextValue = 'emptyState';
        return [
            item,
            this.separator('── START ──'),
            this.button('🏗️  Build a new project', 'buildNewProject', 'go-git-it.buildNewProject'),
            this.button('📂  Open a different project', 'openDifferentProject', 'go-git-it.openDifferentProject'),
        ];
    }
    projectSection() {
        const folder = vscode.workspace.workspaceFolders?.[0];
        const name = folder ? folder.name : '—';
        const header = new StatusItem('📁 PROJECT');
        header.contextValue = 'sectionHeader';
        const nameItem = new StatusItem(name);
        nameItem.description = 'current project';
        nameItem.contextValue = 'projectName';
        return [header, nameItem];
    }
    whereYouAreSection() {
        const s = this.state;
        const header = new StatusItem('📍 WHERE YOU ARE');
        header.contextValue = 'sectionHeader';
        let label;
        if (s.currentBranch === 'main' || s.currentBranch === 'master') {
            label = "You're on: Main line";
        }
        else if (s.currentBranch.startsWith('experiment/')) {
            const name = s.currentBranch.replace('experiment/', '');
            label = `You're experimenting: ${name}`;
        }
        else {
            label = `Branch: ${s.currentBranch}`;
        }
        const location = new StatusItem(label);
        location.contextValue = 'location';
        return [header, location];
    }
    yourWorkSection() {
        const s = this.state;
        const header = new StatusItem('💾 YOUR WORK');
        header.contextValue = 'sectionHeader';
        let label;
        if (!s.hasUpstream) {
            label = "⚠️ Not connected to GitHub";
        }
        else if (s.isDirty) {
            label = "🟡 You have unsaved changes";
        }
        else if (s.commits.length > 0 && !s.commits[0].pushed) {
            label = "🔵 Saved here, not on GitHub yet";
        }
        else {
            label = "✅ Everything saved & backed up";
        }
        const status = new StatusItem(label);
        status.contextValue = 'workStatus';
        return [header, status];
    }
    experimentsSection() {
        const s = this.state;
        const onExperiment = s.currentBranch.startsWith('experiment/');
        const items = [
            this.separator('── EXPERIMENTS ──'),
            this.button('🧪  Start a new experiment', 'startExperiment', 'go-git-it.startExperiment'),
        ];
        if (onExperiment) {
            items.push(this.button('✅  Finish this experiment', 'finishExperiment', 'go-git-it.finishExperiment'), this.button('🗑️  Abandon this experiment', 'abandonExperiment', 'go-git-it.abandonExperiment'));
        }
        return items;
    }
    helpSection() {
        const items = [this.separator('── HELP ──')];
        if (this.hasError) {
            items.push(this.button("❓  What's going on?", 'explainError', 'go-git-it.explainError'));
        }
        items.push(this.button('📖  How does this work?', 'openWalkthrough', 'go-git-it.openWalkthrough'));
        return items;
    }
    separator(label) {
        const item = new StatusItem(label);
        item.contextValue = 'separator';
        return item;
    }
    button(label, buttonId, command) {
        const item = new StatusItem(label, vscode.TreeItemCollapsibleState.None, buttonId);
        item.command = { command, title: label };
        item.contextValue = `button-${buttonId}`;
        return item;
    }
}
exports.StatusProvider = StatusProvider;
//# sourceMappingURL=statusProvider.js.map