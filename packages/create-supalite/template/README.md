# supalite App

A Next.js application with Supabase authentication and database, created with [create-supalite](https://github.com/TimBrunsmo/supalite).

## Getting Started

### Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your app.

### Project Structure

```
├── app/
│   ├── layout.tsx              # Root layout
│   ├── page.tsx                # Home page with auth
│   ├── dashboard/              # Protected dashboard page
│   ├── auth/                   # Auth error pages
│   └── api/auth/callback/      # Auth callback handler
├── components/
│   └── auth/                   # Authentication components
├── lib/
│   ├── supabase/               # Supabase client setup
│   └── types/                  # Generated database types
├── supabase/
│   └── migrations/             # Database migrations
└── scripts/
    └── generate-types.js       # Type generation script
```

## Adding New Tables

### Step 1: Create Migration with Supabase CLI

Create a new migration file:

```bash
supabase migration new create_your_table
```

This creates a file in `supabase/migrations/`. Edit it to add your table:

```sql
CREATE TABLE your_table (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own records"
  ON your_table FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own records"
  ON your_table FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own records"
  ON your_table FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own records"
  ON your_table FOR DELETE
  USING (auth.uid() = user_id);
```

### Step 2: Apply Migration

Apply to your hosted Supabase project:

```bash
supabase db push
```

Or run the SQL directly in your Supabase Dashboard SQL Editor.

### Step 3: Regenerate Types

```bash
npm run db:types
```

This generates TypeScript types in `lib/types/database.ts` based on your database schema.

### Step 4: Use Types in Your App

```typescript
import { Database } from '@/lib/types/database'

type YourTable = Database['public']['Tables']['your_table']['Row']
type NewYourTable = Database['public']['Tables']['your_table']['Insert']
type YourTableUpdate = Database['public']['Tables']['your_table']['Update']
```

### Step 5: Query Your Table

Use the Supabase client to query your table:

```typescript
import { createClient } from '@/lib/supabase/server'

export async function getYourData() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('your_table')
    .select('*')

  if (error) throw error
  return data
}
```

## Authentication

### Magic Link (Default)

Magic Link authentication is enabled by default. Users receive an email with a login link.

The authentication flow:
1. User enters email on home page
2. Supabase sends magic link email
3. User clicks link
4. Redirects to `/api/auth/callback`
5. User is authenticated and redirected to `/dashboard`

### Adding OAuth Providers

To add Google or GitHub OAuth:

1. Configure provider in Supabase Dashboard > Authentication > Providers
2. Update `components/auth/magic-link-form.tsx` to include OAuth buttons

Example for Google:

```typescript
const { error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: `${window.location.origin}/api/auth/callback`,
  },
})
```

## Building for Production

### Build Warnings

When running `npm run build`, you may see Edge Runtime warnings:

```
⚠ Compiled with warnings
A Node.js API is used (process.version) which is not supported in the Edge Runtime.
```

**These warnings are safe to ignore.** They come from the Supabase library and don't affect functionality. The build completes successfully and your app works perfectly. This is expected behavior when using Supabase with Next.js middleware.

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

### Configure Auth Callback

After deployment, add your production URL to Supabase:

1. Copy your production URL (e.g., `https://your-app.vercel.app`)
2. Go to Supabase Dashboard > Authentication > URL Configuration
3. Add to "Redirect URLs": `https://your-app.vercel.app/api/auth/callback`

## Security

### Row Level Security (RLS)

When you create tables, always enable RLS and create appropriate policies. Example policies:

```sql
-- Enable RLS
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;

-- Users can only read their own data
CREATE POLICY "Users can read own data"
  ON your_table FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own data
CREATE POLICY "Users can insert own data"
  ON your_table FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### Environment Variables

Keep your environment variables secure:
- Never commit `.env.local` to git (it's in `.gitignore`)
- Use different Supabase projects for development and production
- Rotate keys if they're exposed

## Database Schema

The initial migration creates the UUID extension. Add your own tables as needed following the patterns above.

To see your current schema:

```bash
supabase db diff
```

## Common Tasks

### Reset Local Database

```bash
supabase db reset
```

### View Database Logs

```bash
supabase db logs
```

### Generate Types After Schema Changes

```bash
npm run db:types
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)

## Project Guide

See `GUIDE.md` for a comprehensive guide including:
- Creating protected pages
- Working with Server Actions
- Best practices and patterns
- Common pitfalls and solutions
