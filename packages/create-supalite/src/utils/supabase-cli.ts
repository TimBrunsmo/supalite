import { spawnSync, spawn } from 'child_process'
import * as p from '@clack/prompts'
import pc from 'picocolors'
import { debug, debugError } from './debug.js'
import {
  MAX_PROJECT_WAIT_TIME_MS,
  PROJECT_CHECK_INTERVAL_MS,
  GENERATED_PASSWORD_LENGTH,
  PASSWORD_CHARSET,
} from '../constants.js'

export interface SupabaseOrganization {
  id: string
  name: string
}

export interface SupabaseProject {
  id: string
  name: string
  organization_id: string
  region: string
  created_at: string
}

export interface ProjectCredentials {
  url: string
  anonKey: string
  serviceKey: string
}

/** Internal interface for CLI JSON org response */
interface CLIOrganization {
  id: string
  name: string
}

/** Internal interface for CLI JSON project response */
interface CLIProject {
  id: string
  name: string
  organization_id: string
  region: string
  created_at: string
}

/** Internal interface for CLI JSON API key response */
interface CLIAPIKey {
  name: string
  api_key: string
}

/**
 * Check if Supabase CLI is installed
 */
export function hasSupabaseCLI(): boolean {
  // Use --version check for cross-platform compatibility (Windows doesn't have 'which')
  const result = spawnSync('supabase', ['--version'], {
    encoding: 'utf-8',
    stdio: 'pipe',
    shell: process.platform === 'win32',
  })
  return result.status === 0
}

/**
 * Check if user is authenticated with Supabase CLI
 */
export function isAuthenticated(): boolean {
  debug(`[DEBUG] Checking authentication...`)
  debug(`[DEBUG] SUPABASE_ACCESS_TOKEN present: ${!!process.env.SUPABASE_ACCESS_TOKEN}`)

  const result = spawnSync('supabase', ['projects', 'list'], {
    encoding: 'utf-8',
    stdio: 'pipe',
    shell: process.platform === 'win32',
    env: { ...process.env },
  })

  debug(`[DEBUG] isAuthenticated exit code: ${result.status}`)
  debug(`[DEBUG] isAuthenticated stderr: ${result.stderr}`)
  debug(`[DEBUG] isAuthenticated stdout: ${result.stdout?.substring(0, 200)}`)

  return result.status === 0
}

/**
 * Detect the operating system
 */
export function detectOS(): 'macos' | 'linux' | 'windows' | 'unknown' {
  if (process.platform === 'darwin') return 'macos'
  if (process.platform === 'linux') return 'linux'
  if (process.platform === 'win32') return 'windows'
  return 'unknown'
}

/**
 * Install Supabase CLI based on the operating system
 */
export async function installCLI(): Promise<boolean> {
  const os = detectOS()

  p.log.info('Installing Supabase CLI...')

  return new Promise((resolve) => {
    let command: string
    let args: string[]

    switch (os) {
      case 'macos':
        // Check if Homebrew is installed
        const hasHomebrew = spawnSync('which', ['brew']).status === 0
        if (!hasHomebrew) {
          p.log.error('Homebrew is not installed. Please install Homebrew first:')
          p.log.info(
            '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
          )
          resolve(false)
          return
        }
        command = 'brew'
        args = ['install', 'supabase/tap/supabase']
        break

      case 'linux':
        // Try to install via direct download
        // Try sudo first, if it fails, install to user directory
        command = 'sh'
        args = [
          '-c',
          'curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar -xz && (sudo mv supabase /usr/local/bin/ 2>/dev/null || (mkdir -p ~/.local/bin && mv supabase ~/.local/bin/ && export PATH="$HOME/.local/bin:$PATH"))'
        ]
        break

      case 'windows':
        // Use the robust Windows installation (winget or direct download)
        installViaWindows().then(resolve)
        return

      default:
        p.log.error('Unsupported operating system')
        resolve(false)
        return
    }

    const child = spawn(command, args, { stdio: 'inherit' })

    child.on('close', (code) => {
      if (code === 0) {
        resolve(true)
      } else {
        // Installation failed - show helpful manual instructions
        if (os === 'linux') {
          p.log.error('')
          p.log.error('Automatic installation failed. You can install manually:')
          p.log.info('')
          p.log.info('  curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar -xz')
          p.log.info('  sudo mv supabase /usr/local/bin/')
          p.log.info('')
          p.log.info('Or continue with manual setup below.')
          p.log.info('')
        }
        resolve(false)
      }
    })

    child.on('error', () => {
      resolve(false)
    })
  })
}

