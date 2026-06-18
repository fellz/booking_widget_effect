import { Effect, Schema as S } from 'effect'
import { Command } from 'foldkit'
import { Calendar } from 'foldkit'

import { AvailabilityCalendar, Reservations, RoomCatalog } from './services'
import { ValidBooking } from './model'
import {
  FailedLoadCalendar,
  FailedLoadRooms,
  FailedSubmit,
  LoadedCalendar,
  LoadedRooms,
  PersistedTheme,
  SucceededSubmit,
} from './message'
import { RoomId, Theme } from './domain/types'

const THEME_STORAGE_KEY = 'booking-widget-theme'

/** Persist the chosen theme. A side effect expressed as a returned value. */
export const PersistTheme = Command.define(
  'PersistTheme',
  { theme: Theme },
  PersistedTheme,
)(({ theme }) =>
  Effect.gen(function* () {
    yield* Effect.sync(() => localStorage.setItem(THEME_STORAGE_KEY, theme))
    return PersistedTheme()
  }).pipe(Effect.catchCause(() => Effect.succeed(PersistedTheme()))),
)

// Each command threads a `requestId` so the resulting Message can be matched
// against the model and a superseded response discarded in `update`. Side
// effects are values returned from `update`, never imperative calls. (Closes 1.1)

// Load failures don't need to be distinguished in the UI (one "couldn't load"
// state with a retry), so both error tags collapse to one Message — but the
// collapse is explicit and exhaustive: a new error tag is a compile error here.
export const LoadRooms = Command.define(
  'LoadRooms',
  { requestId: S.Number },
  LoadedRooms,
  FailedLoadRooms,
)(({ requestId }) =>
  Effect.gen(function* () {
    const catalog = yield* RoomCatalog
    const rooms = yield* catalog.all
    return LoadedRooms({ requestId, rooms })
  }).pipe(
    Effect.catchTags({
      NetworkError: () => Effect.succeed(FailedLoadRooms({ requestId })),
      ServerError: () => Effect.succeed(FailedLoadRooms({ requestId })),
    }),
  ),
)

export const LoadCalendar = Command.define(
  'LoadCalendar',
  {
    roomId: RoomId,
    requestId: S.Number,
    from: Calendar.CalendarDate,
    to: Calendar.CalendarDate,
  },
  LoadedCalendar,
  FailedLoadCalendar,
)(({ roomId, requestId, from, to }) =>
  Effect.gen(function* () {
    const calendar = yield* AvailabilityCalendar
    const blocked = yield* calendar.blockedKeys(roomId, from, to)
    return LoadedCalendar({ roomId, requestId, from, to, blocked })
  }).pipe(
    Effect.catchTags({
      NetworkError: () => Effect.succeed(FailedLoadCalendar({ roomId, requestId })),
      ServerError: () => Effect.succeed(FailedLoadCalendar({ roomId, requestId })),
    }),
  ),
)

export const SubmitBooking = Command.define(
  'SubmitBooking',
  { booking: ValidBooking },
  SucceededSubmit,
  FailedSubmit,
)(({ booking }) =>
  Effect.gen(function* () {
    const reservations = yield* Reservations
    const reference = yield* reservations.submit(booking)
    return SucceededSubmit({ reference })
  }).pipe(
    // The single, exhaustive translation point from the typed error channel to
    // a Message. Each failure mode keeps its identity into the model.
    Effect.catchTags({
      RoomTaken: () => Effect.succeed(FailedSubmit({ reason: 'roomTaken' })),
      NetworkError: () => Effect.succeed(FailedSubmit({ reason: 'network' })),
      ServerError: () => Effect.succeed(FailedSubmit({ reason: 'server' })),
    }),
  ),
)
