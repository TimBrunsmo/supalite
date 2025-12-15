#!/usr/bin/env node

import { execSync } from 'child_process'
import { existsSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')
const outputPath = join(rootDir, 'lib', 'types', 'database.ts')

/**
 * Check if Supabase CLI is installed
 */
function hasSupabaseCLI() {
  try {
    execSync('which supabase', { stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

/**
 * Generate types using Supabase CLI
 */
function generateWithCLI() {
  try {
    console.log('Generating types with Supabase CLI...')
    const types = execSync('supabase gen types typescript --linked', {
      encoding: 'utf-8',
    })

    // Ensure directory exists
    const dir = dirname(outputPath)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }

    writeFileSync(outputPath, types)
    console.log('✓ Types generated successfully')
    return true
  } catch (error) {
    console.error('Failed to generate types with CLI:', error.message)
    return false
  }
}

/**
 * Show instructions for manual type generation
 */
function showManualInstructions() {
  console.log('\n⚠️  Supabase CLI not found')
  console.log('\nOption 1: Install Supabase CLI')
  console.log('  npm install -g supabase')
  console.log('  supabase login')
  console.log('  supabase link --project-ref YOUR_PROJECT_REF')
  console.log('  pnpm db:types')
  console.log('\nOption 2: Generate types manually')
  console.log('  1. Go to Supabase Dashboard > API > TypeScript')
  console.log('  2. Copy the generated types')
  console.log('  3. Paste into lib/types/database.ts')
  process.exit(1)
}

/**
 * Main execution
 */
async function main() {
  if (hasSupabaseCLI()) {
    const success = generateWithCLI()
    if (!success) {
      showManualInstructions()
    }
  } else {
    showManualInstructions()
  }
}

main()
