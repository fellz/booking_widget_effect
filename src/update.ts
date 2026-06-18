import { Match as M, Option } from 'effect'
import { Command } from 'foldkit'
import { Calendar } from 'foldkit'
import { type CalendarDate } from 'foldkit/calendar'
import { evo } from 'foldkit/struct'

import { type BookingServices } from './services'
import { LoadCalendar, LoadRooms, PersistTheme, SubmitBooking } from './command'
import { type RoomId } from './domain/types'
import { HORIZON_DAYS, freshEditing } from './init'
import { type Message } from './message'
import {
  CalendarLoadError,
  CalendarLoaded,
  CalendarLoading,
  CompleteRange,
  Confirmed,
  type DateSelection,
  Editing,
  type Model,
  NoDates,
  NoRoom,
  RoomSelected,
  RoomsLoadError,
  RoomsLoaded,
  RoomsLoading,
  Reviewing,
  StartOnly,
  SubmitFailed,
  Submitting,
} from './model'
import { selectedRoom, validate } from './validation'

type UpdateReturn = readonly [
  Model,
  ReadonlyArray<Command.Command<Message, never, BookingServices>>,
]
const withUpdateReturn = M.withReturnType<UpdateReturn>()
const noCommand = (model: Model): UpdateReturn => [model, []]

// ── Calendar month navigation bounds ────────────────────────────────────────
const monthBounds = (today: CalendarDate) => ({
  minimum: Calendar.firstOfMonth(today),
  maximum: Calendar.firstOfMonth(Calendar.addDays(today, HORIZON_DAYS)),
})

// ── Range selection (mirrors the Vue selectDate state machine) ──────────────
const selectDate = (dates: DateSelection, date: CalendarDate): DateSelection =>
  M.value(dates).pipe(
    M.withReturnType<DateSelection>(),
    M.tag('NoDates', () => StartOnly({ checkIn: date })),
    M.tag('StartOnly', ({ checkIn }) =>
      Calendar.isBefore(checkIn, date)
        ? CompleteRange({ checkIn, checkOut: date })
        : StartOnly({ checkIn: date }),
    ),
    M.tag('CompleteRange', ({ checkIn }) => {
      if (Calendar.isEqual(checkIn, date)) return NoDates()
      return Calendar.isBefore(checkIn, date)
        ? CompleteRange({ checkIn, checkOut: date })
        : StartOnly({ checkIn: date })
    }),
    M.exhaustive,
  )

