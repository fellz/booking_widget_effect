import { Option } from 'effect'
import { Calendar } from 'foldkit'
import { describe, expect, test } from 'vitest'

import { ROOMS } from './domain/rooms'
import { freshEditing } from './init'
import {
  CalendarLoadError,
  CalendarLoaded,
  CalendarLoading,
  CompleteRange,
  type Model,
  RoomSelected,
  RoomsLoaded,
  StartOnly,
} from './model'
import { isValid, validate } from './validation'

const today = Calendar.make(2026, 6, 18)
const horizonTo = Calendar.addDays(today, 180)

const base: Model = {
  ...freshEditing(today, 'ru', 'light', 1),
  rooms: RoomsLoaded({ rooms: ROOMS }),
}

const withComfortLoaded = (
  blocked: ReadonlyArray<string>,
  checkIn: ReturnType<typeof Calendar.make>,
  checkOut: ReturnType<typeof Calendar.make>,
): Model => ({
  ...base,
  guests: 2,
  dates: CompleteRange({ checkIn, checkOut }),
  selection: RoomSelected({
    roomId: 'comfort',
    requestId: 1,
    availability: CalendarLoaded({ from: today, to: horizonTo, blocked }),
  }),
})

describe('validate', () => {
  test('a complete, available, in-horizon booking is valid and produces a ValidBooking', () => {
    const model = withComfortLoaded([], Calendar.addDays(today, 1), Calendar.addDays(today, 3))
    const { errors, booking } = validate(model)
    expect(errors).toEqual([])
    expect(Option.isSome(booking)).toBe(true)
    if (Option.isSome(booking)) {
      expect(booking.value.nights).toBe(2)
      expect(booking.value.room.id).toBe('comfort')
      expect(booking.value.total.ru).toBe(booking.value.room.pricePerNight.ru * 2)
    }
  })

  // Hole 5.1 — a stay outside the fetched window must NOT be reported available.
  test('a stay beyond the fetched horizon is availabilityUnknown, not bookable', () => {
    const model = withComfortLoaded(
      [],
      Calendar.addDays(today, 200),
      Calendar.addDays(today, 203),
    )
    expect(validate(model).errors).toContain('availabilityUnknown')
    expect(isValid(model)).toBe(false)
  })

  // Hole 5.2 — past-date rule lives in the domain, not only in the calendar UI.
  test('a check-in in the past is rejected with pastDates', () => {
    const model = withComfortLoaded(
      [],
      Calendar.subtractDays(today, 3),
      Calendar.subtractDays(today, 1),
    )
    expect(validate(model).errors).toContain('pastDates')
  })

  test('a stay overlapping a blocked day is datesUnavailable', () => {
    const checkIn = Calendar.addDays(today, 1)
    const blockedNight = Calendar.addDays(today, 1)
    const model = withComfortLoaded(
      [isoKey(blockedNight)],
      checkIn,
      Calendar.addDays(today, 3),
    )
    expect(validate(model).errors).toContain('datesUnavailable')
  })

  // Hole 5.3 — until the calendar resolves, availability is unknown, never assumed free.
  test('while the calendar is loading the booking is not valid', () => {
    const model: Model = {
      ...base,
      guests: 2,
      dates: CompleteRange({
        checkIn: Calendar.addDays(today, 1),
        checkOut: Calendar.addDays(today, 3),
      }),
      selection: RoomSelected({
        roomId: 'comfort',
        requestId: 1,
        availability: CalendarLoading(),
      }),
    }
    expect(validate(model).errors).toContain('availabilityUnknown')
    expect(isValid(model)).toBe(false)
  })

  test('a calendar load error keeps the booking invalid (no silent pass)', () => {
    const model: Model = {
      ...base,
      guests: 2,
      dates: CompleteRange({
        checkIn: Calendar.addDays(today, 1),
        checkOut: Calendar.addDays(today, 3),
      }),
      selection: RoomSelected({
        roomId: 'comfort',
        requestId: 1,
        availability: CalendarLoadError(),
      }),
    }
    expect(isValid(model)).toBe(false)
  })

  test('a half-selected range (StartOnly) asks for a check-out', () => {
    const model: Model = { ...base, dates: StartOnly({ checkIn: Calendar.addDays(today, 1) }) }
    expect(validate(model).errors).toContain('noCheckOut')
  })
})

function isoKey(d: ReturnType<typeof Calendar.make>): string {
  const m = String(d.month).padStart(2, '0')
  const day = String(d.day).padStart(2, '0')
  return `${d.year}-${m}-${day}`
}
