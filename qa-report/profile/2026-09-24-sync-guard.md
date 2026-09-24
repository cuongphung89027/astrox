# Account recovery and sync data-loss protection

## Root causes and confirmed bounds
- Profile onboarding previously assumed absence after 600ms without awaiting cloud hydration (fixed in prior release).
- Old versions only synchronized Supabase data; a Zalo login did not establish ownership/linkage of a legacy Supabase record.
- Reproduced a data-loss path: when local profile becomes null while a saved base contains a profile, three-way merge treats null as an edit; the server previously accepted it at the current revision. The exact historical action that first cleared this user's profile is not proven.

## Recovery
Operator confirmed the identified legacy record belongs to them and authorized copying its profile and preserving both histories. Both rows were privately backed up. A compare-and-swap update guarded source and target revisions. The legacy row is untouched. The merged target retains all text-bearing AI readings from both inputs, archiving conflicts rather than replacing their text. Read-back verification confirms restored profile, five cache groups and 177 distinct text-bearing readings retained. No accounts or authentication identities were linked; this is authorized data recovery only.

Initial CLI SQL import failed on D1 statement-length limit without applying. Recovery then used the existing authenticated Cloudflare D1 API with bound parameters and the same revision guards. No credential or private payload is stored in this repository.

## Prevention
- Frontend does not interpret an empty local profile as permission to erase a saved remote profile.
- Backend independently preserves saved profile/chart fields on empty profile uploads, merges AI cache entries, archives conflicting reading text, retains Tarot rows and unions deletion markers.
- SQL trigger records the previous payload on changes; retains the five latest previous revisions per account. Writes and backups are atomic. Backups are not exposed through the user-data API.
- Unchanged uploads retain their revision to avoid unnecessary writes/backups.
- Captive onboarding waits for successful authenticated cloud download. Existing stale-session cancellation, per-account storage and optimistic concurrency tests remain passing.

## Verification
- Reproduced failures before fixes for empty profile overwrite and dropped reading history.
- 200 backend/admin/reward/frontend tests pass; production build and Worker dry run pass.
- Database recovery read-back verifies source unchanged, profile restored, and every expected reading text retained.
- Chrome native accessibility confirmed the user was signed in; further browser interaction stopped when the user changed Chrome. No private fields filled or browser storage cleared.

## Limits
This prevents the reproduced loss paths; it is not an absolute guarantee against all failures. Cross-provider recovery is never automatic based only on names/cache similarity. User confirmation was required here. Previously stored data that never reached any server or surviving device cannot be reconstructed by this change. The separately approved temporary Zalo browser identity security exception is unchanged.
