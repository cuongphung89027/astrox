# AstroX English / US Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.
> Execution note: skill trên không có trong catalog phiên lập kế hoạch. Khi thực thi, dùng skill sẵn có `writing-plans`, `test-driven-development`, `verification-before-completion`; không giả định có công cụ/skill chưa được cài.

**Goal:** Ra mắt bản tiếng Anh đầy đủ tính năng AstroX Việt Nam, trừ chuyên gia, đăng nhập Google, mua Credits/USD qua Lemon và tự chọn phiên bản tại entrypoint.

**Architecture:** Một codebase, hai locale và hai market độc lập. Giữ Next static export trên Pages; geo routing tại Pages Functions, nghiệp vụ identity/wallet/payment ở Worker/D1. Giữ tương thích dữ liệu và hành vi Việt Nam trong mọi bước.

**Tech Stack:** Next 16.3.5, React 19, TypeScript, Cloudflare Pages Functions/Workers/D1, Google OIDC, Lemon API/webhooks; node:test và Playwright đang có.

---

## A. Trạng thái, ownership và quy tắc thực thi

- Plan-only: chưa thực thi các task, chưa chạy test sản phẩm hay deploy trong lượt lập kế hoạch.
- Thiết kế: `docs/superpowers/specs/2026-09-28-english-market-design.md`, gồm Google đã chốt ở `4e1f4aa`.
- Source base đã khảo sát: `db614b23eb549efcc38b5117c15220e0faa14b4f`; branch tài liệu `codex/english-market-design`. Khi thực thi fetch main, đối chiếu diff kể từ base và cập nhật inventory trước chỉnh source.
- Owner kế hoạch: Codex chat này. Integration owner duy nhất sở hữu registry/config/catalog/service-tree/handler/server/navigation/schema. Người thực thi nhận một task, file set, base SHA và evidence; không sửa worktree của người khác.
- Skill áp dụng lúc thực thi: @test-driven-development cho logic; @systematic-debugging khi thất bại; @cloudflare và @workers-best-practices cho Worker; @wrangler trước lệnh triển khai; @qc-web-master cho chứng nhận browser; @verification-before-completion trước commit/handoff.
- Đọc `docs/agent-workflow.md`, `web/AGENTS.md`; đọc tài liệu Next cài trong `web/node_modules/next/dist/docs/` trước đổi routing/layout. Không áp dụng middleware SSR vào static export theo thói quen.
- Mỗi worktree chạy `codegraph sync`; quan hệ shared code dùng `codegraph impact`, `callers`, `callees` trước sửa. Kết thúc chạy sync lại.
- Mỗi task logic: chia từng case thành bước 2–5 phút: viết test → chạy thấy lỗi đúng hành vi → sửa tối thiểu → chạy test liên quan → xem diff → commit đúng file. Không coi lỗi thiếu dependency là regression test đã chứng minh lỗi.
- Task dịch chữ thuần túy: dùng screenshot/coverage review; không thêm test chỉ phản chiếu từng câu chữ.
- Không có giá live tự suy đoán; không tự gửi hồ sơ nhà cung cấp, tạo credential hoặc phát sinh giao dịch thật trong bước viết code.

## B. Những ràng buộc đã tìm thấy trong source

| Bằng chứng | Hệ quả triển khai |
|---|---|
| `web/next.config.ts`: production `output: export` | Geo routing chạy ở edge; phải kiểm HTML xuất ra, không chỉ dev server |
| `functions/[[path]].js`: HTMLRewriter + CSP nonce | Thêm routing không làm mất CSP hoặc rewrite nhầm API/asset |
| `web/src/app/layout.tsx`: root lang vi | Cần HTML tiếng Anh có lang en ngay từ bản export, tránh đổi bằng effect sau hydration |
| `web/src/lib/auth.tsx`: owner `zalo:${id}` | Google phải có namespace và đường di trú an toàn, không đổi key làm mất dữ liệu Zalo |
| `services/backend/auth.mjs`: session sub là app_users.id | Dùng identity provider mapping vào ID nội bộ; không lấy email làm khóa |
| `services/backend/points.mjs`: đọc zalo_point_ledger | US thêm ledger độc lập, không rename/reset ledger Việt |
| `services/admin/config.ts`: amountVnd, vndPerPoint, minAmountVnd | Không đổi nhãn USD lên dữ liệu VND; thêm hợp đồng market có version |
| `services/admin/reading-language.ts`: policy vi-reading-2 | Locale phải đi qua prompt/runtime/repair/render/cache, không chỉ thêm câu “write English” |
| `services/backend/worker.mjs`: webhook PayOS và cron recovery | Tách entrypoint Lemon; giữ PayOS và scheduled recovery Việt |
| `.github/workflows/ci.yml` | Phải giữ test/typecheck/format/lint/knip/build, thêm browser English certification |

## C. Hợp đồng cố định cho kế hoạch

1. Locale `vi|en`, market `VN|US`, currency `VND|USD`. IP và ngôn ngữ không quyết định tiền hoặc quyền.
2. Ví VN giữ legacy source of truth; ví US có bảng mới keyed user ID. Không quy đổi chéo. Login provider không phải market; người dùng đã đăng nhập không bị logout khi đổi ngôn ngữ.
3. Tại checkout đầu tiên chọn rõ market; backend lưu lựa chọn. Đổi market là thao tác rõ ràng, không gọi ngầm bởi locale switch; chặn đổi khi có checkout/AI operation đang xử lý. Số dư hai ví độc lập.
4. Grants mở khóa keyed market, user, service, scope; đọc báo cáo đã mua vẫn được theo quyền sở hữu, dù locale/market hiện tại khác. Tạo nội dung mới dùng thị trường hiện tại và báo giá mới; không coi đổi locale là đọc lại miễn phí một báo cáo chưa tạo.
5. Credits mua không hết hạn theo thiết kế; Credits tặng tách lot và điều kiện. Không subscription, đổi tiền mặt, chuyển Credits hoặc account linking tự động trong release này.
6. Google only trên login US; Zalo Việt không bị thay thế. Email là thông tin liên hệ.
7. Các quyết định kỹ thuật trên dùng để lập kế hoạch; giá USD, mức thưởng và chính sách hoàn tiền được người dùng duyệt trước live. Nếu người dùng đổi cơ chế ví, dừng task migration phụ thuộc và sửa spec trước.

