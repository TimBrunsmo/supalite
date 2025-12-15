import { cp, mkdir, writeFile, readFile } from 'fs/promises'
import { join, relative, dirname } from 'path'
import { fileURLToPath } from 'url'
import type { PackageManager } from '../types.js'
import { DEFAULT_PORT } from '../constants.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * Copy template directory to target location.
 */
export async function copyTemplate(targetDir: string): Promise<void> {
  // Template is at package root, we're in dist/, so go up one level
  const templateDir = join(__dirname, '../template')

  // Create target directory
  await mkdir(targetDir, { recursive: true })

  // Copy all files from template
  await cp(templateDir, targetDir, {
    recursive: true,
    filter: (src) => {
      // Check only the relative path from template to avoid matching node_modules in package path
      const relativePath = relative(templateDir, src)
      // Exclude node_modules, .next, and other build artifacts within the template
      return !relativePath.includes('node_modules') && !relativePath.includes('.next')
    },
  })
}

/**
 * Write environment variables to .env.local.
 */
export async function writeEnvFile(
  targetDir: string,
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<void> {
  const envContent = `# Supabase Configuration
# Get these from https://app.supabase.com/project/_/settings/api
NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${supabaseAnonKey}

# Note: Service role key NOT needed for runtime
# Only used during initial setup by create-supalite CLI
`

  await writeFile(join(targetDir, '.env.local'), envContent, 'utf-8')
}

/**
 * Get the version string for a package manager with appropriate version.
 */
function getPackageManagerVersion(packageManager: PackageManager): string {
  // These are the latest stable versions as of early 2025
  const versions: Record<PackageManager, string> = {
    npm: '10.9.2',
    pnpm: '9.15.4',
    bun: '1.2.0',
  }
  return `${packageManager}@${versions[packageManager]}`
}

/**
 * Update package.json with the selected package manager and port.
 */
export async function setPackageManager(
  targetDir: string,
  packageManager: PackageManager,
  port?: number
): Promise<void> {
  const packageJsonPath = join(targetDir, 'package.json')
  const packageJsonContent = await readFile(packageJsonPath, 'utf-8')
  const packageJson = JSON.parse(packageJsonContent)

  // Add packageManager field
  packageJson.packageManager = getPackageManagerVersion(packageManager)

  // Update dev and start scripts with the selected port
  if (port && port !== DEFAULT_PORT) {
    packageJson.scripts.dev = `next dev -p ${port}`
    packageJson.scripts.start = `next start -p ${port}`
  }

  // Write back with proper formatting
  await writeFile(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2) + '\n',
    'utf-8'
  )
}
