import { type Html, html } from 'foldkit/html'

import { formatDate, formatPrice, messages } from '../i18n'
import { ClickedReset, type Message } from '../message'
import { type Confirmed } from '../model'
import { type Model } from '../model'
import { ghostButtonClass, surfaceClass } from './components'

export const confirmationView = (
  model: Model,
  phase: typeof Confirmed.Type,
): Html => {
  const h = html<Message>()
  const t = messages(model.locale)
  const { booking, reference } = phase

  const detailRow = (label: string, value: string): Html =>
    h.div(
      [h.Class('flex justify-between gap-3')],
      [
        h.span([h.Class('text-gray-500 dark:text-gray-400')], [label]),
        h.span([h.Class('font-semibold')], [value]),
      ],
    )

  return h.div(
    [h.Class('flex flex-col items-center gap-4 py-4 text-center')],
    [
      h.div(
        [
          h.Class(
            'grid h-16 w-16 place-items-center rounded-full bg-indigo-600 text-3xl text-white',
          ),
        ],
        ['✓'],
      ),
      h.h2([h.Class('text-xl font-bold')], [t.confirmTitle]),
      h.div(
        [h.Class(`${surfaceClass} w-full max-w-sm space-y-2 text-left`)],
        [
          detailRow(t.selectRoom, booking.room.name[model.locale]),
          detailRow(
            `${t.checkIn} — ${t.checkOut}`,
            `${formatDate(model.locale, booking.checkIn)} — ${formatDate(
              model.locale,
              booking.checkOut,
            )}`,
          ),
          detailRow(t.total, formatPrice(model.locale, booking.total[model.locale])),
          detailRow(t.bookingRef, reference),
        ],
      ),
      h.p([h.Class('text-gray-500 dark:text-gray-400')], [t.confirmText]),
      h.button(
        [h.Type('button'), h.Class(ghostButtonClass), h.OnClick(ClickedReset())],
        [t.newBooking],
      ),
    ],
  )
}