### Route map đích

| ID | URL Việt giữ nguyên | URL Anh mới |
|---|---|---|
| home | / | /en |
| tuvi | /tuvi | /en/zi-wei |
| zodiac | /cunghoangdao | /en/astrology |
| tarot | /tarot | /en/tarot |
| kinhdich | /kinhdich | /en/i-ching |
| batu | /battu | /en/ba-zi |
| numerology | /thansohoc | /en/numerology |
| compat | /tuonghop | /en/compatibility |
| lunar-calendar | /licham | /en/lunar-calendar |
| palm | /chitay | /en/palm-reading |
| profile/wallet | /hoso | /en/profile |
| pricing | /banggia | /en/pricing |
| terms | /dieukhoan | /en/terms |

Legacy Việt `/trangchu`, `/hoangdao`, `/thanso` vẫn được hỗ trợ. Không tạo `/en/experts`; route đó trả 404. Admin giữ `/admin`, không tạo bản sao `/en/admin`.

## D. Thứ tự và cổng nghiệm thu

`01 → 02 → 03 → 04 → 05`; sau nền tảng, thực thi serial các nhóm `06–10`, `11–14`, `15–20`; `21–24` tích hợp/QC/release. Những nhóm có thể độc lập về logic vẫn không được chỉnh shared contract cùng lúc. Không mặc định spawn agent.

| Gate | Điều kiện |
|---|---|
| G0 baseline | Inventory đủ tất cả leaf/action, baseline lỗi có bằng chứng và owner |
| G1 foundation | Route static, locale, geo, CSP, cache, dữ liệu cũ đều qua test |
| G2 feature parity | Chín bộ môn và các luồng tài khoản/ưu đãi không thiếu; chất lượng English được kiểm |
| G3 commerce sandbox | Google staging, wallet concurrency, Lemon sandbox, refund/recovery qua positive/negative tests |
| G4 release candidate | CI đầy đủ và browser trên artifact export; không còn lỗi chặn tiền/dữ liệu/auth |
| G5 commercial live | Duyệt Lemon, Google production, giá/chính sách, smoke thanh toán được phép và đối soát |

## E. Tasks

### Task 01 — Inventory và baseline (G0)

**Files:** Create `docs/plans/english-us-parity.csv`, `qa-report/english-us/baseline.md`; read `services/admin/modules.ts`, `catalog.ts`, `service-tree.ts`, routes và các component đã map.

1. Ghi git status, SHA; fetch main và liệt kê thay đổi kể từ base, không reset checkout bẩn.
2. Cài dependency bằng `npm --prefix web ci`; dùng Node 24 như CI.
3. Chạy `npm --prefix web test`, `npm --prefix web run typecheck`, `npm --prefix web run lint`, `npm --prefix web run build`; lưu exit code, lỗi baseline và không gọi chúng là lỗi do bản Anh.
4. CSV có cột module,serviceId,action,viRoute,enRoute,scope,freePaid,input,expectedOutput,testId,status,evidence. Mỗi leaf service và hành động có một dòng; 9 module AI/utility, chỉ experts loại trừ. Thêm rewarded ads, referral, streak, promo, unlock upgrade, history, account deletion nếu có trong inventory.
5. Commit `docs: capture English parity baseline`; gate không đạt nếu còn dòng chưa xác định hành vi hiện tại.

### Task 02 — Market contract và đường dẫn dùng chung

**Create:** `services/admin/markets.ts`, `services/admin/markets.test.mjs`, `web/src/lib/locale.ts`; **Modify:** `services/admin/modules.ts`, `catalog.ts`, `service-tree.ts` qua integration owner.

1. Test route map trên, alias Việt, unsupported locale, expert exclusion, market independent of locale.
2. `node --test services/admin/markets.test.mjs` → FAIL vì API chưa tồn tại.
3. Thêm API `moduleRoute(id, locale)`, `visibleModules(locale)`, `resolveRoute(path)`; giữ MODULES.id/policy và service IDs. Market có server allowlist; không dùng string tùy ý để chọn config.
4. Chạy test mới + `node --test services/admin/service-pricing.test.mjs services/admin/public-config.test.mjs` → PASS, số dịch vụ Việt không thay đổi.
5. Commit `feat: define locale and market contracts`.

### Task 03 — i18n dictionary và layout static

**Create:** `web/src/i18n/vi.ts`, `en.ts`, `LocaleProvider.tsx`, `web/tests/locale.test.mjs`; **Move:** các route Việt vào `web/src/app/(vi)/` giữ nguyên suffix/URL; root layout Việt ở `(vi)/layout.tsx`; **Create:** `web/src/app/en/layout.tsx`, `web/src/components/shell/DocumentLayout.tsx`; **Modify:** root layout theo quy tắc multiple root layouts của Next đã cài.

1. Test dictionary key parity, interpolation, plural, formatter; render HTML vi/en và kiểm lang ngay server/static.
2. `node --test web/tests/locale.test.mjs` → FAIL đúng thiếu contract.
3. LocaleProvider nhận locale tĩnh từ layout. Dùng multiple root layouts nếu Next export xác nhận hỗ trợ; không để root lang vi bọc thêm html en. Fonts/CSS chung qua DocumentLayout; di chuyển font import đúng đường dẫn.
4. Mỗi route Anh là wrapper tĩnh import cùng component với Việt; không copy implementation, không catch-all dựng trang rỗng. Kiểm profile/admin robots sau move.
5. `npm --prefix web run build` → cả HTML Việt/Anh có lang, title đúng; không duplicate URL. Commit `feat: add static bilingual layouts`.

