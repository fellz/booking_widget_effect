import clsx from 'clsx'
import { Match as M } from 'effect'
import { type Document, type Html, html } from 'foldkit/html'

import { messages } from '../i18n'
import { ClickedBack, type Message } from '../message'
import { type Model } from '../model'
import { calendarView } from './calendar'
import { confirmationView } from './confirmation'
import { editingSummary, reviewPanel } from './summary'
import { guestSelector, localeControl, themeToggle } from './controls'
import { roomsView } from './rooms'

// Step index derived from the phase by exhaustive match — a new phase forces a
// decision here rather than silently mapping to a wrong number. (Closes 7.2)
const stepIndex = (model: Model): number =>
  M.value(model.phase).pipe(
    M.withReturnType<number>(),
    M.tag('Editing', () => 0),
    M.tag('Reviewing', () => 1),
    M.tag('Submitting', () => 1),
    M.tag('SubmitFailed', () => 1),
    M.tag('Confirmed', () => 2),
    M.exhaustive,
  )

const stepsIndicator = (model: Model): Html => {
  const h = html<Message>()
  const t = messages(model.locale)
  const current = stepIndex(model)
  // The first step is a way back to editing while reviewing (not while
  // submitting or confirmed).
  const canGoBack =
    model.phase._tag === 'Reviewing' || model.phase._tag === 'SubmitFailed'

  return h.div(
    [h.Class('mb-6 flex items-center justify-center gap-2')],
    t.steps.map((label, i) => {
      const state = i === current ? 'current' : i < current ? 'done' : 'upcoming'
      const markerClass = clsx(
        'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
        state === 'current' && 'bg-indigo-600 text-white',
        state === 'done' && 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200',
        state === 'upcoming' && 'bg-gray-100 text-gray-400 dark:bg-gray-800',
      )
      const clickableFirst = i === 0 && canGoBack
      return h.div(
        [h.Class('flex items-center gap-2')],
        [
          h.button(
            [
              h.Type('button'),
              h.Class(clsx(markerClass, clickableFirst ? 'cursor-pointer' : 'cursor-default')),
              ...(clickableFirst ? [h.OnClick(ClickedBack())] : [h.Disabled(true)]),
            ],
            [state === 'done' ? '✓' : String(i + 1)],
          ),
          h.span(
            [
              h.Class(
                clsx(
                  'text-sm',
                  state === 'current'
                    ? 'font-semibold text-gray-900 dark:text-gray-100'
                    : 'text-gray-400',
                ),
              ),
            ],
            [label],
          ),
          ...(i < t.steps.length - 1
            ? [h.span([h.Class('mx-1 text-gray-300')], ['·'])]
            : []),
        ],
      )
    }),
  )
}

const editingLayout = (model: Model): Html => {
  const h = html<Message>()
  return h.div(
    [h.Class('space-y-5')],
    [
      h.div(
        [h.Class('grid gap-5 md:grid-cols-2')],
        [
          calendarView(model),
          h.div([h.Class('space-y-4')], [guestSelector(model), editingSummary(model)]),
        ],
      ),
      roomsView(model),
    ],
  )
}

const content = (model: Model): Html =>
  M.value(model.phase).pipe(
    M.tag('Editing', () => editingLayout(model)),
    M.tag('Reviewing', phase => reviewPanel(model, phase)),
    M.tag('Submitting', phase => reviewPanel(model, phase)),
    M.tag('SubmitFailed', phase => reviewPanel(model, phase)),
    M.tag('Confirmed', phase => confirmationView(model, phase)),
    M.exhaustive,
  )

export const view = (model: Model): Document => {
  const h = html<Message>()
  const t = messages(model.locale)

  const body = h.div(
    [
      h.Class(
        clsx(
          model.theme === 'dark' && 'dark',
          'min-h-screen bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col items-center justify-center gap-4 p-5',
        ),
      ),
    ],
    [
      h.div(
        [
          h.Class(
            'w-full max-w-3xl rounded-2xl bg-white dark:bg-gray-900 shadow-xl p-6 ring-1 ring-gray-200 dark:ring-gray-800',
          ),
        ],
        [
          h.header(
            [h.Class('mb-4 flex items-start justify-between gap-4')],
            [
              h.div(
                [],
                [
                  h.h1([h.Class('text-xl font-bold')], [t.title]),
                  h.p(
                    [h.Class('mt-1 text-sm text-gray-500 dark:text-gray-400')],
                    [t.subtitle],
                  ),
                ],
              ),
              h.div(
                [h.Class('flex shrink-0 items-center gap-2')],
                [localeControl(model), themeToggle(model)],
              ),
            ],
          ),
          stepsIndicator(model),
          content(model),
        ],
      ),
      h.footer(
        [h.Class('text-sm text-gray-400')],
        ['foldkit + Effect · booking_widget_effect'],
      ),
    ],
  )

  return { title: t.title, body }
}
