import { createClient } from '@supabase/supabase-js'
import { readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { spawn, spawnSync } from 'child_process'
import { debug, debugError } from './debug.js'
import { MAX_MIGRATION_RETRIES, MIGRATION_RETRY_BASE_DELAY_MS } from '../constants.js'

/**
 * Check if Supabase CLI is installed.
 */
function hasSupabaseCLI(): boolean {
  try {
    // Use --version check for cross-platform compatibility (Windows doesn't have 'which')
    const result = spawnSync('supabase', ['--version'], {
      stdio: 'pipe',
      shell: process.platform === 'win32',
    })
    return result.status === 0
  } catch {
    return false
  }
}

/**
 * Apply migrations using Supabase CLI.
 * Uses `supabase link` + `supabase db push` per official docs:
 * https://supabase.com/docs/reference/cli/supabase-link
 * https://supabase.com/docs/reference/cli/supabase-db-push
 */
async function applyMigrationsViaCLI(
  targetDir: string,
  projectRef: string,
  dbPassword: string,
  retryCount: number = 0
): Promise<void> {
  debug(`[DEBUG] applyMigrationsViaCLI called`)
  debug(`[DEBUG] Target dir: ${targetDir}`)
  debug(`[DEBUG] Project ref: ${projectRef}`)
  debug(`[DEBUG] Retry count: ${retryCount}`)

  // Step 1: Link project non-interactively
  debug(`[DEBUG] Step 1: Linking project...`)
  const linkResult = await new Promise<boolean>((resolve) => {
    const child = spawn(
      'supabase',
      ['link', '--project-ref', projectRef, '--password', dbPassword],
      {
        cwd: targetDir,
        stdio: 'pipe',
        shell: process.platform === 'win32',
        env: { ...process.env },
      }
    )

    let errorOutput = ''
    let stdoutOutput = ''

    child.stderr?.on('data', (data) => {
      errorOutput += data.toString()
    })

    child.stdout?.on('data', (data) => {
      stdoutOutput += data.toString()
    })

    child.on('close', (code) => {
      debug(`[DEBUG] Link exit code: ${code}`)
      debug(`[DEBUG] Link stdout: ${stdoutOutput}`)
      debug(`[DEBUG] Link stderr: ${errorOutput}`)
      resolve(code === 0)
    })
  })

  if (!linkResult) {
    throw new Error('Failed to link project')
  }

  debug(`[DEBUG] Step 2: Pushing migrations...`)
  // Step 2: Push migrations to linked project
  return new Promise((resolve, reject) => {
    const child = spawn('supabase', ['db', 'push'], {
      cwd: targetDir,
      stdio: 'pipe',
      shell: process.platform === 'win32',
      env: { ...process.env },
    })

    let errorOutput = ''
    let stdoutOutput = ''

    child.stderr?.on('data', (data) => {
      errorOutput += data.toString()
    })

    child.stdout?.on('data', (data) => {
      stdoutOutput += data.toString()
    })

    child.on('close', async (code) => {
      debug(`[DEBUG] Migration push exit code: ${code}`)
      debug(`[DEBUG] Migration push stdout: ${stdoutOutput}`)
      debug(`[DEBUG] Migration push stderr: ${errorOutput}`)

      if (code === 0) {
        resolve()
      } else {
        // Check if error is due to brand new project not fully provisioned
        const isProvisioningIssue =
          errorOutput.includes('Tenant or user not found') ||
          errorOutput.includes('no route to host')

        debug(`[DEBUG] Is provisioning issue: ${isProvisioningIssue}`)

        // Retry up to MAX_MIGRATION_RETRIES times with delays for brand new projects
        if (isProvisioningIssue && retryCount < MAX_MIGRATION_RETRIES) {
          const delayMs = (retryCount + 1) * MIGRATION_RETRY_BASE_DELAY_MS
          debug(`[DEBUG] Retrying after ${delayMs}ms...`)
          await new Promise((r) => setTimeout(r, delayMs))
          try {
            await applyMigrationsViaCLI(
              targetDir,
              projectRef,
              dbPassword,
              retryCount + 1
            )
            resolve()
          } catch (error) {
            reject(error)
          }
        } else {
          reject(new Error(`Migration push failed: ${errorOutput}`))
        }
      }
    })
  })
}

/**
 * Apply migrations by executing SQL using service role key via PostgREST.
 * Creates a temporary function to execute raw SQL.
 */
async function applyMigrationsViaAPI(
  supabaseUrl: string,
  serviceKey: string,
  migrationSQL: string
): Promise<void> {
  const supabase = createClient(supabaseUrl, serviceKey)

  // Execute SQL statements one by one using service role
  // Split on semicolons but preserve function definitions
  const statements = migrationSQL
    .split(/;(?![^$]*\$\$)/g) // Split on ; but not inside $$ blocks
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'))

  for (const statement of statements) {
    if (!statement) continue

    // Use Supabase's query API with service role
    const { error } = await supabase.from('_').select('*').limit(0)

    // Since PostgREST doesn't support raw SQL execution,
    // we need to create the tables using the schema directly
    // This is a limitation - fall through to manual for now
    throw new Error('Direct SQL execution not supported via API')
  }
}

/**
 * Apply database migrations.
 */
export async function applyMigrations(
  targetDir: string,
  supabaseUrl: string,
  serviceKey: string,
  dbPassword?: string
): Promise<{ method: 'cli' | 'api' | 'manual' }> {
  debug(`[DEBUG] applyMigrations called`)
  debug(`[DEBUG] Target dir: ${targetDir}`)
  debug(`[DEBUG] Supabase URL: ${supabaseUrl}`)
  debug(`[DEBUG] Has password: ${!!dbPassword}`)

  const migrationPath = join(
    targetDir,
    'supabase/migrations/20250101000000_initial_schema.sql'
  )
  debug(`[DEBUG] Migration path: ${migrationPath}`)

  const migrationSQL = await readFile(migrationPath, 'utf-8')
  debug(`[DEBUG] Migration SQL loaded (${migrationSQL.length} chars)`)

  const projectRef = new URL(supabaseUrl).hostname.split('.')[0]!
  debug(`[DEBUG] Project ref extracted: ${projectRef}`)

  const hasCLI = hasSupabaseCLI()
  debug(`[DEBUG] Has Supabase CLI: ${hasCLI}`)

  // Try Supabase CLI first if available and we have the password
  if (hasCLI && dbPassword) {
    debug(`[DEBUG] Attempting CLI migration...`)
    try {
      await applyMigrationsViaCLI(targetDir, projectRef, dbPassword)
      debug(`[DEBUG] CLI migration succeeded!`)
      return { method: 'cli' }
    } catch (error) {
      // CLI failed, fall through to manual
      debugError(`[DEBUG] CLI migration failed: ${error}`)
    }
  } else {
    debug(`[DEBUG] Skipping CLI migration (hasCLI: ${hasCLI}, hasPassword: ${!!dbPassword})`)
  }

  // API method doesn't work reliably for raw SQL execution
  // Return manual for now
  debug(`[DEBUG] Falling back to manual migration`)
  return { method: 'manual' }
}

/**
 * Generate types using Supabase CLI or return false if not available.
 */
export async function generateTypes(
  targetDir: string,
  projectRef: string
): Promise<boolean> {
  if (!hasSupabaseCLI()) {
    return false
  }

  return new Promise((resolve) => {
    const child = spawn(
      'supabase',
      ['gen', 'types', 'typescript', '--project-id', projectRef],
      {
        cwd: targetDir,
        stdio: 'pipe',
        shell: process.platform === 'win32',
        env: { ...process.env },
      }
    )

    let output = ''
    child.stdout?.on('data', (data) => {
      output += data.toString()
    })

    child.on('close', async (code) => {
      if (code === 0 && output) {
        // Write output to file using fs/promises (already imported)
        try {
          await writeFile(join(targetDir, 'lib/types/database.ts'), output, 'utf-8')
          resolve(true)
        } catch {
          resolve(false)
        }
      } else {
        resolve(false)
      }
    })
  })
}
