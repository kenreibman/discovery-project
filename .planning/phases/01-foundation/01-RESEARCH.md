# Phase 1: Foundation - Research

**Researched:** 2026-03-29
**Domain:** Authentication, project scaffold, database schema, UI shell
**Confidence:** HIGH

## Summary

Phase 1 is a greenfield scaffold: create a Next.js 15 App Router project with Auth.js v5 (Credentials provider), Drizzle ORM + Turso/libSQL database, shadcn/ui component library with Tailwind v4, and a Claude-inspired dashboard shell. The tech stack is fully locked in CLAUDE.md -- no library selection decisions remain. The primary complexity is wiring Auth.js v5 correctly with the Credentials provider (JWT sessions, NOT database sessions), Drizzle adapter for SQLite, and middleware-based route protection.

This is a single-user app (Jessica only). Authentication is intentionally simple: one email/password credential stored in an environment variable or seeded in the database, bcryptjs for hashing, 30-day JWT sessions. The dashboard is a UI shell only -- file upload processing and AI generation come in later phases.

**Primary recommendation:** Use Auth.js v5 with JWT session strategy (mandatory for Credentials provider), Drizzle adapter for user/account tables, and Next.js middleware for blanket route protection with a public login page exception.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Ultra-minimal login page -- centered card with email + password fields, subtle app name only. No logo, no firm branding, no tagline. Modeled after Claude's auth screen.
- **D-02:** Warm neutral color scheme -- cream/beige tones like Claude's UI with dark text. Approachable and professional for a legal tool.
- **D-03:** Inline subtle error handling -- small red text below the field for wrong credentials. Non-disruptive, no toast notifications on login.
- **D-04:** Claude-inspired layout -- centered main area with left sidebar. Main area has greeting + upload drop zone. Sidebar lists previous cases.
- **D-05:** Single drop zone for file upload -- one large drag-and-drop area in the center. Upload processing itself is Phase 2 -- Phase 1 just renders the UI shell.
- **D-06:** Time-of-day greeting -- "Good morning/afternoon/evening, Jessica" with a functional subtitle.
- **D-07:** Sidebar shows case entries by case name + date. Clicking opens that case's responses.
- **D-08:** Empty sidebar state -- subtle "No cases yet" text.
- **D-09:** Auth tables plus case stubs -- create users, sessions, accounts tables for Auth.js, plus case and document tables with basic columns. Phase 2 extends them.
- **D-10:** Auto-naming from PDF -- schema supports a `name` field on cases that's initially null/auto-populated.
- **D-11:** 30-day session duration.
- **D-12:** Silent redirect on session expiry -- quietly redirect to login with no alarming error messages. After login, return to where she was.
- **D-13:** Subtle logout button -- small logout option in sidebar or settings area.

### Claude's Discretion
- Technical implementation patterns (folder structure, component organization, state management)
- Specific shadcn/ui component choices
- Tailwind color palette exact values (within the warm neutral direction)
- Auth.js configuration details
- Drizzle schema column types and constraints

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | User can log in with email and password | Auth.js v5 Credentials provider with bcryptjs password verification |
| AUTH-02 | Unauthenticated users cannot access any functionality | Next.js middleware with `callbacks.authorized` redirecting to /login |
| AUTH-03 | User session persists across browser refresh | JWT session strategy with 30-day maxAge, stored in HttpOnly cookie |
| AUTH-04 | All data transmitted over HTTPS | Vercel enforces HTTPS by default on all deployments |
| AUTH-05 | Uploaded documents are not accessible to other users or exposed publicly | Vercel Blob private access mode (configured in Phase 2, schema supports it now) |
</phase_requirements>

## Standard Stack

