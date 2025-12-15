export type PackageManager = 'npm' | 'pnpm' | 'bun'

export interface ProjectConfig {
  projectName: string
  supabaseUrl: string
  supabaseAnonKey: string
  supabaseServiceKey: string
  targetDir: string
  packageManager: PackageManager
  port?: number
  dbPassword?: string
}
