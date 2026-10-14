# Wave 1 recheck

Verdict: READY

| # | Status | Evidence |
|---|---|---|
| B1 | RESOLVED | WorldQueries used for world at src/core/types.ts:2828, 3622, 3698, 3722, 3869; World only in BuildDeps (3800) |
| B2 | RESOLVED | itemSpriteKey src/core/rules.ts:240; art-checklist --check: up to date |
| B3 | RESOLVED | src/core/keys.ts exists; tests/unit/core/keyCoverage.allow.ts KNOWN_MISSING = [] and test passes |
| B4 | RESOLVED | src/core/math.ts:108 activity returns 1; types.ts:236 fast-forward REPLACES speed |
| B5 | RESOLVED | sim-engineer.md:27 defers soak to qa; contracts.md:81 specifies createHeadlessGame |
| B6 | RESOLVED | ResultEffect restricted (types.ts:733); ActivityResult.skill/details at 3289/3295 |

Gates: typecheck OK, lint OK (63 files), test 201 passed/1 todo, build OK, e2e (chromium) 1 passed, soak stub OK (still a stub until Wave 2).

New blockers: none.
