# booking_widget (Vue 3) → booking_widget_effect (foldkit)

> 🇷🇺 Русская версия: [COMPARISON-RU.md](./COMPARISON-RU.md)

A side-by-side rewrite of the same hotel-room booking widget, built to answer one
question: **how many of the original's correctness holes does a TEA + Effect
architecture (foldkit) close — structurally, not by remembering to be careful?**

Same domain, same deterministic availability data, same flow (dates → guests →
room → review → confirm), same ru/en i18n, theme toggle, calendar, and a
mock/http API boundary. The difference is entirely in *how state is modelled and
transitions are expressed*.

- Vue version: `../booking_widget`
- foldkit version: this project (`src/`)

Run it: `npm run dev`. Verify it: `npm test` (18 tests), `npm run typecheck`, `npm run build`.

---

## The architecture: full TEA

This is not "Vue with some Effect sprinkled in" — it's a complete implementation of
**The Elm Architecture**, the loop foldkit prescribes. Everything else in this
document is downstream of these five pieces:

- **Model** — the entire app state in one immutable, `Schema`-typed structure
  (`src/model.ts`). No component-local state, no refs.
- **Message** — every input (clicks, command results) is a variant of one tagged
  union (`src/message.ts`). Nothing happens that isn't a Message.
- **update** — a single *pure* function `(Model, Message) → [Model, Command[]]`
  (`src/update.ts`), matched exhaustively (`Match.tagsExhaustive`). It is the only
  place state transitions, and it touches no I/O.
- **view** — a pure function `Model → Document` (`src/view/`) via foldkit's `html`
  DSL. The UI is a projection of the Model; it cannot hold state of its own.
- **Command** — side effects are *values* returned from `update`, run by the
  runtime, which feeds their results back in as Messages (`src/command.ts`). The
  view never calls an API; it dispatches a Message, `update` returns a Command.

The runtime (`src/entry.ts` → `Runtime.makeApplication` / `Runtime.run`) closes the
loop: dispatch → `update` → re-`view`, with `Flags` for startup inputs (`today`,
theme) and a `resources` Layer for the command dependency graph. Tested through
foldkit's TEA-native primitives — `Story` (drive `update` with Messages, assert
Model + Commands) and `Scene` (assert the `view`) — so no DOM or fake timers.

**Which TEA / foldkit features are used here, and which aren't** (honesty matters
for a comparison): used — Model, Message, pure `update`, `view`, `Command`, `Flags`,
`resources` Layers, DevTools overlay, `Story`/`Scene` tests. *Not* used — foldkit
also offers Subscriptions, Submodels, Managed Resources, type-safe routing, Ports,
and a `fieldValidation` module; this widget needs none of them (validation is a pure
function over the Model instead), so they're left out rather than shown off.

---

## The audit

A correctness audit of the Vue widget found **13 holes**. The table below maps
each to its fate in the foldkit rewrite. "Structurally closed" = the bad state is
either unrepresentable in the type/model, or a transition that would produce it is
a compile error or an exhaustiveness requirement — not a convention a future edit
can quietly break.

