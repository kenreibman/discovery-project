---
phase: 01-foundation
plan: 01
subsystem: auth, database, infra
tags: [next-auth, drizzle-orm, libsql, sqlite, jwt, bcryptjs, tailwind-v4, shadcn-ui, vitest]

# Dependency graph
requires: []
provides:
  - "Next.js 15 project scaffold with Tailwind v4 warm neutral theme"
  - "Auth.js v5 with Credentials provider and JWT sessions (30-day)"
  - "Drizzle ORM with 6 SQLite tables (users, accounts, sessions, verificationTokens, cases, documents)"
  - "Middleware route protection redirecting to /login"
  - "Seeded user record for Jessica Massimi"
  - "Vitest test framework with 4 Wave 0 test stub files"
  - "shadcn/ui components: button, card, input, label, separator, skeleton"
affects: [01-02, 01-03, 02-upload, 03-parsing, 04-generation]

# Tech tracking
tech-stack:
  added: [next@15.5.14, next-auth@5.0.0-beta.30, drizzle-orm@0.45.2, "@libsql/client@0.17.2", bcryptjs@3.0.3, "zod@4.3.6", react-hook-form@7.72.0, vitest@4.1.2, tailwindcss@4, shadcn-ui]
  patterns: [auth-config-split, jwt-session-strategy, middleware-route-protection, drizzle-schema-with-auth-tables]

key-files:
  created:
    - src/lib/db/schema.ts
    - src/lib/db/index.ts
    - src/lib/db/seed.ts
    - src/lib/auth.config.ts
    - src/lib/auth.ts
    - src/middleware.ts
    - src/app/api/auth/[...nextauth]/route.ts
    - drizzle.config.ts
    - vitest.config.ts
    - src/__tests__/auth.test.ts
    - src/__tests__/middleware.test.ts
    - src/__tests__/session.test.ts
    - src/__tests__/protected-routes.test.ts
  modified:
    - package.json
    - src/app/globals.css
    - src/app/layout.tsx
    - src/app/page.tsx
    - .gitignore

key-decisions:
  - "Used Inter font at 400/600 weights per UI-SPEC"
  - "Auth config split: auth.config.ts (edge-safe) + auth.ts (with DrizzleAdapter) per research Pattern 2"
  - "JWT session strategy with 30-day maxAge per D-11"
  - "Dynamic imports in authorize callback to avoid edge runtime issues (Pitfall 2)"
  - "Added dotenv to seed script for standalone execution"

patterns-established:
  - "Auth config split: auth.config.ts for edge, auth.ts for Node.js runtime"
  - "Drizzle schema co-locates Auth.js tables with application tables in single file"
  - "Middleware exports auth as middleware with matcher excluding /login and /api/auth"
  - "Warm neutral theme: #F5F3EE background, #C8653A accent, #1A1714 text"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05]

# Metrics
duration: 7min
completed: 2026-03-29
---

# Phase 01 Plan 01: Foundation Scaffold Summary

**Next.js 15 + Auth.js v5 with JWT sessions, Drizzle ORM with 6 SQLite tables, warm neutral Tailwind v4 theme, and vitest framework with 4 test stub files**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-30T00:39:01Z
- **Completed:** 2026-03-30T00:46:38Z
- **Tasks:** 2
- **Files modified:** 28

