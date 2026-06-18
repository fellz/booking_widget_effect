import { Option } from 'effect'
import { type Html, html } from 'foldkit/html'

import { formatPrice, messages } from '../i18n'
import { ClickedRetryCalendar, ClickedRetryRooms, ClickedRoom, type Message } from '../message'
import { type Model } from '../model'
import { type Room } from '../domain/types'
import { selectedAvailability, validate } from '../validation'
import { badge, ghostButtonClass, spinner } from './components'

const skeleton = (): Html => {
  const h = html<Message>()
  return h.div(
    [h.Class('h-32 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800')],
    [],
  )
}

const roomCard = (model: Model, room: Room): Html => {
  const h = html<Message>()
  const t = messages(model.locale)

  const isSelected =
    model.selection._tag === 'RoomSelected' && model.selection.roomId === room.id
  const tooSmall = room.capacity < model.guests
  const availability = selectedAvailability(model)
  const checking =
    isSelected && Option.exists(availability, a => a._tag === 'CalendarLoading')
  const calendarErrored =
    isSelected && Option.exists(availability, a => a._tag === 'CalendarLoadError')
  const busy = isSelected && validate(model).errors.includes('datesUnavailable')

  const badgeNode = tooSmall
    ? badge<Message>(t.errors.capacityExceeded, 'danger')
    : checking
      ? h.span(
          [h.Class('flex items-center gap-1 text-xs text-gray-500')],
          [spinner<Message>(), t.checkingAvailability],
        )
      : busy
        ? badge<Message>(t.unavailableForDates, 'danger')
        : isSelected
          ? h.span([h.Class('text-indigo-600 font-semibold')], ['✓'])
          : h.empty

  const borderClass = isSelected
    ? 'border-indigo-500 ring-1 ring-indigo-500'
    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'

  const card = h.button(
    [
      h.Type('button'),
      h.AriaPressed(String(isSelected)),
      h.Class(
        `w-full rounded-xl border bg-white dark:bg-gray-800 p-4 text-left transition ${borderClass} ${
          tooSmall ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`,
      ),
      ...(tooSmall ? [h.Disabled(true)] : [h.OnClick(ClickedRoom({ roomId: room.id }))]),
    ],
    [
      h.div(
        [h.Class('flex items-baseline justify-between gap-3')],
        [
          h.h3([h.Class('text-lg font-semibold')], [room.name[model.locale]]),
          badge<Message>(t.upToGuests(room.capacity)),
        ],
      ),
      h.p(
        [h.Class('mt-1 text-sm text-gray-500 dark:text-gray-400')],
        [room.description[model.locale]],
      ),
      h.div(
        [h.Class('mt-3 flex items-center justify-between gap-3')],
        [
          h.span(
            [h.Class('text-base font-bold')],
            [
              formatPrice(model.locale, room.pricePerNight[model.locale]),
              h.small(
                [h.Class('ml-1 font-normal text-gray-500')],
                [`/ ${t.perNight}`],
              ),
            ],
          ),
          badgeNode,
        ],
      ),
    ],
  )

  // Calendar load failure is a recoverable, visible state — not a silent
  // dead-end. (Closes hole 5.3)
  const calendarErrorBanner = calendarErrored
    ? h.div(
        [
          h.Class(
            'mt-2 flex items-center justify-between gap-3 rounded-lg bg-red-50 dark:bg-red-950/40 px-3 py-2 text-sm text-red-700 dark:text-red-300',
          ),
        ],
        [
          h.span([], [t.calendarError]),
          h.button(
            [h.Type('button'), h.Class(ghostButtonClass), h.OnClick(ClickedRetryCalendar())],
            [t.retry],
          ),
        ],
      )
    : h.empty

  return h.div([h.Class('space-y-0')], [card, calendarErrorBanner])
}

export const roomsView = (model: Model): Html => {
  const h = html<Message>()
  const t = messages(model.locale)

  const body =
    model.rooms._tag === 'RoomsLoading'
      ? h.div([h.Class('grid gap-3')], [skeleton(), skeleton(), skeleton()])
      : model.rooms._tag === 'RoomsLoadError'
        ? h.div(
            [
              h.Class(
                'flex flex-col items-center gap-3 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-center text-gray-500',
              ),
            ],
            [
              h.span([], [t.loadError]),
              h.button(
                [h.Type('button'), h.Class(ghostButtonClass), h.OnClick(ClickedRetryRooms())],
                [t.retry],
              ),
            ],
          )
        : h.div(
            [h.Class('grid gap-3')],
            model.rooms.rooms.map(room => roomCard(model, room)),
          )

  return h.section(
    [],
    [h.h2([h.Class('mb-3 text-base font-semibold')], [t.selectRoom]), body],
  )
}
