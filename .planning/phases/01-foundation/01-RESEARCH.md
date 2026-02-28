# Phase 1: Foundation - Research

**Researched:** 2026-02-28
**Domain:** Auth, project management, BYOK API key storage, n8n security perimeter, database schema
**Confidence:** HIGH (stack is locked; official docs verified for all major components)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Framework:** Next.js (App Router)
- **Database/Auth/Storage:** Supabase (Postgres + built-in auth + storage)
- **AI Orchestration:** n8n handles all LLM calls, prompt chaining, and workflow logic; Next.js calls n8n via webhooks
- **Hosting:** Vercel for Next.js, self-hosted n8n (hosting provider at Claude's discretion), Supabase managed
- **Styling:** Tailwind CSS + shadcn/ui component library
- **State Management:** React Server Components first, minimal client state only where needed (forms, modals)
- **Dashboard:** Card grid layout (2-3 columns on desktop); each card shows title, status badge, word count, last modified date, genre tag, progress bar
- **Empty state:** Guided welcome message with 2-3 example project cards plus "Start your novel" CTA
- **API Key Management:** Dedicated settings page; "test connection" button; key stored server-side only, displayed as masked with last 4 chars (e.g., ••••••••abcd); pre-selected recommended models per task; no free tier
- **Auth Flow:** Single page with Sign in / Create account toggle tabs; email + password via Supabase Auth; email verification required before accessing app; standard email link for password reset; always land on project dashboard after login
- **AI Architecture Pattern:** n8n workflows as conversation-style chains; GSD-style pattern with structured Q&A, accumulating context docs, context compression; Human-in-the-loop via n8n Wait node; Phase 1 includes basic end-to-end test chain (Next.js → n8n webhook → LLM call → response back to UI)

### Claude's Discretion
- n8n hosting provider (Railway, DigitalOcean, etc.)
- n8n <-> Next.js authentication method (shared secret vs JWT)
- Database schema design
- Context storage strategy (DB vs workflow state vs hybrid)
- Exact spacing, typography, and component styling
- Error state handling and loading patterns
- Auto-save implementation details

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User can create an account with email and password | Supabase Auth `signUp()` with email verification; `@supabase/ssr` pattern verified in official docs |
| AUTH-02 | User can log in and stay logged in across browser sessions | Supabase cookie-based session with middleware refresh; `@supabase/ssr` + `middleware.ts` pattern |
| AUTH-03 | User can log out from any page | Supabase `signOut()` via Server Action callable from any layout; middleware clears cookie |
| AUTH-04 | User can reset password via email link | Supabase `resetPasswordForEmail()` + `updateUser()` on confirm page; native Supabase email template |
| PROJ-01 | User can create a new novel project from the dashboard | Server Action inserts into `projects` table with RLS policy; revalidates dashboard route |
| PROJ-02 | User can view all their novel projects in a dashboard | Server Component queries `projects` table with RLS; RSC renders card grid |
| PROJ-03 | User can resume any in-progress novel project | Router navigates to `/projects/[id]`; project state loaded from DB |
| PROJ-04 | User can delete a novel project | Server Action with soft-delete or hard-delete; RLS ensures ownership |
| PROJ-05 | Novel state auto-saves after every generation or user edit | Debounced Server Action (`useDebouncedCallback`); updates `projects.updated_at` and relevant columns |
| LLM-01 | User can connect their own OpenRouter API key (BYOK) | Settings page form → Server Action → Supabase Vault `vault.create_secret()` |
| LLM-02 | User can select specific LLMs for different tasks | `user_model_preferences` table; UI shows pre-selected models with expandable overrides |
| LLM-03 | Platform provides hosted API access via subscription | Subscription flag on user profile; phase 1 establishes the schema column; billing deferred to Phase 5 |
| LLM-04 | User's API key is never exposed to the browser | API key stored encrypted in Supabase Vault; retrieved only in Server Actions / Route Handlers; never in `NEXT_PUBLIC_` vars |
</phase_requirements>

---

## Summary

Phase 1 is a well-understood tech-stack combination with excellent official documentation coverage. Next.js 15 App Router + Supabase Auth is a first-class pairing with an official Vercel starter template, and the `@supabase/ssr` package (replacing the deprecated `auth-helpers-nextjs`) is the current standard approach. The hardest problems in this phase are not the auth or project CRUD — those are commodity patterns — but rather two higher-stakes concerns: (1) the n8n security perimeter, and (2) BYOK API key storage.

**n8n has active critical CVEs (CVSS 9.9–10.0) discovered in late 2025 and early 2026.** The instance MUST be isolated from the public internet and running version >= 1.121.0 (or any 2.x). Railway is the recommended hosting platform for n8n (private networking is supported; Redis queue mode has an IPv6 issue to work around). The n8n <-> Next.js communication channel must use a shared secret in the request header, verified by n8n's IF node before any workflow logic runs.

**BYOK key storage** must use Supabase Vault (not pgcrypto directly, not plaintext) — Vault provides Authenticated Encryption with the key held separately from your data. The pattern is: Server Action receives key → calls `vault.create_secret()` → stores the Vault UUID per user → retrieval happens only in server-side code. The browser never sees the raw key.

The database schema designed in Phase 1 must carry story bible tables forward (per the STATE.md architectural decision), even though story bible content is populated in Phase 2. Designing it correctly now avoids painful migrations later.

**Primary recommendation:** Bootstrap with the official Vercel+Supabase Next.js starter template, add shadcn/ui, lock in the DB schema with RLS from day one, deploy n8n >= 2.x on Railway with private networking and a Postgres backing database (not SQLite), and authenticate the n8n webhook with a shared secret header.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 15.x | App Router, Server Components, Server Actions | Locked decision; official Vercel deployment target |
| @supabase/supabase-js | latest (2.x) | Supabase JS client for DB, Auth, Storage | Official Supabase JS SDK |
| @supabase/ssr | latest | Cookie-based auth for SSR — replaces deprecated auth-helpers | Official replacement; required for App Router session management |
| tailwindcss | 4.x | Utility-first CSS | Locked decision |
| shadcn/ui | latest (CLI-based) | Component library built on Radix UI | Locked decision; copies source into project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| use-debounce | latest | `useDebouncedCallback` hook for auto-save | PROJ-05 auto-save on client edit |
| zod | 3.x | Schema validation for Server Actions | Validate form inputs before DB writes |
| react-hook-form | 7.x | Form state management | Auth forms, settings forms; pairs with zod via `@hookform/resolvers` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Supabase Vault | pgcrypto directly | Vault is managed, key is held separately from data — pgcrypto requires you to manage key storage yourself |
| Supabase Vault | Application-layer AES-256 + env var key | Both are viable; Vault preferred because key rotation doesn't require app redeploy |
| Railway for n8n | DigitalOcean Droplet | Railway has private networking and simpler ops; DO gives more raw control; both supported |
| shadcn/ui | Radix UI directly | shadcn copies source into your project; Radix is the underlying dependency either way |

**Installation:**
```bash
# Next.js project creation
npx create-next-app@latest storywriter --typescript --tailwind --app --src-dir

# Supabase
npm install @supabase/supabase-js @supabase/ssr

# shadcn/ui (run after Next.js init)
npx shadcn@latest init
npx shadcn@latest add button card badge input label form dialog tabs select

# Form handling
npm install react-hook-form @hookform/resolvers zod

# Auto-save
npm install use-debounce
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── (auth)/                  # Route group — no layout chrome
│   │   ├── auth/                # Auth callback handler
│   │   │   └── confirm/         # Email confirmation + password reset
│   │   ├── login/               # Sign in / Create account (toggle tabs)
│   │   └── layout.tsx
│   ├── (dashboard)/             # Authenticated app shell
│   │   ├── dashboard/           # Project card grid
│   │   ├── projects/
│   │   │   └── [id]/            # Project editor (future phases)
│   │   ├── settings/            # API key, model preferences
│   │   └── layout.tsx           # Auth guard + nav
│   └── api/
│       ├── n8n/                 # Webhook receive from n8n (future phases)
│       └── health/              # Uptime check
├── components/
│   ├── ui/                      # shadcn copies land here
│   ├── auth/                    # LoginForm, SignupForm tabs
│   ├── dashboard/               # ProjectCard, ProjectGrid, EmptyState
│   └── settings/                # ApiKeyForm, ModelSelector
├── lib/
│   ├── supabase/
│   │   ├── client.ts            # Browser client
│   │   ├── server.ts            # Server client (cookies)
│   │   └── middleware.ts        # Session refresh helper
│   ├── n8n/
│   │   └── client.ts            # n8n webhook caller (shared secret)
│   └── validations/             # Zod schemas
├── actions/                     # Server Actions
│   ├── auth.ts                  # signIn, signUp, signOut, resetPassword
│   ├── projects.ts              # createProject, deleteProject, updateProject
│   └── settings.ts              # saveApiKey, testApiKey, saveModelPrefs
└── types/
    └── database.ts              # Supabase generated types
middleware.ts                    # Session refresh — root level (required)
```

### Pattern 1: Supabase SSR Auth with Middleware

**What:** Cookie-based session management using `@supabase/ssr`. Middleware refreshes tokens on every request. Server Components read session server-side. Browser client used only in Client Components.

**When to use:** Every authenticated page, every Server Component that needs the user context.

```typescript
// middleware.ts (root level — required by Next.js)
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  // IMPORTANT: always call getClaims() not getSession() in server code
  const { data: { user } } = await supabase.auth.getUser()

  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

```typescript
// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options))
        },
      },
    }
  )
}
```

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
```

