import * as p from '@clack/prompts'
import { ProjectConfig } from '../types.js'
import path from 'path'
import {
  getAvailablePackageManagers,
  getDefaultPackageManager,
} from '../utils/detect-package-managers.js'
import { DEFAULT_PORT, MIN_PORT, MAX_PORT } from '../constants.js'

export async function collectProjectInfo(
  initialProjectName?: string
): Promise<ProjectConfig | null> {
  p.intro('supalite')

  p.note(
    'Manual setup requires your Supabase project credentials.\n\n' +
    'If you don\'t have a project yet:\n' +
    '  1. Go to https://supabase.com/dashboard\n' +
    '  2. Click "New project"\n' +
    '  3. Fill in the details and create it\n' +
    '  4. Come back here with your credentials',
    'Setup Guide'
  )

  const projectName = await p.text({
    message: 'Project name (for your local folder):',
    initialValue: initialProjectName || 'my-app',
    validate: (value) => {
      if (!value) return 'Project name is required'
      const trimmed = value.trim()
      if (!/^[a-z0-9-]+$/.test(trimmed))
        return 'Project name must be lowercase alphanumeric with hyphens'
    },
  })

  if (p.isCancel(projectName)) {
    p.cancel('Operation cancelled')
    return null
  }

  // Trim whitespace from project name
  const trimmedProjectName = (projectName as string).trim()

  p.log.info('')
  p.log.info('Next: Find your project URL')
  p.log.info('  1. Go to https://supabase.com/dashboard')
  p.log.info('  2. Select your project')
  p.log.info('  3. Scroll down on the project home page')
  p.log.info('  4. Copy the "Project URL" (looks like https://xxxxx.supabase.co)')
  p.log.info('')

  const supabaseUrl = await p.text({
    message: 'Supabase project URL:',
    placeholder: 'https://xxxxx.supabase.co',
    validate: (value) => {
      if (!value) return 'Supabase URL is required'
      if (!value.startsWith('https://') || !value.includes('supabase.co'))
        return 'Must be a valid Supabase URL (https://xxxxx.supabase.co)'
    },
  })

  if (p.isCancel(supabaseUrl)) {
    p.cancel('Operation cancelled')
    return null
  }

  // Extract project ref from URL for direct links
  const urlMatch = (supabaseUrl as string).match(/https:\/\/([^.]+)\.supabase\.co/)
  const projectRef = urlMatch ? urlMatch[1] : null

  if (projectRef) {
    p.log.info('')
    p.log.info('Next: Find your anon key')
    p.log.info(`  Scroll down on the project home page`)
    p.log.info('  Copy the anon key (it\'s right below the Project URL)')
    p.log.info('')
  } else {
    p.log.info('')
    p.log.info('Next: Find your anon key')
    p.log.info('  Scroll down on the project home page')
    p.log.info('  Copy the anon key (it\'s right below the Project URL)')
    p.log.info('')
  }

  const supabaseAnonKey = await p.text({
    message: 'Supabase anon key (starts with eyJh...):',
    placeholder: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    validate: (value) => {
      if (!value) return 'Anon key is required'
      if (value.length < 100) return 'Key appears invalid (too short)'
    },
  })

  if (p.isCancel(supabaseAnonKey)) {
    p.cancel('Operation cancelled')
    return null
  }

  if (projectRef) {
    p.log.info('')
    p.log.info('Next: Find your service_role key')
    p.log.info(`  Go to: https://supabase.com/dashboard/project/${projectRef}/settings/api-keys`)
    p.log.info('  Click the "Legacy API Keys" tab')
    p.log.info('  Copy the service_role key')
    p.log.info('')
  } else {
    p.log.info('')
    p.log.info('Next: Find your service_role key')
    p.log.info('  1. Go to Project Settings > API Keys')
    p.log.info('  2. Click the "Legacy API Keys" tab')
    p.log.info('  3. Copy the service_role key')
    p.log.info('')
  }

  const supabaseServiceKey = await p.text({
    message: 'Supabase service_role key:',
    placeholder: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    validate: (value) => {
      if (!value) return 'Service role key is required for setup'
      if (value.length < 100) return 'Key appears invalid (too short)'
    },
  })

  if (p.isCancel(supabaseServiceKey)) {
    p.cancel('Operation cancelled')
    return null
  }

  const availablePackageManagers = getAvailablePackageManagers()

  if (availablePackageManagers.length === 0) {
    p.cancel('No package manager found. Please install npm, pnpm, or bun.')
    return null
  }

  const packageManager = await p.select({
    message: 'Package manager:',
    options: availablePackageManagers,
    initialValue: getDefaultPackageManager(),
  })

  if (p.isCancel(packageManager)) {
    p.cancel('Operation cancelled')
    return null
  }

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
    return null
  }

  const targetDir = path.resolve(process.cwd(), trimmedProjectName)

  return {
    projectName: trimmedProjectName,
    supabaseUrl: supabaseUrl as string,
    supabaseAnonKey: supabaseAnonKey as string,
    supabaseServiceKey: supabaseServiceKey as string,
    targetDir,
    packageManager: packageManager as 'npm' | 'pnpm' | 'bun',
    port: parseInt(portInput as string),
  }
}
