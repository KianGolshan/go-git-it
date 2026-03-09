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
exports.isGhCliAvailable = isGhCliAvailable;
exports.createGithubRepo = createGithubRepo;
exports.showGhCliMissingModal = showGhCliMissingModal;
exports.connectExistingRepo = connectExistingRepo;
const child_process_1 = require("child_process");
const util_1 = require("util");
const vscode = __importStar(require("vscode"));
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
/** Returns true if the `gh` CLI is installed and authenticated. */
async function isGhCliAvailable() {
    try {
        await execFileAsync('gh', ['auth', 'status']);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Create a public GitHub repo from the given local path and push the initial commit.
 * Assumes `git init` and first commit already done.
 */
async function createGithubRepo(cwd, slug) {
    try {
        const { stdout } = await execFileAsync('gh', ['repo', 'create', slug, '--public', '--source=.', '--remote=origin', '--push'], { cwd });
        const urlMatch = stdout.match(/https:\/\/github\.com\/\S+/);
        return { ok: true, url: urlMatch ? urlMatch[0] : undefined };
    }
    catch (err) {
        const e = err;
        return { ok: false, error: e.stderr ?? e.message ?? 'Unknown error' };
    }
}
/**
 * Show the "gh CLI not installed" fallback modal.
 * Returns true if the user clicked "Open Setup Guide".
 */
async function showGhCliMissingModal() {
    const choice = await vscode.window.showInformationMessage('One quick setup needed', {
        modal: true,
        detail: 'To connect to GitHub automatically, we need a small free tool called the GitHub CLI. It only takes a minute to set up.',
    }, 'Open Setup Guide', 'Skip for now');
    if (choice === 'Open Setup Guide') {
        await vscode.env.openExternal(vscode.Uri.parse('https://cli.github.com'));
        return true;
    }
    return false;
}
/**
 * Connect an existing local repo to a GitHub repo by setting the remote.
 */
async function connectExistingRepo(cwd, slug) {
    try {
        // gh repo create with --source will add remote and push
        const { stdout } = await execFileAsync('gh', ['repo', 'create', slug, '--public', '--source=.', '--remote=origin', '--push'], { cwd });
        const urlMatch = stdout.match(/https:\/\/github\.com\/\S+/);
        return { ok: true, url: urlMatch ? urlMatch[0] : undefined };
    }
    catch (err) {
        const e = err;
        return { ok: false, error: e.stderr ?? e.message ?? 'Unknown error' };
    }
}
//# sourceMappingURL=githubSetup.js.map