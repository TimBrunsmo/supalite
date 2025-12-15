import { spawnSync } from 'child_process'
import type { PackageManager } from '../types.js'

/**
 * Detect OS for platform-specific checks
 */
function isWindows(): boolean {
  return process.platform === 'win32'
}

/**
 * Check if a package manager is installed on the system.
 */
function isPackageManagerInstalled(pm: PackageManager): boolean {
  // On Windows, npm commands need shell: true to work
  if (isWindows()) {
    const result = spawnSync(pm, ['--version'], {
      encoding: 'utf-8',
      stdio: 'pipe',
      shell: true,
      env: { ...process.env },
    })
    return result.status === 0
  }

  // macOS/Linux - use which command
  const result = spawnSync('which', [pm], {
    encoding: 'utf-8',
    stdio: 'pipe',
  })
  return result.status === 0
}

/**
 * Get list of available package managers with their display labels.
 */
export function getAvailablePackageManagers(): Array<{
  value: PackageManager
  label: string
}> {
  const allOptions = [
    { value: 'npm' as PackageManager, label: 'npm (default)', priority: 3 },
    { value: 'pnpm' as PackageManager, label: 'pnpm (fast, efficient)', priority: 1 },
    { value: 'bun' as PackageManager, label: 'bun (fastest)', priority: 2 },
  ]

  // On Windows, we know npm exists (since they're running this npm package)
  // Just check for pnpm and bun
  if (isWindows()) {
    const available = allOptions
      .filter((option) => {
        if (option.value === 'npm') return true // Always include npm on Windows
        return isPackageManagerInstalled(option.value)
      })
      .sort((a, b) => a.priority - b.priority)
    return available
  }

  // macOS/Linux - check all package managers
  const available = allOptions
    .filter((option) => isPackageManagerInstalled(option.value))
    .sort((a, b) => a.priority - b.priority)

  return available
}

/**
 * Get the default package manager (prefer pnpm > npm > bun).
 */
export function getDefaultPackageManager(): PackageManager {
  const available = getAvailablePackageManagers()

  if (available.length === 0) {
    throw new Error('No package manager found. Please install npm, pnpm, or bun.')
  }

  return available[0].value
}
