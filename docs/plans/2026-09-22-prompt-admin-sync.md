# Preserve original prompts and make Admin authoritative

Approved scope: restore original prompts and missing readings, manage full templates and API/calculation engines in Admin, wire actual runtime and cache, verify and deploy.

1. Build versioned original template registry from legacy HTML, with named variables and source references; keep original prose unchanged. Include global rules, module context wrappers, every task, and period/Tarot/Kinh Dich/compat templates. Make restore and preview available in Admin.
2. Extend validated config with templates and calculation-engine integration metadata/settings. Distinguish embedded deterministic libraries (iztro, astronomy-engine, lunar-typescript and local algorithms) from external HTTP services; never invent endpoints or pretend unused URL settings work.
3. Send exact service IDs and structured variables from all frontend AI calls. Server validates variables, renders published templates, and applies per-service status/chain. Retain pre-migration compatibility until publication. Restore all original Zodiac topics and original compatibility inputs.
4. Version cache by published prompt content; preserve historical reading data while allowing a current-version result. Preserve compact instructions server-side.
5. Add template rendering/variable and service mapping regression tests; verify real chart JSON and rendered prompt. Run typecheck/build and relevant tests, deploy main and migrate existing config without replacing unrelated settings or credentials. Verify Admin and production.