### Task 04 — Geo entrypoint và SEO

**Create:** `functions/lib/locale-routing.js`, `services/admin/locale-routing.test.mjs`, `web/src/components/shell/LanguageSwitcher.tsx`; **Modify:** `functions/[[path]].js`, `web/src/app/sitemap.ts`, `robots.ts`, metadata các wrapper.

1. Cases: saved vi/en > geo; US en; VN vi; unknown Accept-Language; invalid cookie; direct URL không chuyển; query/fragment-safe UI mapping; asset/API/callback không chuyển; `/` chọn vi không loop.
2. `node --test services/admin/locale-routing.test.mjs services/admin/routes.test.mjs` → thấy case mới fail.
3. Edge chỉ redirect GET/HEAD `/` bằng 302, giữ query, `Cache-Control: private, no-store`; dùng request.cf.country, không tin header giả từ client. LanguageSwitcher lưu cookie Path=/, SameSite=Lax, Secure và dùng full navigation qua root layouts.
4. Canonical riêng, hreflang vi/en/x-default, sitemap đủ route. Không ép bot/user rời deep link. Cookie chỉ là preference, không auth.
5. Test CSP nonce hiện tại vẫn hoạt động; cache hai request từ hai quốc gia không lẫn. Commit `feat: add locale entry routing and SEO`.

### Task 05 — Shell, hồ sơ và UI chung

**Modify:** `web/src/components/shell/AppShell.tsx`, `BottomDock.tsx`, `AuthMenu.tsx`, `LoginPrompt.tsx`, `PublishedNotice.tsx`, `home/Dashboard.tsx`, `profile/ProfileModal.tsx`, `AccountPage.tsx`, `kit/AiText.tsx`, `StructuredReading.tsx`, `SavedReading.tsx`, `ReadingQuestion.tsx`, `motion/toast.tsx`; **Create:** `web/tests/locale-shell.test.mjs`.

1. Test navigation giữ locale, selected state, account unauthenticated/authenticated, experts absent English nhưng còn Việt.
2. `node --test web/tests/locale-shell.test.mjs` → FAIL trước sửa.
3. Extract text có ngữ cảnh, aria labels, errors, loading, empty states; không nối câu tiếng Anh bằng vị trí từ Việt. Layout/flow giữ tương đương.
4. Test form validation, keyboard focus, native dialog, long English text; account balance unknown không hiển thị 0 giả.
5. Commit `feat: localize shared user interface`; không triển khai Google giả trong task này.

### Task 06 — Ngày sinh, nơi sinh và timezone quốc tế

**Create:** `web/src/lib/birth-location.ts`, `birth-time.ts`, `web/tests/birth-time.test.mjs`, `docs/plans/english-us-birth-rules.md`; **Modify:** `birth-input.ts`, `types.ts`, `provinces.ts`, `profile/ProfileModal.tsx`, `zodiac.ts`, `batu.ts`, `tuvi.ts`, `calendar-vn.ts` dưới `web/src/lib/`.

1. Ghi quyết định engine-specific: giờ dân sự nơi sinh, chuyển UTC cho astronomy; quy ước lịch âm/giờ chi cho engine phương Đông có nguồn tham chiếu. Không âm thầm áp UTC+7 cho US.
2. Fixture: Los Angeles/New York mùa hè và đông, Arizona/Hawaii, DST ambiguous/nonexistent, sinh sát nửa đêm, không biết giờ, legacy chỉ có tỉnh Việt; hai locale cho cùng số liệu.
3. `node --test web/tests/birth-time.test.mjs` → FAIL; chọn thư viện timezone có data lịch sử và kiểm license/bundle. Place search cần trả IANA zone/coords, có nhập thủ công và lỗi rõ; không suy zone từ browser hiện tại.
4. Thêm trường optional/versioned; không tự viết lại dob/time hồ sơ cũ. Giờ ambiguous yêu cầu phân biệt, nonexistent báo lỗi, unknown-hour dùng khả năng hiện có không bịa giờ.
5. PASS fixtures với kết quả tham chiếu độc lập rồi commit `feat: normalize international birth inputs`. Quy ước chưa có bằng chứng là blocker G2, không đánh dấu xong bằng mock.

### Task 07 — Prompt, runtime và cache theo locale

**Modify:** `services/admin/prompt-templates.ts`, `prompt-engine.ts`, `reading-language.ts`, `runtime.mjs`, `integration-api.mjs`, `functions/api/ai.js`, `web/src/lib/managed-prompts.ts`, `api.ts`, `state.ts`, `cloud-merge.ts`, `tarot-history.ts`, `web/src/components/kit/AiText.tsx`; **Create:** `services/admin/english-prompts.test.mjs`, `web/tests/locale-cache.test.mjs`.

1. Cases cho từng service: locale default vi giữ prompt cũ; en không vào Vietnamese repair; prompt injection không thay locale; JSON keys/numbers/chart facts không dịch sai; missing en prompt fail closed và không tính phí.
2. `node --test services/admin/english-prompts.test.mjs web/tests/locale-cache.test.mjs` → FAIL.
3. Request truyền locale enum; prompt version và cache key gồm locale + engine/input + promptVersion, market với nội dung phụ thuộc market. Đọc legacy không có locale là vi. Không reset original-prompts hoặc published Vietnamese config.
4. Localize deterministic labels trước AI; repair theo locale, không heuristic “chỉ ASCII là sai”; tên người và thuật ngữ gốc được giữ. Retry repair hữu hạn, không sửa sự kiện/số liệu để vượt validation.
5. Chạy tests mới + `npm --prefix web run test:prompts` + reading-language hiện có → PASS. Commit `feat: isolate English prompts and reading cache`.

