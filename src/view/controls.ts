import clsx from 'clsx'
import { type Html, html } from 'foldkit/html'

import { locales, type Locale } from '../domain/types'
import { messages } from '../i18n'
import { ChangedGuests, ChangedLocale, ToggledTheme, type Message } from '../message'
import { type Model } from '../model'
import { maxGuests } from '../validation'
import { iconButtonClass } from './components'

export const localeControl = (model: Model): Html => {
  const h = html<Message>()
  return h.div(
    [h.Class('inline-flex rounded-lg border border-gray-300 dark:border-gray-600 p-0.5')],
    locales.map((locale: Locale) =>
      h.button(
        [
          h.Type('button'),
          h.OnClick(ChangedLocale({ locale })),
          h.Class(
            clsx(
              'rounded-md px-3 py-1 text-sm font-medium transition cursor-pointer',
              model.locale === locale
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800',
            ),
          ),
        ],
        [locale.toUpperCase()],
      ),
    ),
  )
}

export const themeToggle = (model: Model): Html => {
  const h = html<Message>()
  return h.button(
    [
      h.Type('button'),
      h.Class(iconButtonClass),
      h.AriaLabel(model.theme === 'dark' ? 'Light theme' : 'Dark theme'),
      h.OnClick(ToggledTheme()),
    ],
    [model.theme === 'dark' ? '☀' : '☾'],
  )
}

export const guestSelector = (model: Model): Html => {
  const h = html<Message>()
  const t = messages(model.locale)
  const max = maxGuests(model)
  const stepButton = (label: string, target: number, enabled: boolean): Html =>
    h.button(
      [
        h.Type('button'),
        h.Class(iconButtonClass),
        h.AriaLabel(label),
        ...(enabled ? [h.OnClick(ChangedGuests({ guests: target }))] : [h.Disabled(true)]),
      ],
      [label],
    )

  return h.div(
    [h.Class('flex items-center justify-between gap-4')],
    [
      h.span([h.Class('font-semibold')], [t.guests]),
      h.div(
        [h.Class('flex items-center gap-3')],
        [
          stepButton('−', model.guests - 1, model.guests > 1),
          h.span(
            [h.Class('min-w-20 text-center')],
            [
              `${model.guests} `,
              h.small([h.Class('text-gray-500')], [t.guest(model.guests)]),
            ],
          ),
          stepButton('+', model.guests + 1, model.guests < max),
        ],
      ),
    ],
  )
}
