import * as p from '@clack/prompts'
import { ProjectConfig } from './types.js'
import { copyTemplate, writeEnvFile, setPackageManager } from './utils/copy-template.js'
import { installDependencies } from './utils/install-deps.js'
import { applyMigrations, generateTypes } from './utils/supabase-setup.js'
import { existsSync } from 'fs'
import pc from 'picocolors'
import { debug, debugError } from './utils/debug.js'

/**
 * Create a new supalite project.
 */
export async function createProject(config: ProjectConfig): Promise<void> {
  debug('[DEBUG] createProject called')
  debug(`[DEBUG] Config: ${JSON.stringify({ ...config, supabaseServiceKey: '[REDACTED]', dbPassword: '[REDACTED]' }, null, 2)}`)

  // Check if directory already exists
  if (existsSync(config.targetDir)) {
    const overwrite = await p.confirm({
      message: `Directory ${config.projectName} already exists. Overwrite?`,
    })

    if (p.isCancel(overwrite) || !overwrite) {
      p.cancel('Operation cancelled')
      process.exit(0)
    }
  }

  const spinner = p.spinner()

  try {
    // Step 1: Copy template
    debug('[DEBUG] Step 1: Copying template')
    spinner.start('Creating project directory')
    await copyTemplate(config.targetDir)
    spinner.stop('Project directory created')
    debug('[DEBUG] Template copied successfully')

    // Step 2: Set package manager and port
    debug('[DEBUG] Step 2: Setting package manager and port')
    await setPackageManager(config.targetDir, config.packageManager, config.port)
    debug('[DEBUG] Package manager and port set successfully')

    // Step 3: Write env file
    debug('[DEBUG] Step 3: Writing environment file')
    spinner.start('Writing environment variables')
    await writeEnvFile(
      config.targetDir,
      config.supabaseUrl,
      config.supabaseAnonKey
    )
    spinner.stop('Environment variables written')
    debug('[DEBUG] Environment file written')

    // Step 4: Apply migrations
    debug('[DEBUG] Step 4: Applying migrations')
    spinner.start('Applying database migrations')
    const migrationResult = await applyMigrations(
      config.targetDir,
      config.supabaseUrl,
      config.supabaseServiceKey,
      config.dbPassword
    )

    debug(`[DEBUG] Migration result: ${migrationResult.method}`)

    if (migrationResult.method === 'manual') {
      spinner.stop('Database migrations require manual setup')
      p.note(
        `Please run the SQL in ${pc.cyan('supabase/migrations/20250101000000_initial_schema.sql')} in your Supabase dashboard`,
        'Manual Migration Required'
      )
    } else {
      spinner.stop(
        `Database migrations applied (${migrationResult.method === 'cli' ? 'CLI' : 'API'})`
      )
    }

    // Step 5: Generate types
    debug('[DEBUG] Step 5: Generating types')
    spinner.start('Generating types')

    let projectRef: string
    try {
      projectRef = new URL(config.supabaseUrl).hostname.split('.')[0]!
      if (!projectRef) {
        throw new Error('Invalid project reference')
      }
    } catch (error) {
      spinner.stop('Types generation skipped (invalid Supabase URL)')
      debug(`[DEBUG] Failed to parse project ref from URL: ${config.supabaseUrl}`)
      projectRef = ''
    }

    const typesGenerated = projectRef ? await generateTypes(config.targetDir, projectRef) : false

    debug(`[DEBUG] Types generated: ${typesGenerated}`)

    if (!typesGenerated) {
      spinner.stop('Types generation skipped (template includes placeholder)')
      const typeCommand = config.packageManager === 'npm'
        ? 'npm run db:types'
        : `${config.packageManager} db:types`
      p.note(
        `Run ${pc.cyan(typeCommand)} after installing dependencies to generate types`,
        'Type Generation'
      )
    } else {
      spinner.stop('Types generated')
    }

    // Step 6: Install dependencies
    debug('[DEBUG] Step 6: Installing dependencies')
    debug(`[DEBUG] Using package manager: ${config.packageManager}`)
    spinner.start('Installing dependencies')
    await installDependencies(config.targetDir, config.packageManager)
    spinner.stop('Dependencies installed')
    debug('[DEBUG] Dependencies installed')

    p.note(
      `Service role key was used for setup only and was not saved`,
      'Security Note'
    )
  } catch (error) {
    spinner.stop('Setup failed')
    debugError(`[DEBUG] Setup error: ${error}`)
    debugError(`[DEBUG] Error stack: ${error instanceof Error ? error.stack : 'No stack trace'}`)
    throw error
  }
}