/**
 * Login to Supabase CLI (opens browser)
 */
export async function login(): Promise<boolean> {
  p.log.info('Opening browser for authentication...')

  return new Promise((resolve) => {
    const child = spawn('supabase', ['login'], {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: { ...process.env },
    })

    child.on('close', (code) => {
      resolve(code === 0)
    })

    child.on('error', () => {
      resolve(false)
    })
  })
}

/**
 * Get list of organizations
 */
export async function getOrganizations(): Promise<SupabaseOrganization[]> {
  const result = spawnSync('supabase', ['orgs', 'list', '--output', 'json'], {
    encoding: 'utf-8',
    stdio: 'pipe',
    shell: process.platform === 'win32',
    env: { ...process.env },
  })

  if (result.status !== 0) {
    throw new Error(`Failed to get organizations: ${result.stderr}`)
  }

  const output = result.stdout.trim()

  // Try parsing as JSON first (newer CLI versions)
  try {
    const orgs: CLIOrganization[] = JSON.parse(output)
    if (Array.isArray(orgs)) {
      return orgs.map((org) => ({
        id: org.id,
        name: org.name,
      }))
    }
  } catch {
    // Not JSON, try table format
  }

  // Parse table format (older CLI versions like v2.39.2)
  // Format: "  ID                   | NAME"
  //         "  ----------------------|----------------"
  //         "   azoyksukebdkeaelzlfm | Growth Stories"
  const lines = output.split('\n')
  const orgs: SupabaseOrganization[] = []

  for (const line of lines) {
    // Skip headers, separators, and empty lines
    if (
      line.includes('|') &&
      !line.includes('---') &&
      !line.toUpperCase().includes('ID') &&
      !line.toUpperCase().includes('NAME')
    ) {
      const parts = line.split('|').map((p) => p.trim())
      if (parts.length >= 2 && parts[0] && parts[1]) {
        orgs.push({ id: parts[0], name: parts[1] })
      }
    }
  }

  if (orgs.length === 0) {
    throw new Error('Failed to parse organizations list')
  }

  return orgs
}

/**
 * Get list of projects
 */
export async function listProjects(): Promise<SupabaseProject[]> {
  const result = spawnSync('supabase', ['projects', 'list', '--output', 'json'], {
    encoding: 'utf-8',
    stdio: 'pipe',
    shell: process.platform === 'win32',
    env: { ...process.env },
  })

  if (result.status !== 0) {
    throw new Error(`Failed to list projects: ${result.stderr}`)
  }

  try {
    const projects: CLIProject[] = JSON.parse(result.stdout)
    return projects.map((project) => ({
      id: project.id,
      name: project.name,
      organization_id: project.organization_id,
      region: project.region,
      created_at: project.created_at,
    }))
  } catch (error) {
    throw new Error('Failed to parse projects list')
  }
}

/**
 * Create a new Supabase project
 */
