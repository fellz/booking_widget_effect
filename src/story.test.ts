import { Calendar, Story } from 'foldkit'
import { describe, expect, test } from 'vitest'

import { LoadCalendar, SubmitBooking } from './command'
import { ROOMS } from './domain/rooms'
import { freshEditing } from './init'
import {
  ChangedGuests,
  ClickedConfirm,
  ClickedDay,
  ClickedPreviousMonth,
  ClickedReview,
  ClickedRoom,
  FailedSubmit,
  LoadedCalendar,
  LoadedRooms,
  SucceededSubmit,
} from './message'
import {
  CalendarLoaded,
  CalendarLoading,
  CompleteRange,
  type Model,
  RoomSelected,
  RoomsLoaded,
  RoomsLoading,
} from './model'
import { update } from './update'

const today = Calendar.make(2026, 6, 18)
const horizonTo = Calendar.addDays(today, 180)

const base: Model = {
  ...freshEditing(today, 'ru', 'light', 1),
  rooms: RoomsLoaded({ rooms: ROOMS }),
}

const validModel: Model = {
  ...base,
  guests: 2,
  dates: CompleteRange({
    checkIn: Calendar.addDays(today, 1),
    checkOut: Calendar.addDays(today, 3),
  }),
  selection: RoomSelected({
    roomId: 'comfort',
    requestId: 1,
    availability: CalendarLoaded({ from: today, to: horizonTo, blocked: [] }),
  }),
}

