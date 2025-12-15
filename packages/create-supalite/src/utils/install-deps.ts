import { spawn } from 'child_process'
import type { PackageManager } from '../types.js'

/**
 * Install dependencies in target directory using the specified package manager.
 */
export async function installDependencies(
  targetDir: string,
  packageManager: PackageManager
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(packageManager, ['install'], {
      cwd: targetDir,
      stdio: 'inherit',
      shell: process.platform === 'win32', // Windows needs shell: true for npm/pnpm/bun
      env: { ...process.env },
    })

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`${packageManager} install failed`))
      } else {
        resolve()
      }
    })

    child.on('error', (error) => {
      reject(new Error(`Failed to run ${packageManager}: ${error.message}`))
    })
  })
}
