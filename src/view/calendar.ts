import clsx from 'clsx'
import { Array as Arr, Option } from 'effect'
import { Calendar } from 'foldkit'
import { type CalendarDate } from 'foldkit/calendar'
import { type Html, html } from 'foldkit/html'

import { toIsoKey } from '../domain/date'
import { HORIZON_DAYS } from '../init'
import { formatDate, formatMonth, messages, weekdayInitials } from '../i18n'
import { ClickedDay, ClickedNextMonth, ClickedPreviousMonth, type Message } from '../message'
import { type Model } from '../model'
import { checkIn, checkOut } from '../validation'
import { iconButtonClass, spinner } from './components'

type WindowInfo = { blocked: ReadonlySet<string>; from: CalendarDate; to: CalendarDate }

// The selected room's loaded availability window, if any.
const availabilityWindow = (model: Model): Option.Option<WindowInfo> => {
  if (model.selection._tag !== 'RoomSelected') return Option.none()
  const a = model.selection.availability
  return a._tag === 'CalendarLoaded'
    ? Option.some({ blocked: new Set(a.blocked), from: a.from, to: a.to })
    : Option.none()
}

const mondayIndex = (date: CalendarDate): number =>
  (Calendar.toDateLocal(date).getDay() + 6) % 7

const dayCell = (model: Model, window: Option.Option<WindowInfo>, date: CalendarDate): Html => {
  const h = html<Message>()

  const inCurrentMonth = date.month === model.visibleMonth.month
  const isToday = Calendar.isEqual(date, model.today)
  const isPast = Calendar.isBefore(date, model.today)
  const occupied = Option.match(window, {
    onNone: () => false,
    onSome: ({ blocked, from, to }) =>
      Calendar.between(date, { minimum: from, maximum: to }) &&
      blocked.has(toIsoKey(date)),
  })

  const ci = checkIn(model.dates)
  const co = checkOut(model.dates)
  const start = Option.exists(ci, d => Calendar.isEqual(d, date))
  const end = Option.exists(co, d => Calendar.isEqual(d, date))
  const inRange =
    Option.isSome(ci) &&
    Option.isSome(co) &&
    Calendar.isAfterOrEqual(date, ci.value) &&
    Calendar.isBeforeOrEqual(date, co.value)

  const disabled = isPast || occupied

  const className = clsx(
    'flex aspect-square items-center justify-center rounded-md text-sm transition',
    !inCurrentMonth && 'opacity-40',
    isToday && 'ring-1 ring-inset ring-gray-400',
    disabled && 'cursor-not-allowed line-through opacity-30',
    occupied && 'text-red-600 bg-red-100 dark:bg-red-950/60 opacity-100 line-through',
    !disabled && !start && !end && 'cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/40',
    inRange && !start && !end && 'bg-indigo-100 dark:bg-indigo-900/40',
    (start || end) && 'bg-indigo-600 text-white font-semibold',
  )

  return h.button(
    [
      h.Type('button'),
      h.Class(className),
      h.AriaLabel(formatDate(model.locale, date)),
      ...(disabled ? [h.Disabled(true)] : [h.OnClick(ClickedDay({ date }))]),
    ],
    [String(date.day)],
  )
}

export const calendarView = (model: Model): Html => {
  const h = html<Message>()
  const t = messages(model.locale)
  const window = availabilityWindow(model)

  const firstCell = Calendar.subtractDays(
    Calendar.firstOfMonth(model.visibleMonth),
    mondayIndex(Calendar.firstOfMonth(model.visibleMonth)),
  )
  const days = Arr.makeBy(42, i => Calendar.addDays(firstCell, i))

  const minMonth = Calendar.firstOfMonth(model.today)
  const maxMonth = Calendar.firstOfMonth(Calendar.addDays(model.today, HORIZON_DAYS))
  const atMin = Calendar.isBeforeOrEqual(model.visibleMonth, minMonth)
  const atMax = Calendar.isAfterOrEqual(model.visibleMonth, maxMonth)

  const summary = Option.match(checkIn(model.dates), {
    onNone: () => t.pickDates,
    onSome: ci =>
      Option.match(checkOut(model.dates), {
        onNone: () => `${t.checkIn}: ${formatDate(model.locale, ci)}`,
        onSome: co =>
          `${formatDate(model.locale, ci)} — ${formatDate(model.locale, co)} · ${t.nights(
            Calendar.daysUntil(ci, co),
          )}`,
      }),
  })

  const selectionTag =
    model.selection._tag === 'RoomSelected'
      ? model.selection.availability._tag
      : 'none'

  const legend =
    selectionTag === 'CalendarLoading'
      ? h.p(
          [h.Class('mt-2 flex items-center justify-center gap-2 text-sm text-gray-500')],
          [spinner<Message>(), t.loadingCalendar],
        )
      : selectionTag === 'CalendarLoaded'
        ? h.p(
            [h.Class('mt-2 text-center text-sm text-gray-500 dark:text-gray-400')],
            [t.roomBusyHint],
          )
        : h.empty

  return h.section(
    [h.Class('select-none')],
    [
      h.header(
        [h.Class('mb-3 flex items-center justify-between')],
        [
          h.button(
            [
              h.Type('button'),
              h.Class(iconButtonClass),
              h.AriaLabel('‹'),
              ...(atMin ? [h.Disabled(true)] : [h.OnClick(ClickedPreviousMonth())]),
            ],
            ['‹'],
          ),
          h.span(
            [h.Class('font-semibold capitalize')],
            [formatMonth(model.locale, model.visibleMonth)],
          ),
          h.button(
            [
              h.Type('button'),
              h.Class(iconButtonClass),
              h.AriaLabel('›'),
              ...(atMax ? [h.Disabled(true)] : [h.OnClick(ClickedNextMonth())]),
            ],
            ['›'],
          ),
        ],
      ),
      h.div(
        [h.Class('mb-2 grid grid-cols-7 gap-1')],
        weekdayInitials(model.locale).map(label =>
          h.span(
            [h.Class('text-center text-xs capitalize text-gray-500 dark:text-gray-400')],
            [label],
          ),
        ),
      ),
      h.div(
        [h.Class('grid grid-cols-7 gap-1')],
        days.map(date => dayCell(model, window, date)),
      ),
      h.p(
        [h.Class('mt-4 min-h-5 text-center text-sm text-gray-500 dark:text-gray-400')],
        [summary],
      ),
      legend,
    ],
  )
}