### Pattern 2: Server Actions for Auth

**What:** Auth mutations happen in Server Actions (not API routes), so forms can submit without JS and errors return via `useFormState`.

```typescript
// actions/auth.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

export async function signIn(formData: FormData) {
  const parsed = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) return { error: 'Invalid credentials' }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return { error: error.message }
  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function signUp(formData: FormData) {
  const parsed = LoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) return { error: 'Invalid input' }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm` },
  })
  if (error) return { error: error.message }
  return { success: 'Check your email to confirm your account' }
}

export async function resetPassword(formData: FormData) {
  const email = formData.get('email') as string
  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm?next=/settings/password`,
  })
  if (error) return { error: error.message }
  return { success: 'Password reset email sent' }
}
```

### Pattern 3: Supabase Vault for BYOK API Key Storage

**What:** OpenRouter API keys are stored encrypted in Supabase Vault. The Vault UUID is stored in the user's profile. Decryption happens only in server-side code via the `vault.decrypted_secrets` view.

**Why Vault over application-layer encryption:** The encryption key is never stored in your database — Supabase holds it in their secured backend separately from your data. Encrypted at rest, encrypted in backups, encrypted in replication streams.

```typescript
// actions/settings.ts — save API key
'use server'
import { createClient } from '@/lib/supabase/server'

export async function saveApiKey(formData: FormData) {
  const apiKey = formData.get('apiKey') as string
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // Store in Vault (service role required for vault.create_secret)
  // This runs via a Postgres function called from the service role client
  // OR via a database function with SECURITY DEFINER
  const { data: vaultId, error } = await supabase
    .rpc('upsert_user_api_key', {
      p_user_id: user.id,
      p_api_key: apiKey
    })

  if (error) return { error: 'Failed to save API key' }
  return { success: true }
}
```

```sql
-- Database function to handle vault upsert with SECURITY DEFINER
-- (runs with elevated permissions, not user's RLS context)
create or replace function upsert_user_api_key(p_user_id uuid, p_api_key text)
returns uuid
language plpgsql
security definer  -- runs as function owner (postgres), not caller
set search_path = public, vault
as $$
declare
  v_vault_id uuid;
  v_existing_vault_id uuid;
begin
  -- Check if user already has a key stored
  select openrouter_vault_id into v_existing_vault_id
  from user_settings where user_id = p_user_id;

  if v_existing_vault_id is not null then
    -- Update existing secret
    update vault.secrets
    set secret = p_api_key
    where id = v_existing_vault_id;
    return v_existing_vault_id;
  else
    -- Create new secret
    v_vault_id := vault.create_secret(p_api_key, 'openrouter_' || p_user_id::text);
    -- Store vault UUID in user settings
    insert into user_settings (user_id, openrouter_vault_id)
    values (p_user_id, v_vault_id)
    on conflict (user_id) do update set openrouter_vault_id = v_vault_id;
    return v_vault_id;
  end if;
end;
$$;
```

```typescript
// Server-side key retrieval (Route Handler or Server Action only)
export async function getApiKey(userId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('user_settings')
    .select('openrouter_vault_id')
    .eq('user_id', userId)
    .single()

  if (!data?.openrouter_vault_id) return null

  const { data: secret } = await supabase
    .rpc('get_decrypted_api_key', { p_vault_id: data.openrouter_vault_id })

  return secret ?? null
}
```

### Pattern 4: n8n Webhook Authentication (Shared Secret)

**What:** Every request from Next.js to n8n includes a pre-shared secret in a custom header. n8n's webhook node validates this before any workflow logic runs.

```typescript
// lib/n8n/client.ts
const N8N_SECRET = process.env.N8N_WEBHOOK_SECRET  // Never NEXT_PUBLIC_
const N8N_BASE_URL = process.env.N8N_BASE_URL       // Internal URL only

export async function triggerN8nWorkflow(
  webhookPath: string,
  payload: Record<string, unknown>
) {
  const response = await fetch(`${N8N_BASE_URL}/webhook/${webhookPath}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Secret': N8N_SECRET!,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`n8n webhook failed: ${response.status}`)
  }

  return response.json()
}
```

```
// n8n workflow — first node after Webhook trigger:
// IF node: {{ $request.headers['x-webhook-secret'] === $env.WEBHOOK_SECRET }}
// true → continue workflow
// false → Respond to Webhook node with 401
```

### Pattern 5: Auto-Save with Debounce

**What:** Client component detects text changes, debounces 1-2 seconds, calls a Server Action to persist.

```typescript
// components/dashboard/ProjectEditor.tsx
'use client'
import { useDebouncedCallback } from 'use-debounce'
import { updateProject } from '@/actions/projects'

