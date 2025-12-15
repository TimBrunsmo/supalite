# supalite Project Guide

This is a **supalite** project - a minimal Next.js + Supabase starter with authentication.

## 🎯 Project Philosophy

**Zero Bloat**: This template provides ONLY working authentication. Everything else is intentionally minimal so you can build exactly what you need without stripping out opinionated features.

## 🏗 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Database & Auth**: Supabase
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS v3
- **Package Manager**: (npm/pnpm/bun - check package.json)

## 📁 Project Structure

```
├── app/
│   ├── page.tsx              # Landing page with auth form
│   ├── dashboard/
│   │   └── page.tsx          # Protected dashboard
│   ├── api/auth/callback/    # Auth callback handler
│   └── globals.css           # Tailwind + custom styles
├── components/
│   └── auth/
│       ├── magic-link-form.tsx
│       └── sign-out-button.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts         # Client-side Supabase
│   │   ├── server.ts         # Server-side Supabase
│   │   └── middleware.ts     # Auth middleware
│   └── types/
│       └── database.ts       # Generated from Supabase schema
├── supabase/
│   └── migrations/           # Database migrations
└── middleware.ts             # Next.js middleware for auth
```

## 🔐 Authentication Flow

1. **Magic Link**: User enters email → receives link → clicks → authenticated
2. **Session Management**: Handled by `@supabase/ssr` with cookies
3. **Protected Routes**: Dashboard requires authentication (redirects to `/` if not logged in)
4. **Middleware**: Refreshes auth session on every request

## 🗄 Database & Migrations

### Adding Tables

1. Create a new migration file using Supabase CLI:
   ```bash
   supabase migration new add_posts
   ```

   This creates a timestamped file in `supabase/migrations/`

2. Edit the migration file (e.g., `supabase/migrations/20250106120000_add_posts.sql`):
   ```sql
   CREATE TABLE posts (
     id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
     user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     title TEXT NOT NULL,
     content TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Enable RLS
   ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

   -- RLS Policies
   CREATE POLICY "Users can read own posts"
     ON posts FOR SELECT
     USING (auth.uid() = user_id);

   CREATE POLICY "Users can create own posts"
     ON posts FOR INSERT
     WITH CHECK (auth.uid() = user_id);
   ```

3. Apply migration to your Supabase project:
   ```bash
   supabase db push
   ```

4. Generate TypeScript types:
   ```bash
   npm run db:types
   ```

### Working with Supabase

**Client-side** (use in components):
```typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
const { data } = await supabase.from('posts').select('*')
```

**Server-side** (use in Server Components, Route Handlers):
```typescript
import { createClient } from '@/lib/supabase/server'

const supabase = await createClient()
const { data } = await supabase.from('posts').select('*')
```

## 🎨 Styling Guidelines

**Colors** (Supabase theme):
- Background: `#161616`
- Cards: `#1d1d1d`
- Borders: `#292929`
- Active text: `#f9f9f9`
- Normal text: `#6f6f6f`
- Buttons: `#1e5634` with `#2f784d` border

**Custom Classes**:
- `.card` - Card styling
- `.btn` - Button styling
- `.text-active` - Active text color
- `.text-normal` - Normal text color

## 📝 Code Patterns

### Creating a Protected Page

```typescript
// app/my-page/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function MyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  return <div>Protected content</div>
}
```

### Creating a Server Action

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createPost(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('posts')
    .insert({
      user_id: user.id,
      title: formData.get('title') as string,
    })

  if (error) throw error

  revalidatePath('/dashboard')
}
```

### Creating an API Route

```typescript
// app/api/posts/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data })
}
```

## 🚫 What NOT to Do

- ❌ Don't use `createClient` from `@supabase/supabase-js` directly
- ❌ Don't bypass RLS policies
- ❌ Don't store sensitive data in client components
- ❌ Don't hardcode user IDs - always get from `auth.uid()`
- ❌ Don't skip TypeScript types - regenerate after schema changes

## ✅ Best Practices

- ✅ Always enable RLS on new tables
- ✅ Use TypeScript types from `lib/types/database.ts`
- ✅ Keep auth logic in Server Components when possible
- ✅ Revalidate paths after mutations
- ✅ Follow the existing file structure
- ✅ Use Server Actions for mutations
- ✅ Test RLS policies thoroughly

## 🔧 Common Tasks

**Get current user**:
```typescript
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
```

**Check if authenticated**:
```typescript
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/')
```

**Sign out**:
```typescript
const supabase = createClient()
await supabase.auth.signOut()
router.push('/')
router.refresh()
```

## 🐛 Debugging

**Auth not working?**
1. Check redirect URLs in Supabase dashboard
2. Verify environment variables are set
3. Check browser console for errors
4. Verify middleware is running

**Database query failing?**
1. Check RLS policies
2. Verify user is authenticated
3. Check table permissions
4. Look at Supabase logs

**Types out of sync?**
```bash
npm run db:types
```

## 📚 Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 🚀 Deployment

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy
5. Add production URL to Supabase redirect URLs

## 📖 Additional Resources

- [Supabase Docs](https://supabase.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase + Next.js Guide](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)

---

**Remember**: This is a minimal starter. The lack of features is intentional. Build exactly what you need, nothing more.
