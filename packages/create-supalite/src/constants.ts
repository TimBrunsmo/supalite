/**
 * Application-wide constants
 */

/** Default port for Next.js development server */
export const DEFAULT_PORT = 3000

/** Minimum valid port number */
export const MIN_PORT = 1

/** Maximum valid port number */
export const MAX_PORT = 65535

/** Maximum time to wait for project provisioning (5 minutes) */
export const MAX_PROJECT_WAIT_TIME_MS = 300000

/** Interval between project readiness checks (10 seconds) */
export const PROJECT_CHECK_INTERVAL_MS = 10000

/** Base retry delay for migrations (10 seconds) */
export const MIGRATION_RETRY_BASE_DELAY_MS = 10000

/** Maximum number of migration retries */
export const MAX_MIGRATION_RETRIES = 3

/** Minimum database password length */
export const MIN_DB_PASSWORD_LENGTH = 12

/** Generated database password length */
export const GENERATED_PASSWORD_LENGTH = 20

/** Characters used for password generation */
export const PASSWORD_CHARSET =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
