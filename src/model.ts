import { Schema as S } from 'effect'
import { Calendar } from 'foldkit'
import { ts } from 'foldkit/schema'

import { FailureReason } from './domain/errors'
import { LocalizedPrice, Locale, Room, RoomId, Theme } from './domain/types'

// ─────────────────────────────────────────────────────────────────────────
// DATE SELECTION — a sum type. The Vue `DateRange = { checkIn, checkOut }`
// could represent `{ checkIn: null, checkOut: someDate }` (a check-out with no
// check-in). Here that state simply cannot be constructed. (Closes hole 4.1)
// ─────────────────────────────────────────────────────────────────────────
export const NoDates = ts('NoDates')
export const StartOnly = ts('StartOnly', { checkIn: Calendar.CalendarDate })
export const CompleteRange = ts('CompleteRange', {
  checkIn: Calendar.CalendarDate,
  checkOut: Calendar.CalendarDate,
})
export const DateSelection = S.Union([NoDates, StartOnly, CompleteRange])
export type DateSelection = typeof DateSelection.Type

// ─────────────────────────────────────────────────────────────────────────
// ROOM CATALOGUE LOADING
// ─────────────────────────────────────────────────────────────────────────
export const RoomsLoading = ts('RoomsLoading')
export const RoomsLoaded = ts('RoomsLoaded', { rooms: S.Array(Room) })
export const RoomsLoadError = ts('RoomsLoadError')
export const RoomsLoad = S.Union([RoomsLoading, RoomsLoaded, RoomsLoadError])
export type RoomsLoad = typeof RoomsLoad.Type

// ─────────────────────────────────────────────────────────────────────────
// PER-ROOM AVAILABILITY CALENDAR. `Loaded` carries the *window* it covers
// (`from`/`to`) alongside the blocked keys, so "is this stay inside the data we
// actually fetched?" is an explicit, checkable question. (Closes hole 5.1)
// ─────────────────────────────────────────────────────────────────────────
export const CalendarLoading = ts('CalendarLoading')
export const CalendarLoaded = ts('CalendarLoaded', {
  from: Calendar.CalendarDate,
  to: Calendar.CalendarDate,
  blocked: S.Array(S.String),
})
export const CalendarLoadError = ts('CalendarLoadError')
export const Availability = S.Union([
  CalendarLoading,
  CalendarLoaded,
  CalendarLoadError,
])
export type Availability = typeof Availability.Type

// ─────────────────────────────────────────────────────────────────────────
// ROOM SELECTION. Availability data lives *inside* `RoomSelected`, so
// "calendar ready with no room picked" is unrepresentable. `requestId` tags
// in-flight calendar fetches so stale responses are dropped. (Closes hole 4.2)
// ─────────────────────────────────────────────────────────────────────────
export const NoRoom = ts('NoRoom')
export const RoomSelected = ts('RoomSelected', {
  roomId: RoomId,
  requestId: S.Number,
  availability: Availability,
})
export const RoomSelection = S.Union([NoRoom, RoomSelected])
export type RoomSelection = typeof RoomSelection.Type

// ─────────────────────────────────────────────────────────────────────────
// VALID BOOKING — the captured, validated payload. It can only be built by the
// smart constructor in `validation.ts` once every rule passes, and the booking
// flow carries it forward. A `Confirmed` phase therefore *cannot exist* without
// the data that justified it. (Closes holes 2.1 / 2.2)
// ─────────────────────────────────────────────────────────────────────────
export const ValidBooking = S.Struct({
  room: Room,
  checkIn: Calendar.CalendarDate,
  checkOut: Calendar.CalendarDate,
  guests: S.Number,
  nights: S.Number,
  total: LocalizedPrice,
})
export type ValidBooking = typeof ValidBooking.Type

// ─────────────────────────────────────────────────────────────────────────
// PHASE — the flow state. Review/Submitting/Confirmed/Failed each *carry* the
// `ValidBooking`, so they are snapshots of validated data, not flags layered
// over mutable editing state.
// ─────────────────────────────────────────────────────────────────────────
export const Editing = ts('Editing')
export const Reviewing = ts('Reviewing', { booking: ValidBooking })
export const Submitting = ts('Submitting', { booking: ValidBooking })
export const Confirmed = ts('Confirmed', {
  booking: ValidBooking,
  reference: S.String,
})
export const SubmitFailed = ts('SubmitFailed', {
  booking: ValidBooking,
  reason: FailureReason,
})
export const Phase = S.Union([
  Editing,
  Reviewing,
  Submitting,
  Confirmed,
  SubmitFailed,
])
export type Phase = typeof Phase.Type

// ─────────────────────────────────────────────────────────────────────────
// MODEL — one immutable structure. Every transition flows through `update`.
// ─────────────────────────────────────────────────────────────────────────
export const Model = S.Struct({
  locale: Locale,
  theme: Theme,
  today: Calendar.CalendarDate,
  guests: S.Number,
  dates: DateSelection,
  rooms: RoomsLoad,
  roomsRequestId: S.Number,
  selection: RoomSelection,
  calendarRequestId: S.Number,
  visibleMonth: Calendar.CalendarDate,
  phase: Phase,
})
export type Model = typeof Model.Type
