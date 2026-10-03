# Palm full flow verification — 2026-10-03

Owner/integration/release: Codex root. Base: `6c43b3b871a3e48fdb124169cdc1bc084bcc24a7`.
Branch: `codex/palm-full-flow`. Worktree is isolated; the original checkout and its dirty files were not modified.
Scope: Palm capture/photo quality, structured observations, review/results, text-only follow-up, manual device history and two-hand comparison. Shared prompt integration is owned by root. No pricing, navigation, authentication, database schema or published Admin configuration changes.

## Product acceptance

- Capture opens only after a user action. Auto-capture waits for stable fresh hand detection and lighting/sharpness/framing checks; manual capture rechecks pixels. Native phone camera and upload actions remain available. Abort, GPU/CPU fallback, late model cleanup and frozen-frame guards are preserved.
- Camera and uploaded/native photos use the same local pixel/framing assessment. Dark/overexposed/small/missing/clipped/distant-hand cases have explicit recovery. Blur and unavailable detection produce review guidance. Native HEIC decoding is attempted; unsupported browsers get a conversion/native-camera message.
- Results show visible observations, qualitative visibility, uncertainty and traditional interpretation separately. Empty interpretations and invalid schemas are rejected. No crease overlay or confidence percentage is shown; finger landmarks are never treated as creases.
- Follow-up uses `palm.followup.v1` under the same palm service and server-owned pricing/consent. The request has one text part and no image. The initial reading remains available during errors/cancellation. Account/locale changes remount the entire session and abort old work.
- History is saved only by an explicit user action. Whitelist serialization stores at most 20 readings and no photo/geometry; account namespace and locale are isolated. Storage failures do not report success. Saved results reopen without a new AI request and can start a new capture.
- Adding the other hand preserves the first snapshot; comparison also selects the opposite hand from saved readings. Each hand retains its own observations, uncertainty and interpretation. Comparison never starts an additional AI request.

## Evidence

- Full suite: 619 unit/integration tests plus 22 library tests (641 total); 79 complete rendered prompt roundtrips. Focused tests cover abort cleanup, retake gates, HEIC normalization, old published templates, account isolation, quota errors, text-only follow-up and comparison/reopening.
- Typecheck, lint (0 errors, 20 existing warnings), Knip, backend/Admin format check, production static build and `git diff --check` passed. CodeGraph synchronized after source edits. The temporary local QA route was removed and is absent from the export.
- Browser QA used fictional readings and a loopback fixture API, with no real palm image or charge: VI and EN save/reopen, text-only follow-up, uncertainty and opposite-hand comparison. Widths 320 and 390 have no horizontal overflow; desktop 1440 also exercised. No browser console errors in the exercised local flow. Fixture API records only descriptor/locale/hasImage metadata and confirms follow-up hasImage=false in both locales.
- Screenshots and logs: `/Users/Thsonjpg/.codex/visualizations/2026/10/03/01a0ff65-7874-7550-abcb-1239895f6211/palm-full-flow/`.
- D1 was inspected read-only: latest published version 8, draft revision 12, zero rows written. No migration or published prompt history rewrite is needed; runtime guidance supplements existing published templates.

## Limits and rollback

Photo quality thresholds are heuristics, not a scientific palm-line detector. Real-palm inference quality, physical iPhone/Android/OPPO camera selection, permissions and torch/focus behavior are not certified by fixture/browser tests. Real payment and authenticated production booking were not exercised; existing wallet/authorization/booking regressions passed in the full suite.

Release receipts, CI, exact SHA, production HTTP/API checks and deployment IDs are recorded in the external `release-report.json` after release. Rollback code is the base SHA above; previous Worker version `8c23887c-f39f-415d-b54c-85820329928b`, Pages deployment `4304e8cb-aa67-4f29-b427-b80e23a9e7a4`. No database rollback is required.
