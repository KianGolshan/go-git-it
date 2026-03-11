import * as vscode from 'vscode'

/**
 * Run an async operation wrapped in a friendly progress notification.
 */
export async function withFriendlyProgress<T>(
  title: string,
  task: (progress: vscode.Progress<{ message?: string }>) => Promise<T>
): Promise<T> {
  return vscode.window.withProgress<T>(
    {
      location: vscode.ProgressLocation.Notification,
      title,
      cancellable: false,
    },
    task
  )
}

/**
 * Show a friendly success message.
 */
export function showSuccess(message: string): void {
  vscode.window.showInformationMessage(message)
}

export { slugify } from './utils'
