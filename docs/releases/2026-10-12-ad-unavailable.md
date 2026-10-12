# Optional ad support note

Owner root; base 918a83d. Scope: DisplayAd/CSS, browser QA, rewarded load-error copy, plan/spec.
SDK failures collapse the ad and show one optional, dismissible VI/EN support note per browser session. No-fill remains silent. Storage failures skip the note. No detection claims, access restrictions or reward changes. Existing ad serving flag remains off.

Validation: browser regression failed before implementation; 13 provider-mocked browser checks pass after implementation. Typecheck, scoped ESLint, production build and diff check pass. CodeGraph synced. Storage fallback inspected; authenticated rewards and live ad fill not validated.
No migrations or backend changes. Rollback: 918a83d (Worker a7643fc7-41ec-4488-832f-35a0c1acb780, Pages 71e32265-21b0-44be-aacd-42d2205b76cd).