describe('update', () => {
  // Hole 1.1 — a superseded rooms response is dropped by requestId.
  test('a stale LoadedRooms response is ignored; the current one applies', () => {
    Story.story(
      update,
      Story.with({ ...base, rooms: RoomsLoading(), roomsRequestId: 2 }),
      Story.message(LoadedRooms({ requestId: 1, rooms: ROOMS })),
      Story.model(model => {
        expect(model.rooms._tag).toBe('RoomsLoading')
      }),
      Story.message(LoadedRooms({ requestId: 2, rooms: ROOMS })),
      Story.model(model => {
        expect(model.rooms._tag).toBe('RoomsLoaded')
      }),
    )
  })

  // Hole 2.1 — Review cannot be entered without a valid booking.
  test('ClickedReview on an invalid model stays in Editing', () => {
    Story.story(
      update,
      Story.with(base),
      Story.message(ClickedReview()),
      Story.Command.expectNone(),
      Story.model(model => {
        expect(model.phase._tag).toBe('Editing')
      }),
    )
  })

  // Holes 2.1 / 2.2 — Review carries the validated snapshot; Confirm runs a real
  // command that can succeed.
  test('valid booking: Review → Confirm → SubmitBooking → Confirmed with reference', () => {
    Story.story(
      update,
      Story.with(validModel),
      Story.message(ClickedReview()),
      Story.model(model => {
        expect(model.phase._tag).toBe('Reviewing')
        if (model.phase._tag === 'Reviewing') {
          expect(model.phase.booking.room.id).toBe('comfort')
          expect(model.phase.booking.nights).toBe(2)
        }
      }),
      Story.message(ClickedConfirm()),
      Story.Command.expectExact(SubmitBooking),
      Story.model(model => {
        expect(model.phase._tag).toBe('Submitting')
      }),
      Story.Command.resolve(SubmitBooking, SucceededSubmit({ reference: 'BK-TEST' })),
      Story.model(model => {
        expect(model.phase._tag).toBe('Confirmed')
        if (model.phase._tag === 'Confirmed') {
          expect(model.phase.reference).toBe('BK-TEST')
        }
      }),
    )
  })

  // Hole 2.2 — submission failure is a handled state, not an unhandled effect.
  test('a failed submission lands in SubmitFailed carrying the booking', () => {
    Story.story(
      update,
      Story.with(validModel),
      Story.message(ClickedReview()),
      Story.message(ClickedConfirm()),
      Story.Command.resolve(SubmitBooking, FailedSubmit({ reason: 'roomTaken' })),
      Story.model(model => {
        expect(model.phase._tag).toBe('SubmitFailed')
        if (model.phase._tag === 'SubmitFailed') {
          expect(model.phase.booking.room.id).toBe('comfort')
          // The typed error survives as data into the model, distinct per cause.
          expect(model.phase.reason).toBe('roomTaken')
        }
      }),
    )
  })

  // After a failed submission, confirming again resubmits the same booking.
  test('retry from SubmitFailed resubmits and can succeed', () => {
    Story.story(
      update,
      Story.with(validModel),
      Story.message(ClickedReview()),
      Story.message(ClickedConfirm()),
      Story.Command.resolve(SubmitBooking, FailedSubmit({ reason: 'roomTaken' })),
      Story.model(model => {
        expect(model.phase._tag).toBe('SubmitFailed')
      }),
      Story.message(ClickedConfirm()),
      Story.Command.expectExact(SubmitBooking),
      Story.model(model => {
        expect(model.phase._tag).toBe('Submitting')
      }),
      Story.Command.resolve(SubmitBooking, SucceededSubmit({ reference: 'BK-RETRY' })),
      Story.model(model => {
        expect(model.phase._tag).toBe('Confirmed')
      }),
    )
  })

  // Cross-field rule, enforced by the model: raising the party size past a
  // room's capacity drops the selection.
  test('raising guests beyond capacity clears an oversized room', () => {
    Story.story(
      update,
      Story.with({
        ...base,
        guests: 2,
        selection: RoomSelected({
          roomId: 'standard',
          requestId: 1,
          availability: CalendarLoading(),
        }),
      }),
      Story.message(ChangedGuests({ guests: 3 })),
      Story.model(model => {
        expect(model.selection._tag).toBe('NoRoom')
      }),
    )
  })

  // Selecting a room fetches its calendar with a fresh requestId.
  test('ClickedRoom selects the room and fires LoadCalendar', () => {
    Story.story(
      update,
      Story.with(base),
      Story.message(ClickedRoom({ roomId: 'comfort' })),
      Story.Command.expectExact(LoadCalendar),
      Story.model(model => {
        expect(model.selection._tag).toBe('RoomSelected')
        if (model.selection._tag === 'RoomSelected') {
          expect(model.selection.availability._tag).toBe('CalendarLoading')
        }
      }),
      Story.Command.resolve(
        LoadCalendar,
        LoadedCalendar({
          roomId: 'comfort',
          requestId: 1,
          from: today,
          to: horizonTo,
          blocked: [],
        }),
      ),
      Story.model(model => {
        if (model.selection._tag === 'RoomSelected') {
          expect(model.selection.availability._tag).toBe('CalendarLoaded')
        }
      }),
    )
  })

  // Month navigation is clamped to the fetch horizon — no navigating to dates
  // we could never have availability for.
  test('ClickedPreviousMonth at the first allowed month is a no-op', () => {
    Story.story(
      update,
      Story.with(base),
      Story.message(ClickedPreviousMonth()),
      Story.model(model => {
        expect(Calendar.isEqual(model.visibleMonth, Calendar.firstOfMonth(today))).toBe(true)
      }),
    )
  })

  // The range-selection state machine.
  test('day clicks drive NoDates → StartOnly → CompleteRange, and clicking start clears', () => {
    Story.story(
      update,
      Story.with(base),
      Story.message(ClickedDay({ date: Calendar.addDays(today, 1) })),
      Story.model(model => {
        expect(model.dates._tag).toBe('StartOnly')
      }),
      Story.message(ClickedDay({ date: Calendar.addDays(today, 3) })),
      Story.model(model => {
        expect(model.dates._tag).toBe('CompleteRange')
      }),
      Story.message(ClickedDay({ date: Calendar.addDays(today, 1) })),
      Story.model(model => {
        expect(model.dates._tag).toBe('NoDates')
      }),
    )
  })
})
