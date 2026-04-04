---
phase: 4
slug: rfp-response-generation
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-03
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-T1 | 01 | 1 | RFP-01, RFP-02 | unit | `npx vitest run src/__tests__/generation-schema.test.ts --reporter=verbose` | W0 (created by task) | pending |
| 04-01-T2 | 01 | 1 | RFP-03, RFP-04, RFP-05, RFP-06 | unit | `node -e "const m = require('fs').readFileSync('src/lib/generation/prompt.ts','utf8'); const has = (s) => m.includes(s); if(!has('export function buildGenerationPrompt')) process.exit(1); if(!has('attorney-client privilege')) process.exit(1); if(!has('Without waiving any objection')) process.exit(1); console.log('PASS');"` | W0 (created by task) | pending |
| 04-02-T1 | 02 | 2 | RFP-01, RFP-02, RFP-05, RFP-06 | unit | `npx vitest run src/__tests__/generate.test.ts --reporter=verbose` | W0 (created by task) | pending |
| 04-02-T2 | 02 | 2 | RFP-01 | integration | `npx vitest run --reporter=verbose` | exists (extends cases.ts) | pending |
| 04-03-T1 | 03 | 3 | RFP-01, RFP-02, RFP-03, RFP-04, RFP-05, RFP-06 | integration | `npx vitest run --reporter=verbose && node -e "const fs=require('fs'); const gr=fs.readFileSync('src/components/generated-response.tsx','utf8'); if(!gr.includes('JSON.parse')) process.exit(1); if(!gr.includes('Produced All')) process.exit(1); console.log('PASS');"` | W0 (created by task) | pending |
| 04-03-T2 | 03 | 3 | RFP-01, RFP-03 | checkpoint | Manual: human-verify generation flow, voice quality, streaming UX | N/A (checkpoint) | pending |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

- [x] Test stubs for RFP-01 through RFP-06 (created inline by Plan 01 Task 1 TDD and Plan 02 Task 1 TDD)
- [x] Shared fixtures for Claude API mocking and database seeding (pattern exists from Phase 3 extract.test.ts)

*Existing vitest infrastructure from Phase 3 covers framework installation.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Voice quality matches Jessica's patterns | RFP-03 | Subjective quality assessment | Compare generated objection text against Swan case responses verbatim |
| Streaming progress UX | RFP-01 | Visual UI behavior | Trigger generation, observe "X/Y generated" counter updates in real-time |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 15s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** complete