### Task 08 — Tử Vi, Bát Tự, Hoàng Đạo

**Modify:** toàn bộ `.tsx` trong `web/src/components/tuvi/`, `batu/`, `zodiac/` và label exports ở `web/src/lib/tuvi.ts`, `batu.ts`, `zodiac.ts`; **Create:** `web/src/i18n/astrology-en.ts`, `web/tests/astrology-locale.test.mjs`.

1. Theo parity CSV, đánh dấu chart/period/topic/detail/upgrade/follow-up mỗi mục riêng; export danh sách file chính xác từ ba thư mục vào evidence trước sửa.
2. Test invariants số sao/cung/aspect/pillar không đổi theo locale; `node --test web/tests/astrology-locale.test.mjs` → FAIL vì labels chưa có.
3. Dịch UI và thuật ngữ từ ID ổn định; không dịch ID/key để làm mất lookup. Giữ mọi tab và phương án input.
4. So sánh fixture charts và 320/390/1440px screenshots; nếu thiếu nội dung ghi FAIL, không ẩn tab để vượt QC.
5. Commit từng bộ môn `feat: localize zi wei`, `feat: localize ba zi`, `feat: localize astrology` sau các test tương ứng.

### Task 09 — Tarot, Kinh Dịch, Thần Số và Tương Hợp

**Modify:** toàn bộ `.tsx` trong `web/src/components/tarot/`, `kinhdich/`, `numerology/`, `compat/`; label trong `web/src/lib/tarot.ts`, `kinhdich.ts`, `numerology.ts`, `couples.ts`; **Create:** `web/tests/divination-locale.test.mjs`.

1. Fixture đầy đủ deck/spread/reversal/history, coin/tube casting, hexagram/change lines, numerology names/cycles và pair input.
2. `node --test web/tests/divination-locale.test.mjs` → FAIL phần locale; giữ random seed để so hành vi khi test.
3. Dịch từng bộ môn một, tên deck/copyright giữ đúng quyền; nhận diện text trong ảnh/video cần asset English nếu chứa hướng dẫn Việt. Không sinh lại mỹ thuật khi chỉ cần dịch.
4. Kiểm cả trạng thái hủy/retry, follow-up và saved reading, giảm chuyển động. Numerology không thay cách tính tên vô tình khi dịch.
5. Commit riêng từng module sau PASS; matrix không được thiếu module ít được dùng.

### Task 10 — Lịch âm và Palm đầy đủ

**Modify:** `web/src/components/discovery/LunarCalendar.tsx`, `PalmReader.tsx`, `PalmCamera.tsx`, `PalmGuide.tsx`, `DiscoveryCards.tsx`, `web/src/lib/almanac.ts`, `palm.ts`; **Create:** `web/tests/discovery-locale.test.mjs`.

1. Test lịch, ngày gia đình, nhập/sửa/xóa theo scope hiện có; Palm upload/camera/consent/retake/quality/continue/history theo inventory.
2. `node --test web/tests/discovery-locale.test.mjs` → FAIL locale mới.
3. Dịch cảnh báo và hướng dẫn thật, không thay thuật toán overlay; dữ liệu lễ/tập tục Việt được giải thích bằng Anh, không thay thành lịch Mỹ ngoài phạm vi.
4. Camera permission denied, ảnh không hợp lệ, abort, đổi account và real-image QA; giữ consent gửi ảnh, không log ảnh. AI quality không được chứng nhận chỉ bằng test mocked.
5. Chạy toàn bộ `web/tests/palm-*.test.mjs` và test mới → PASS; commit `feat: localize calendar and palm flows`.

### Task 11 — Identity Google và migration additive

**Create:** `migrations/google-identities.sql`, `services/backend/google-auth.mjs`, `google-auth.test.mjs`; **Modify:** `services/backend/auth.mjs`, `handler.mjs`, `config.mjs`, `wrangler.jsonc` (chỉ khai báo tên binding, không secret).

1. Kiểm schema thật của app_users/app_identities từ migration + fixture trước DDL; không tạo bảng trùng nếu đã có identity abstraction. Google unique `(provider,subject)` trỏ app_users.id; pending OAuth TTL có state/nonce/PKCE và return path allowlist.
2. Tests: đúng token, wrong audience/issuer/signature/nonce, expired, state replay, redirect ngoài domain, account suspended, concurrent first login, email trùng Zalo.
3. `node --test services/backend/google-auth.test.mjs` → FAIL; dùng authorization code flow, server verify qua thư viện OIDC/JWT đã kiểm tương thích Workers, JWKS cache/key rotation; không viết JWT crypto tự chế.
4. Session tiếp tục dùng cơ chế hiện có; không lưu access token lâu dài khi không cần; code/token/secret không vào log. Credential Google cấu hình riêng preview/production với redirect URI chính xác.
5. Test migration trên DB legacy và chạy lại; Zalo/session cũ vẫn hoạt động. Commit `feat: add Google identity provider`.

### Task 12 — Client Google, namespace và sync

**Modify:** `web/src/lib/auth.tsx`, `state.ts`, `types.ts`, `cloud-sync.ts`, `points.ts`, `web/src/components/shell/LoginPrompt.tsx`; **Create:** `web/tests/google-account.test.mjs`.

1. Cases login Google mới/quay lại, logout, đổi tài khoản khi request cũ đang chạy, đổi locale giữ session, đọc storage Zalo cũ nguyên vẹn.
2. `node --test web/tests/google-account.test.mjs web/tests/account-data.test.mjs web/tests/cloud-sync.test.mjs` → case Google FAIL.
3. Google namespace dùng ID nội bộ; Zalo legacy key có compatibility adapter, không bulk rename localStorage. Không nhập guest data vào user khác tự động; cache/inflight response gắn owner.
4. US chỉ Continue with Google; localhost preview phải mô phỏng hai provider/market rõ và không gọi production. Test OIDC thật staging riêng khỏi mock.
5. PASS và commit `feat: connect Google login to account state`.

