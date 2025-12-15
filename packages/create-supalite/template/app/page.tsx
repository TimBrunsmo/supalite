import { MagicLinkForm } from '@/components/auth/magic-link-form'

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-3 text-active">
            supalite
          </h1>
          <p className="text-normal text-lg mb-6">
            A minimal Next.js starter with Supabase authentication
          </p>
        </div>

        <div className="card p-8 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-active">
            Sign In
          </h2>
          <p className="text-normal text-sm mb-6">
            Enter your email to receive a magic link
          </p>
          <MagicLinkForm />
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-3 text-active">
            What&apos;s included
          </h3>
          <ul className="space-y-2 text-sm text-normal">
            <li className="flex items-start">
              <span className="text-active mr-2">✓</span>
              <span>Next.js 15 with App Router</span>
            </li>
            <li className="flex items-start">
              <span className="text-active mr-2">✓</span>
              <span>Supabase authentication (magic link)</span>
            </li>
            <li className="flex items-start">
              <span className="text-active mr-2">✓</span>
              <span>TypeScript configured</span>
            </li>
            <li className="flex items-start">
              <span className="text-active mr-2">✓</span>
              <span>Tailwind CSS styling</span>
            </li>
            <li className="flex items-start">
              <span className="text-active mr-2">✓</span>
              <span>Zero bloat - add what you need</span>
            </li>
          </ul>
        </div>
      </div>
    </main>
  )
}
