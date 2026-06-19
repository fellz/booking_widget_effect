import { Schema as S } from 'effect'
import * as fc from 'fast-check'
import { Calendar } from 'foldkit'
import { type CalendarDate } from 'foldkit/calendar'
import { describe, expect, test } from 'vitest'

import { eachDayInRange, nightCount, stayNights, toIsoKey } from './date'

// More runs than the default 100 — these functions are pure and cheap, so we
// can afford to hammer them. fast-check shrinks any counterexample to its
// minimal form (e.g. a single day across a month/year/leap-day boundary).
fc.configureGlobal({ numRuns: 500 })

// ── ARBITRARIES ─────────────────────────────────────────────────────────────

/** Any real calendar date. Day is bounded by the month's actual length, so we
 *  never generate Feb 30 and never throw out of `Calendar.make`. */
const arbDate: fc.Arbitrary<CalendarDate> = fc
  .record({
    year: fc.integer({ min: 1900, max: 2100 }),
    month: fc.integer({ min: 1, max: 12 }),
  })
  .chain(({ year, month }) =>
    fc
      .integer({ min: 1, max: Calendar.daysInMonth(year, month) })
      .map(day => Calendar.make(year, month, day)),
  )

/** An anchor date plus an integer day-offset — lets us assert exact arithmetic
 *  identities like `nightCount(a, a + n) === max(n, 0)`. */
const arbDateAndOffset: fc.Arbitrary<readonly [CalendarDate, number]> = fc.tuple(
  arbDate,
  fc.integer({ min: -500, max: 500 }),
)

const decodeIso = S.decodeSync(Calendar.CalendarDateFromIsoString)

// ── eachDayInRange ────────────────────────────────────────────────────────────

describe('eachDayInRange', () => {
  test('is empty exactly when `to` is before `from`', () => {
    fc.assert(
      fc.property(arbDate, arbDate, (from, to) => {
        const isEmpty = eachDayInRange(from, to).length === 0
        expect(isEmpty).toBe(Calendar.daysUntil(from, to) < 0)
      }),
    )
  })

  test('length is the inclusive span (daysUntil + 1) when non-empty', () => {
    fc.assert(
      fc.property(arbDateAndOffset, ([from, offset]) => {
        const to = Calendar.addDays(from, Math.abs(offset)) // guarantee to >= from
        expect(eachDayInRange(from, to).length).toBe(
          Calendar.daysUntil(from, to) + 1,
        )
      }),
    )
  })

  test('starts at `from`, ends at `to`, and steps one day at a time', () => {
    fc.assert(
      fc.property(arbDateAndOffset, ([from, offset]) => {
        const to = Calendar.addDays(from, Math.abs(offset))
        const days = eachDayInRange(from, to)

        expect(Calendar.isEqual(days[0]!, from)).toBe(true)
        expect(Calendar.isEqual(days[days.length - 1]!, to)).toBe(true)

        for (let i = 1; i < days.length; i++) {
          expect(Calendar.isEqual(days[i]!, Calendar.addDays(days[i - 1]!, 1))).toBe(
            true,
          )
        }
      }),
    )
  })

  test('every day lies within [from, to] and all days are distinct', () => {
    fc.assert(
      fc.property(arbDateAndOffset, ([from, offset]) => {
        const to = Calendar.addDays(from, Math.abs(offset))
        const days = eachDayInRange(from, to)

        expect(
          days.every(d => Calendar.between(d, { minimum: from, maximum: to })),
        ).toBe(true)

        const keys = days.map(toIsoKey)
        expect(new Set(keys).size).toBe(keys.length)
      }),
    )
  })
})

// ── stayNights ─────────────────────────────────────────────────────────────────

describe('stayNights', () => {
  test('agrees with nightCount on length', () => {
    fc.assert(
      fc.property(arbDate, arbDate, (checkIn, checkOut) => {
        expect(stayNights(checkIn, checkOut).length).toBe(
          nightCount(checkIn, checkOut),
        )
      }),
    )
  })

  test('is empty exactly when check-out is not after check-in', () => {
    fc.assert(
      fc.property(arbDate, arbDate, (checkIn, checkOut) => {
        const isEmpty = stayNights(checkIn, checkOut).length === 0
        expect(isEmpty).toBe(Calendar.daysUntil(checkIn, checkOut) <= 0)
      }),
    )
  })

  test('check-in inclusive, check-out exclusive — last night is the day before checkout', () => {
    fc.assert(
      fc.property(arbDateAndOffset, ([checkIn, offset]) => {
        // force a real stay of >= 1 night
        const nights = Math.abs(offset) + 1
        const checkOut = Calendar.addDays(checkIn, nights)
        const slept = stayNights(checkIn, checkOut)

        expect(Calendar.isEqual(slept[0]!, checkIn)).toBe(true)
        expect(
          Calendar.isEqual(slept[slept.length - 1]!, Calendar.addDays(checkOut, -1)),
        ).toBe(true)
        // never sleeps on checkout day itself
        expect(slept.every(d => Calendar.isBefore(d, checkOut))).toBe(true)
      }),
    )
  })

  test('is exactly eachDayInRange minus the checkout day', () => {
    fc.assert(
      fc.property(arbDateAndOffset, ([checkIn, offset]) => {
        const checkOut = Calendar.addDays(checkIn, Math.abs(offset) + 1)
        const slept = stayNights(checkIn, checkOut).map(toIsoKey)
        const range = eachDayInRange(checkIn, checkOut).map(toIsoKey)
        expect(slept).toEqual(range.slice(0, -1))
      }),
    )
  })
})

// ── nightCount ───────────────────────────────────────────────────────────────

describe('nightCount', () => {
  test('is never negative', () => {
    fc.assert(
      fc.property(arbDate, arbDate, (a, b) => {
        expect(nightCount(a, b)).toBeGreaterThanOrEqual(0)
      }),
    )
  })

  test('equals max(offset, 0) for an anchor plus offset', () => {
    fc.assert(
      fc.property(arbDateAndOffset, ([anchor, offset]) => {
        const other = Calendar.addDays(anchor, offset)
        expect(nightCount(anchor, other)).toBe(Math.max(offset, 0))
      }),
    )
  })

  test('is zero exactly when check-out is not after check-in', () => {
    fc.assert(
      fc.property(arbDate, arbDate, (a, b) => {
        expect(nightCount(a, b) === 0).toBe(Calendar.daysUntil(a, b) <= 0)
      }),
    )
  })
})

// ── toIsoKey ─────────────────────────────────────────────────────────────────

describe('toIsoKey', () => {
  test('always produces a zero-padded YYYY-MM-DD string', () => {
    fc.assert(
      fc.property(arbDate, date => {
        expect(toIsoKey(date)).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      }),
    )
  })

  test('round-trips through the ISO codec back to the same date', () => {
    fc.assert(
      fc.property(arbDate, date => {
        expect(Calendar.isEqual(decodeIso(toIsoKey(date)), date)).toBe(true)
      }),
    )
  })

  test('is injective: equal keys imply equal dates', () => {
    fc.assert(
      fc.property(arbDate, arbDate, (a, b) => {
        expect(toIsoKey(a) === toIsoKey(b)).toBe(Calendar.isEqual(a, b))
      }),
    )
  })
})
