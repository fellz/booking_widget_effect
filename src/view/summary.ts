import { Option } from 'effect'
import { type CalendarDate } from 'foldkit/calendar'
import { type Html, html } from 'foldkit/html'

import { formatDate, formatPrice, messages } from '../i18n'
import { ClickedBack, ClickedConfirm, ClickedReview, type Message } from '../message'
import { type Model, Reviewing, SubmitFailed, Submitting, type ValidBooking } from '../model'
import {
  calcTotal,
  checkIn,
  checkOut,
  isValid,
  selectedRoom,
  validate,
} from '../validation'
import { nightCount } from '../domain/date'
import { primaryButtonClass, ghostButtonClass, surfaceClass } from './components'
import { type LocalizedPrice } from '../domain/types'

type ReviewPhase =
  | typeof Reviewing.Type
  | typeof Submitting.Type
  | typeof SubmitFailed.Type

const row = (label: string, value: string, emphasize = false): Html => {
  const h = html<Message>()
  return h.div(
    [
      h.Class(
        `flex items-center justify-between gap-3 ${
          emphasize
            ? 'border-t border-dashed border-gray-300 dark:border-gray-600 pt-2 text-lg font-bold'
            : 'text-sm text-gray-600 dark:text-gray-300'
        }`,
      ),
    ],
    [h.span([], [label]), h.span([], [value])],
  )
}

const rows = (
  model: Model,
  roomName: Option.Option<string>,
  dates: Option.Option<readonly [CalendarDate, CalendarDate]>,
  total: LocalizedPrice,
): ReadonlyArray<Html> => {
  const t = messages(model.locale)
  const out: Html[] = []
  Option.match(roomName, {
    onNone: () => {},
    onSome: name => out.push(row(name, '')),
  })
  Option.match(dates, {
    onNone: () => {},
    onSome: ([ci, co]) =>
      out.push(
        row(
          `${t.checkIn} — ${t.checkOut}`,
          `${formatDate(model.locale, ci)} — ${formatDate(model.locale, co)}`,
        ),
      ),
  })
  out.push(row(t.total, formatPrice(model.locale, total[model.locale]), true))
  return out
}

// EDITING — reads live state and the validation result; the button only enables
// for a genuinely valid booking and transitions to Review.
export const editingSummary = (model: Model): Html => {
  const h = html<Message>()
  const t = messages(model.locale)

  const room = selectedRoom(model)
  const ci = checkIn(model.dates)
  const co = checkOut(model.dates)
  const nights = Option.isSome(ci) && Option.isSome(co)
    ? nightCount(ci.value, co.value)
    : 0
  const total: LocalizedPrice = Option.match(room, {
    onNone: () => ({ ru: 0, en: 0 }),
    onSome: r => calcTotal(r.pricePerNight, nights),
  })
  const dates =
    Option.isSome(ci) && Option.isSome(co)
      ? Option.some([ci.value, co.value] as const)
      : Option.none<readonly [CalendarDate, CalendarDate]>()

  const [firstError] = validate(model).errors
  const hint = firstError
    ? h.p([h.Class('text-center text-sm text-gray-500')], [t.errors[firstError]])
    : h.empty

  return h.div(
    [h.Class(`${surfaceClass} space-y-3`)],
    [
      h.div([h.Class('space-y-2')], rows(model, Option.map(room, r => r.name[model.locale]), dates, total)),
      hint,
      h.button(
        [
          h.Type('button'),
          h.Class(`${primaryButtonClass} w-full`),
          ...(isValid(model) ? [h.OnClick(ClickedReview())] : [h.Disabled(true)]),
        ],
        [t.book],
      ),
    ],
  )
}

// REVIEW — reads the *captured* ValidBooking from the phase, never live state.
// A Submitting phase shows progress; a failed phase shows the error and lets
// the user retry. (Closes holes 2.1 / 2.2)
export const reviewPanel = (model: Model, phase: ReviewPhase): Html => {
  const h = html<Message>()
  const t = messages(model.locale)
  const booking: ValidBooking = phase.booking

  const total = booking.total
  const dates = Option.some([booking.checkIn, booking.checkOut] as const)

  const submitting = phase._tag === 'Submitting'

  const errorNote =
    phase._tag === 'SubmitFailed'
      ? h.p([h.Class('text-center text-sm text-red-600')], [t.submitErrors[phase.reason]])
      : h.empty

  return h.div(
    [h.Class('mx-auto max-w-md')],
    [
      h.div(
        [h.Class(`${surfaceClass} space-y-3`)],
        [
          h.div(
            [h.Class('space-y-2')],
            rows(model, Option.some(booking.room.name[model.locale]), dates, total),
          ),
          errorNote,
          h.div(
            [h.Class('flex gap-3')],
            [
              h.button(
                [
                  h.Type('button'),
                  h.Class(ghostButtonClass),
                  ...(submitting ? [h.Disabled(true)] : [h.OnClick(ClickedBack())]),
                ],
                [t.back],
              ),
              h.button(
                [
                  h.Type('button'),
                  h.Class(`${primaryButtonClass} flex-1`),
                  ...(submitting ? [h.Disabled(true)] : [h.OnClick(ClickedConfirm())]),
                ],
                [submitting ? t.submitting : t.book],
              ),
            ],
          ),
        ],
      ),
    ],
  )
}
