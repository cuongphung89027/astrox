# English/US execution progress

Branch `codex/english-us`, worktree `../astrox-english-us`. Base `db614b2` (= origin/main 28/09). Doc commits 80d3322 kept verbatim. All commits local/unpushed.

| Task | Commit | Status |
|---|---|---|
| 01 Inventory/baseline | 8a68b15 | DONE — G0 PASS (CSV 142 rows, baseline all exit 0, 383 tests) |
| 02 markets.ts contract | cae374d | DONE — 10+2 tests, route map/crossLocalePath |
| 03 i18n + dual root layouts | a97b54c | DONE — (vi)/ group + en/ wrappers (13), lang ok in export |
| 04 geo routing + SEO | 5c8d90e | DONE — [[path]].js AX_EN_ROUTING flag (kill switch), entryLocale, sitemap 25 urls, hreflang, robots /en/profile |
| 05 shell/UI localization | cadddd4 | DONE — nav.ts builders, dict ~170 keys, 13 components, LanguageSwitcher in topbar, dock/sheet/wizard/account localized |

## Verification state after Task 05
- `npm --prefix web run test:unit` → 418/418 pass.
- typecheck clean; lint 19 warnings = baseline set (format debt on services/ is PRE-EXISTING at db614b2 — 21 files, do not "fix" casually; plan Task 22 handles).
- Build exports 34 HTML routes (20 VI + 13 EN + _not-found).
- Key facts: web tests run from repo root via `web/package.json test:unit` glob; components localize via `useLocale()` from `@/i18n/LocaleProvider`; nav labels/routes ONLY via `web/src/lib/nav.ts` + `services/admin/markets.ts` (never hardcode hrefs).
- LoginPrompt on EN still shows Zalo primary + Google disabled ("Coming soon") — Google arrives Task 11–12.
- hourChi + VN_PROVINCES in ProfileModal still VI-only → Task 06 replaces birth place/hour input.

| 06 International birth inputs | 471a947 | DONE — birth-time.ts (Intl, DST gap/ambiguity, wallTimeCandidates), birth-location.ts (VN/US/world + resolveProfileZone), zodiac natalTime zone-aware, batu VN-true-solar kept + foreign civil path, Profile placeTz/birthDst fields, EN wizard place+zone+time+DST UI, birth-rules doc; 12+tests |
| 07 Prompts/runtime/cache by locale | 588c738 | DONE — english-prompts.ts (EN system + 34 templates + 70 tasks, full coverage enforced), renderServicePrompt locale strict (EN_PROMPT_MISSING fail-closed), runtime EN system/policy/repair (Han≥4 only), integration-api locale enum + promptsEn config merge + digest includes locale, client localeCacheKey + body.locale + aiServiceIdForPath; 443/443 |

## Key implementation facts (Tasks 06–07)
- EN AI path: `input.locale==='en'` → English system + ENGLISH_READING_POLICY only (admin VI prompts skipped); prompt settings = defaultEnglishPromptSettings() merged with `c.promptsEn` (Task 19 wires Admin editor). EN request never falls back to VI template (strict render throws EN_PROMPT_MISSING).
- EN language repair triggers ONLY on Han runs ≥4 chars; Latin Vietnamese names legit. Policy version en-reading-1 returned on results.
- Cache: EN readings use `en::` key prefix via state.localeCacheKey; callers (Tasks 08–10) must use it + pass locale to callAiText.
- Birth: profile.placeTz (IANA) + profile.birthDst('first'|'second'); resolveProfileZone default Asia/Ho_Chi_Minh keeps legacy charts byte-identical.

| 08 Astrology engines EN | 7f47075 | DONE — astrology-en.ts labels; iztro en-US charts; batu Han-keyed EN tables + civil path; zodiac EN signs/planets/aspects + US_STATE_COORDS + degraded no-coords natal; components threaded (tuvi tabs/topics/period, batu, zodiac). NOTE: plan wanted 3 per-module commits; combined commit (recorded deviation). |
| 09 Divination EN | 7d37437 | DONE — divination-en.ts (spreads/decks/8 trigrams/64 hexagrams/numerology/compat); KdResultPanel EN hexagram names; parity tests. |
| 10 Calendar/palm EN | 5d3cf75 | DONE — almanac dateLabel/holidays/tradition locale params (gods/terms glosses); palm prompt EN lives in english-prompts.ts (Task 07). |