export function ProjectEditor({ projectId, initialContent }: Props) {
  const [content, setContent] = useState(initialContent)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved')

  const debouncedSave = useDebouncedCallback(async (value: string) => {
    setSaveStatus('saving')
    const result = await updateProject(projectId, { content: value })
    setSaveStatus(result.error ? 'error' : 'saved')
  }, 1500) // 1.5s debounce

  const handleChange = (value: string) => {
    setContent(value)
    setSaveStatus('saving') // optimistic indicator
    debouncedSave(value)
  }

  return (
    <div>
      <textarea value={content} onChange={e => handleChange(e.target.value)} />
      <span>{saveStatus === 'saving' ? 'Saving...' : 'Saved'}</span>
    </div>
  )
}
```

### Pattern 6: Database Schema with RLS

**What:** Every table has RLS enabled with policies scoped to `auth.uid()`. Core tables for Phase 1:

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- User settings (1:1 with auth.users)
create table user_settings (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id) on delete cascade not null unique,
  openrouter_vault_id  uuid,           -- Vault reference for BYOK key
  subscription_tier    text default 'none',  -- 'none' | 'hosted'
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Model preferences per task type
create table user_model_preferences (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  task_type   text not null,           -- 'outline' | 'prose' | 'editing'
  model_id    text not null,           -- OpenRouter model identifier
  updated_at  timestamptz default now(),
  unique(user_id, task_type)
);

-- Novel projects
create table projects (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid references auth.users(id) on delete cascade not null,
  title         text not null default 'Untitled Novel',
  status        text not null default 'draft',  -- 'draft' | 'writing' | 'complete'
  genre         text,
  word_count    integer default 0,
  chapter_count integer default 0,
  chapters_done integer default 0,
  -- Story bible schema seeded here for Phase 2 (per STATE.md decision)
  story_bible   jsonb default '{}',
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Row Level Security — ALL tables
alter table user_settings enable row level security;
alter table user_model_preferences enable row level security;
alter table projects enable row level security;

-- RLS policies (user_settings example — replicate for all tables)
create policy "Users see own settings"
  on user_settings for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users insert own settings"
  on user_settings for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users update own settings"
  on user_settings for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users delete own settings"
  on user_settings for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Trigger: auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger projects_updated_at
  before update on projects
  for each row execute function update_updated_at();
```