### Core (Verified Versions)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 15.5.14 | Full-stack framework | Latest stable 15.x. Locked in CLAUDE.md. |
| react / react-dom | 19.x | UI library | Ships with Next.js 15. |
| typescript | 5.x | Type safety | Ships with Next.js 15 setup. |
| tailwindcss | 4.x | Styling | CSS-first config, no tailwind.config.js needed. |
| next-auth | 5.0.0-beta.30 | Authentication | Auth.js v5 for Next.js. Beta tag but production-stable. |
| @auth/drizzle-adapter | 1.11.1 | Auth DB adapter | Connects Auth.js to Drizzle/SQLite tables. |
| drizzle-orm | 0.45.2 | Database ORM | TypeScript-first, SQL-transparent, lightweight. |
| @libsql/client | 0.17.2 | Turso DB driver | Required by Drizzle for Turso/libSQL connectivity. |
| drizzle-kit | 0.31.10 | DB migrations | Schema generation and migration tooling. |
| bcryptjs | 3.0.3 | Password hashing | Pure JS, no native deps. Hash Jessica's password. |
| zod | 3.x | Schema validation | Validate login form inputs, API responses. |

### UI Components

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| shadcn/ui | latest (npx shadcn@latest init) | Component library | Card (login), Button, Input, Sidebar, Sheet |
| lucide-react | latest | Icons | LogOut icon, sidebar icons |
| react-hook-form | 7.x | Form management | Login form with validation |

### Installation

```bash
# Create Next.js project
npx create-next-app@15 discovery-drafter --ts --tailwind --eslint --app --src-dir

# Core dependencies
npm install next-auth@beta @auth/drizzle-adapter drizzle-orm @libsql/client bcryptjs zod react-hook-form

# Type definitions
npm install -D @types/bcryptjs drizzle-kit

# Initialize shadcn/ui (select Tailwind v4, New York style)
npx shadcn@latest init

# Add needed components
npx shadcn@latest add button card input label sidebar
```

### Version Verification

| Package | Registry Version | Date Checked |
|---------|-----------------|--------------|
| next@15 | 15.5.14 | 2026-03-29 |
| next-auth@beta | 5.0.0-beta.30 | 2026-03-29 |
| @auth/drizzle-adapter | 1.11.1 | 2026-03-29 |
| drizzle-orm | 0.45.2 | 2026-03-29 |
| @libsql/client | 0.17.2 | 2026-03-29 |
| drizzle-kit | 0.31.10 | 2026-03-29 |
| bcryptjs | 3.0.3 | 2026-03-29 |

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx          # Login page (public)
│   ├── (protected)/
│   │   ├── layout.tsx            # Dashboard layout with sidebar
│   │   └── dashboard/
│   │       └── page.tsx          # Main dashboard (greeting + drop zone shell)
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts      # Auth.js API route handler
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Root redirect to /dashboard or /login
├── components/
│   ├── ui/                       # shadcn/ui components (auto-generated)
│   ├── login-form.tsx            # Login form component
│   ├── dashboard-greeting.tsx    # Time-of-day greeting
│   ├── sidebar-nav.tsx           # Case list sidebar
│   └── upload-zone-shell.tsx     # Drop zone placeholder (non-functional in Phase 1)
├── lib/
│   ├── auth.ts                   # Auth.js configuration (NextAuth export)
│   ├── auth.config.ts            # Auth.js config (providers, callbacks)
│   └── db/
│       ├── index.ts              # Drizzle client instance
│       ├── schema.ts             # All table definitions
│       └── seed.ts               # Seed script for Jessica's user record
├── middleware.ts                  # Auth.js middleware for route protection
└── styles/
    └── globals.css               # Tailwind v4 imports + warm color theme
```

### Pattern 1: Route Groups for Auth Boundary

**What:** Use Next.js route groups `(auth)` and `(protected)` to separate public and protected pages.
**When to use:** Always -- this is the standard Next.js 15 pattern for auth-gated apps.
**Example:**

```typescript
// src/app/(auth)/login/page.tsx -- public, no auth required
// src/app/(protected)/layout.tsx -- wraps all authenticated pages
// src/app/(protected)/dashboard/page.tsx -- requires login
```

The middleware handles the actual auth check. Route groups provide layout separation (login has no sidebar; dashboard has sidebar).

### Pattern 2: Auth.js v5 Configuration Split

**What:** Split Auth.js config into `auth.config.ts` (providers, callbacks -- edge-compatible) and `auth.ts` (full config with adapter -- Node.js runtime).
**When to use:** When using a database adapter. The middleware runs at the edge and cannot import the database adapter directly.
**Example:**

```typescript
// src/lib/auth.config.ts -- edge-safe, no DB imports
import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"