export async function createProject(
  name: string,
  orgId: string,
  region: string = 'us-east-1',
  dbPassword?: string
): Promise<SupabaseProject> {
  debug(`[DEBUG] Creating project: ${name}`)
  debug(`[DEBUG] Organization ID: ${orgId}`)
  debug(`[DEBUG] Region: ${region}`)

  // Generate a random password if not provided
  const password =
    dbPassword ||
    Array.from({ length: GENERATED_PASSWORD_LENGTH }, () =>
      PASSWORD_CHARSET[Math.floor(Math.random() * PASSWORD_CHARSET.length)]
    ).join('')

  const args = [
    'projects',
    'create',
    name,
    '--org-id',
    orgId,
    '--db-password',
    password,
    '--region',
    region,
    '--output',
    'json',
  ]

  debug(`[DEBUG] Running: supabase ${args.filter(a => a !== password).join(' ')}`)

  const result = spawnSync('supabase', args, {
    encoding: 'utf-8',
    stdio: 'pipe',
    shell: process.platform === 'win32',
    env: { ...process.env },
  })

  debug(`[DEBUG] Create project exit code: ${result.status}`)
  debug(`[DEBUG] Create project stdout: ${result.stdout}`)
  debug(`[DEBUG] Create project stderr: ${result.stderr}`)

  if (result.status !== 0) {
    const errorMsg = result.stderr || result.stdout || 'Unknown error'
    debugError(`[DEBUG] Project creation failed: ${errorMsg}`)
    throw new Error(`Failed to create project: ${errorMsg}`)
  }

  try {
    const project = JSON.parse(result.stdout)
    debug(`[DEBUG] Created project ID: ${project.id}`)
    return {
      id: project.id,
      name: project.name,
      organization_id: project.organization_id,
      region: project.region,
      created_at: project.created_at,
    }
  } catch (error) {
    debugError(`[DEBUG] Failed to parse project response: ${error}`)
    throw new Error(`Failed to parse project creation response: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get project credentials (URL and API keys)
 */
export async function getProjectCredentials(
  projectRef: string
): Promise<ProjectCredentials> {
  debug(`[DEBUG] Fetching credentials for project ref: ${projectRef}`)

  // Get project API settings
  const result = spawnSync(
    'supabase',
    ['projects', 'api-keys', '--project-ref', projectRef, '--output', 'json'],
    {
      encoding: 'utf-8',
      stdio: 'pipe',
      shell: process.platform === 'win32',
      env: { ...process.env },
    }
  )

  debug(`[DEBUG] CLI exit code: ${result.status}`)
  debug(`[DEBUG] CLI stdout: ${result.stdout}`)
  debug(`[DEBUG] CLI stderr: ${result.stderr}`)

  if (result.status !== 0) {
    throw new Error(`Failed to get project credentials: ${result.stderr || result.stdout}`)
  }

  try {
    const apiKeys: CLIAPIKey[] = JSON.parse(result.stdout)
    debug(`[DEBUG] Parsed API keys: ${JSON.stringify(apiKeys, null, 2)}`)

    // Find anon and service_role keys
    const anonKey = apiKeys.find((key) => key.name === 'anon')?.api_key
    const serviceKey = apiKeys.find((key) => key.name === 'service_role')?.api_key

    debug(`[DEBUG] Found anon key: ${anonKey ? 'yes' : 'no'}`)
    debug(`[DEBUG] Found service_role key: ${serviceKey ? 'yes' : 'no'}`)

    if (!anonKey || !serviceKey) {
      throw new Error('Could not find required API keys')
    }

    // Construct the project URL
    const url = `https://${projectRef}.supabase.co`
    debug(`[DEBUG] Constructed URL: ${url}`)

    return {
      url,
      anonKey,
      serviceKey,
    }
  } catch (error) {
    debugError(`[DEBUG] Error parsing credentials: ${error}`)
    if (error instanceof Error && error.message.includes('required API keys')) {
      throw error
    }
    throw new Error(`Failed to parse project credentials: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Wait for project to be ready (newly created projects need time to provision)
 */
export async function waitForProjectReady(
  projectRef: string,
  maxWaitTime: number = MAX_PROJECT_WAIT_TIME_MS
): Promise<boolean> {
  debug(`[DEBUG] Waiting for project to be ready: ${projectRef}`)
  debug(`[DEBUG] Max wait time: ${maxWaitTime}ms`)

  const startTime = Date.now()
  const spinner = p.spinner()

  spinner.start('Waiting for project to be ready (this may take a few minutes)...')

  return new Promise((resolve) => {
    let checkCount = 0
    const checkInterval = setInterval(() => {
      checkCount++
      const elapsed = Math.round((Date.now() - startTime) / 1000)
      debug(`[DEBUG] Check #${checkCount} (${elapsed}s elapsed)`)

      const result = spawnSync(
        'supabase',
        ['projects', 'api-keys', '--project-ref', projectRef],
        {
          encoding: 'utf-8',
          stdio: 'pipe',
          shell: process.platform === 'win32',
          env: { ...process.env },
        }
      )

      debug(`[DEBUG] Check exit code: ${result.status}`)
      if (result.status !== 0) {
        debug(`[DEBUG] Check stderr: ${result.stderr}`)
      }

      if (result.status === 0) {
        clearInterval(checkInterval)
        spinner.stop('Project is ready!')
        debug(`[DEBUG] Project ready after ${elapsed}s`)
        resolve(true)
        return
      }

      if (Date.now() - startTime > maxWaitTime) {
        clearInterval(checkInterval)
        spinner.stop('Project provisioning timed out')
        debugError(`[DEBUG] Timeout after ${elapsed}s`)
        resolve(false)
      }
    }, PROJECT_CHECK_INTERVAL_MS)
  })
}

