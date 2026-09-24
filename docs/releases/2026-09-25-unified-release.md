# AstroX unified release — 2026-09-25

The integration combines hierarchical service pricing, Lịch âm, Chỉ tay, Đặt lịch chuyên gia and Kinh Dịch/UI polish. The source is the descendant of `c038ba7`; the feature commit is `c514369529640d1b484a413d78749369192c9143`. Both `origin/main` and `upstream/main` were fast-forwarded to that feature commit before deployment.

The production D1 database `astrox-db` already contained `experts`, `expert_slots`, `expert_bookings` and `booking_events`. A private full D1 export was taken before applying the additive `migrations/service-unlocks.sql`. The migration executed three queries successfully; `service_unlock_operations` is present. The booking schema was left intact.

Initial deployments from the feature commit:

- Worker `astrox-api`: version `da2d0d24-00a4-4cbc-b865-b7394ac8d7a8`.
- Pages `theastrox`, production branch `main`: `08487ebd-6f40-46c3-9862-75d603f4aa1d`, preview `https://08487ebd.theastrox-a3l.pages.dev`.
- Previous Pages source: `c038ba7`, deployment `dcffb5fd-e454-4502-91ac-d2ca949b448d`.

Verification: 293 unit/integration tests passed at first release commit; TypeScript and static export build passed, ESLint had zero errors (18 warnings). Browser QA passed 22 readings/Kinh Dịch checkpoints with stubbed AI. Local and production browser checks at 390 and 1440 px found nine home quick links, all three new routes, and no page exceptions. Custom-domain `/licham`, `/chitay`, `/chuyengia` returned 200. Production `/api/experts` returned 200 with no published experts; `/api/bookings` returned 401 without a session. Public configuration revision 3 projects the three new services as free at 0 Point. Production Admin is protected by Cloudflare Access, so authenticated Admin editing was not tested on the live domain; local server and automated Admin/booking tests passed.

The pricing unlock switch remains off because no module/group prices were supplied or published by Admin. The pricing controls and server-side credit computation are deployed and covered by tests. Expert profiles and slots have not been fabricated; Admin must publish real availability before users can book. No live palm AI inference or paid checkout was executed in this smoke test.

Rollback: use `c038ba7` for the previous application code and the previous Pages deployment listed above. The private pre-migration D1 export is available to the operator if restoration is ever needed. The additive table can remain in place during an application rollback.