### Task 13 — Credits ledger và account market

**Create:** `migrations/us-credits.sql`, `services/backend/credits.mjs`, `market.mjs`, `credits.test.mjs`; **Modify:** `handler.mjs`, `http.mjs` nếu cần public error code, `web/src/lib/types.ts`.

1. Tables đề xuất: credits_accounts(user_id,balance,reserved,status), credits_ledger(user_id,delta,kind,operation_key,source_order,lot_id), credit_lots(source,remaining,expires_at), market_preferences. Unique operation keys; CHECK nonnegative available/reserved; migration không đổi bảng Point.
2. Tests concurrency: balance 10, hai spend 7 đồng thời chỉ một thành công; duplicate credit chỉ một; reserve/commit/release crash/retry; wrong owner/market không truy cập.
3. `node --test services/backend/credits.test.mjs` → FAIL; dùng conditional writes và transaction/D1 batch đã kiểm semantics. Một nguồn balance authoritative; ledger và balance cập nhật atomic, không read-then-write rời rạc.
4. VN adapter giữ legacy; market setter authenticated + trusted origin, không lấy market từ IP. Lịch sử phân trang ổn định, không rò dữ liệu khác user.
5. Test real SQLite/D1 local concurrency, không chỉ mocked DB; commit `feat: add isolated US Credits ledger`.

### Task 14 — AI charge, grants và upgrade theo market

**Modify:** `services/backend/ai-operations.mjs`, `service-unlocks.mjs`, `services/admin/service-pricing.ts`, `functions/api/ai/quote.js`, `functions/api/ai.js`, `web/src/lib/ai-operation.ts`, `use-paid-price.ts`, `reading-consent.ts`; **Create:** `migrations/market-ai-operations.sql`, `services/backend/market-billing.test.mjs`.

1. Quote bind user/market/service/scope/input digest/revision và units; operation giữ immutable snapshot. Locale không phải quyền sở hữu.
2. `node --test services/backend/market-billing.test.mjs` → FAIL các case market; giữ test legacy service-unlocks.
3. US reserve trước AI, commit đúng một lần sau kết quả hợp lệ, release khi fail/abort theo lifecycle đã có. Thêm market/grant uniqueness qua additive migration; legacy rows default VN.
4. Test double-click, tab race, config đổi, quote cũ, insufficient Credits, provider timeout, worker crash sau AI trước response, reconnect đọc kết quả; eligible upgrade chỉ từ grants cùng market/scope. Công thức upgrade hiện có giữ nguyên.
5. Reconcile operation unresolved không hoàn rồi cấp kết quả miễn phí do race; PASS + commit `feat: scope AI billing and grants by market`.

### Task 15 — Lemon catalog và checkout

**Create:** `services/backend/lemon.mjs`, `lemon-checkout.test.mjs`, `migrations/lemon-orders.sql`; **Modify:** `services/admin/config.ts`, `public-state.mjs`, `services/backend/handler.mjs`, `web/src/components/topup/TopupPanel.tsx`, `web/src/lib/api.ts`.

1. Config US versioned, package ID/credits/USD cents/test-live store/variant; không đưa API key ra public. Order snapshot gồm user, market, package revision, expected pricing/credits/environment; quantity 1.
2. `node --test services/backend/lemon-checkout.test.mjs` → FAIL; client chỉ gửi packageId + requestKey, backend dựng checkout. Hosted checkout ưu tiên để giảm iframe/CSP phức tạp.
3. Retry cùng requestKey trả cùng local order; upstream timeout là unknown, không tự tạo nhiều đơn không kiểm soát. Custom data chỉ opaque order ID, server mapping là authoritative; không dùng email để cấp ví.
4. Tắt custom price/client discount tùy ý; đối chiếu subtotal/currency/variant, phân biệt tax và discount thật để không reject total chỉ vì thuế. Giá UI và Lemon khác → chặn bán package, báo operator.
5. Cancel/return chỉ đọc order status, không cộng ví. Test anonymous/foreign user/forged price/wrong env. Commit `feat: create server-owned Lemon checkouts`.

### Task 16 — Webhook Lemon đúng một lần

**Create:** `functions/api/lemon/webhook.js`, `services/backend/lemon-webhook.mjs`, `lemon-webhook.test.mjs`; **Modify:** `services/backend/worker.mjs`, `handler.mjs`, env binding deployment config.

1. Test signed raw body, body bị thay, signature thiếu/sai độ dài, wrong store/test_mode/currency/variant, status chưa paid, custom order ID giả, unknown events, duplicate/reordered events.
2. `node --test services/backend/lemon-webhook.test.mjs` → FAIL.
3. HMAC SHA256 raw bytes với X-Signature theo docs; compare an toàn độ dài và timing. Lưu receipt durable trước ack; chỉ paid order hợp lệ mới credit qua atomic ledger.
4. Uniqueness fulfillment `(provider,environment,store,orderId)`; không dựa vào giả định provider có event UUID. Receipt có digest để trace, business idempotency theo order và transition. Callback nhận lại event không cộng lại.
5. 2xx cho accepted/no-op; lỗi lưu tạm thời 5xx để retry; invalid signature 4xx; unknown signed event ghi metadata tối thiểu rồi bỏ qua. Commit `feat: fulfill Lemon orders idempotently`.

### Task 17 — Refund, dispute và reconciliation

**Create:** `services/backend/lemon-reconcile.mjs`, `lemon-reconcile.test.mjs`; **Modify:** `worker.mjs`, `credits.mjs`, `lemon-webhook.mjs`, Admin billing data endpoint.