/**
 * Get available regions for project creation
 */
export function getAvailableRegions(): Array<{ value: string; label: string }> {
  return [
    { value: 'us-east-1', label: 'US East (North Virginia)' },
    { value: 'us-west-1', label: 'US West (North California)' },
    { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
    { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
    { value: 'eu-west-1', label: 'Europe (Ireland)' },
    { value: 'eu-central-1', label: 'Europe (Frankfurt)' },
  ]
}

/**
 * Install Supabase CLI via Homebrew (macOS)
 */
async function installViaBrew(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn('brew', ['install', 'supabase/tap/supabase'], {
      stdio: 'inherit',
    })

    child.on('close', (code) => {
      resolve(code === 0)
    })

    child.on('error', () => {
      resolve(false)
    })
  })
}

/**
 * Install Supabase CLI via direct download (Linux)
 */
async function installViaDirectDownload(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(
      'sh',
      [
        '-c',
        'curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar -xz && (sudo mv supabase /usr/local/bin/ 2>/dev/null || (mkdir -p ~/.local/bin && mv supabase ~/.local/bin/))',
      ],
      {
        stdio: 'inherit',
      }
    )

    child.on('close', (code) => {
      resolve(code === 0)
    })

    child.on('error', () => {
      resolve(false)
    })
  })
}

/**
 * Install Supabase CLI on Windows (direct download)
 */
async function installViaWindows(): Promise<boolean> {
  return new Promise((resolve) => {
    debug('[DEBUG] Installing Supabase CLI for Windows via direct download...')

    // Direct download approach - more reliable than winget
    const script = [
      '$ProgressPreference = "SilentlyContinue";',
      '$url = "https://github.com/supabase/cli/releases/latest/download/supabase_windows_amd64.tar.gz";',
      '$tempDir = "$env:TEMP\\supabase-install";',
      '$tarFile = "$tempDir\\supabase.tar.gz";',
      '$installDir = "$env:USERPROFILE\\.local\\bin";',
      'Write-Host "Downloading Supabase CLI...";',
      'New-Item -ItemType Directory -Force -Path $tempDir | Out-Null;',
      'New-Item -ItemType Directory -Force -Path $installDir | Out-Null;',
      'try {',
      '  Invoke-WebRequest -Uri $url -OutFile $tarFile -UseBasicParsing;',
      '  Write-Host "Extracting...";',
      '  tar -xzf $tarFile -C $tempDir;',
      '  Copy-Item "$tempDir\\supabase.exe" -Destination "$installDir\\supabase.exe" -Force;',
      '  Write-Host "Installation complete";',
      '  exit 0;',
      '} catch {',
      '  Write-Host "Installation failed: $_";',
      '  exit 1;',
      '}'
    ].join(' ')

    const downloadAndInstall = spawn('powershell', ['-Command', script], {
      stdio: 'inherit',
    })

    downloadAndInstall.on('close', (code) => {
      if (code === 0) {
        debug('[DEBUG] Windows installation succeeded')
        // Add to PATH for current process
        if (process.env.PATH && !process.env.PATH.includes('.local\\bin')) {
          process.env.PATH = `${process.env.USERPROFILE}\\.local\\bin;${process.env.PATH}`
          debug('[DEBUG] Updated PATH to include .local\\bin')
        }
        resolve(true)
      } else {
        debugError('[DEBUG] Windows installation failed')
        resolve(false)
      }
    })

    downloadAndInstall.on('error', (err) => {
      debugError(`[DEBUG] Windows installation error: ${err}`)
      resolve(false)
    })
  })
}

/**
 * Install Supabase CLI with manual fallback (OS-aware)
 * This is used when automatic installation fails and user selects "Help me install it"
 */
export async function installCLIManual(): Promise<boolean> {
  const os = detectOS()

  switch (os) {
    case 'macos':
      return installViaBrew()

    case 'linux':
      return installViaDirectDownload()

    case 'windows':
      return installViaWindows()

    default:
      return false
  }
}