| # | Hole (Vue) | Severity | Closed | How foldkit closes it |
|---|------------|----------|--------|------------------------|
| 1.1 | `loadRooms` had no request-invalidation → a slow/duplicated retry could overwrite fresh rooms, or flip `status` to `error` while data is present | HIGH | ✅ structural | Every fetch is a `Command` carrying a `requestId`; `update` discards any `LoadedRooms`/`FailedLoadRooms` whose id ≠ the model's current id. Same guard the Vue calendar had — but here it's the *only* way to handle a result, applied uniformly. (`src/update.ts` `LoadedRooms`/`FailedLoadRooms`) |
| 5.1 | A stay beyond the 180-day fetch horizon was reported **available & bookable** — `blockedDates` simply had no data for those days, so the "busy?" check returned false | HIGH | ✅ structural | `CalendarLoaded` carries the *window* (`from`/`to`) it covers. `rangeAvailability` returns `Unknown` (→ `availabilityUnknown` error, not bookable) for any night outside that window. Month navigation is also clamped to the horizon. (`src/validation.ts`, `src/update.ts` month bounds) |
| 2.1 | `status: editing\|review\|confirmed` was a flag *decoupled* from validity — kept consistent only by conditional rendering | MED | ✅ structural | `Phase` is a sum type whose `Reviewing`/`Submitting`/`Confirmed`/`SubmitFailed` variants each **carry a `ValidBooking`**. You cannot construct `Confirmed` without the validated payload that justifies it. (`src/model.ts` `Phase`) |
| 2.2 | `confirm()` set a local flag and performed **no side effect** — the one operation that matters couldn't fail or report failure | MED | ✅ structural | Confirm dispatches a real `SubmitBooking` command with `SucceededSubmit`/`FailedSubmit` results; the model has explicit `Submitting` and `SubmitFailed` states, surfaced in the UI with retry. Failures are a **typed error channel** (see the section below), not a swallowed exception. (`src/command.ts`, `src/update.ts`) |
| 3.1 | The booking was spread across 4 refs + 1 reactive object; cross-field rules ("dropped room ⇒ clear calendar") held only because every mutator remembered to call them | MED | ✅ structural | One immutable `Model`, one pure `update`. Each transition recomputes a whole consistent state; there is no second writer to forget a rule. |
| 4.1 | `DateRange = { checkIn, checkOut }` could represent `checkOut` set with `checkIn` null | LOW-MED | ✅ structural | `DateSelection = NoDates \| StartOnly \| CompleteRange`. The half-set state is unconstructable. (`src/model.ts`) |
| 4.2 | `calendarStatus === 'ready'` was representable with no room selected (the code defensively re-checked `selectedRoomId !== null`) | LOW | ✅ structural | Availability lives *inside* `RoomSelected`. No room ⇒ no availability field exists. (`src/model.ts` `RoomSelection`) |
| 7.1 | Non-exhaustive `locale === 'ru' ? … : …` ternaries in 3 places — a third locale would silently format everything as `en-GB` | MED | ✅ structural | Locale is resolved by `Match.exhaustive` (`messages`, `localeTag`, `currency`). A new locale is a compile error at each site. (`src/i18n.ts`) |
| 7.2 | `goToStep` hard-coded `index === 0 ⇒ edit()`; reordering steps silently breaks nav | LOW | ✅ structural | Step index is derived from `Phase` by `Match.exhaustive`; navigation is keyed by phase, not position. (`src/view/index.ts`) |
| 6.1 | No request cancellation; superseded `fetch`es completed and were merely ignored | LOW | ✅ (mostly) | Stale results are dropped by id (as before); Effect commands are also cancellable fibers, so superseded work can be interrupted rather than just ignored. |
| 5.2 | Past-date rule lived **only** in the calendar UI (`isPast`); the domain accepted past dates from any other path | MED | ⚠️ partly | The rule now lives in pure `validate` (`pastDates` error), so it holds for tests and any caller — not just the rendered calendar. Still a rule you must write; foldkit makes it central and unmissable rather than auto-true. |
| 5.3 | Calendar load error = disabled button, no hint, no retry (the error branch was never rendered) | MED | ⚠️ partly | `Availability` includes `CalendarLoadError`; exhaustive handling forces a visible, recoverable state — a retry banner (`ClickedRetryCalendar`). Still requires writing the branch; exhaustiveness makes omitting it a compile error. |
| 1.2 | Calendar's `today` (fetch time) could diverge from the picker's `today` (mount time) across midnight | LOW | ⚠️ partly | There is a single `today` in the model, sourced once from `Calendar.today.local` at startup (a `Flag`). One value, used everywhere. A clock subscription could make "now" a live input, but that isn't wired here. |

**Tally: 9 of 13 closed structurally, 4 closed in practice (rule centralised /
exhaustiveness-enforced but still author-written), 0 left open.**

There's also a free win not in the original audit: the Vue code normalised
`Date` to local midnight everywhere to avoid time-of-day bugs (`startOfDay` called
defensively in `addDays`, `daysBetween`, …). foldkit's `CalendarDate` is a plain
`{year, month, day}` with no time component, so that entire class of bug — and the
defensive normalisation — disappears.

---

## The error layer (the axis Effect is built for)

The Vue widget had no real notion of a *failure type*. `loadRooms`/`loadRoomCalendar`
did `try { … } catch { status = 'error' }` — every failure mode (offline, 500,
malformed JSON, a room taken out from under you) collapsed to one boolean-ish
`'error'`, and `confirm()` couldn't fail at all. The rewrite makes failures a
**typed, exhaustive channel** end to end:

1. **A named error ADT** (`src/domain/errors.ts`) — `NetworkError`,
   `ServerError({status})`, `RoomTaken`, via `Data.TaggedError`. `LoadError` and
   `SubmitError` are the unions each operation can produce.
2. **The service carries errors in its `E` channel** — `submitBooking` is
   `Effect<string, SubmitError>`, not `Effect<string>`. The http adapter maps each
   failure at its source: fetch reject → `NetworkError`, non-2xx → `ServerError`,
   409 → `RoomTaken`, malformed body (a Schema decode `SchemaError`) → `ServerError`.
   No `as`, no swallowed exceptions.