1. Xác minh event types thực tế của Lemon; không giả định có chargeback webhook. Khi thiếu event, có API reconcile hoặc quy trình operator với evidence và idempotency.
2. `node --test services/backend/lemon-reconcile.test.mjs` → FAIL full/partial refund, refund trước paid, replay, already-spent lot, dispute reversal.
3. Reconcile bounded batch/cursor/backoff, lock lease chống cron chồng. Persist cumulative refunded amount/credits để chỉ áp delta; integer rounding deterministic và cap theo lượng gốc.
4. Refund vào lot mua gốc; không đủ Credits thì restriction/debt record riêng có thông báo và manual resolution; không đụng ví VN, không xóa ledger. Khóa thanh toán US vẫn tiếp nhận webhook/reconcile đơn cũ.
5. Fault injection DB unavailable/API timeout/restart; balance audit totals khớp. Commit `feat: reconcile and reverse US credit orders`.

### Task 18 — Rewards, promo và lịch sử đầy đủ

**Modify:** `services/backend/rewards.mjs`, `rewarded-ads.mjs`, `payments.mjs`, `web/src/lib/referral.ts`, `rewarded-ad.ts`, `web/src/components/points/EarnPointsView.tsx`, `PointsHome.tsx`, `shell/PointsChip.tsx`, `kit/PaidPriceBadge.tsx`, `PaidReadingConsent.tsx`; **Create:** `services/backend/us-rewards.test.mjs`, `web/tests/credits-ui.test.mjs`.

1. Matrix parity cho đăng ký, referral, first topup, attendance, milestones, rewarded ads, promo direct và promo mua; giá/threshold USD riêng.
2. `node --test services/backend/us-rewards.test.mjs web/tests/credits-ui.test.mjs` → FAIL US branch.
3. Award market-bound, source uniqueness; chống đổi locale/market để nhận lặp phần thưởng cùng sự kiện. Referral reward theo campaign/market xác định server, không theo URL locale.
4. Ads completion chỉ từ bằng chứng provider hợp lệ, không fake thưởng khi mạng US chưa cấu hình. Nếu provider chưa sẵn sàng, ghi blocker parity rõ thay vì gọi full launch thành công.
5. UI thể hiện purchased/bonus/available/reserved và error/pending; PASS rồi commit `feat: extend rewards and wallet UI to Credits`.

### Task 19 — Admin cấu hình và vận hành US

**Modify:** `services/admin/config.ts`, `server.mjs`, `backend.mjs`, `insights.mjs`, `public-state.mjs`, `web/src/components/admin/panels/BillingPanel.tsx`, `ServicesPanel.tsx`, `PromptsPanel.tsx`, `IntegrationsPanel.tsx`, `RewardsPanel.tsx`, `ContentPanel.tsx`; **Create:** `services/admin/us-config.test.mjs`.

1. Test migration config cũ → VN unchanged/US disabled; permissions read/write/publish; public projection không secret; config expectedRevision conflicts.
2. `node --test services/admin/us-config.test.mjs services/admin/public-config.test.mjs` → FAIL mới.
3. Selector market trong panel liên quan; tách prompt en/version, nội dung, price, package, rewards và flags. Existing Vietnamese admin labels có thể giữ, không nhân bản dashboard.
4. Validation publish: packages mapping, units/currency, English service coverage, không experts US, no duplicate IDs; summary cho thấy market sắp publish.
5. Dashboard filter provider/market/order/operation, không lộ ảnh/câu hỏi/token. Audit changes và reconciliation action. Commit `feat: manage US commerce in Admin`.

### Task 20 — Policies, giá và provider onboarding package

**Create:** `docs/ops/english-us-onboarding.md`, `docs/ops/english-us-pricing.md`; **Modify:** `web/src/components/shell/TermsContent.tsx`, `web/src/lib/terms.ts`, `web/src/components/points/PricingContent.tsx`.

1. Soạn mô tả đúng tính năng AI và prepaid Credits, sample của từng nhóm nội dung, site demo và contact; không gửi thay người dùng nếu chưa được yêu cầu.
2. Bảng tính gói: gross USD → sales tax handling → Lemon fee theo docs hiện hành → AI cost p50/p95 + retry/repair → refunds/support → margin; tính cả thưởng. Không đặt “unlimited”.
3. Ba gói nạp đề xuất sau khi có usage/cost sample; user duyệt package price, Credits, bonus, refund wording. Không dùng giá mock live.
4. Policy English: AI disclosure, Credits usage/expiry, refunds, privacy/ảnh palm, contact, ownership/receipts; versioned consent khi cần. MoR thuế bán hàng không thay nghĩa vụ thu nhập cá nhân.
5. Gate cần Google client/redirect production, Lemon acceptance cho AI+Credits, identity/payout hoàn tất. Test mode vẫn có thể làm trước; commit `docs: prepare US commercial launch package`.

### Task 21 — Browser certification và chất lượng AI

**Create:** `web/scripts/english-us-qa.mjs`, `web/scripts/english-export-qa.mjs`, `qa-report/english-us/REPORT.md`; **Modify:** `web/package.json`, `.github/workflows/ci.yml` thêm scripts đã kiểm hoạt động.

1. Browser harness có deterministic authenticated fixtures và real backend staging suite riêng; không dùng localhost-preview để chứng minh auth thật.
2. `node web/scripts/english-us-qa.mjs` test Chromium/WebKit, 320/390/768/1440, keyboard/focus/reduced motion, login canceled, slow network, refresh, back/forward, cross-tab, retry.
3. `node web/scripts/english-export-qa.mjs` phục vụ static export qua Pages runtime và test HTML lang/metadata/geo/CSP/cookie/cache; Next dev không thay chứng nhận này.
4. Mỗi module: free flow, paid success, insufficient Credits, fail/refund, read history, follow-up khi hiện có. Screenshot + network assertions + no hydration/console errors. English không có expert route/navigation.
5. Live AI sample ít nhất 3 input đa dạng cho mỗi bộ môn có AI và mọi response schema khác nhau; thêm multilingual names và prompt injection. Review facts đối chiếu engine, tiếng Anh tự nhiên, format, không đưa claim bịa; retained evidence redacted. Palm dùng ảnh thật được phép.
6. Mọi row parity có PASS/FAIL/BLOCKED và evidence; không SKIP để tính PASS. Commit `test: certify English parity and commerce flows`.

