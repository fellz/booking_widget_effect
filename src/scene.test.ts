import { Array as Arr, Option } from 'effect'
import { Calendar, Scene } from 'foldkit'
import { describe, test } from 'vitest'

import { ROOMS } from './domain/rooms'
import { freshEditing } from './init'
import { Confirmed, type Model, RoomsLoaded } from './model'
import { update } from './update'
import { view } from './view'

const today = Calendar.make(2026, 6, 18)
const comfort = Option.getOrThrow(Arr.findFirst(ROOMS, r => r.id === 'comfort'))

const editing: Model = {
  ...freshEditing(today, 'en', 'light', 1),
  rooms: RoomsLoaded({ rooms: ROOMS }),
}

describe('view', () => {
  test('editing view shows the title and the room list', () => {
    Scene.scene(
      { update, view },
      Scene.with(editing),
      Scene.expect(Scene.role('heading', { name: 'Book a room' })).toExist(),
      Scene.expect(Scene.text('Standard')).toExist(),
      Scene.expect(Scene.text('Comfort')).toExist(),
    )
  })

  test('confirmed view shows the confirmation and the booking reference', () => {
    const confirmed: Model = {
      ...editing,
      phase: Confirmed({
        booking: {
          room: comfort,
          checkIn: Calendar.addDays(today, 1),
          checkOut: Calendar.addDays(today, 3),
          guests: 2,
          nights: 2,
          total: { ru: 13800, en: 150 },
        },
        reference: 'BK-20260619-COM',
      }),
    }
    Scene.scene(
      { update, view },
      Scene.with(confirmed),
      Scene.expect(Scene.role('heading', { name: 'Booking confirmed' })).toExist(),
      Scene.expect(Scene.text('BK-20260619-COM')).toExist(),
    )
  })
})
