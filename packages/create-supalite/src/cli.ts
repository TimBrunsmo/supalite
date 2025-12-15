#!/usr/bin/env node

import { setupWithSupabaseCLI } from './prompts/setup-method.js'
import { createProject } from './create-project.js'
import * as p from '@clack/prompts'
import pc from 'picocolors'
import { debug } from './utils/debug.js'
import { DEFAULT_PORT } from './constants.js'

async function main() {
  const args = process.argv.slice(2)
  const projectName = args[0]?.trim()

  console.clear()

  // Run comprehensive setup flow with CLI integration
  const { config, method } = await setupWithSupabaseCLI(projectName)

  if (!config) {
    process.exit(0)
  }

  const startTime = Date.now()

  try {
    await createProject(config)

    const duration = Math.round((Date.now() - startTime) / 1000)

    const setupMethod =
      method === 'cli-auto'
        ? pc.dim('(automated with Supabase CLI)')
        : pc.dim('(manual setup)')

    // Show redirect URL setup for CLI-auto method (new projects)
    let redirectSetup = ''
    if (method === 'cli-auto') {
      try {
        const projectRef = new URL(config.supabaseUrl).hostname.split('.')[0]
        const port = config.port || DEFAULT_PORT
        const callbackUrl = `http://localhost:${port}/api/auth/callback`

        redirectSetup = `
${pc.yellow('⚠  One manual step:')}
   1. Open: ${pc.cyan(`https://app.supabase.com/project/${projectRef}/auth/url-configuration`)}
   2. Add this URL:
      ${pc.green(callbackUrl)}
`
      } catch (error) {
        // Invalid URL - skip redirect setup message
        debug(`[DEBUG] Failed to parse project ref for redirect setup`)
      }
    }

    // Format the dev command based on package manager
    const devCommand = config.packageManager === 'npm'
      ? 'npm run dev'
      : `${config.packageManager} dev`

    p.outro(
      pc.green(`✓ Done (${duration}s)${redirectSetup}
Then run:
  ${pc.cyan(`cd ${config.projectName} && ${devCommand}`)}`)
    )
  } catch (error) {
    p.outro(
      pc.red(
        `Setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    )
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Error:', error)
  process.exit(1)
})