### Task 22 — Full regression và release candidate

**Create:** `qa-report/english-us/release-candidate.md`; **Modify:** chỉ lỗi phát hiện qua task sửa riêng, không trộn feature mới.

1. Chạy từ root các lệnh CI dưới đây sau dependency setup; lưu SHA/output. Các suite browser mới tích hợp CI để không bỏ quên khi merge.
2. Phân biệt lỗi baseline và regression; zero unresolved auth/payment/data corruption, no missing English features. Full Vietnamese flows smoke bắt buộc.
3. Refresh inventory với latest main; integrate từng branch, semantic review shared config/dispatchers; test lại phần bị conflict.
4. Chạy CodeGraph sync và git diff --check; commit report với provenance test/staging/live riêng.

```bash
npm --prefix web test
npm --prefix web run typecheck
npm --prefix web run format:check
npm --prefix web run lint
npm --prefix web run knip
npm --prefix web run build
node web/scripts/english-us-qa.mjs
node web/scripts/english-export-qa.mjs
git diff --check
```

Expected: từng command exit 0; browser asserts đủ matrix. Nếu môi trường thiếu Google/Lemon live chỉ G4 được chứng nhận, G5 vẫn chưa đạt.

### Task 23 — Release có kiểm soát

**Create:** `docs/ops/english-us-release.md`; **Modify:** deployment configuration sau review @wrangler, không ghi credentials vào tài liệu.

1. Chỉ release owner thao tác production; xác minh clean pushed SHA, remote và permission deploy; backup/inspect D1, record schema/balance totals trước.
2. Apply migrations additive lên staging → verify invariants → production. Không dùng lệnh apply toàn bộ migration cũ nếu lịch sử chưa được quản lý; kiểm từng file mới và mapping schema thật.
3. Deploy Worker trước, Pages sau từ cùng SHA; cấu hình flag US disabled mặc định, canary allowlist server-side. VN không phụ thuộc flag mới.
4. Kiểm route/API production, Google thật, order ownership, checkout test/live separation. Bật live checkout chỉ sau provider approval và giá/policy đã duyệt.
5. Giao dịch thật nhỏ và refund phải được user cho phép, kiểm webhook/ledger/receipt/reconciliation; giữ trạng thái payout UNVERIFIED cho đến khi tiền thực sự về.
6. Mở geo routing cuối cùng sau full English parity. Ghi SHA, Worker/Pages deployment IDs, migrations, flag state, evidence, rollback revisions.

### Task 24 — Rollback và handoff vận hành

**Files:** cập nhật `docs/ops/english-us-release.md`, `qa-report/english-us/REPORT.md`.

1. Test kill switch checkout/AI-US/geo độc lập; tắt bán mới không tắt webhook, refund hoặc đọc lịch sử.
2. Khi lỗi auth/payment/double-credit/data isolation: tắt affected US entrypoints ngay; giữ ledger nguyên, reconcile pending. Không chạy destructive down migration hoặc quay Worker về phiên bản không hiểu đơn mới.
3. Rollback Pages chỉ khi tương thích API; Worker dùng bản tương thích schema mới đã chuẩn bị. Điều chỉnh balance bằng compensating entry có audit.
4. Handoff dashboard queries cho pending/failed fulfillment, stale reserves, refunds, balance mismatches, OAuth failure, per-market cost. Có owner và cách xử lý từng alert.
5. Nhịp theo dõi đề xuất 24 giờ/72 giờ/7 ngày; chưa tạo automation khi chưa được yêu cầu. Kết luận released khác với profitable/market-validated.

## F. Mẫu contract/test cụ thể để bắt đầu

Các mẫu này là code dự kiến trong plan, không phải implementation đã có. Không copy test secret vào production.

```ts
// services/admin/markets.ts — contract đề xuất
export type Locale = 'vi' | 'en';
export type Market = 'VN' | 'US';
export type WalletUnit = 'POINT' | 'CREDIT';
export type QuoteContext = {
  userId: string;
  market: Market;
  serviceId: string;
  scopeKey: string;
  inputDigest: string;
  configRevision: number;
};
```

```js
// services/admin/locale-routing.test.mjs — core behavior
import test from 'node:test';
import assert from 'node:assert/strict';
import { entryLocale } from '../../functions/lib/locale-routing.js';
test('saved choice wins over country', () => {
  assert.equal(entryLocale({ saved: 'vi', country: 'US', acceptLanguage: 'en-US' }), 'vi');
});
test('unknown country falls back to browser language', () => {
  assert.equal(entryLocale({ saved: '', country: '', acceptLanguage: 'vi,en;q=0.8' }), 'vi');
});
```

```js
// functions/lib/locale-routing.js — minimal seed; broaden parser by test cases
export function entryLocale({ saved, country, acceptLanguage = '' }) {
  if (saved === 'vi' || saved === 'en') return saved;
  if (country === 'VN') return 'vi';
  if (country === 'US') return 'en';
  const ranked = acceptLanguage.split(',').map(part => {
    const [tag, ...params] = part.trim().toLowerCase().split(';');
    const quality = params.find(p => p.trim().startsWith('q='));
    const q = quality ? Number(quality.trim().slice(2)) : 1;
    return { tag: tag.split('-')[0], q };
  }).filter(x => Number.isFinite(x.q) && x.q > 0 && x.q <= 1)
    .sort((a, b) => b.q - a.q);
  return ranked.find(x => x.tag === 'vi' || x.tag === 'en')?.tag ?? 'en';
}
```

Billing state transitions cần fixtures thực tế thay cho assertion trên chuỗi source:

