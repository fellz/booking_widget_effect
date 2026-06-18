import { Calendar } from 'foldkit'
import { type CalendarDate } from 'foldkit/calendar'

import { type Locale, type Theme } from './domain/types'
import { Editing, type Model, NoDates, NoRoom, RoomsLoading } from './model'

/** How far ahead the per-room availability calendar is fetched. The booking
 *  flow refuses to confirm stays that fall outside this window. */
export const HORIZON_DAYS = 180

export const DEFAULT_GUESTS = 2

/** The blank editing model, reused by `init` and by `ClickedReset`. Locale,
 *  theme and `today` are carried over by the caller. */
export const freshEditing = (
  today: CalendarDate,
  locale: Locale,
  theme: Theme,
  roomsRequestId: number,
): Model => ({
  locale,
  theme,
  today,
  guests: DEFAULT_GUESTS,
  dates: NoDates(),
  rooms: RoomsLoading(),
  roomsRequestId,
  selection: NoRoom(),
  calendarRequestId: 0,
  visibleMonth: Calendar.firstOfMonth(today),
  phase: Editing(),
})
