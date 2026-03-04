# AGENTS.md — Skylos Cloud Dashboard

## Project Overview

Next.js 16 web dashboard for Skylos. Provides project management, analysis result viewing, credit purchasing, and API key management.

**Stack:** Next.js 16 (App Router) + Supabase + Lemon Squeezy + Tailwind CSS + TypeScript

## Build & Run

```bash
npm install
npm run dev          # Development server
npm run build        # Production build
npm run lint         # ESLint
```

## Project Structure

```
src/
  app/               # Next.js App Router pages and API routes
    api/             # API route handlers
    auth/            # Auth callback routes
    dashboard/       # Dashboard pages
    blog/            # Blog (MDX)
    login/           # Login page
  components/        # React components
  lib/               # Shared utilities
    supabase/        # Supabase client setup
    payments.ts      # Lemon Squeezy integration
    site.ts          # Site URL helper
  content/           # MDX blog content
supabase/
  migrations/        # DB migrations (YYYYMMDDHHMMSS_name.sql)
```

## API Route Patterns

All API routes follow this pattern:
```typescript
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  // Scope queries by organization
  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  // Use membership.organization_id to scope all queries
}
```

## Key Conventions

- **Authentication:** `@supabase/ssr` for server-side auth, `supabase-js` admin client for service role operations
- **Payments:** Lemon Squeezy only (NOT Stripe). Routes: `api/checkout/route.ts`, `api/webhook/route.ts`, lib: `lib/payments.ts`
- **Credits:** Atomic operations via RPC functions (`deduct_credits`, `add_credits`) — never update credit balances directly
- **Migrations:** Timestamped SQL files in `supabase/migrations/` with format `YYYYMMDDHHMMSS_name.sql`
- **Organization scoping:** All data queries must be scoped by `organization_id` from `organization_members` table

## Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `LEMONSQUEEZY_API_KEY`
- `LEMONSQUEEZY_WEBHOOK_SECRET`
- `LEMONSQUEEZY_STORE_ID`