// ── Selecting a room kicks off its calendar fetch with a fresh requestId ─────
const selectRoom = (model: Model, roomId: RoomId): UpdateReturn => {
  const alreadySelected =
    model.selection._tag === 'RoomSelected' && model.selection.roomId === roomId
  if (alreadySelected) {
    return noCommand(evo(model, { selection: () => NoRoom() }))
  }
  const requestId = model.calendarRequestId + 1
  const from = model.today
  const to = Calendar.addDays(model.today, HORIZON_DAYS)
  return [
    evo(model, {
      calendarRequestId: () => requestId,
      selection: () =>
        RoomSelected({ roomId, requestId, availability: CalendarLoading() }),
    }),
    [LoadCalendar({ roomId, requestId, from, to })],
  ]
}

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    withUpdateReturn,
    M.tagsExhaustive({
      // ── Locale & theme ───────────────────────────────────────────────────
      ChangedLocale: ({ locale }) => noCommand(evo(model, { locale: () => locale })),

      ToggledTheme: () => {
        const theme = model.theme === 'dark' ? 'light' : 'dark'
        return [evo(model, { theme: () => theme }), [PersistTheme({ theme })]]
      },

      PersistedTheme: () => noCommand(model),

      // ── Calendar ─────────────────────────────────────────────────────────
      ClickedDay: ({ date }) =>
        noCommand(evo(model, { dates: dates => selectDate(dates, date) })),

      ClickedPreviousMonth: () =>
        noCommand(
          evo(model, {
            visibleMonth: m =>
              Calendar.clamp(Calendar.subtractMonths(m, 1), monthBounds(model.today)),
          }),
        ),

      ClickedNextMonth: () =>
        noCommand(
          evo(model, {
            visibleMonth: m =>
              Calendar.clamp(Calendar.addMonths(m, 1), monthBounds(model.today)),
          }),
        ),

      // ── Guests ───────────────────────────────────────────────────────────
      ChangedGuests: ({ guests }) => {
        const next = evo(model, { guests: () => guests })
        // Drop a selection that can no longer host the party.
        return Option.match(selectedRoom(next), {
          onNone: () => noCommand(next),
          onSome: room =>
            room.capacity < guests
              ? noCommand(evo(next, { selection: () => NoRoom() }))
              : noCommand(next),
        })
      },

      // ── Room selection ───────────────────────────────────────────────────
      ClickedRoom: ({ roomId }) => selectRoom(model, roomId),

      // ── Flow transitions. Review/Confirm only proceed with a ValidBooking. ─
      ClickedReview: () =>
        model.phase._tag === 'Editing'
          ? Option.match(validate(model).booking, {
              onNone: () => noCommand(model),
              onSome: booking =>
                noCommand(evo(model, { phase: () => Reviewing({ booking }) })),
            })
          : noCommand(model),

      ClickedBack: () =>
        model.phase._tag === 'Reviewing' || model.phase._tag === 'SubmitFailed'
          ? noCommand(evo(model, { phase: () => Editing() }))
          : noCommand(model),

      // Confirm from Review, or retry from a failed submission — both carry a
      // ValidBooking to resubmit.
      ClickedConfirm: () => {
        const phase = model.phase
        if (phase._tag !== 'Reviewing' && phase._tag !== 'SubmitFailed') {
          return noCommand(model)
        }
        const booking = phase.booking
        return [
          evo(model, { phase: () => Submitting({ booking }) }),
          [SubmitBooking({ booking })],
        ]
      },

      ClickedReset: () =>
        Option.match(
          model.rooms._tag === 'RoomsLoaded'
            ? Option.some(model.rooms.rooms)
            : Option.none(),
          {
            // Keep the loaded catalogue; just clear the booking. (Vue did the same.)
            onSome: rooms =>
              noCommand(
                evo(freshEditing(model.today, model.locale, model.theme, model.roomsRequestId), {
                  rooms: () => RoomsLoaded({ rooms }),
                }),
              ),
            onNone: () =>
              noCommand(
                freshEditing(model.today, model.locale, model.theme, model.roomsRequestId),
              ),
          },
        ),

      // ── Retries ──────────────────────────────────────────────────────────
      ClickedRetryRooms: () => {
        const requestId = model.roomsRequestId + 1
        return [
          evo(model, { rooms: () => RoomsLoading(), roomsRequestId: () => requestId }),
          [LoadRooms({ requestId })],
        ]
      },

      ClickedRetryCalendar: () => {
        if (model.selection._tag !== 'RoomSelected') return noCommand(model)
        const { roomId } = model.selection
        const requestId = model.calendarRequestId + 1
        const from = model.today
        const to = Calendar.addDays(model.today, HORIZON_DAYS)
        return [
          evo(model, {
            calendarRequestId: () => requestId,
            selection: () =>
              RoomSelected({ roomId, requestId, availability: CalendarLoading() }),
          }),
          [LoadCalendar({ roomId, requestId, from, to })],
        ]
      },

      // ── Command results (stale responses are discarded by requestId) ───────
      LoadedRooms: ({ requestId, rooms }) =>
        requestId === model.roomsRequestId
          ? noCommand(evo(model, { rooms: () => RoomsLoaded({ rooms }) }))
          : noCommand(model),

      FailedLoadRooms: ({ requestId }) =>
        requestId === model.roomsRequestId
          ? noCommand(evo(model, { rooms: () => RoomsLoadError() }))
          : noCommand(model),

      LoadedCalendar: ({ roomId, requestId, from, to, blocked }) => {
        const sel = model.selection
        if (
          sel._tag === 'RoomSelected' &&
          sel.roomId === roomId &&
          sel.requestId === requestId
        ) {
          return noCommand(
            evo(model, {
              selection: () =>
                RoomSelected({
                  roomId,
                  requestId,
                  availability: CalendarLoaded({ from, to, blocked }),
                }),
            }),
          )
        }
        return noCommand(model)
      },

      FailedLoadCalendar: ({ roomId, requestId }) => {
        const sel = model.selection
        if (
          sel._tag === 'RoomSelected' &&
          sel.roomId === roomId &&
          sel.requestId === requestId
        ) {
          return noCommand(
            evo(model, {
              selection: () =>
                RoomSelected({ roomId, requestId, availability: CalendarLoadError() }),
            }),
          )
        }
        return noCommand(model)
      },

      // ── Submission results ────────────────────────────────────────────────
      SucceededSubmit: ({ reference }) => {
        if (model.phase._tag !== 'Submitting') return noCommand(model)
        const booking = model.phase.booking
        return noCommand(evo(model, { phase: () => Confirmed({ booking, reference }) }))
      },

      FailedSubmit: ({ reason }) => {
        if (model.phase._tag !== 'Submitting') return noCommand(model)
        const booking = model.phase.booking
        return noCommand(evo(model, { phase: () => SubmitFailed({ booking, reason }) }))
      },
    }),
  )
