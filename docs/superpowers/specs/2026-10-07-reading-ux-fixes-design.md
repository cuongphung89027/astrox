# Reading UX corrections

Owner: root (integration owner). Base: 6d6a1e96b10f72075ca55e6cb7528256fc70b361.
Branch/worktree: codex/reading-ux-fixes; dedicated managed checkout.
Authorization: user accepted review findings 1–5, requested fixes and a finer desktop navigation underline.

Keep AstroX cream/forest/gold colors, existing fonts and native React/SVG motion.

- Replace arbitrary percentage scores with two compact evidence cards: the actual day deity and applicable lunar taboo dates. Each explains the source of the suggestion; clearly identify the reference as traditional almanac guidance. An available personal visual reading uses its actual title/summary, never serialized JSON.
- Separate date concepts. The almanac is the Vietnamese UTC+7 calendar in both languages (including its hour windows). Label that explicitly on English screens. Personal dashboard today/date/greeting uses UTC+7 on VI, current device IANA zone on EN. Do not infer a current zone from the birth location or force every US user to Eastern time. Forecast snapshots and existing paid scopes/calculation anchors remain intact; only show a cached personal forecast when its dated visual snapshot matches the current personal date.
- Fix Term taps under the calendar card's stretched link. Render tooltip content in a body portal, clamp to viewport, support keyboard/Escape/tap/outside, dismiss when scrolling/resizing and remove timers/listeners on unmount. Avoid nested block elements inside paragraphs and buttons.
- Shared reading toolbar for legacy text and native visual reports. Listen/copy/share readable full report content with titles, chapters, evidence, examples, terms and actions; never technical IDs or JSON. Cancel speech when its source changes/unmounts, hide unsupported actions and report clipboard/share failures.
- Convert supported Markdown by syntax, preserving literal C#, multiplication, identifiers and fenced content. Keep paragraph/list structure and mirror displayed term translation.
- Desktop underline: short 1.5px tapered forest/gold rule centered below the label, gentle finite reveal, identical style for direct links and groups, reduced motion support. Keep nav dimensions/routes.

Research: MDN Intl.DateTimeFormat documents IANA zones and runtime default zone; existing lunar engine is explicitly UTC+7. Browser tests cover New York, Los Angeles, Phoenix, Honolulu and DST transitions. No backend schema, wallet, pricing or prompt changes.