## G2 status note (honest)
Engine/label/locale plumbing for all 9 modules DONE (458/458 tests). REMAINING before G2 can pass: per-component EN pass over decorative panel copy (LunarCalendar 946 lines, PalmReader, TopicsPanel hints, compat/numerology/kinhdich client strings) — EN pages render EN charts/prompts/tabs but some panel strings remain VI. Task 21 certification must FAIL those rows; finish copy pass before RC.

| 11 Google identity backend | 8c2f76d + 6c92b7a | DONE — google-identities.sql (nonce col + DROP idx_app_users_email vì email không phải khóa; zalo_identities tái dụng làm identity abstraction với UNIQUE(provider,provider_subject)); google-auth.mjs (state+PKCE+nonce single-use, tokeninfo verify + aud/iss/exp/nonce/email_verified local assert, no auto-link, atomic first login); routes /auth/google/{login,callback}; settings integrations.google (config.mjs + admin/config.ts default + legacy import merge); 9 tests. |
| 12 Client Google + namespace | f226234 | DONE — /api/me trả provider; accountOwner() `google:`/`zalo:` namespace (legacy zalo keys byte-identical); googleLogin() qua AUTH_API_BASE; LoginPrompt EN: Continue with Google chính, ẩn Zalo; VI giữ nguyên; 3 tests. |
| 13 US Credits ledger | 69fa0f9 | DONE — us-credits.sql (credits_accounts CHECK, credit_lots, credits_ledger UNIQUE(user,kind,op_key), market_preferences); credits.mjs reserve/commit/release exactly-once + FIFO lots + audit SUM(delta) + market setter chặn khi reserved>0; routes /api/credits/{balance,history} + /api/market; 8 tests real SQLite (AI-01 concurrency pass). |
| 14 Market billing — PART 1 ONLY | 4c398ac | PARTIAL — market-ai-operations.sql (market col VN default trên backend_ai_operations + service_unlock_operations); quoteUnlock/reserveUnlock/completeUnlock/refundUnlock market-aware (US unlock mua bằng reserveCredits, grants filter market); VN 10/10 giữ nguyên. |

## CHECKPOINT 2026-09-28 — paused safely here (user request)
Task 14 REMAINING (resume list, ưu tiên đúng thứ tự):
1. ai-operations.mjs: resolveMarketPref (b.market validate + marketOf so khớp, mismatch→409 market_mismatch — MARKET-02); chargeAi nhánh US direct-paid: reserveCredits(opKey `ai:${operationId}`) → INSERT op market='US' (nếu conflict → release + replay); completeAi: op.market US → commitReserved rồi flip status; refundAi/reconcile: US → releaseReserved; VN INSERT stamp market='VN'.
2. functions/api/ai/quote.js + quoteAi: truyền market (từ preference) vào quoteUnlock, trả market trong quote payload.
3. Client: ai-operation.ts/use-paid-price.ts/reading-consent.ts attach market (lấy từ GET /api/market cache) vào charge/quote body.
4. services/backend/market-billing.test.mjs: MARKET-01/02, AI-01/02 bản US (double-click, tab race, stale quote, insufficient credits, provider timeout, crash-after-AI, reconnect đọc kết quả, reconcile không cấp miễn phí), upgrade eligibility chỉ grants cùng market (đã có filter, cần test).
5. Commit "feat: scope AI billing and grants by market".

Then: Tasks 15–18 Lemon (checkout server-owned, webhook HMAC đúng một lần, refund/reconcile, rewards US) → 19–20 Admin+docs → 21–22 certification/RC → 23–24 release docs (KHÔNG deploy prod).
