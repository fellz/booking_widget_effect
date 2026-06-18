import { Array as Arr } from 'effect'
import { Calendar } from 'foldkit'
import { type CalendarDate } from 'foldkit/calendar'

/** Stable `YYYY-MM-DD` key for Sets/maps. CalendarDate is already day-precise
 *  (no time component), so this is a pure projection — no normalization needed. */
export const toIsoKey = (date: CalendarDate): string => {
  const m = String(date.month).padStart(2, '0')
  const d = String(date.day).padStart(2, '0')
  return `${date.year}-${m}-${d}`
}

/** Inclusive list of every calendar day from `from` to `to`. Empty if to < from. */
export const eachDayInRange = (
  from: CalendarDate,
  to: CalendarDate,
): ReadonlyArray<CalendarDate> => {
  const span = Calendar.daysUntil(from, to)
  if (span < 0) return []
  return Arr.makeBy(span + 1, i => Calendar.addDays(from, i))
}

/** The nights actually slept: check-in inclusive, check-out exclusive. */
export const stayNights = (
  checkIn: CalendarDate,
  checkOut: CalendarDate,
): ReadonlyArray<CalendarDate> => {
  const nights = Calendar.daysUntil(checkIn, checkOut)
  if (nights <= 0) return []
  return Arr.makeBy(nights, i => Calendar.addDays(checkIn, i))
}

/** Whole nights between check-in and check-out (0 if non-positive). */
export const nightCount = (checkIn: CalendarDate, checkOut: CalendarDate): number => {
  const nights = Calendar.daysUntil(checkIn, checkOut)
  return nights > 0 ? nights : 0
}