export default {
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        // Validate credentials against DB
        // Return user object or null
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days (D-11)
  },
  callbacks: {
    authorized: async ({ auth }) => {
      return !!auth // Redirect unauthenticated to login
    },
  },
} satisfies NextAuthConfig
```

```typescript
// src/lib/auth.ts -- full config with adapter
import NextAuth from "next-auth"
import { DrizzleAdapter } from "@auth/drizzle-adapter"
import { db } from "@/lib/db"
import authConfig from "./auth.config"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  ...authConfig,
})
```

### Pattern 3: Middleware Route Protection

**What:** Use Next.js middleware.ts to protect all routes except login and static assets.
**When to use:** Always for auth-gated apps.
**Example:**

```typescript
// src/middleware.ts
export { auth as middleware } from "@/lib/auth"

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|login).*)",
  ],
}
```

### Pattern 4: JWT Session with Credentials Provider

**What:** Use JWT session strategy (NOT database sessions) with the Credentials provider.
**When to use:** ALWAYS when using Credentials provider with Auth.js v5.
**Why:** Auth.js does NOT automatically create database sessions for the Credentials provider. This is by design. JWT sessions are stored in an encrypted HttpOnly cookie -- no session table lookups needed.

### Pattern 5: Drizzle Schema with Auth.js Tables + App Tables

**What:** Define Auth.js required tables AND application tables in a single schema file.
**When to use:** Always -- keeps schema co-located and migration-friendly.
**Example:**

```typescript
// src/lib/db/schema.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"

// Auth.js required tables
export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: integer("emailVerified", { mode: "timestamp" }),
  image: text("image"),
  passwordHash: text("password_hash"), // Added for Credentials provider
})

export const accounts = sqliteTable("accounts", {
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("providerAccountId").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
})

export const sessions = sqliteTable("sessions", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: integer("expires", { mode: "timestamp" }).notNull(),
})

export const verificationTokens = sqliteTable("verificationTokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: integer("expires", { mode: "timestamp" }).notNull(),
})

// Application tables (D-09, D-10)
export const cases = sqliteTable("cases", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => users.id),
  name: text("name"), // Nullable -- auto-populated from PDF in Phase 3 (D-10)
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
})

