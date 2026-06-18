# booking_widget_effect

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
| Tests — `Story` (update), `Scene` (view), pure validation | `src/*.test.ts` |

## Commands

```bash
npm run dev        # dev server at http://localhost:5173
npm test           # 17 Story / Scene / validation tests
npm run typecheck  # tsc --noEmit
npm run build      # production build
npm run lint       # eslint
```

By default the widget runs against an in-memory mock adapter. Set `VITE_API_URL`
to point the (Schema-decoded) HTTP adapter at a real backend.