## Accomplishments
- Next.js 15.5.14 project scaffolded with Tailwind v4 warm neutral theme (#F5F3EE bg, #C8653A accent) and Inter font
- Auth.js v5 configured with Credentials provider, JWT session strategy (30-day), and DrizzleAdapter
- Full Drizzle schema with 6 tables: users (with passwordHash), accounts, sessions, verificationTokens, cases, documents
- Middleware route protection redirects unauthenticated users to /login
- Jessica's user record seeded with bcrypt-hashed password
- Vitest running with 9 passing tests across 4 stub files (AUTH-01 through AUTH-05)
- shadcn/ui initialized with button, card, input, label, separator, skeleton components

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Next.js 15, install deps, configure theme** - `8efdcce` (feat)
2. **Task 2: Auth, DB schema, middleware, seed, test stubs** - `f093c9e` (feat)

## Files Created/Modified
- `src/lib/db/schema.ts` - All 6 database table definitions (users, accounts, sessions, verificationTokens, cases, documents)
- `src/lib/db/index.ts` - Drizzle client with libSQL, local SQLite fallback
- `src/lib/db/seed.ts` - Seeds Jessica Massimi user with hashed password
- `src/lib/auth.config.ts` - Edge-safe auth config: Credentials provider, JWT strategy, 30-day sessions
- `src/lib/auth.ts` - Full auth config with DrizzleAdapter, exports handlers/auth/signIn/signOut
- `src/middleware.ts` - Route protection via auth as middleware
- `src/app/api/auth/[...nextauth]/route.ts` - Auth.js API route handler
- `src/app/globals.css` - Warm neutral Tailwind v4 theme with sidebar-specific colors
- `src/app/layout.tsx` - Inter font, Discovery Drafter metadata
- `src/app/page.tsx` - Redirects to /dashboard
- `drizzle.config.ts` - Drizzle Kit configuration for SQLite
- `vitest.config.ts` - Vitest config with React plugin and path aliases
- `src/__tests__/auth.test.ts` - AUTH-01 test stubs (2 tests)
- `src/__tests__/middleware.test.ts` - AUTH-02 test stubs (3 tests)
- `src/__tests__/session.test.ts` - AUTH-03 test stubs (2 tests)
- `src/__tests__/protected-routes.test.ts` - AUTH-05 test stubs (2 tests)

## Decisions Made
- Used Inter font at weights 400 and 600 per UI-SPEC (replacing default Geist fonts)
- Split auth config into edge-safe auth.config.ts and full auth.ts with DrizzleAdapter per research Pattern 2
- Used dynamic imports in authorize callback to avoid edge runtime issues with libSQL
- Added dotenv dependency so seed script can load .env.local standalone
- Removed dark mode theme from globals.css (single-user legal tool, light mode only)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] create-next-app refused non-empty directory**
- **Found during:** Task 1
- **Issue:** create-next-app@15 refuses to scaffold into a directory containing .planning/ and CLAUDE.md
- **Fix:** Scaffolded into a temp directory and copied files back
- **Files modified:** None extra
- **Verification:** Dev server starts successfully
- **Committed in:** 8efdcce (Task 1 commit)

**2. [Rule 2 - Missing Critical] Added dotenv for seed script**
- **Found during:** Task 2
- **Issue:** tsx does not auto-load .env.local, seed script fails without env vars
- **Fix:** Added dotenv dependency and explicit .env.local loading in seed.ts
- **Files modified:** src/lib/db/seed.ts, package.json
- **Verification:** `npx tsx src/lib/db/seed.ts` succeeds
- **Committed in:** f093c9e (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing critical)
**Impact on plan:** Both fixes necessary for correct execution. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## Known Stubs
None. All test stubs are intentional Wave 0 placeholders per VALIDATION.md -- they will be replaced with real integration tests as features are implemented.

## User Setup Required
None - no external service configuration required. Local SQLite database is auto-created.

## Next Phase Readiness
- Auth backend complete, ready for login UI (Plan 02) and dashboard shell (Plan 03)
- Database schema ready for case and document management
- Theme established for all UI components
- Test framework operational for future integration tests

## Self-Check: PASSED

- All 13 key files: FOUND
- Commit 8efdcce (Task 1): FOUND
- Commit f093c9e (Task 2): FOUND
- Vitest: 9/9 tests passing across 4 files
- local.db: EXISTS with seeded user

---
*Phase: 01-foundation*
*Completed: 2026-03-29*