### Anti-Patterns to Avoid

- **Using `getSession()` in server code:** Trusts the client's JWT without verification. Always use `getUser()` or `getClaims()` in Server Components and middleware. `getSession()` is safe only in client components.
- **NEXT_PUBLIC_ for any secret:** Everything prefixed `NEXT_PUBLIC_` is embedded in the client bundle. The n8n URL, webhook secret, and Supabase service role key must never have this prefix.
- **Fetching Vault secrets in Client Components:** The `vault.decrypted_secrets` view must only be accessed server-side. Access in a client component would expose the key in the network tab.
- **SQLite for n8n:** SQLite wipes on container redeploy (Railway). Use Postgres for n8n's own backing database.
- **Skipping RLS and patching later:** Enabling RLS after data exists requires auditing every query. Enable RLS before any data writes.
- **Calling n8n webhook from the client:** Webhooks to n8n must go through a Next.js Server Action or Route Handler (to avoid exposing N8N_WEBHOOK_SECRET to the browser).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session management across SSR/client | Custom JWT + cookie logic | `@supabase/ssr` + middleware | Token refresh, HttpOnly cookies, edge cases already handled |
| Password reset flow | Custom token generation + email | Supabase Auth built-in `resetPasswordForEmail()` | Token expiry, secure delivery, rate limiting |
| Email verification | Custom email sending + token DB | Supabase Auth email confirmation | Configured in Supabase dashboard; auto-retried |
| Encrypted secret storage | AES-256 + custom key management | Supabase Vault | Key held separately from data; encrypted at rest and in backups |
| Form validation | Hand-written validation functions | Zod + react-hook-form | Type-safe, composable, integrates with Server Actions |
| Auto-save debouncing | `setTimeout` + `clearTimeout` in useEffect | `useDebouncedCallback` from `use-debounce` | Handles cleanup, cancellation, flush-on-unmount |
| UI components | Custom Radix + styled components | shadcn/ui | Locked decision; copies accessible, styled source into project |