3. **One exhaustive translation point** from Effect-world to TEA-world — the
   commands' `Effect.catchTags({ RoomTaken, NetworkError, ServerError })`
   (`src/command.ts`). Adding an error variant to the service is a **compile error**
   here until it's handled. Each variant keeps its identity into a `FailedSubmit`
   Message carrying a typed `reason`.
4. **The reason survives as data into the model** (`SubmitFailed` carries
   `FailureReason`) and i18n renders a *distinct* message per cause
   (`submitErrors`, exhaustive over the reason) — "the room was just taken" ≠
   "no connection" ≠ "server unavailable" — instead of one generic "couldn't submit".

So the boundary between typed errors and the message-driven runtime is a single,
explicit, exhaustively-checked function — which is exactly what the `try/catch →
status flag` of the Vue version lacked.

**Server payloads are decoded, not trusted** (the Elm-decoder analogue). The HTTP
adapters don't cast `response.json()` to a type — they run it through
`S.decodeUnknownEffect(schema)` (`readJson` in `src/services/httpClient.ts`),
validating against `S.Array(Room)`, `S.Array(S.String)`, `S.Struct({reference})`. A
shape mismatch is a `SchemaError`, mapped to `ServerError` like any other failure.
The decisive improvement over Elm's hand-written `Json.Decode` decoders: the schema
*is* the type — the same `Room` used in the Model decodes the wire — so decoder and
domain type cannot drift. (`Flags` are likewise Schema-validated by the runtime at
startup. The mock adapter returns already-typed values, so decoding only matters at
the real wire boundary.) The Vue `httpBookingApi` did `(await res.json()) as RoomDto[]`
— an unchecked assertion that would happily hand malformed data to the UI.

> Live verification of the failure path also surfaced a real bug the type system
> *didn't* catch: the retry button in `SubmitFailed` was wired to `ClickedConfirm`,
> but `update` only acted on `ClickedConfirm` from `Reviewing`, so retry was a
> silent no-op. Fixed (resubmit from `SubmitFailed` too) and pinned with a
> regression `Story` test. A useful reminder that "impossible states out" closes
> *representation* bugs, not *transition-logic* bugs — those still need tests.

---

## Architecture & domains (Layers)

The Vue version inverted its single dependency by hand: a `BookingApi` interface,
two implementations (`createMockBookingApi` / `createHttpBookingApi`), and one
`createBookingApi()` that picks via `VITE_API_URL`. That's clean DI — but it's one
coarse port, the wiring is manual, and there's no notion of a *dependency graph*
(the http client, config, and the data ports are all tangled into one factory).

The foldkit version expresses the same idea as a typed graph of **Effect Layers**,
decomposed along domain lines (`src/services/`):

- **Domain ports**, one service each — `RoomCatalog` (read the catalogue),
  `AvailabilityCalendar` (read a room's blocked dates), `Reservations` (place a
  booking, the write side, with its own `RoomTaken` failure). Splitting the one
  `BookingApi` into three bounded ports means a command depends only on what it
  uses, and the read/write asymmetry is explicit in the types.
- **Infrastructure & config as services too** — `HttpClient` (the single place
  that touches `fetch`) and `AppConfig` (base URL, mock latencies). They are
  dependencies like any other, injected, not read ad-hoc.
- **A dependency graph wired by `Layer`** — `AppConfig ← HttpClient ← {the three
  HTTP adapters}`, composed with `Layer.mergeAll` (ports side by side) and
  `Layer.provide` (feed their dependencies). The mock and HTTP stacks are two
  alternative graphs producing the *same* three services:

  ```ts
  const MockServices = Layer.mergeAll(RoomCatalogMock, AvailabilityCalendarMock, ReservationsMock)
    .pipe(Layer.provide(AppConfigLive))

  const HttpServices = Layer.mergeAll(RoomCatalogHttp, AvailabilityCalendarHttp, ReservationsHttp)
    .pipe(Layer.provide(HttpClientLive), Layer.provide(AppConfigLive))
  ```

What this buys over the hand-rolled DI:

- **The `R` channel is the dependency contract, type-checked.** `update` returns
  `Command<Message, never, RoomCatalog | AvailabilityCalendar | Reservations>`. If
  a command uses a service the runtime's `resources` Layer doesn't provide, it's a
  compile error — you can't forget to wire something. The Vue factory had no such
  check; a missing dependency is a runtime surprise.
- **Swap one node, not the whole feed.** You could provide a real `Reservations`
  while keeping mock reads, or a fake `HttpClient` in a test, by composing
  different Layers — no factory rewrite.