export const documents = sqliteTable("documents", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  caseId: text("case_id").notNull().references(() => cases.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "complaint" | "discovery_request"
  filename: text("filename").notNull(),
  blobUrl: text("blob_url").notNull(), // Vercel Blob URL
  mimeType: text("mime_type"),
  uploadedAt: integer("uploaded_at", { mode: "timestamp" }).$defaultFn(() => new Date()),
})
```

### Anti-Patterns to Avoid

- **Database sessions with Credentials provider:** Auth.js v5 does NOT create session records for credentials logins. Use `session: { strategy: "jwt" }` -- always.
- **Importing DB adapter in middleware:** The middleware runs at the edge. Import only the auth config (no adapter, no DB client) in middleware. Split config into auth.config.ts and auth.ts.
- **Custom auth instead of Auth.js:** Do not hand-roll JWT handling, cookie management, or session logic. Auth.js handles encryption, rotation, CSRF protection.
- **Storing passwords in plain text:** Always hash with bcryptjs before storing. Use `bcrypt.hash(password, 12)` for creation, `bcrypt.compare()` for verification.
- **Using toast notifications on login errors (D-03):** User explicitly requested inline subtle error text below the field. No sonner/toast on the login page.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session management | Custom JWT + cookies | Auth.js v5 | Handles encryption, CSRF, rotation, HttpOnly cookies |
| Password hashing | Custom hash function | bcryptjs | Battle-tested, timing-safe comparison |
| Route protection | Custom auth checks per page | Auth.js middleware + authorized callback | Centralized, can't forget a route |
| Form validation | Manual if/else checks | zod + react-hook-form | Type-safe schemas, consistent error handling |
| UI components | Custom styled inputs/cards | shadcn/ui (Button, Card, Input) | Accessible, tested, Tailwind-native |
| Database migrations | Manual SQL scripts | drizzle-kit generate + migrate | Tracks schema changes, generates SQL |
| HTTPS enforcement | Custom redirect logic | Vercel platform | Automatic on all Vercel deployments |

## Common Pitfalls

### Pitfall 1: Credentials Provider + Database Sessions
**What goes wrong:** Auth.js silently fails to create session records when using `session: { strategy: "database" }` with the Credentials provider. User appears logged in briefly, then session vanishes.
**Why it happens:** Auth.js deliberately does not create database sessions for credentials logins -- only OAuth providers trigger session creation. This is documented but easy to miss.
**How to avoid:** Always use `session: { strategy: "jwt" }` with Credentials provider. Set this explicitly in auth.config.ts.
**Warning signs:** Session is null after successful login, no INSERT queries on the sessions table.

### Pitfall 2: Edge Runtime vs Node.js Runtime for Auth
**What goes wrong:** Middleware that imports the Drizzle adapter or @libsql/client crashes because the edge runtime doesn't support Node.js APIs.
**Why it happens:** Next.js middleware runs at the edge by default. Drizzle + libSQL require Node.js runtime.
**How to avoid:** Split auth config: `auth.config.ts` (edge-safe, providers + callbacks only) imported by middleware, `auth.ts` (full config with adapter) used in server components and API routes.
**Warning signs:** "Module not found" or "Dynamic code evaluation" errors in middleware.

### Pitfall 3: Auth.js v5 Import Paths
**What goes wrong:** Importing from `next-auth/react` or old v4 paths causes type errors or missing exports.
**Why it happens:** Auth.js v5 changed many import paths from v4.
**How to avoid:** Use these imports:
- `import NextAuth from "next-auth"` (server config)
- `import { signIn, signOut } from "next-auth/react"` (client actions)
- `import Credentials from "next-auth/providers/credentials"` (provider)
- `import { DrizzleAdapter } from "@auth/drizzle-adapter"` (adapter)
**Warning signs:** TypeScript "not exported" errors on auth imports.

### Pitfall 4: Missing AUTH_SECRET in Production
**What goes wrong:** Auth.js throws "MissingSecret" error on deployment.
**Why it happens:** AUTH_SECRET is auto-generated in dev but required in production.
**How to avoid:** Generate with `npx auth secret` or `openssl rand -base64 32`. Add to Vercel environment variables.
**Warning signs:** Works locally, fails on deploy.

### Pitfall 5: Tailwind v4 CSS-First Config
**What goes wrong:** Creating a tailwind.config.ts file and expecting it to work.
**Why it happens:** Tailwind v4 uses CSS-based configuration, not JS config files. Developer habit from v3.
**How to avoid:** Configure theme in `globals.css` using `@theme { }` directive. shadcn/ui init handles this correctly.
**Warning signs:** Custom colors not applying, theme overrides ignored.

### Pitfall 6: create-next-app with Wrong Version
**What goes wrong:** Running `npx create-next-app@latest` installs Next.js 16 (current latest), not 15.
**Why it happens:** npm latest tag now points to Next.js 16.2.1.
**How to avoid:** Pin version: `npx create-next-app@15` to get Next.js 15.x.
**Warning signs:** `package.json` shows `"next": "^16"`, middleware.ts renamed to proxy.ts.

### Pitfall 7: Drizzle + Turso Local Development
**What goes wrong:** Trying to connect to Turso cloud during local development adds latency and requires network.
**Why it happens:** Not configuring the local SQLite file fallback.
**How to avoid:** Use `url: "file:local.db"` for local development in the libSQL client config. Switch to Turso URL via environment variable in production.
**Warning signs:** Slow local dev, network errors when offline.

## Code Examples

### Auth.js signIn Server Action

```typescript
// src/app/(auth)/login/actions.ts
"use server"

