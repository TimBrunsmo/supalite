# create-supalite

Create a Supabase + Next.js app in seconds.

## Quick Start

```bash
npm install -g create-supalite
create-supalite my-app
```

Answer a few prompts, and you'll have a working authenticated app in under 90 seconds.

## What is supalite?

supalite is a CLI tool that scaffolds a production-ready Next.js application with Supabase as the backend. No configuration files to edit, no manual dashboard setup, no authentication boilerplate.

### Features

- **90-Second Setup** - From command to working app in under two minutes
- **Automated Project Creation** - Optionally create new Supabase projects directly from the CLI
- **Security First** - RLS-ready setup, validated inputs
- **Full Type Safety** - Generated TypeScript types from your schema

## What's Included

- Next.js 16 with App Router
- Supabase authentication (Magic Link)
- Protected dashboard with authentication
- Type-safe database queries
- Server-side and client-side Supabase clients
- RLS-ready database setup
- Comprehensive project guide (GUIDE.md)

## Requirements

- Node.js 20 or higher
- A Supabase organisation

## Installation

```bash
npm install -g create-supalite
```

## Usage

```bash
create-supalite my-app
```

### How It Works

When you run the CLI, it:

1. **Checks for Supabase CLI** - If not installed, offers to install it automatically
2. **Authenticates** - If not logged in, opens browser for authentication
3. **Offers two setup modes:**

#### Automated Setup (Recommended)

The CLI will:
- Let you create a new Supabase project or select an existing one
- Automatically fetch project credentials (URL and API keys)
- Create your project directory
- Copy the template files
- Apply database migrations
- Generate TypeScript types
- Install dependencies

You'll only need to manually add the auth callback URL (instructions provided).

#### Manual Setup

For users who prefer manual control:
- Enter Supabase project URL manually
- Enter anon key manually
- Enter service_role key manually (used for setup only, not stored)
- The CLI will:
  - Create your project directory
  - Copy the template files
  - Apply database migrations
  - Generate TypeScript types
  - Install dependencies

## After Setup

```bash
cd my-app
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your app.

### What You Get

Your new app includes:

- Authentication page with Magic Link sign-in
- Protected dashboard (requires authentication)
- Pre-configured Supabase clients (server and client)
- Database migrations in `supabase/migrations/`
- Type generation script (`npm run db:types`)
- Comprehensive guide in `GUIDE.md`

## Project Structure

```
my-app/
├── app/                        # Next.js App Router
│   ├── page.tsx                # Home with auth
│   ├── dashboard/              # Protected dashboard
│   └── api/auth/callback/      # Auth callback
├── components/
│   └── auth/                   # Auth components
├── lib/
│   ├── supabase/               # Supabase clients
│   └── types/                  # Generated types
├── supabase/migrations/        # Database schema
└── GUIDE.md                    # Comprehensive project guide
```

## Extending Your App

### Adding a New Table

1. Create a migration file:
   ```bash
   supabase migration new create_your_table
   ```

2. Edit the migration file in `supabase/migrations/` to define your table with RLS policies

3. Apply the migration:
   ```bash
   supabase db push
   ```

4. Regenerate TypeScript types:
   ```bash
   npm run db:types
   ```

Check the `GUIDE.md` file in your generated project for detailed examples including:

- Complete table creation with RLS policies
- Creating protected pages
- Working with Server Actions
- Implementing CRUD operations
- Best practices and patterns

## Why supalite?

### vs. Manual Setup

Manual Supabase + Next.js setup takes 15-30 minutes and requires:

- Installing multiple packages
- Configuring authentication
- Setting up RLS policies
- Creating type definitions
- Building auth UI

supalite does all of this in 90 seconds.

### vs. Other Starters

Most starters require:

- Manual CLI installations
- Manual configuration files
- 7+ setup steps

supalite handles everything automatically in one command.

## CLI Features

- **Supabase CLI Integration**: Automatically installs and configures Supabase CLI
- **Project Creation**: Create new Supabase projects directly from the CLI
- **Smart Fallbacks**: Gracefully handles errors with manual setup option
- **Cross-Platform**: Works on macOS, Linux, and Windows
- **Package Manager Detection**: Supports npm, pnpm, and bun

## Contributing

Contributions welcome! Found a bug or have a feature request? [Open an issue](https://github.com/TimBrunsmo/supalite/issues).

## License

MIT
