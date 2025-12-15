import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SignOutButton } from '@/components/auth/sign-out-button'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-active mb-2">Dashboard</h1>
            <p className="text-normal">Welcome back, {user.email}</p>
          </div>
          <SignOutButton />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="card p-6">
            <h2 className="text-xl font-semibold text-active mb-3">
              Authentication Working
            </h2>
            <p className="text-normal text-sm mb-4">
              You&apos;re successfully authenticated with Supabase. This starter template provides:
            </p>
            <ul className="space-y-2 text-sm text-normal">
              <li className="flex items-start">
                <span className="text-active mr-2">•</span>
                <span>Magic link authentication</span>
              </li>
              <li className="flex items-start">
                <span className="text-active mr-2">•</span>
                <span>Server-side session management</span>
              </li>
              <li className="flex items-start">
                <span className="text-active mr-2">•</span>
                <span>Protected routes with middleware</span>
              </li>
            </ul>
          </div>

          <div className="card p-6">
            <h2 className="text-xl font-semibold text-active mb-3">
              Next Steps
            </h2>
            <p className="text-normal text-sm mb-4">
              Build your application on this foundation:
            </p>
            <ul className="space-y-2 text-sm text-normal">
              <li className="flex items-start">
                <span className="text-active mr-2">1.</span>
                <span>Add database tables in <code className="text-xs bg-background px-1 py-0.5 rounded">supabase/migrations/</code></span>
              </li>
              <li className="flex items-start">
                <span className="text-active mr-2">2.</span>
                <span>Generate types with <code className="text-xs bg-background px-1 py-0.5 rounded">npm run db:types</code></span>
              </li>
              <li className="flex items-start">
                <span className="text-active mr-2">3.</span>
                <span>Build your features using the Supabase client</span>
              </li>
            </ul>
          </div>

          <div className="card p-6">
            <h2 className="text-xl font-semibold text-active mb-3">
              User Info
            </h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-normal">Email:</span>
                <span className="text-active ml-2">{user.email}</span>
              </div>
              <div>
                <span className="text-normal">User ID:</span>
                <span className="text-active ml-2 font-mono text-xs">{user.id}</span>
              </div>
              <div>
                <span className="text-normal">Last Sign In:</span>
                <span className="text-active ml-2">
                  {user.last_sign_in_at
                    ? new Date(user.last_sign_in_at).toLocaleDateString()
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-xl font-semibold text-active mb-3">
              Resources
            </h2>
            <ul className="space-y-3 text-sm">
              <li>
                <a
                  href="https://supabase.com/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-normal hover:text-active transition-colors underline"
                >
                  Supabase Documentation
                </a>
              </li>
              <li>
                <a
                  href="https://nextjs.org/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-normal hover:text-active transition-colors underline"
                >
                  Next.js Documentation
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/supabase/supabase"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-normal hover:text-active transition-colors underline"
                >
                  Supabase GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  )
}