import { signIn } from "@/lib/auth"
import { AuthError } from "next-auth"

export async function loginAction(
  prevState: { error: string | null },
  formData: FormData
) {
  try {
    await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      redirectTo: "/dashboard",
    })
    return { error: null }
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid email or password." }
        default:
          return { error: "Something went wrong." }
      }
    }
    throw error // Re-throw non-auth errors (e.g., redirect)
  }
}
```

### Drizzle Client Setup (Local + Production)

```typescript
// src/lib/db/index.ts
import { drizzle } from "drizzle-orm/libsql"
import { createClient } from "@libsql/client"
import * as schema from "./schema"

const client = createClient({
  url: process.env.TURSO_DATABASE_URL ?? "file:local.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
})

export const db = drizzle(client, { schema })
```

### Seed Script for Jessica's User

```typescript
// src/lib/db/seed.ts
import { db } from "./index"
import { users } from "./schema"
import bcrypt from "bcryptjs"

async function seed() {
  const passwordHash = await bcrypt.hash(process.env.INITIAL_PASSWORD!, 12)

  await db.insert(users).values({
    id: crypto.randomUUID(),
    name: "Jessica Massimi",
    email: process.env.INITIAL_EMAIL!,
    passwordHash,
  }).onConflictDoNothing()

  console.log("Seeded user: Jessica Massimi")
}

seed().catch(console.error)
```

### Time-of-Day Greeting

```typescript
// src/components/dashboard-greeting.tsx
"use client"

