import pc from 'picocolors'

/**
 * Check if debug mode is enabled via environment variables.
 * Enable with: DEBUG=1 or SUPALITE_DEBUG=1
 */
const isDebugEnabled = process.env.DEBUG === '1' || process.env.SUPALITE_DEBUG === '1'

/**
 * Log a debug message (only when debug mode is enabled)
 */
export function debug(message: string): void {
  if (isDebugEnabled) {
    console.log(pc.dim(message))
  }
}

/**
 * Log an error debug message (only when debug mode is enabled)
 */
export function debugError(message: string): void {
  if (isDebugEnabled) {
    console.log(pc.red(message))
  }
}

/**
 * Check if debug mode is enabled
 */
export function isDebug(): boolean {
  return isDebugEnabled
}