- **Construction effects and resource lifecycles are first-class.** `Layer.effect`
  lets a service's *construction* be an Effect (read config, open a connection);
  scoped Layers get acquire/release. The Vue factory could only return plain
  objects.

The cost is real: more files and the Layer/`Context.Service` vocabulary for what is,
today, a three-endpoint demo. For an app this small the hand-rolled port was fine;
the Layer graph earns its keep as the number of services, their interdependencies,
and the need to vary them per environment/test grow.

---

## What it cost

The closures aren't free; they're paid in **up-front modelling**:

- More named states. The Vue store had ~8 refs; the foldkit model has ~5 sum
  types (`DateSelection`, `RoomsLoad`, `Availability`, `RoomSelection`, `Phase`)
  plus the `ValidBooking` smart-constructed payload. You declare the states you'd
  otherwise track implicitly.
- The view is more verbose than Vue SFC templates — an explicit `html` DSL with
  Tailwind strings instead of `<template>` + scoped CSS.
- A real Effect/Schema learning curve (services as `Context.Service`, commands as
  values, `Match.exhaustive`, `evo` for immutable updates).

The payoff: the bugs that an audit *found* in the Vue version are, in the foldkit
version, mostly things you cannot express — and the few that remain author-written
are enforced by exhaustiveness or centralised in one pure function, with the whole
flow covered by fast, deterministic `Story`/`Scene` tests (no DOM, no mocks-for-time).

---

## Tests (TEA-native, not DOM-mounting)

Because TEA splits the pure `update` (transition logic), the pure `view` (render),
and `Command` (effects-as-values), each layer is tested in isolation — no component
mounting, no `fetch` mocks, no fake timers. The 18 tests run in ~30 ms.

**`Story` — state-machine tests (`src/story.test.ts`).** Feed a sequence of Messages
through the real `update` and assert both the new Model *and the Commands it
returned* — the commands are **not executed**:

```ts
Story.story(
  update,
  Story.with(validModel),
  Story.message(ClickedConfirm()),
  Story.Command.expectExact(SubmitBooking),                 // the effect is a VALUE you can assert on
  Story.model(m => expect(m.phase._tag).toBe('Submitting')),
  Story.Command.resolve(SubmitBooking, SucceededSubmit({ reference: 'BK-TEST' })), // inject its result
  Story.model(m => expect(m.phase._tag).toBe('Confirmed')),
)
```

- **Effects are inspectable values** — no API module to mock. Assert "a `SubmitBooking`
  command was emitted", then `resolve` it with a chosen result Message to continue.
- **No timers, no `await`** — effects don't run, so there's nothing to wait on.
- **Races are deterministic** — the "stale `LoadedRooms` is ignored" test drives the
  `requestId` guard with two messages in a row, no async at all.
- The retry-after-failure path and the transition bug live verification surfaced are
  both **pinned here as regression tests**.

**`Scene` — view tests (`src/scene.test.ts`).** Render `view(model)` and query by
accessibility role / text (like Testing Library), tied to the `{ update, view }`
loop rather than a mounted component:

```ts
Scene.scene({ update, view }, Scene.with(confirmed),
  Scene.expect(Scene.role('heading', { name: 'Booking confirmed' })).toExist(),
  Scene.expect(Scene.text('BK-20260622-COM')).toExist(),
)
```

**`validation.test.ts`** is plain vitest over the pure `validate(model)` — possible
only because validity is one pure function, not scattered across computeds and
template guards.

Contrast with the Vue version: its tests mount real components with
`@vue/test-utils` + jsdom, **mock the API and `await`** for async, and lean on
Playwright for end-to-end. Here mocks and timers aren't needed at all — because an
effect is a value you can assert on and resolve by hand.

---

## Where the holes were closed (file map)

- Impossible states removed → `src/model.ts` (`DateSelection`, `RoomSelection`,
  `Availability`, `Phase`, `ValidBooking`)
- Single source of validity + horizon check → `src/validation.ts`
- Request-id staleness, exhaustive transitions, real submit → `src/update.ts`
- Effects as values, commands → `src/command.ts`
- Domain ports + Layer dependency graph (mock/http) → `src/services/` (`config.ts`, `httpClient.ts`, `roomCatalog.ts`, `availabilityCalendar.ts`, `reservations.ts`, `index.ts`)
- Typed error channel (ADT + exhaustive `catchTags` translation) → `src/domain/errors.ts`, `src/services/`, `src/command.ts`
- Exhaustive locale handling → `src/i18n.ts`
- Exhaustive phase→step / phase→view routing → `src/view/index.ts`
- Behavioural proof → `src/validation.test.ts`, `src/story.test.ts`, `src/scene.test.ts`
