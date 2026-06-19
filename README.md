# booking_widget_effect

🇷🇺 [Читать на русском](./README-RU.md)

🚀 **[Live demo](https://fellz.github.io/booking_widget_effect/)**

A [foldkit](https://foldkit.dev) (The Elm Architecture + Effect-TS) reimplementation
of the Vue 3 hotel booking widget in `../booking_widget`, built to measure how many
of the original's **correctness holes** a TEA + Effect architecture closes structurally.

See **[COMPARISON.md](./COMPARISON.md)** for the full audit-to-architecture mapping
(9 of 13 holes closed structurally, 4 closed in practice, 0 left open).

## Architecture

| Concern | File |
|---------|------|
| Domain (Schema, on `CalendarDate`) | `src/domain/` |
| Model — sum types that make bad states unrepresentable | `src/model.ts` |
| Single source of validity + smart-constructed `ValidBooking` | `src/validation.ts` |
| Pure `update` — exhaustive, request-id staleness, real submit | `src/update.ts` |
| Effects as values; commands | `src/command.ts` |
| Domain ports + Layer dependency graph (config → http client → 3 domain services, mock/http) | `src/services/` |
| Typed error channel — ADT + exhaustive `catchTags` translation to messages | `src/domain/errors.ts`, `src/services/`, `src/command.ts` |
| i18n with exhaustive locale matching | `src/i18n.ts` |
| View (foldkit `html` DSL + Tailwind) | `src/view/` |
| Startup flags (`today`, theme) + runtime wiring | `src/main.ts`, `src/entry.ts` |
| Tests — `Story` (update), `Scene` (view), pure validation, property-based datetime | `src/*.test.ts`, `src/domain/date.test.ts` |

## Commands

```bash
npm run dev        # dev server at http://localhost:5173
npm test           # 32 Story / Scene / validation + property-based datetime tests
npm run typecheck  # tsc --noEmit
npm run build      # production build
npm run lint       # eslint
```

## Property-based testing

The pure datetime core in `src/domain/date.ts` is covered by
[fast-check](https://github.com/dubzzz/fast-check) property tests in
`src/domain/date.test.ts` — instead of hand-picked examples, each test asserts an
**invariant** over 500 randomly generated calendar dates, and any counterexample is
automatically shrunk to its minimal form (e.g. a single day across a month / year /
leap-day boundary). Checked properties include:

- `eachDayInRange` — empty iff `to < from`, length `= daysUntil + 1`, one-day steps, all days in range and distinct
- `stayNights` — check-in inclusive / check-out exclusive (never sleeps on the checkout day)
- `nightCount` — never negative; `nightCount(a, a + n) === max(n, 0)`
- `toIsoKey` — always `YYYY-MM-DD`, round-trips through the ISO codec, and is injective

By default the widget runs against an in-memory mock adapter. Set `VITE_API_URL`
to point the (Schema-decoded) HTTP adapter at a real backend.
