# Orange-to-green implementation plan

Owner: Codex root. Branch codex/green-accent. Base 0788036e497a2f20b60254f772f48bf25ffe31a3.

User scope: replace orange with green, preserve all other colors. Keep the exact original cream surfaces, typography colors, dark jade cards, gold details, 1:1 layout and motion. Only original orange primary buttons, section eyebrows, focus/selection and orange ambient decoration become dark jade #244d40 / #193e33 at their original opacity. Semantic error red remains.

Files: web/src/app/globals.css; kit/Btn.tsx; kit/SectionTitle.tsx; shell/AuthMenu.tsx; tuvi/LockPanel.tsx; plan and QA note. All homepage CSS, AppShell and locale layouts must match base byte-for-byte.

1. Restore every non-orange change to base; inspect final diff and compare original theme tokens and component files.
2. Run focused tests/build plus exact-head CI; inspect VI/EN public preview mobile/desktop, verify cream background, original dark jade/gold, green login button and no overflow.
3. Commit/push clean branch, update existing PR #6 and attach final preview evidence. Resume production only after the corrected scope is fully verified.
