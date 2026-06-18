import { Effect, Schema as S } from 'effect'
import { Calendar, Runtime } from 'foldkit'

import { type BookingServices } from './services'
import { LoadRooms } from './command'
import { Theme } from './domain/types'
import { freshEditing } from './init'
import { Message } from './message'
import { type Model } from './model'
import { update } from './update'
import { view } from './view'

// FLAGS — impure startup inputs gathered once, then handed to a pure `init`.
export const Flags = S.Struct({
  today: Calendar.CalendarDate,
  initialTheme: Theme,
})
export type Flags = typeof Flags.Type

const THEME_STORAGE_KEY = 'booking-widget-theme'

const readInitialTheme: Effect.Effect<Theme> = Effect.sync(() => {
  const stored = localStorage.getItem(THEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  const prefersDark =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'dark' : 'light'
})

export const flags: Effect.Effect<Flags> = Effect.gen(function* () {
  const today = yield* Calendar.today.local
  const initialTheme = yield* readInitialTheme
  return { today, initialTheme }
})

export const init: Runtime.ApplicationInit<Model, Message, Flags, BookingServices> = ({
  today,
  initialTheme,
}) => [freshEditing(today, 'ru', initialTheme, 1), [LoadRooms({ requestId: 1 })]]

export { Message, update, view }
export { Model } from './model'
