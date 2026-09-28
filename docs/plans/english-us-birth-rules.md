# English/US birth data conventions (plan Task 06)

Decisions binding for Tasks 07–10. Evidence: `web/tests/birth-time.test.mjs` (reference fixtures) and this file.

## Core principle

**Every wall time is civil time at the birth place.** Nothing assumes UTC+7 for non-Vietnamese births, and the visitor's current browser timezone is never read (`birth-location.ts` has no such code path).

## Per-engine conventions

| Engine | Input semantics | Timezone handling |
|---|---|---|
| Zi Wei (`tuvi.ts`) | Solar date + hour-chi index | Both are birth-place civil values entered by the user; `astro.bySolar` consumes them directly. No conversion. |
| Ba Zi (`batu.ts`) | Solar date + hour-chi mid-hour | **VN province:** legacy true-solar refinement kept byte-identical (+07:00 instant + longitude correction). **Foreign:** civil parts fed straight to `Solar.fromYmdHms` — no +07 instant, no longitude correction without trusted coordinates. |
| Western astrology (`zodiac.ts`) | True UTC instant | `natalTime()` resolves zone via `resolveProfileZone`, then `wallTimeToInstant` (exact `birthTime` when present, else hour-chi mid, else 12:00 local noon). |
| Lunar calendar (`calendar-vn.ts`) | Vietnamese civil calendar | Unchanged: it describes VN calendar days on the UTC+7 day boundary by definition. |
| Numerology | Names + date digits | No timezone involvement; multilingual name rules handled in Task 09. |

## Zone resolution (`resolveProfileZone`)

1. `profile.placeTz` (IANA) when present and valid — international profiles set it in the wizard.
2. Otherwise `Asia/Ho_Chi_Minh` — legacy profiles are Vietnamese by construction; this keeps every historical chart byte-identical (asserted by test: `wallTimeToInstant(Hanoi) === new Date("…+07:00")`).

## DST policy (`birth-time.ts`)

- **Nonexistent** wall time (spring-forward gap) → `nonexistent: true`; the wizard blocks saving with `wizard.timeNonexistent`.
- **Ambiguous** wall time (fall-back overlap) → `ambiguous: true`; the wizard requires the user to pick the first or second occurrence (`profile.birthDst: 'first' | 'second'`, default `first`). `wallTimeCandidates()` returns both; `natalTime()` honors the choice.
- No tz database is bundled: conversion uses the platform tzdata through `Intl` (MIT-compatible, ships with browsers/node/Workers and receives historical updates). Zero bundle cost.

## Place model (versioned, additive)

- `Profile.placeTz?: string` and `Profile.birthDst?: 'first'|'second'` are optional; old profiles are never rewritten.
- International wizard (EN tree): free-text place with offline suggestions (`searchBirthPlaces`: 63 VN provinces + US states/DC zones + curated world cities) **plus** an explicit required zone select — auto-filled when the text exactly matches a known place, never inferred silently.
- VN wizard unchanged (province select → `Asia/Ho_Chi_Minh`).

## Reference checks performed (fixtures in `birth-time.test.mjs`)

LA summer/winter (−7/−8), NY gap 2026-03-08 02:30 (nonexistent), NY overlap 2026-11-01 01:30 (ambiguous, first = EDT −4), Arizona/Hawaii no-DST, Hanoi 1990 (+7 exact-match vs legacy formula), near-midnight NY Jan 1 00:30, invalid zone/clock/date rejection, locale-free math (leap-day 2000-02-29).
