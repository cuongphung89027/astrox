# Google OAuth Activation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Activate basic Google sign-in with AstroX branding and support identity, with accurate Vietnamese and English privacy disclosures.

**Architecture:** Reuse the current state/PKCE/nonce OIDC backend and custom API domain. Configure the Google provider and existing versioned Admin integration without changing wallet, market or Zalo semantics. Add factual disclosures matching the existing Google identity storage before requesting brand verification.

**Tech Stack:** Google Auth Platform, Cloudflare Worker/D1/Pages, Next.js, TypeScript.

---

Owner: root. Dedicated branch/worktree codex/google-auth-setup; base 2d2b8bcdfeb02743b51a58c9ad2ba6b6e55d99d4. Production credentials stay outside Git, screenshots and chat.

### Task 1: Google provider configuration

1. Verify support@theastrox.space Google identity, grant only the approved project role, and sign into the project as that identity.
2. Complete External audience setup and basic app configuration. Obtain action-time confirmation for binding agreements.
3. Configure AstroX name, existing logo, homepage https://theastrox.space/en, privacy https://theastrox.space/en/terms#privacy, terms https://theastrox.space/en/terms, authorized domain theastrox.space.
4. Create web client with callback https://api.theastrox.space/auth/google/callback. Preserve basic openid/email/profile only. Handle credential creation/access confirmation at the concrete form.
5. Verify domain through an additive TXT record; preserve existing Microsoft mail DNS. Verify and publish branding when eligible.

### Task 2: Privacy disclosures

**Files:**
- Modify web/src/components/shell/TermsContent.tsx (Vietnamese and English privacy sections, dated document metadata).
- Modify web/src/lib/terms.ts (version to 2026-10-04-r5 so prior consent does not silently cover the new Google disclosure).

1. Inspect CodeGraph callers/impact and existing consent tests before changes.
2. Add matching disclosures: Google identifier, verified email, name and avatar are used for account authentication/profile; basic scopes only; no Gmail, Drive or contacts access. Account fields stored on Cloudflare infrastructure; retention/deletion follows existing policy and support requests. No sale or use for advertising. Google API Services User Data Policy and Limited Use link provided.
3. Keep pricing/refunds/other legal provisions intact. Do not invent a new retention duration or claim unverified data practices.
4. Verify changed TSX/TypeScript with formatting, typecheck and production build. Reuse existing consent checks; do not add tests that merely repeat static copy.
5. Inspect both rendered legal pages and the consent version transition before release.

### Task 3: Runtime activation and release

1. Install only Google client values via supported secret/environment flow, without printing values. Preserve SESSION_SECRET and all unrelated bindings.
2. Publish existing Admin integrations.google values using the supported versioned config protocol, preserving other settings and prompts.
3. Verify local/CI checks and exact clean release commit; obtain any necessary production approval on concrete preview/config evidence.
4. Deploy Worker and Pages from the same commit. No D1 schema migration expected; inspect before applying anything.
5. Verify production login redirect, exact custom callback, basic scopes, consent brand and authenticated return with user consent where required. Record deployment IDs and rollback config/revision, and distinguish external brand review from completed login behavior.

Execution remains in this user-authorized task with root as integration/release owner. No new task or subagent required.
