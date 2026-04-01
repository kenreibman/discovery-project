---
phase: 2
slug: file-upload
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts (or "none — Wave 0 installs") |
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
| 02-01-01 | 01 | 1 | UPLD-01 | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | UPLD-02 | integration | `npx vitest run` | ❌ W0 | ⬜ pending |
| 02-01-03 | 01 | 1 | UPLD-06 | unit | `npx vitest run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest` + `@testing-library/react` — install test framework if not present
- [ ] `src/__tests__/upload.test.ts` — stubs for UPLD-01, UPLD-02, UPLD-06
- [ ] `vitest.config.ts` — vitest configuration

*If none: "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Drag-and-drop upload works in browser | UPLD-01 | Requires real browser interaction | Open dashboard, drag PDF onto drop zone, verify upload starts |
| Vercel Blob stores file securely | UPLD-01 | Requires deployed Vercel Blob store | Upload file, verify blob URL is private, unauthenticated GET returns 403 |
| Claude classification detects document type | UPLD-02 | Requires Claude API call | Upload complaint PDF and RFP PDF, verify types are correctly detected |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
