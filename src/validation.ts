import { Array as Arr, Match as M, Option, pipe } from 'effect'
import { Calendar } from 'foldkit'
import { type CalendarDate } from 'foldkit/calendar'

import { stayNights, toIsoKey } from './domain/date'
import { type BookingError, type LocalizedPrice, type Room } from './domain/types'
import {
  type Availability,
  type DateSelection,
  type Model,
  type ValidBooking,
} from './model'

// ── SELECTORS ────────────────────────────────────────────────────────────

/** The loaded catalogue, or empty while loading / on error. */
export const roomsList = (model: Model): ReadonlyArray<Room> =>
  model.rooms._tag === 'RoomsLoaded' ? model.rooms.rooms : []

export const findRoom = (
  model: Model,
  roomId: Room['id'],
): Option.Option<Room> => Arr.findFirst(roomsList(model), r => r.id === roomId)

/** The currently selected room object (looked up in the loaded catalogue). */
export const selectedRoom = (model: Model): Option.Option<Room> =>
  model.selection._tag === 'RoomSelected'
    ? findRoom(model, model.selection.roomId)
    : Option.none()

export const selectedAvailability = (
  model: Model,
): Option.Option<Availability> =>
  model.selection._tag === 'RoomSelected'
    ? Option.some(model.selection.availability)
    : Option.none()

/** Upper bound for the guest stepper, from loaded data. */
export const maxGuests = (model: Model): number => {
  const rooms = roomsList(model)
  return rooms.length === 0
    ? model.guests
    : Math.max(...rooms.map(r => r.capacity))
}

export const availableRooms = (model: Model): ReadonlyArray<Room> =>
  roomsList(model).filter(r => r.capacity >= model.guests)

export const checkIn = (dates: DateSelection): Option.Option<CalendarDate> =>
  dates._tag === 'NoDates' ? Option.none() : Option.some(dates.checkIn)

export const checkOut = (dates: DateSelection): Option.Option<CalendarDate> =>
  dates._tag === 'CompleteRange' ? Option.some(dates.checkOut) : Option.none()

// ── PRICING ──────────────────────────────────────────────────────────────

export const calcTotal = (
  pricePerNight: LocalizedPrice,
  nights: number,
): LocalizedPrice => ({
  ru: pricePerNight.ru * nights,
  en: pricePerNight.en * nights,
})

// ── AVAILABILITY OVER A RANGE ──────────────────────────────────────────────

type RangeAvailability =
  | 'Available'
  | 'Busy'
  | 'Unknown' // loading, errored, or stay falls outside the fetched window

const rangeAvailability = (
  availability: Availability,
  checkInDate: CalendarDate,
  checkOutDate: CalendarDate,
): RangeAvailability =>
  M.value(availability).pipe(
    M.withReturnType<RangeAvailability>(),
    M.tag('CalendarLoading', () => 'Unknown'),
    M.tag('CalendarLoadError', () => 'Unknown'),
    M.tag('CalendarLoaded', ({ from, to, blocked }) => {
      const nights = stayNights(checkInDate, checkOutDate)
      // Every night must lie inside the window we actually fetched, otherwise
      // we have no data and must not claim the room is free. (Closes hole 5.1)
      const allWithinWindow = nights.every(d =>
        Calendar.between(d, { minimum: from, maximum: to }),
      )
      if (!allWithinWindow) return 'Unknown'
      const blockedSet = new Set(blocked)
      return nights.some(d => blockedSet.has(toIsoKey(d))) ? 'Busy' : 'Available'
    }),
    M.exhaustive,
  )

// ── VALIDATION + SMART CONSTRUCTOR ─────────────────────────────────────────

export type ValidationResult = Readonly<{
  errors: ReadonlyArray<BookingError>
  booking: Option.Option<ValidBooking>
}>

/**
 * The single source of truth for "can this booking proceed?". Pure over the
 * whole model. Produces both the error list (for hints) and — only when every
 * rule passes — a `ValidBooking` the flow can carry forward. The Vue version
 * spread this across `validateBooking`, a `selectedRoomBusy` computed, an
 * `isValid` computed, and the calendar component's `isPast`/`isOccupied`
 * guards; here it is one function. (Closes holes 3.1 / 5.2 / 5.3)
 */
export const validate = (model: Model): ValidationResult => {
  const errors: BookingError[] = []

  const maybeRoom = selectedRoom(model)

  // Dates
  const dates = model.dates
  if (dates._tag === 'NoDates') {
    errors.push('noDates')
  } else if (dates._tag === 'StartOnly') {
    errors.push('noCheckOut')
  } else {
    if (!Calendar.isBefore(dates.checkIn, dates.checkOut)) {
      errors.push('invalidRange')
    } else if (Calendar.isBefore(dates.checkIn, model.today)) {
      // Past-date rule lives in the domain, not only in the calendar UI.
      errors.push('pastDates')
    }
  }

  // Room + capacity
  if (model.selection._tag === 'NoRoom') {
    errors.push('noRoom')
  } else if (
    Option.isSome(maybeRoom) &&
    maybeRoom.value.capacity < model.guests
  ) {
    errors.push('capacityExceeded')
  }

  // Availability — only when dates + room are otherwise sound.
  if (
    errors.length === 0 &&
    dates._tag === 'CompleteRange' &&
    model.selection._tag === 'RoomSelected'
  ) {
    const verdict = rangeAvailability(
      model.selection.availability,
      dates.checkIn,
      dates.checkOut,
    )
    if (verdict === 'Busy') errors.push('datesUnavailable')
    else if (verdict === 'Unknown') errors.push('availabilityUnknown')
  }

  if (errors.length > 0 || dates._tag !== 'CompleteRange') {
    return { errors, booking: Option.none() }
  }

  return pipe(
    maybeRoom,
    Option.map((room): ValidBooking => {
      const nights = Calendar.daysUntil(dates.checkIn, dates.checkOut)
      return {
        room,
        checkIn: dates.checkIn,
        checkOut: dates.checkOut,
        guests: model.guests,
        nights,
        total: calcTotal(room.pricePerNight, nights),
      }
    }),
    booking => ({ errors, booking }),
  )
}

export const isValid = (model: Model): boolean =>
  Option.isSome(validate(model).booking)