export function DashboardGreeting() {
  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening"

  return (
    <div>
      <h1 className="text-2xl font-medium">{greeting}, Jessica</h1>
      <p className="text-muted-foreground">
        Upload a complaint and discovery request to get started.
      </p>
    </div>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| NextAuth v4 (next-auth@4) | Auth.js v5 (next-auth@5 beta) | 2024 | New import paths, middleware pattern, edge support |
| tailwind.config.js (v3) | CSS-first @theme {} (v4) | 2025 | No JS config file, configure in globals.css |
| next-auth/react useSession | auth() server function | 2024 | Server-first session access, no client provider wrapper needed |
| create-next-app@latest = Next 15 | create-next-app@latest = Next 16 | 2026 | Must pin to @15 to get the correct version |
| Drizzle drizzle-orm/better-sqlite3 | drizzle-orm/libsql | 2024 | libSQL is the Turso-compatible driver |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Next.js runtime | Yes | v24.13.0 | -- |
| npm | Package management | Yes | 10.5.0 | -- |
| git | Version control | Yes | 2.42.0 | -- |
| Turso CLI | Database management | No | -- | Use local SQLite file for dev; configure Turso via web dashboard |

**Missing dependencies with no fallback:**
- None -- all critical tools are available.

**Missing dependencies with fallback:**
- Turso CLI not installed locally. Use `file:local.db` for development and configure Turso database through the web dashboard or install later with `npm install -g turso`.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected (greenfield) |
| Config file | None -- see Wave 0 |
| Quick run command | `npx jest --passWithNoTests` or `npx vitest run` (TBD at scaffold) |
| Full suite command | Same as quick run for Phase 1 |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | Login with email/password succeeds | integration | Test signIn with valid credentials | Wave 0 |
| AUTH-01 | Login with wrong password fails | integration | Test signIn with invalid credentials returns error | Wave 0 |
| AUTH-02 | Unauthenticated access redirects to /login | integration | Test middleware redirects unauthenticated requests | Wave 0 |
| AUTH-03 | Session persists (JWT cookie present after login) | integration | Test auth() returns session after signIn | Wave 0 |
| AUTH-04 | HTTPS enforced | manual-only | Vercel platform feature -- verify in deployment settings | N/A |
| AUTH-05 | Documents not publicly accessible | manual-only | Vercel Blob private mode -- verified in Phase 2 configuration | N/A |

### Sampling Rate
- **Per task commit:** Quick test run (if test infra exists)
- **Per wave merge:** Full suite
- **Phase gate:** Manual verification of login flow + redirect behavior

### Wave 0 Gaps
- [ ] Test framework selection and setup (vitest recommended for Next.js 15 -- lighter than jest)
- [ ] `src/__tests__/auth.test.ts` -- covers AUTH-01, AUTH-02, AUTH-03
- [ ] Test utilities for mocking Auth.js session

## Open Questions

1. **Auth.js v5 beta stability**
   - What we know: v5 has been in beta since 2024, widely used in production. Current version is beta.30.
   - What's unclear: Whether any breaking changes remain before stable release.
   - Recommendation: Pin to `5.0.0-beta.30` exactly in package.json. Monitor changelog.

2. **Drizzle adapter schema compatibility**
   - What we know: @auth/drizzle-adapter provides SQLite schema. Adding custom columns (passwordHash) to the users table is supported.
   - What's unclear: Whether the adapter handles the extra passwordHash column gracefully or requires explicit table overrides.
   - Recommendation: Test during implementation. If the adapter complains, pass custom table references as the second argument to DrizzleAdapter().

3. **shadcn/ui Sidebar component maturity**
   - What we know: shadcn/ui has a Sidebar component. It was added relatively recently.
   - What's unclear: Whether it matches the Claude-inspired layout exactly or needs customization.
   - Recommendation: Install and evaluate. If insufficient, build a custom sidebar using shadcn/ui primitives (Sheet, ScrollArea).

## Sources

### Primary (HIGH confidence)
- [Auth.js v5 Protecting Routes](https://authjs.dev/getting-started/session-management/protecting) -- middleware pattern, authorized callback
- [Auth.js v5 Next.js Reference](https://authjs.dev/reference/nextjs) -- handlers, auth(), signIn/signOut exports
- [Auth.js Drizzle Adapter](https://authjs.dev/getting-started/adapters/drizzle) -- schema requirements, adapter setup
- [Auth.js Drizzle SQLite Reference](https://authjs.dev/reference/drizzle-adapter/lib/sqlite) -- SQLite table definitions
- [Auth.js Session Strategies](https://authjs.dev/concepts/session-strategies) -- JWT vs database sessions
- [Drizzle + Turso Setup](https://docs.turso.tech/sdk/ts/orm/drizzle) -- official Turso integration guide
- [Drizzle ORM Turso Tutorial](https://orm.drizzle.team/docs/tutorials/drizzle-with-turso) -- schema, migrations, client setup
- [shadcn/ui Next.js Installation](https://ui.shadcn.com/docs/installation/next) -- init command, component installation
- [shadcn/ui Tailwind v4 Support](https://ui.shadcn.com/docs/tailwind-v4) -- CSS-first configuration
- npm registry (direct version queries) -- all package versions verified 2026-03-29

### Secondary (MEDIUM confidence)
- [Next.js Adding Authentication Tutorial](https://nextjs.org/learn/dashboard-app/adding-authentication) -- official Next.js auth patterns
- [Auth.js v5 Setup Guide (codevoweb)](https://codevoweb.com/how-to-set-up-next-js-15-with-nextauth-v5/) -- end-to-end credentials setup walkthrough
- [Drizzle + Turso + Next.js Guide (patelvivek)](https://patelvivek.dev/blog/drizzle-turso-nextjs) -- practical integration patterns

### Tertiary (LOW confidence)
- [Auth.js v5 Credentials Session Null Discussion](https://github.com/nextauthjs/next-auth/discussions/12848) -- confirms database sessions don't work with credentials

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries locked in CLAUDE.md, versions verified against npm registry
- Architecture: HIGH -- Auth.js v5 + Next.js 15 App Router patterns well-documented with multiple sources
- Pitfalls: HIGH -- credentials + database session issue is extensively documented; edge runtime split is well-known

**Research date:** 2026-03-29
**Valid until:** 2026-04-28 (stable ecosystem, 30-day validity)