**Key insight:** The most dangerous place to hand-roll is auth/security. Every custom implementation of token handling, secret storage, or webhook verification introduces edge cases that Supabase, Vault, and standard libraries have already addressed.

---

## Common Pitfalls

### Pitfall 1: n8n Deployed on Public Internet Without Isolation

**What goes wrong:** n8n has active CVSS 9.9–10.0 RCEs (CVE-2025-68613, CVE-2026-21858, CVE-2026-21877). A publicly reachable n8n instance that stores user API keys can result in full server compromise and credential exfiltration.

**Why it happens:** n8n's default Docker setup listens on a public port. Developers expose it for convenience during development and never restrict it.

**How to avoid:**
- On Railway: use private networking (`railway.internal` DNS) — n8n should not have a public TCP service; only the Next.js app is public
- If a public port is required temporarily, restrict access with firewall rules + `N8N_BASIC_AUTH_ACTIVE=true`
- Deploy n8n version >= 1.121.0 (or any 2.x); set `N8N_BLOCK_ENV_ACCESS_IN_NODE=true`, `N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true`
- Set a random `N8N_ENCRYPTION_KEY` — losing this means losing all stored credentials

**Warning signs:** n8n URL is accessible from the browser developer console, or n8n's admin UI is reachable without a VPN/tunnel.

