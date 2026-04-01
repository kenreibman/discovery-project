---
phase: 2
slug: file-upload
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-01
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | UPLD-01, UPLD-02, UPLD-06 | unit | `npx vitest run && node -e "const pkg=require('./package.json');..."` | Yes (created in task) | ⬜ pending |
| 02-01-02 | 01 | 1 | UPLD-01, UPLD-02, UPLD-06 | integration | `npx tsc --noEmit && npx vitest run --reporter=verbose` | Yes | ⬜ pending |
| 02-02-01 | 02 | 2 | UPLD-01, UPLD-02 | compile | `npx tsc --noEmit` | n/a (UI components) | ⬜ pending |
| 02-02-02 | 02 | 2 | UPLD-01, UPLD-02 | compile | `npx tsc --noEmit` | n/a (UI components) | ⬜ pending |
| 02-03-01 | 03 | 3 | UPLD-01, UPLD-02, UPLD-06 | compile | `npx tsc --noEmit` | n/a (UI components) | ⬜ pending |
| 02-03-02 | 03 | 3 | UPLD-01, UPLD-02 | compile | `npx tsc --noEmit` | n/a (UI components) | ⬜ pending |
| 02-03-03 | 03 | 3 | — | build | `npm run build` | n/a (checkpoint) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `vitest` + `@testing-library/react` — installed in Plan 01 Task 1
- [x] `src/__tests__/upload.test.ts` — stubs for UPLD-01, UPLD-02, UPLD-06 (created in Plan 01 Task 1)
- [x] `src/__tests__/upload-security.test.ts` — stubs for upload security (created in Plan 01 Task 1)
- [x] `src/__tests__/cases.test.ts` — stubs for case CRUD (created in Plan 01 Task 1)
- [x] `vitest.config.ts` — vitest configuration (created in Plan 01 Task 1)

*Wave 0 is folded into Plan 01 Task 1 — no separate Wave 0 plan needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Drag-and-drop upload works in browser | UPLD-01 | Requires real browser interaction | Open dashboard, drag PDF onto drop zone, verify upload starts |
| Vercel Blob stores file securely | UPLD-01 | Requires deployed Vercel Blob store | Upload file, verify blob URL is private, unauthenticated GET returns 403 |
| Claude classification detects document type | UPLD-02 | Requires Claude API call | Upload complaint PDF and RFP PDF, verify types are correctly detected |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready
