---
phase: 01-foundation
plan: 03
subsystem: ui
tags: [next.js, react, dashboard, sidebar, auth, tailwind, shadcn-ui, lucide]

# Dependency graph
requires:
  - phase: 01-foundation-01
    provides: "Auth system (auth.ts, auth.config.ts, middleware), DB schema, global CSS with theme variables"
  - phase: 01-foundation-02
    provides: "Login page with credentials flow, inline error handling"
provides:
  - "Protected dashboard layout with sidebar navigation"
  - "Time-of-day greeting component"
  - "Upload drop zone shell with drag-hover visual feedback"
  - "Sidebar with case list empty state and logout"
  - "Root route redirect to /dashboard"
affects: [02-pdf-upload, 03-ai-generation, 06-review-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "(protected) route group with server-side auth check"
    - "Client components for interactive UI (greeting, drop zone, sidebar)"
    - "Edge-compatible middleware using auth.config.ts directly"

key-files:
  created:
    - src/app/(protected)/layout.tsx
    - src/app/(protected)/dashboard/page.tsx
    - src/components/dashboard-greeting.tsx
    - src/components/upload-zone-shell.tsx
    - src/components/sidebar-nav.tsx
  modified:
    - src/app/page.tsx
    - src/middleware.ts
    - next.config.ts

key-decisions:
  - "Middleware imports auth from auth.config.ts directly for edge runtime compatibility"
  - "serverExternalPackages for @libsql/client in next.config.ts for Turbopack compatibility"

patterns-established:
  - "Protected layout pattern: server component calls auth(), redirects if no session"
  - "Client component pattern: 'use client' for interactive UI with useState for visual states"
  - "Sidebar 280px fixed width with flex-col layout, sticky bottom logout"

requirements-completed: [AUTH-02, AUTH-03, AUTH-04, AUTH-05]

# Metrics
duration: 15min
completed: 2026-03-30
---

# Phase 01 Plan 03: Dashboard Shell Summary

**Claude-inspired dashboard with 280px sidebar (case list empty state, logout), time-of-day greeting, and drag-hover upload drop zone shell**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-30T00:55:00Z
- **Completed:** 2026-03-30T01:10:00Z
- **Tasks:** 2 (1 auto + 1 checkpoint verification)
- **Files modified:** 8

## Accomplishments
- Dashboard layout with sidebar navigation and centered 640px content area matching UI-SPEC
- Time-of-day greeting ("Good morning/afternoon/evening, Jessica") with upload prompt subtitle
- Upload drop zone shell with dashed border, hover/drag-over visual feedback, and file picker
- Sidebar with "Discovery Drafter" header, "No cases yet" empty state, and subtle logout button
- Root route (/) redirects to /dashboard
- Edge runtime and Turbopack compatibility fixes for middleware and @libsql/client

## Task Commits

Each task was committed atomically:

1. **Task 1: Create dashboard layout with sidebar, greeting, drop zone shell, and logout** - `6ab6c19` (feat)
2. **Runtime fixes: Edge runtime and Turbopack compatibility** - `5ce85b9` (fix)

**Task 2:** Checkpoint (human visual verification) - approved, no commit needed.

**Plan metadata:** (pending final docs commit)

## Files Created/Modified
- `src/app/(protected)/layout.tsx` - Protected layout with auth check, sidebar + main content
- `src/app/(protected)/dashboard/page.tsx` - Dashboard page with greeting and drop zone
- `src/components/dashboard-greeting.tsx` - Time-of-day greeting client component
- `src/components/upload-zone-shell.tsx` - Drop zone with drag-hover visual feedback
- `src/components/sidebar-nav.tsx` - Sidebar with case list, logout, 280px width
- `src/app/page.tsx` - Root redirect to /dashboard
- `src/middleware.ts` - Fixed to import auth from auth.config.ts (edge runtime)
- `next.config.ts` - Added serverExternalPackages for @libsql/client

## Decisions Made
- Middleware must import from auth.config.ts (not auth.ts) because auth.ts uses DrizzleAdapter which requires Node.js runtime, incompatible with edge middleware
- Added @libsql/client to serverExternalPackages in next.config.ts to resolve Turbopack bundling issues

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Edge runtime middleware fix**
- **Found during:** Task 2 (visual verification / dev server testing)
- **Issue:** Middleware importing auth from auth.ts failed at runtime because auth.ts includes DrizzleAdapter which requires Node.js APIs unavailable in edge runtime
- **Fix:** Changed middleware to import NextAuth with auth.config.ts directly (edge-safe config without adapter)
- **Files modified:** src/middleware.ts
- **Verification:** Dev server runs without runtime errors, auth redirects work
- **Committed in:** 5ce85b9

**2. [Rule 3 - Blocking] Turbopack @libsql/client compatibility**
- **Found during:** Task 2 (visual verification / dev server testing)
- **Issue:** Turbopack could not bundle @libsql/client, causing build/dev errors
- **Fix:** Added serverExternalPackages: ["@libsql/client"] to next.config.ts
- **Files modified:** next.config.ts
- **Verification:** Dev server starts and database operations work correctly
- **Committed in:** 5ce85b9

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes necessary for runtime functionality. No scope creep.

## Issues Encountered
- Edge runtime incompatibility with DrizzleAdapter in middleware - resolved by splitting auth config (auth.config.ts for edge, auth.ts for server)
- Turbopack bundling issue with @libsql/client native bindings - resolved via serverExternalPackages

## User Setup Required
None - no external service configuration required.

## Known Stubs
- Upload drop zone is a visual shell only - file selection triggers file picker but does not process files (intentional; wired in Phase 2 PDF upload plan)
- Sidebar case list hardcoded to "No cases yet" empty state (intentional; wired when case management is implemented)

## Next Phase Readiness
- Complete Phase 1 auth + UI foundation is in place
- Protected routes, session management, login/logout flow all verified end-to-end
- Dashboard shell ready to receive PDF upload functionality (Phase 2)
- Sidebar ready to receive case list data (future phase)

## Self-Check: PASSED

All 8 files verified present. Both commits (6ab6c19, 5ce85b9) verified in git log.

---
*Phase: 01-foundation*
*Completed: 2026-03-30*