### Pitfall 2: API Key Leaking to Browser

**What goes wrong:** OpenRouter API key appears in network requests from the browser, visible in DevTools. User's own paid key is exposed.

**Why it happens:** Developer calls OpenRouter directly from a Client Component, or puts the key in a `NEXT_PUBLIC_` env var.

**How to avoid:**
- All OpenRouter calls go through Server Actions or Route Handlers
- Key retrieved from Vault only in server-side code
- `OPENROUTER_API_KEY` (or Vault lookup) never in `NEXT_PUBLIC_*` namespace
- Test: inspect all network requests in DevTools; key must never appear

**Warning signs:** `NEXT_PUBLIC_OPENROUTER_KEY` env var exists anywhere in the codebase.

### Pitfall 3: Middleware Matching Too Broadly or Too Narrowly

**What goes wrong:** Auth redirect loops (middleware redirects to `/login`, login page also matched, infinite redirect), or protected routes accessible without auth because the matcher misses them.

**Why it happens:** Default Next.js middleware matcher patterns include static files, or exclude certain routes.

**How to avoid:** Use the Supabase-recommended matcher that excludes `_next/static`, `_next/image`, `favicon.ico`, and image files:
```
'/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
```
The `/login` page must be excluded from the auth redirect check (already handled in the Pattern 1 middleware above).

**Warning signs:** Redirect loops in browser, or 401 responses on static assets.

### Pitfall 4: Missing `updated_at` Trigger Causes Stale Dashboard Sort

**What goes wrong:** Dashboard shows projects in wrong order; recently edited projects don't bubble up.

**Why it happens:** `updated_at` column exists but no trigger updates it on row modification; auto-save only sets `word_count` etc., not `updated_at`.

**How to avoid:** Add a `before update` trigger on every table that has an `updated_at` column (see Pattern 6 above). The trigger fires automatically — no application-level code needed.

### Pitfall 5: n8n Using SQLite on Railway

