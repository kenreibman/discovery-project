# Phase 1: Foundation - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Project scaffold, database schema, authentication, and security baseline. Jessica can log in securely, see a Claude-inspired dashboard with sidebar navigation, and no confidential data is exposed to unauthenticated users. No file upload processing or AI generation in this phase — just the shell and auth.

</domain>

<decisions>
## Implementation Decisions

### Login Page Design
- **D-01:** Ultra-minimal login page — centered card with email + password fields, subtle app name only. No logo, no firm branding, no tagline. Modeled after Claude's auth screen.
- **D-02:** Warm neutral color scheme — cream/beige tones like Claude's UI with dark text. Approachable and professional for a legal tool.
- **D-03:** Inline subtle error handling — small red text below the field for wrong credentials. Non-disruptive, no toast notifications on login.

### Post-Login Dashboard
- **D-04:** Claude-inspired layout — centered main area with left sidebar. Main area has greeting + upload drop zone. Sidebar lists previous cases.
- **D-05:** Single drop zone for file upload — one large drag-and-drop area in the center (like Claude's input box). Jessica drops both complaint and discovery request files here; system figures out which is which. (Upload processing itself is Phase 2 — Phase 1 just renders the UI shell.)
- **D-06:** Time-of-day greeting — "Good morning/afternoon/evening, Jessica" with a functional subtitle like "Upload a complaint and discovery request to get started."
- **D-07:** Sidebar shows case entries by case name + date (e.g., "Swan v. Dollar Tree — Mar 4"). Clicking opens that case's responses. Modeled after Claude's conversation list.
- **D-08:** Empty sidebar state — subtle "No cases yet" text. Unobtrusive, lets the main upload zone speak.

### Database Schema
- **D-09:** Auth tables plus case stubs — create users, sessions, accounts tables for Auth.js, plus case and document tables with basic columns. Phase 2 extends them rather than creating from scratch.
- **D-10:** Auto-naming from PDF — system will extract case name from uploaded documents (e.g., "Swan v. Dollar Tree"). Jessica can rename later. Schema should support a `name` field on cases that's initially null/auto-populated.

### Session & Security
- **D-11:** 30-day session duration — Jessica uses this daily on her own machine, frequent re-login would be annoying.
- **D-12:** Silent redirect on session expiry — quietly redirect to login page with no alarming error messages. After login, return to where she was.
- **D-13:** Subtle logout button — small logout option in sidebar or settings area. Present when needed, not prominent.

### Claude's Discretion
- Technical implementation patterns (folder structure, component organization, state management)
- Specific shadcn/ui component choices
- Tailwind color palette exact values (within the warm neutral direction)
- Auth.js configuration details
- Drizzle schema column types and constraints

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Specs
- `.planning/PROJECT.md` — Core value, constraints, key decisions, client context
- `.planning/REQUIREMENTS.md` — AUTH-01 through AUTH-05 requirements for this phase
- `.planning/ROADMAP.md` — Phase 1 success criteria and dependency info

### Tech Stack
- `CLAUDE.md` §Technology Stack — Full recommended stack with versions, alternatives considered, and rationale

### Benchmark Documents
- `samples/2026-3-4 Swan Discovery Responses.docx` — Jessica's filed RFP responses (benchmark for voice/formatting)
- `samples/2026-3-4 Swan Interrogatory Responses.docx` — Jessica's filed interrogatory responses (benchmark)

### Design Reference
- Claude's web UI (claude.ai) — Primary design inspiration for auth screen, dashboard layout, sidebar navigation, and overall aesthetic

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing codebase

### Established Patterns
- None yet — Phase 1 establishes all patterns (folder structure, component conventions, styling approach)

### Integration Points
- Vercel deployment pipeline (to be configured)
- Turso database connection (to be configured)
- Auth.js middleware for route protection

</code_context>

<specifics>
## Specific Ideas

- **Claude's web UI as primary design reference** — auth screen, main layout, sidebar, greeting pattern, overall warm/clean aesthetic. This is the north star for the entire app's look and feel, not just Phase 1.
- **Time-of-day greeting** — dynamically changes based on local time (morning/afternoon/evening)
- **Single unified drop zone** — like Claude's input box, one area for all files rather than separate upload fields

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-29*
