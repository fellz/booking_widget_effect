import { Calendar } from 'foldkit'
import { type CalendarDate } from 'foldkit/calendar'

import { eachDayInRange, toIsoKey } from './date'
import { type RoomId } from './types'

/**
 * Deterministic fake "already booked" rhythm — identical to the Vue demo, so
 * the two widgets show the same busy days. Real availability would come from a
 * backend; here it is reproducible (no randomness) for stable tests.
 */
const RHYTHM: Record<RoomId, { period: number; blocked: number; offset: number }> = {
  standard: { period: 11, blocked: 2, offset: 3 },
  comfort: { period: 7, blocked: 2, offset: 1 },
  family: { period: 9, blocked: 3, offset: 5 },
}

// Fixed epoch keeps the day index stable regardless of "today".
const EPOCH = Calendar.make(2020, 1, 1)

/** True if the room is free on the given day. */
export const isDateAvailable = (roomId: RoomId, date: CalendarDate): boolean => {
  const { period, blocked, offset } = RHYTHM[roomId]
  const dayIndex = Calendar.daysUntil(EPOCH, date) + offset
  return ((dayIndex % period) + period) % period >= blocked
}

/** Set of `YYYY-MM-DD` keys blocked for a room within an inclusive window. */
export const blockedDateKeys = (
  roomId: RoomId,
  from: CalendarDate,
  to: CalendarDate,
): ReadonlyArray<string> =>
  eachDayInRange(from, to)
    .filter(day => !isDateAvailable(roomId, day))
    .map(toIsoKey)