**What goes wrong:** All n8n execution history, credentials, and workflow definitions are wiped every time the container redeploys (which can happen on Railway's hobby tier during maintenance).

**Why it happens:** n8n defaults to SQLite for local convenience.

**How to avoid:** Provision a Postgres service in Railway alongside n8n and set:
```
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=postgres.railway.internal
DB_POSTGRESDB_DATABASE=n8n
DB_POSTGRESDB_USER=postgres
DB_POSTGRESDB_PASSWORD=${PGPASSWORD}
```
Use Railway's private networking URL (`.railway.internal`) for the DB host.

### Pitfall 6: Supabase RLS Disabled on New Tables

**What goes wrong:** Any authenticated (or unauthenticated) user can read or modify any row in a new table — including other users' projects and API key vault references.

**Why it happens:** RLS is off by default in Postgres. It must be explicitly enabled per table.

**How to avoid:** Enable RLS immediately after `create table`. A linting rule or migration convention (e.g., `enable row level security;` always follows `create table`) prevents forgetting.

**Warning signs:** `select * from projects` from an anon context returns rows that should be private.

---

## Code Examples

Verified patterns from official sources:

### Auth Callback Route (email confirmation + password reset)

```typescript
// app/(auth)/auth/confirm/route.ts
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs
import { createServerClient } from '@supabase/ssr'
import { type EmailOtpType } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/dashboard'

  if (token_hash && type) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: (v) => v.forEach(({name,value,options}) => cookieStore.set(name,value,options)) } }
    )

    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) return NextResponse.redirect(new URL(next, request.url))
  }

  return NextResponse.redirect(new URL('/login?error=invalid_token', request.url))
}
```

### Project CRUD Server Actions

```typescript
// actions/projects.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const CreateProjectSchema = z.object({
  title: z.string().min(1).max(200),
  genre: z.string().optional(),
})

export async function createProject(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const parsed = CreateProjectSchema.safeParse({
    title: formData.get('title'),
    genre: formData.get('genre'),
  })
  if (!parsed.success) return { error: 'Invalid input' }

  const { data, error } = await supabase
    .from('projects')
    .insert({ user_id: user.id, ...parsed.data })
    .select('id')
    .single()

  if (error) return { error: 'Failed to create project' }
  revalidatePath('/dashboard')
  return { projectId: data.id }
}

export async function deleteProject(projectId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  // RLS enforces ownership — safe to pass projectId directly
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)

  if (error) return { error: 'Failed to delete project' }
  revalidatePath('/dashboard')
  return { success: true }
}
```

### Dashboard Server Component

```typescript
// app/(dashboard)/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import { ProjectGrid } from '@/components/dashboard/ProjectGrid'
import { EmptyState } from '@/components/dashboard/EmptyState'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, status, genre, word_count, chapter_count, chapters_done, updated_at')
    .order('updated_at', { ascending: false })

  if (!projects?.length) return <EmptyState />
  return <ProjectGrid projects={projects} />
}
```

### Test Connection for OpenRouter API Key

```typescript
// actions/settings.ts — test API key validity
export async function testApiKey(apiKey: string) {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    })
    if (response.ok) return { valid: true }
    return { valid: false, error: 'Invalid API key' }
  } catch {
    return { valid: false, error: 'Connection failed' }
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | 2023–2024 | auth-helpers is deprecated; ssr package is the replacement |
| `getSession()` in server code | `getUser()` / `getClaims()` | 2024 | `getSession()` doesn't verify JWT on server; security hole |
| Manual pgcrypto for secrets | Supabase Vault | 2022+ (stable) | Vault manages key separately from data; safer |
| n8n 1.x (< 1.121.0) | n8n >= 1.121.0 or 2.x | Jan 2026 | CVE-2026-21858 CVSS 10.0 unauthenticated RCE patched in 1.121.0 |
| shadcn/ui with Tailwind v3 | shadcn/ui with Tailwind v4 | 2025 | Install with `npx shadcn@latest init`; use `shadcn@2.3.0` if staying on Tailwind v3 |
| React 18 `use client` everywhere | Server Components by default, `use client` only for interactivity | Next.js 13+ / App Router | App Router defaults to Server Components; Client Components used only for forms, modals |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: Replaced by `@supabase/ssr`. Do not install.
- `n8n` versions < 1.121.0: Active CVSS 10.0 CVE. Never deploy; always use latest 2.x.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Being transitioned to `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Both work during transition; use the new name.

---

## Open Questions

1. **n8n Hosting: Railway vs DigitalOcean**
   - What we know: Railway has simpler ops, private networking, usage-based pricing; known Redis IPv6 issue in queue mode; DO gives more raw control and predictable pricing
   - What's unclear: Whether Railway's private networking Redis IPv6 issue affects the Phase 1 use case (single-instance n8n without queue mode probably doesn't need Redis)
   - Recommendation: Default to Railway single-instance (no queue mode) for Phase 1 — it's simpler. Queue mode with Redis is only needed for high-volume parallel workflows.

2. **n8n <-> Next.js Authentication: Shared Secret vs JWT**
   - What we know: Shared secret (custom header) is simple and sufficient for server-to-server calls; JWT provides per-user context in the payload
   - What's unclear: Phase 1 test chain needs to pass which user triggered the workflow; JWT signed with a secret carries user ID securely
   - Recommendation: Use shared secret for Phase 1 test chain (simpler); document that Phase 3 will likely need JWT to pass user context to n8n workflows.

3. **`story_bible` column: JSONB now vs separate table**
   - What we know: STATE.md mandates story bible tables be in Phase 1 schema; complex queries on JSONB at scale are harder than relational
   - What's unclear: Whether Phase 1 needs to query into story bible fields (probably not — just store and retrieve)
   - Recommendation: Start with a `story_bible jsonb` column on `projects` for Phase 1. Phase 2 planning can decide whether to normalize into separate `characters`, `locations`, `plot_beats` tables. This avoids premature normalization while seeding the schema.

4. **Auto-trigger of `user_settings` row creation**
   - What we know: `user_settings` needs a row per user; could be created on first login (Server Action) or via a Postgres trigger on `auth.users`
   - What's unclear: Supabase's `auth.users` triggers can be unreliable in some edge cases
   - Recommendation: Create `user_settings` row in the sign-up Server Action immediately after `signUp()` succeeds. More explicit, easier to debug than a DB trigger on auth.users.

---

## Sources

### Primary (HIGH confidence)
- [Supabase: Setting up Server-Side Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) — middleware, server client, browser client patterns
- [Supabase: Creating a client for SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client) — `createBrowserClient`, `createServerClient` APIs
- [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) — RLS policy patterns, `auth.uid()`, performance wrapping
- [Supabase: Vault](https://supabase.com/docs/guides/database/vault) — `vault.create_secret()`, `vault.decrypted_secrets` view, security model
- [shadcn/ui: Next.js installation](https://ui.shadcn.com/docs/installation/next) — `npx shadcn@latest init`, Tailwind v4 compatibility
- [n8n security advisory (Jan 2026)](https://blog.n8n.io/security-advisory-20260108/) — CVE-2026-21858 details and remediation
- [Canadian Centre for Cyber Security: AL26-001](https://www.cyber.gc.ca/en/alerts-advisories/al26-001-vulnerabilities-affecting-n8n-cve-2026-21858-cve-2026-21877-cve-2025-68613) — CVE list and CVSS scores

### Secondary (MEDIUM confidence)
- [Railway: How Private Networking Works](https://docs.railway.com/networking/private-networking/how-it-works) — Wireguard mesh, `.railway.internal` DNS
- [Railway: n8n deploy templates](https://railway.com/deploy/n8n) — one-click deploy, Postgres backing DB pattern
- [Supabase + Vercel integration](https://supabase.com/partners/integrations/vercel) — automatic env var injection on connect
- [WebSearch: n8n shared secret webhook pattern](https://n8n.io/workflows/5174-creating-a-secure-webhook-must-have/) — header-based secret, IF node validation

### Tertiary (LOW confidence — needs validation)
- Redis IPv6 private network issue on Railway with n8n queue mode (GitHub issue #13117) — may or may not apply to single-instance n8n; flagged as Open Question
- Supabase Vault `vault.update_secret()` API — referenced in community docs but not verified in official Vault docs; the `update vault.secrets set secret = ...` pattern used above is the confirmed approach

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — official Supabase, shadcn, Next.js docs verified for all core packages
- Architecture: HIGH — patterns derived from official docs and verified against current API signatures
- n8n security: HIGH — CVE data from official advisories (CCCS, NVD, n8n blog)
- n8n hosting specifics: MEDIUM — Railway private networking verified; Redis IPv6 issue from GitHub issues (single source)
- Pitfalls: HIGH — derived from official security advisories and documented Supabase auth gotchas

**Research date:** 2026-02-28
**Valid until:** 2026-03-28 (n8n CVE landscape is fast-moving; re-verify version requirements before deployment)
