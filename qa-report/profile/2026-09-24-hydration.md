# Google restoration and premature profile onboarding

- Restored disabled Google / Đang phát triển button removed during popup redesign; verified visible on production.
- User reports Chrome macOS opens profile wizard before account name can be inspected. Chrome is not available to the current browser connector, so personal history recovery is not verified.
- Confirmed code race: ProfileModal auto-opened after 600ms based only on loggedIn and absent local profile. Cloud account download was not awaited.
- Added explicit first-successful-download state. Automatic captive onboarding now waits for auth resolution and valid cloud data. Download failure keeps it from forcing new profile entry. Existing local preview behavior retained.
- No account merging, data migration or production profile/history writes performed.
- Read-only aggregate D1 inspection shows stored user_data includes Zalo-scoped data. This is not proof that the reporting user's full history exists remotely.
- Older auth code only synchronized via Supabase token, so past Zalo login alone did not guarantee cloud backup.
- 33 sync/backend/frontend tests passed before addition of two modal-specific integration tests; those two also pass. Next production build passes.
- Remaining verification: user reloads Chrome, confirms account name, sync status and expected saved history. Never clear browser storage as a troubleshooting step here.
