# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-29
**Phase:** 01-foundation
**Areas discussed:** Login page design, Post-login dashboard, Database schema scope, Session & security behavior

---

## Login Page Design

### Branding Level

| Option | Description | Selected |
|--------|-------------|----------|
| Ultra-minimal | Centered card with email + password, subtle app name. No logo/tagline — like Claude's login. | :heavy_check_mark: |
| Light branding | Centered card with small app name/icon at top. Still very clean. | |
| Firm-branded | Massimi Law PLLC branding, logo, firm colors. | |

**User's choice:** Ultra-minimal
**Notes:** User explicitly wants UI modeled after Claude's web UI.

### Color Scheme

| Option | Description | Selected |
|--------|-------------|----------|
| Warm neutral | Cream/beige tones like Claude's UI. Approachable and professional. | :heavy_check_mark: |
| Cool neutral | Light grays/whites with blue accents. Traditional SaaS feel. | |
| Dark mode | Dark background with light text. | |
| You decide | Claude's discretion. | |

**User's choice:** Warm neutral
**Notes:** None

### Login Error Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Inline subtle | Small red text below field, like Claude's error states. | :heavy_check_mark: |
| Toast notification | Brief toast/banner at top. Disappears after seconds. | |
| You decide | Claude's discretion. | |

**User's choice:** Inline subtle
**Notes:** None

---

## Post-Login Dashboard

### Upload Experience

| Option | Description | Selected |
|--------|-------------|----------|
| Single drop zone | One large drag-and-drop area in center. System figures out file types. | :heavy_check_mark: |
| Two labeled drop zones | Separate areas for complaint and discovery request. More explicit but busier. | |
| Button-triggered | "New Case" button opens modal with file pickers. | |

**User's choice:** Single drop zone
**Notes:** Like Claude's input box — one unified area.

### Sidebar Organization

| Option | Description | Selected |
|--------|-------------|----------|
| Case name + date | Each entry is a case (e.g., "Swan v. Dollar Tree — Mar 4"). Like Claude's conversation list. | :heavy_check_mark: |
| Per-document entries | Each entry is a specific response set (e.g., "Swan RFPs", "Swan Interrogatories"). | |
| You decide | Claude's discretion. | |

**User's choice:** Case name + date
**Notes:** None

### Empty Sidebar State

| Option | Description | Selected |
|--------|-------------|----------|
| Subtle empty text | Small "No cases yet" text. Unobtrusive. | :heavy_check_mark: |
| Guided prompt | Brief tip with arrow toward main area. | |
| You decide | Claude's discretion. | |

**User's choice:** Subtle empty text
**Notes:** None

### Greeting Tone

| Option | Description | Selected |
|--------|-------------|----------|
| Warm + functional | "Good morning, Jessica." with functional subtitle. | :heavy_check_mark: |
| Minimal | Just app name, no personal greeting. | |
| You decide | Claude's discretion. | |

**User's choice:** Warm + functional
**Notes:** User specified greeting should change depending on time of day (morning/afternoon/evening).

---

## Database Schema Scope

### Schema Breadth

| Option | Description | Selected |
|--------|-------------|----------|
| Auth + case stubs | Auth tables plus empty case/document tables with basic columns. Phase 2 extends them. | :heavy_check_mark: |
| Auth only | Only users and sessions. Phase 2 creates everything else. | |
| Full schema upfront | All tables now. Risk of schema changes. | |
| You decide | Claude's discretion. | |

**User's choice:** Auth + case stubs
**Notes:** None

### Case Naming

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-name from PDF | System extracts case name from document. Jessica can rename later. | :heavy_check_mark: |
| Manual naming | Jessica types a case name when uploading. | |
| You decide | Claude's discretion. | |

**User's choice:** Auto-name from PDF
**Notes:** None

---

## Session & Security Behavior

### Session Duration

| Option | Description | Selected |
|--------|-------------|----------|
| 30 days | Stay logged in for a month. Daily use on own machine. | :heavy_check_mark: |
| 7 days | Weekly re-login. More secure. | |
| Until browser close | Session ends when browser closes. | |
| You decide | Claude's discretion. | |

**User's choice:** 30 days
**Notes:** None

### Session Expiry Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Silent redirect | Quietly redirect to login. Return to previous page after login. | :heavy_check_mark: |
| Gentle notice | Brief "session expired" message before redirect. | |
| You decide | Claude's discretion. | |

**User's choice:** Silent redirect
**Notes:** None

### Logout Button

| Option | Description | Selected |
|--------|-------------|----------|
| Subtle but present | Small option in sidebar or settings area. There when needed, not prominent. | :heavy_check_mark: |
| No logout button | Skip it — single user can clear cookies. | |
| You decide | Claude's discretion. | |

**User's choice:** Subtle but present
**Notes:** None

---

## Claude's Discretion

- Technical implementation patterns (folder structure, component organization)
- Specific shadcn/ui component choices
- Tailwind color palette exact values
- Auth.js configuration details
- Drizzle schema column types and constraints

## Deferred Ideas

None — discussion stayed within phase scope.
