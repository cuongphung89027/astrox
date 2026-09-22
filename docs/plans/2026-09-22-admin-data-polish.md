# Admin data usability implementation plan

Goal: Finish usable data browsing within the approved redesign Admin scope.
Architecture: A reusable client table backed by existing authenticated responses; pure helpers for filtering, stable sorting, pagination and CSV export. No fabricated production rows or changes to wallet authority.
Tech stack: React, CSS Modules, TypeScript, node:test, Playwright.

1. Write failing tests for Vietnamese search, exact status filtering, numeric sorting, page bounds and spreadsheet-safe CSV escaping.
2. Implement pure helpers in services/admin/table.ts.
3. Extract AdminDataTable with search, status filter, sortable columns, pagination, expandable full-row details and export of filtered loaded rows. Keep backend limits explicit in UI.
4. Add refresh to operational data and audit views, preserving unsaved config; handle loading/errors honestly.
5. Test actual browser interactions with local-only fixture responses, then existing Admin flows, TypeScript/lint/build. Document verified scope.

Implemented: shared table helpers + extracted table component, refresh controls, report source selector (aggregate/rewards/AI), read-only browser fixture verification. Table keeps readable columns with internal horizontal scrolling on mobile; entire page stays within viewport. Local credential provided directly to user on request, never written into source.

Verification: 66 Node tests passed; TypeScript and targeted ESLint passed; full existing Admin browser flows passed. Data browser flow verifies search, pagination, status, sorting, row details, CSV contents, refresh and source switching. No production data mutation or deployment.
