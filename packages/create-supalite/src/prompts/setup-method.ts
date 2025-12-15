import * as p from '@clack/prompts'
import pc from 'picocolors'
import { collectProjectInfo } from './collect-info.js'
import { ProjectConfig } from '../types.js'
import {
  hasSupabaseCLI,
  isAuthenticated,
  installCLI,
  installCLIManual,
  login,
  getOrganizations,
  listProjects,
  createProject,
  getProjectCredentials,
  waitForProjectReady,
  getAvailableRegions,
  detectOS,
} from '../utils/supabase-cli.js'
import path from 'path'
import { debug, debugError } from '../utils/debug.js'
import {
  getAvailablePackageManagers,
  getDefaultPackageManager,
} from '../utils/detect-package-managers.js'
import { DEFAULT_PORT, MIN_PORT, MAX_PORT, MIN_DB_PASSWORD_LENGTH } from '../constants.js'
import { existsSync } from 'fs'

export interface SetupResult {
  config: ProjectConfig | null
  method: 'cli-auto' | 'manual' | 'cancelled'
}

/**
 * Comprehensive setup flow with Supabase CLI integration
 */
export async function setupWithSupabaseCLI(
  projectName?: string
): Promise<SetupResult> {
  p.intro(pc.bgCyan(pc.black(' supalite ')))

  // Check if directory already exists before starting setup
  if (projectName) {
    const targetDir = path.resolve(process.cwd(), projectName)
    if (existsSync(targetDir)) {
      const overwrite = await p.confirm({
        message: `Directory "${projectName}" already exists. Overwrite?`,
        initialValue: false,
      })

      if (p.isCancel(overwrite) || !overwrite) {
        p.cancel('Operation cancelled')
        return { config: null, method: 'cancelled' }
      }
    }
  }

  // Step 1: Check if Supabase CLI is installed
  const hasCLI = hasSupabaseCLI()

  if (!hasCLI) {
    const installChoice = await p.select({
      message: 'Supabase CLI not installed. Setup:',
      options: [
        {
          value: 'install',
          label: 'Install automatically (recommended)',
        },
        {
          value: 'manual',
          label: 'Manual credentials',
        },
        {
          value: 'cancel',
          label: 'Cancel',
        },
      ],
    })

    if (p.isCancel(installChoice)) {
      p.cancel('Operation cancelled')
      return { config: null, method: 'cancelled' }
    }

    if (installChoice === 'cancel') {
      p.cancel('Setup cancelled')
      return { config: null, method: 'cancelled' }
    }

    if (installChoice === 'manual') {
      const config = await collectProjectInfo(projectName)
      return { config, method: 'manual' }
    }

    // Install CLI
    const spinner = p.spinner()
    spinner.start(`Installing Supabase CLI for ${detectOS()}...`)

    const installed = await installCLI()
    spinner.stop()

    // Update PATH for current process if CLI was installed to ~/.local/bin
    if (installed && process.env.HOME && process.env.PATH && !process.env.PATH.includes('.local/bin')) {
      process.env.PATH = `${process.env.HOME}/.local/bin:${process.env.PATH}`
      debug('[DEBUG] Updated PATH to include ~/.local/bin')
    }

    if (!installed) {
      p.log.error('Failed to install Supabase CLI')

      const fallbackChoice = await p.select({
        message: 'Installation failed. What would you like to do?',
        options: [
          {
            value: 'install',
            label: 'Help me install it',
          },
          {
            value: 'manual',
            label: 'Continue with manual setup',
          },
          {
            value: 'cancel',
            label: 'Cancel setup',
          },
        ],
      })

      if (p.isCancel(fallbackChoice) || fallbackChoice === 'cancel') {
        p.cancel('Setup cancelled')
        return { config: null, method: 'cancelled' }
      }

      if (fallbackChoice === 'install') {
        // Try to install it for them (OS-aware)
        const installSpinner = p.spinner()
        installSpinner.start('Installing Supabase CLI...')

        const installResult = await installCLIManual()
        installSpinner.stop()

        // Update PATH for current process if installed to ~/.local/bin (Linux only)
        const os = detectOS()
        if (os === 'linux' && process.env.PATH && !process.env.PATH.includes('.local/bin')) {
          process.env.PATH = `${process.env.HOME}/.local/bin:${process.env.PATH}`
          debug('[DEBUG] Updated PATH to include ~/.local/bin')
        }

        if (installResult && hasSupabaseCLI()) {
          p.log.success('Supabase CLI installed successfully!')
          // Continue with the normal flow (check authentication next)
        } else {
          p.log.error('Installation failed')
          p.log.info('You may need to install it manually or continue with manual setup')
          // Ask again
          return await setupWithSupabaseCLI(projectName)
        }
      } else {
        const config = await collectProjectInfo(projectName)
        return { config, method: 'manual' }
      }
    }

    p.log.success('Supabase CLI installed successfully!')
  }

  // Step 2: Check authentication
  if (!isAuthenticated()) {
    const authChoice = await p.select({
      message: 'Supabase authentication required:',
      options: [
        {
          value: 'login',
          label: 'Login (opens browser)',
        },
        {
          value: 'manual',
          label: 'Manual credentials',
        },
        {
          value: 'cancel',
          label: 'Cancel',
        },
      ],
    })

    if (p.isCancel(authChoice)) {
      p.cancel('Operation cancelled')
      return { config: null, method: 'cancelled' }
    }

    if (authChoice === 'cancel') {
      p.cancel('Setup cancelled')
      return { config: null, method: 'cancelled' }
    }

    if (authChoice === 'manual') {
      const config = await collectProjectInfo(projectName)
      return { config, method: 'manual' }
    }

    // Login
    const loginSuccess = await login()

    if (!loginSuccess) {
      p.log.error('Login failed')

      const retryChoice = await p.select({
        message: 'What would you like to do?',
        options: [
          {
            value: 'retry',
            label: 'Try logging in again',
          },
          {
            value: 'manual',
            label: 'Continue with manual setup',
          },
          {
            value: 'cancel',
            label: 'Cancel setup',
          },
        ],
      })

      if (p.isCancel(retryChoice) || retryChoice === 'cancel') {
        p.cancel('Setup cancelled')
        return { config: null, method: 'cancelled' }
      }

      if (retryChoice === 'retry') {
        const retryLogin = await login()
        if (!retryLogin) {
          p.log.error('Login failed again')
          const config = await collectProjectInfo(projectName)
          return { config, method: 'manual' }
        }
      } else {
        const config = await collectProjectInfo(projectName)
        return { config, method: 'manual' }
      }
    }

    p.log.success('Successfully authenticated!')
  }

  // Step 3: Project setup choice
  const setupChoice = await p.select({
    message: 'Supabase setup:',
    options: [
      {
        value: 'create',
        label: 'Create new project',
      },
      {
        value: 'existing',
        label: 'Use existing project',
      },
      {
        value: 'manual',
        label: 'Manual credentials',
      },
    ],
  })

  if (p.isCancel(setupChoice)) {
    p.cancel('Operation cancelled')
    return { config: null, method: 'cancelled' }
  }

  if (setupChoice === 'manual') {
    const config = await collectProjectInfo(projectName)
    return { config, method: 'manual' }
  }

  // Step 4: Handle project creation or selection
  try {
    if (setupChoice === 'create') {
      return await handleProjectCreation(projectName)
    } else {
      return await handleExistingProject(projectName)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Check if it's a project limit error
    const isProjectLimitError = errorMessage.includes('maximum limits') ||
                                errorMessage.includes('project limit') ||
                                errorMessage.includes('free projects')

    if (isProjectLimitError) {
      p.log.error('Project limit reached')
      p.note(
        `No worries! You've reached your free project limit.\n\nTo continue:\n1. Open ${pc.cyan('https://supabase.com/dashboard')}\n2. Delete, pause, or upgrade a project\n3. Come back here and press Enter to retry`,
        'Action Required'
      )

      const retry = await p.confirm({
        message: 'Ready to retry? (I\'ve fixed it)',
        initialValue: true,
      })

      if (p.isCancel(retry) || !retry) {
        p.cancel('Setup cancelled')
        return { config: null, method: 'cancelled' }
      }

      // Retry the setup
      return await setupWithSupabaseCLI(projectName)
    }

    // For other errors, show generic fallback
    p.log.error(`Error: ${errorMessage}`)

    const fallbackChoice = await p.select({
      message: 'What would you like to do?',
      options: [
        {
          value: 'manual',
          label: 'Manual setup',
        },
        {
          value: 'cancel',
          label: 'Cancel',
        },
      ],
    })

    if (p.isCancel(fallbackChoice) || fallbackChoice === 'cancel') {
      p.cancel('Setup cancelled')
      return { config: null, method: 'cancelled' }
    }

    const config = await collectProjectInfo(projectName)
    return { config, method: 'manual' }
  }
}

/**
 * Handle creation of a new Supabase project
 */
async function handleProjectCreation(
  initialProjectName?: string
): Promise<SetupResult> {
  // Get project name
  const projectNameInput = await p.text({
    message: 'Project name:',
    initialValue: initialProjectName || 'my-app',
    validate: (value) => {
      if (!value) return 'Project name is required'
      if (!/^[a-z0-9-]+$/.test(value))
        return 'Project name must be lowercase alphanumeric with hyphens'
    },
  })

  if (p.isCancel(projectNameInput)) {
    p.cancel('Operation cancelled')
    return { config: null, method: 'cancelled' }
  }

  // Get organizations
  const spinner = p.spinner()
  spinner.start('Loading organizations...')

  let orgs
  try {
    orgs = await getOrganizations()
    spinner.stop()
  } catch (error) {
    spinner.stop()
    throw new Error('Failed to fetch organizations')
  }

  if (orgs.length === 0) {
    p.log.error('No organizations found. Please create one at https://supabase.com')
    const config = await collectProjectInfo(projectNameInput as string)
    return { config, method: 'manual' }
  }

  // Select organization
  let selectedOrgId: string

  if (orgs.length === 1) {
    selectedOrgId = orgs[0].id
    p.log.info(`Using organization: ${pc.cyan(orgs[0].name)}`)
  } else {
    const orgChoice = await p.select({
      message: 'Select an organization:',
      options: orgs.map((org) => ({
        value: org.id,
        label: org.name,
      })),
    })

    if (p.isCancel(orgChoice)) {
      p.cancel('Operation cancelled')
      return { config: null, method: 'cancelled' }
    }

    selectedOrgId = orgChoice as string
  }

  // Select region
  const regionChoice = await p.select({
    message: 'Region:',
    options: getAvailableRegions(),
    initialValue: 'us-east-1',
  })

  if (p.isCancel(regionChoice)) {
    p.cancel('Operation cancelled')
    return { config: null, method: 'cancelled' }
  }

  // Create database password
  const dbPassword = await p.password({
    message: `Database password (min ${MIN_DB_PASSWORD_LENGTH} chars):`,
    validate: (value) => {
      if (!value) return 'Password is required'
      if (value.length < MIN_DB_PASSWORD_LENGTH) return `Password must be at least ${MIN_DB_PASSWORD_LENGTH} characters`
    },
  })

  if (p.isCancel(dbPassword)) {
    p.cancel('Operation cancelled')
    return { config: null, method: 'cancelled' }
  }

  // Check for duplicate project name
  spinner.start('Checking for duplicate project names...')
  const existingProjects = await listProjects()
  const duplicateProject = existingProjects.find(
    (p) => p.name.toLowerCase() === (projectNameInput as string).toLowerCase()
  )

  if (duplicateProject) {
    spinner.stop()
    p.log.error(
      `A project named "${projectNameInput}" already exists in your organization.`
    )
    p.log.info(
      `Please delete it from the Supabase dashboard or choose a different name.`
    )
    return { config: null, method: 'cancelled' }
  }
  spinner.stop()

  // Create the project
  spinner.start('Creating Supabase project...')

  let project
  try {
    project = await createProject(
      projectNameInput as string,
      selectedOrgId,
      regionChoice as string,
      dbPassword as string
    )
    spinner.stop('Project created!')
  } catch (error) {
    spinner.stop()
    throw error // Preserve the original error with details
  }

  // Wait for project to be ready
  debug(`[DEBUG] About to wait for project: ${project.id}`)
  const isReady = await waitForProjectReady(project.id)

  if (!isReady) {
    p.log.warn(
      'Project is still provisioning. You can check status at https://supabase.com/dashboard'
    )
    p.log.info('Please wait a few minutes and run the setup again')
    return { config: null, method: 'cancelled' }
  }

  // Get credentials
  spinner.start('Fetching project credentials...')
  debug(`[DEBUG] About to fetch credentials for project: ${project.id}`)

  let credentials
  try {
    credentials = await getProjectCredentials(project.id)
    spinner.stop('Credentials retrieved!')
    debug(`[DEBUG] Successfully retrieved credentials`)
  } catch (error) {
    spinner.stop()
    debugError(`[DEBUG] Error in getProjectCredentials: ${error}`)
    debugError(`[DEBUG] Error details: ${error instanceof Error ? error.stack : 'No stack trace'}`)
    throw new Error(`Failed to get project credentials: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  // Select package manager
  const availablePackageManagers = getAvailablePackageManagers()

  if (availablePackageManagers.length === 0) {
    p.cancel('No package manager found. Please install npm, pnpm, or bun.')
    return { config: null, method: 'cancelled' }
  }

  const packageManager = await p.select({
    message: 'Package manager:',
    options: availablePackageManagers,
    initialValue: getDefaultPackageManager(),
  })

  if (p.isCancel(packageManager)) {
    p.cancel('Operation cancelled')
    return { config: null, method: 'cancelled' }
  }

  // Select dev server port
  const portInput = await p.text({
    message: 'Dev server port:',
    initialValue: String(DEFAULT_PORT),
    validate: (value) => {
      const port = parseInt(value)
      if (isNaN(port)) return 'Port must be a number'
      if (port < MIN_PORT || port > MAX_PORT) return `Port must be between ${MIN_PORT} and ${MAX_PORT}`
    },
  })

  if (p.isCancel(portInput)) {
    p.cancel('Operation cancelled')
    return { config: null, method: 'cancelled' }
  }

  const targetDir = path.resolve(process.cwd(), projectNameInput as string)

  const config: ProjectConfig = {
    projectName: projectNameInput as string,
    supabaseUrl: credentials.url,
    supabaseAnonKey: credentials.anonKey,
    supabaseServiceKey: credentials.serviceKey,
    targetDir,
    packageManager: packageManager as 'npm' | 'pnpm' | 'bun',
    port: parseInt(portInput as string),
    dbPassword: dbPassword as string,
  }

  return { config, method: 'cli-auto' }
}

/**
 * Handle selection of an existing Supabase project
 */
async function handleExistingProject(
  initialProjectName?: string
): Promise<SetupResult> {
  // Get project name for local folder
  const projectNameInput = await p.text({
    message: 'Local project name:',
    initialValue: initialProjectName || 'my-app',
    validate: (value) => {
      if (!value) return 'Project name is required'
      if (!/^[a-z0-9-]+$/.test(value))
        return 'Project name must be lowercase alphanumeric with hyphens'
    },
  })

  if (p.isCancel(projectNameInput)) {
    p.cancel('Operation cancelled')
    return { config: null, method: 'cancelled' }
  }

  // Get list of projects
  const spinner = p.spinner()
  spinner.start('Loading projects...')

  let projects
  try {
    projects = await listProjects()
    spinner.stop()
  } catch (error) {
    spinner.stop()
    throw new Error('Failed to fetch projects')
  }

  if (projects.length === 0) {
    p.log.warn('No projects found. Create one at https://supabase.com')

    const fallbackChoice = await p.select({
      message: 'What would you like to do?',
      options: [
        {
          value: 'create',
          label: 'Create a new project',
        },
        {
          value: 'manual',
          label: 'Enter credentials manually',
        },
        {
          value: 'cancel',
          label: 'Cancel setup',
        },
      ],
    })

    if (p.isCancel(fallbackChoice) || fallbackChoice === 'cancel') {
      p.cancel('Setup cancelled')
      return { config: null, method: 'cancelled' }
    }

    if (fallbackChoice === 'create') {
      return await handleProjectCreation(projectNameInput as string)
    }

    const config = await collectProjectInfo(projectNameInput as string)
    return { config, method: 'manual' }
  }

  // Select project
  const projectChoice = await p.select({
    message: 'Select a Supabase project:',
    options: projects.map((project) => ({
      value: project.id,
      label: `${project.name} (${project.region})`,
      hint: project.organization_id,
    })),
  })

  if (p.isCancel(projectChoice)) {
    p.cancel('Operation cancelled')
    return { config: null, method: 'cancelled' }
  }

  const selectedProjectId = projectChoice as string
  debug(`[DEBUG] Selected existing project ID: ${selectedProjectId}`)

  // Get credentials
  spinner.start('Loading credentials...')
  debug(`[DEBUG] Fetching credentials for existing project: ${selectedProjectId}`)

  let credentials
  try {
    credentials = await getProjectCredentials(selectedProjectId)
    spinner.stop()
    debug(`[DEBUG] Successfully retrieved credentials for existing project`)
  } catch (error) {
    spinner.stop()
    debugError(`[DEBUG] Error fetching credentials for existing project: ${error}`)
    debugError(`[DEBUG] Error details: ${error instanceof Error ? error.stack : 'No stack trace'}`)
    throw new Error(`Failed to get project credentials: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  // Select package manager
  const availablePackageManagers = getAvailablePackageManagers()

  if (availablePackageManagers.length === 0) {
    p.cancel('No package manager found. Please install npm, pnpm, or bun.')
    return { config: null, method: 'cancelled' }
  }

  const packageManager = await p.select({
    message: 'Package manager:',
    options: availablePackageManagers,
    initialValue: getDefaultPackageManager(),
  })

  if (p.isCancel(packageManager)) {
    p.cancel('Operation cancelled')
    return { config: null, method: 'cancelled' }
  }

  // Select dev server port
  const portInput = await p.text({
    message: 'Dev server port:',
    initialValue: String(DEFAULT_PORT),
    validate: (value) => {
      const port = parseInt(value)
      if (isNaN(port)) return 'Port must be a number'
      if (port < MIN_PORT || port > MAX_PORT) return `Port must be between ${MIN_PORT} and ${MAX_PORT}`
    },
  })

  if (p.isCancel(portInput)) {
    p.cancel('Operation cancelled')
    return { config: null, method: 'cancelled' }
  }

  const targetDir = path.resolve(process.cwd(), projectNameInput as string)

  const config: ProjectConfig = {
    projectName: projectNameInput as string,
    supabaseUrl: credentials.url,
    supabaseAnonKey: credentials.anonKey,
    supabaseServiceKey: credentials.serviceKey,
    targetDir,
    packageManager: packageManager as 'npm' | 'pnpm' | 'bun',
    port: parseInt(portInput as string),
  }

  return { config, method: 'cli-auto' }
}
