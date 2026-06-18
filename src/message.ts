import { Schema as S } from 'effect'
import { Calendar } from 'foldkit'
import { m } from 'foldkit/message'

import { FailureReason } from './domain/errors'
import { Locale, Room, RoomId } from './domain/types'

// ── User interactions ──────────────────────────────────────────────────────
export const ChangedLocale = m('ChangedLocale', { locale: Locale })
export const ToggledTheme = m('ToggledTheme')
/** Fire-and-forget acknowledgement of the theme-persistence side effect. */
export const PersistedTheme = m('PersistedTheme')

export const ClickedDay = m('ClickedDay', { date: Calendar.CalendarDate })
export const ClickedPreviousMonth = m('ClickedPreviousMonth')
export const ClickedNextMonth = m('ClickedNextMonth')

export const ChangedGuests = m('ChangedGuests', { guests: S.Number })
export const ClickedRoom = m('ClickedRoom', { roomId: RoomId })

export const ClickedReview = m('ClickedReview')
export const ClickedBack = m('ClickedBack')
export const ClickedConfirm = m('ClickedConfirm')
export const ClickedReset = m('ClickedReset')
export const ClickedRetryRooms = m('ClickedRetryRooms')
export const ClickedRetryCalendar = m('ClickedRetryCalendar')

// ── Command results (room catalogue) ────────────────────────────────────────
// Each result carries the requestId of the fetch that produced it, so a stale
// response can be matched against the model and discarded. (Closes hole 1.1)
export const LoadedRooms = m('LoadedRooms', {
  requestId: S.Number,
  rooms: S.Array(Room),
})
export const FailedLoadRooms = m('FailedLoadRooms', { requestId: S.Number })

// ── Command results (per-room calendar) ─────────────────────────────────────
export const LoadedCalendar = m('LoadedCalendar', {
  roomId: RoomId,
  requestId: S.Number,
  from: Calendar.CalendarDate,
  to: Calendar.CalendarDate,
  blocked: S.Array(S.String),
})
export const FailedLoadCalendar = m('FailedLoadCalendar', {
  roomId: RoomId,
  requestId: S.Number,
})

// ── Command results (submission) ────────────────────────────────────────────
export const SucceededSubmit = m('SucceededSubmit', { reference: S.String })
export const FailedSubmit = m('FailedSubmit', { reason: FailureReason })

export const Message = S.Union([
  ChangedLocale,
  ToggledTheme,
  PersistedTheme,
  ClickedDay,
  ClickedPreviousMonth,
  ClickedNextMonth,
  ChangedGuests,
  ClickedRoom,
  ClickedReview,
  ClickedBack,
  ClickedConfirm,
  ClickedReset,
  ClickedRetryRooms,
  ClickedRetryCalendar,
  LoadedRooms,
  FailedLoadRooms,
  LoadedCalendar,
  FailedLoadCalendar,
  SucceededSubmit,
  FailedSubmit,
])
export type Message = typeof Message.Type
