import { Match as M } from 'effect'
import { Calendar } from 'foldkit'
import { type CalendarDate } from 'foldkit/calendar'

import { type FailureReason } from './domain/errors'
import { type BookingError, type Locale } from './domain/types'

type Messages = {
  title: string
  subtitle: string
  steps: readonly [string, string, string]
  guests: string
  guest: (n: number) => string
  upToGuests: (n: number) => string
  perNight: string
  checkIn: string
  checkOut: string
  pickDates: string
  selectRoom: string
  unavailableForDates: string
  checkingAvailability: string
  roomBusyHint: string
  loadingCalendar: string
  calendarError: string
  loadError: string
  retry: string
  nights: (n: number) => string
  total: string
  book: string
  back: string
  submitting: string
  confirmTitle: string
  confirmText: string
  bookingRef: string
  submitErrors: Record<FailureReason, string>
  newBooking: string
  errors: Record<BookingError, string>
}

/** Russian pluralization: [one, few, many]. */
const plural = (n: number, forms: readonly [string, string, string]): string => {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return forms[1]
  return forms[2]
}

const ru: Messages = {
  title: 'Бронирование номера',
  subtitle: 'Выберите даты, число гостей и подходящий номер',
  steps: ['Выбор', 'Проверка', 'Готово'],
  guests: 'Гости',
  guest: n => plural(n, ['гость', 'гостя', 'гостей']),
  upToGuests: n => `до ${n} ${plural(n, ['гостя', 'гостей', 'гостей'])}`,
  perNight: 'за ночь',
  checkIn: 'Заезд',
  checkOut: 'Выезд',
  pickDates: 'Выберите даты заезда и выезда',
  selectRoom: 'Выберите номер',
  unavailableForDates: 'Занято на выбранные даты',
  checkingAvailability: 'Проверяем доступность…',
  roomBusyHint: 'Подсвечены занятые даты этого номера',
  loadingCalendar: 'Загружаем доступность номера…',
  calendarError: 'Не удалось загрузить доступность',
  loadError: 'Не удалось загрузить номера',
  retry: 'Повторить',
  nights: n => `${n} ${plural(n, ['ночь', 'ночи', 'ночей'])}`,
  total: 'Итого',
  book: 'Забронировать',
  back: 'Назад',
  submitting: 'Отправляем…',
  confirmTitle: 'Бронирование подтверждено',
  confirmText: 'Мы отправили детали на вашу почту. Ждём вас!',
  bookingRef: 'Номер брони',
  submitErrors: {
    roomTaken: 'Этот номер только что заняли на выбранные даты. Попробуйте ещё раз.',
    network: 'Нет связи с сервером. Проверьте интернет и повторите.',
    server: 'Сервер недоступен. Попробуйте ещё раз чуть позже.',
  },
  newBooking: 'Новое бронирование',
  errors: {
    noDates: 'Выберите даты',
    noCheckOut: 'Выберите дату выезда',
    invalidRange: 'Дата выезда должна быть позже заезда',
    pastDates: 'Дата заезда не может быть в прошлом',
    noRoom: 'Выберите номер',
    capacityExceeded: 'Номер не вмещает столько гостей',
    datesUnavailable: 'Номер занят на выбранные даты',
    availabilityUnknown: 'Доступность для этих дат ещё не известна',
  },
}

const en: Messages = {
  title: 'Book a room',
  subtitle: 'Pick your dates, number of guests and a matching room',
  steps: ['Choose', 'Review', 'Done'],
  guests: 'Guests',
  guest: n => (n === 1 ? 'guest' : 'guests'),
  upToGuests: n => `up to ${n} guests`,
  perNight: 'per night',
  checkIn: 'Check-in',
  checkOut: 'Check-out',
  pickDates: 'Select check-in and check-out dates',
  selectRoom: 'Select a room',
  unavailableForDates: 'Unavailable for the selected dates',
  checkingAvailability: 'Checking availability…',
  roomBusyHint: 'Highlighted dates are booked for this room',
  loadingCalendar: 'Loading room availability…',
  calendarError: 'Couldn’t load availability',
  loadError: 'Couldn’t load rooms',
  retry: 'Retry',
  nights: n => `${n} ${n === 1 ? 'night' : 'nights'}`,
  total: 'Total',
  book: 'Book now',
  back: 'Back',
  submitting: 'Submitting…',
  confirmTitle: 'Booking confirmed',
  confirmText: 'We have emailed you the details. See you soon!',
  bookingRef: 'Booking reference',
  submitErrors: {
    roomTaken: 'This room was just taken for the selected dates. Please try again.',
    network: 'Can’t reach the server. Check your connection and retry.',
    server: 'The server is unavailable. Please try again shortly.',
  },
  newBooking: 'New booking',
  errors: {
    noDates: 'Select your dates',
    noCheckOut: 'Select a check-out date',
    invalidRange: 'Check-out must be after check-in',
    pastDates: 'Check-in cannot be in the past',
    noRoom: 'Select a room',
    capacityExceeded: 'This room cannot host that many guests',
    datesUnavailable: 'This room is booked for the selected dates',
    availabilityUnknown: 'Availability for these dates is not known yet',
  },
}

/** Dictionary for a locale — chosen via an exhaustive match, so a new locale
 *  is a compile error here and at `localeTag`/`currency`. (Closes hole 7.1) */
export const messages = (locale: Locale): Messages =>
  M.value(locale).pipe(
    M.withReturnType<Messages>(),
    M.when('ru', () => ru),
    M.when('en', () => en),
    M.exhaustive,
  )

const localeTag = (locale: Locale): string =>
  M.value(locale).pipe(
    M.withReturnType<string>(),
    M.when('ru', () => 'ru-RU'),
    M.when('en', () => 'en-GB'),
    M.exhaustive,
  )

const currency = (locale: Locale): string =>
  M.value(locale).pipe(
    M.withReturnType<string>(),
    M.when('ru', () => 'RUB'),
    M.when('en', () => 'EUR'),
    M.exhaustive,
  )

export const formatPrice = (locale: Locale, amount: number): string =>
  new Intl.NumberFormat(localeTag(locale), {
    style: 'currency',
    currency: currency(locale),
    maximumFractionDigits: 0,
  }).format(amount)

export const formatDate = (locale: Locale, date: CalendarDate): string =>
  new Intl.DateTimeFormat(localeTag(locale), {
    day: 'numeric',
    month: 'long',
  }).format(Calendar.toDateLocal(date))

export const formatMonth = (locale: Locale, date: CalendarDate): string =>
  new Intl.DateTimeFormat(localeTag(locale), {
    month: 'long',
    year: 'numeric',
  }).format(Calendar.toDateLocal(date))

export const weekdayInitials = (locale: Locale): ReadonlyArray<string> => {
  const fmt = new Intl.DateTimeFormat(localeTag(locale), { weekday: 'short' })
  // 2024-01-01 is a Monday; build Monday-first initials.
  return Array.from({ length: 7 }, (_, i) =>
    fmt.format(Calendar.toDateLocal(Calendar.make(2024, 1, 1 + i))),
  )
}