```text
Checkout: created -> pending/unknown -> paid -> fulfilled
Refund: cumulative refunded amount tăng -> compensating ledger delta
AI: reserved -> succeeded+committed OR failed+released
Duplicate event: same order/operation -> same result, zero extra ledger entries
Foreign user: same order ID -> denied, zero balance/history exposure
```

## G. Dependencies bên ngoài và bằng chứng cần cung cấp

| Dependency | Khi nào cần | Thiếu thì vẫn làm được | Không được tuyên bố |
|---|---|---|---|
| Google OAuth client/consent/redirect hợp lệ | Task 11–12 staging/live | Unit + mock + UI | Login production thành công |
| Lemon duyệt AI + prepaid Credits | Trước G5 | Sandbox checkout/webhook | Được phép mở bán |
| Store/variant/API key/signing secret test | Task 15–17 integration | Fixtures/contract tests | Provider integration đã chạy |
| KYC/payout | G5 | Product và sandbox | Đã nhận tiền về ngân hàng |
| USD packages và rewards user duyệt | G5 | Giá fixture, admin editor | Giá thương mại đã chốt |
| Múi giờ + quy ước engine | G2 | UI/dictionary | Lá số quốc tế chính xác |
| Rewarded ad provider US | G2/G5 nếu tính năng bật | UI và verified mock | Ads/earn Credits live đã chạy |

## H. Nguồn kỹ thuật và phạm vi bằng chứng

- Google OIDC: https://developers.google.com/identity/openid-connect/openid-connect
- Lemon checkout: https://docs.lemonsqueezy.com/api/checkouts/create-checkout
- Lemon signing: https://docs.lemonsqueezy.com/help/webhooks/signing-requests
- Lemon event types (đọc khi triển khai, chưa xác minh event inventory trong lượt này): https://docs.lemonsqueezy.com/help/webhooks/event-types
- Điều kiện sản phẩm, payout, phương thức thanh toán: các link trong design spec. Kiểm lại khi onboard vì policy có thể đổi.
- Không áp dụng Stripe account eligibility vào Lemon payout: đây là hai quan hệ onboarding khác nhau.
- Kế hoạch này không chứng nhận code hoặc production. Mỗi gate cần evidence mới từ SHA thực thi.


## I. Ma trận kiểm chứng các rủi ro trọng yếu

| ID | Thao tác / lỗi được tiêm | Kết quả bắt buộc |
|---|---|---|
| AUTH-01 | Token Google hợp lệ, callback lần đầu rồi replay | Một identity/user; callback replay bị từ chối |
| AUTH-02 | Google cùng email một Zalo user | Không auto-link hoặc lộ dữ liệu Zalo |
| AUTH-03 | Đổi account trong lúc sync/AI đang trả kết quả | Response cũ không ghi vào account mới |
| DATA-01 | User Zalo cũ mở app sau nâng cấp | Profile, history, cache, Point và grants còn nguyên |
| GEO-01 | US IP nhưng cookie vi; mở deep link en | Root theo cookie; deep link giữ en |
| GEO-02 | Hai request cùng URL khác quốc gia/cookie | Không nhận redirect/cache của nhau |
| MARKET-01 | Đổi locale giữa checkout hoặc AI operation | Đơn/operation giữ market và giá ban đầu |
| MARKET-02 | Gửi market US nhưng dùng quote/grant VN | Server từ chối sai market; không đụng ví VN |
| PAY-01 | 20 webhook paid cùng order đồng thời | Một fulfillment, một credit ledger entry |
| PAY-02 | Return URL giả success, webhook chưa tới | Pending, chưa tăng số dư |
| PAY-03 | Webhook sai signature/store/env/variant | Không credit; có diagnostic không chứa secret |
| PAY-04 | DB chết trước/sau transaction fulfillment | Retry/reconcile kết thúc đúng một lần |
| PAY-05 | Thuế làm total khác giá package | So đúng trường giá/thuế/discount đã xác thực |
| PAY-06 | Hoàn tiền một phần hai lần, event đảo thứ tự | Chỉ bù delta mới, không reverse vượt gốc |
| PAY-07 | Refund sau khi khách đã tiêu Credits | Ghi nghĩa vụ/restriction rõ; không xóa lịch sử hoặc trừ Point |
| AI-01 | Hai operation 7 Credits khi available 10 | Một được reserve, một insufficient; không âm balance |
| AI-02 | Server đã tạo kết quả nhưng client timeout | Retry lấy cùng kết quả/charge; không mua lại |
| AI-03 | en request trùng input có vi cache | Không dùng nhầm vi cache hoặc chạy vi repair |
| PARITY-01 | Thử tất cả leaf và UI actions trong CSV | Đủ chức năng tương đương; experts là ngoại lệ duy nhất |
| ROLLBACK-01 | Tắt checkout US lúc đơn đang pending | Đơn cũ vẫn được fulfill/reconcile, lịch sử còn truy cập |

Các số 7/10 và 20 events là fixture kiểm thử, không phải bảng giá hoặc giới hạn production.

## J. Bàn giao thực thi

Đề xuất làm tuần tự trên branch/worktree chuyên dụng, bắt đầu Task 01–04 rồi nghiệm thu G1. Nếu người dùng muốn chia cho nhiều agent/chat, chỉ giao nhóm độc lập sau khi hợp đồng nền tảng đã được commit; integration owner vẫn tích hợp serial. Không yêu cầu cài skill executing-plans để có thể thực hiện công việc bằng các skill hiện có.

Ước lượng theo mốc thay vì hứa ngày hoàn tất: G0/G1 là nền tảng; G2 là toàn bộ nội dung và chức năng; G3 là tiền và đăng nhập; G4 là release candidate; G5 phụ thuộc nhà cung cấp và kiểm chứng thật. Sau Task 01 mới lập lịch theo inventory thực tế, tốc độ dịch/review và dữ liệu test.
