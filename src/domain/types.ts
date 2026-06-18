import { Schema as S } from 'effect'

// LOCALE — a closed literal union. Every consumer matches it exhaustively, so
// adding a third locale becomes a compile error at every use site (closes the
// non-exhaustive `locale === 'ru' ? … : …` ternaries of the Vue version).
export const Locale = S.Literals(['ru', 'en'])
export type Locale = typeof Locale.Type
export const locales = Locale.literals

export const Theme = S.Literals(['light', 'dark'])
export type Theme = typeof Theme.Type

export const RoomId = S.Literals(['standard', 'comfort', 'family'])
export type RoomId = typeof RoomId.Type

/** Price/text keyed by locale — the struct form of `Record<Locale, T>`,
 *  so a missing locale is a compile error rather than `undefined` at runtime. */
export const LocalizedPrice = S.Struct({ ru: S.Number, en: S.Number })
export type LocalizedPrice = typeof LocalizedPrice.Type

export const LocalizedText = S.Struct({ ru: S.String, en: S.String })
export type LocalizedText = typeof LocalizedText.Type

export const Room = S.Struct({
  id: RoomId,
  capacity: S.Number,
  pricePerNight: LocalizedPrice,
  name: LocalizedText,
  description: LocalizedText,
})
export type Room = typeof Room.Type

/** Reasons a booking cannot proceed. Surfaced to the UI as i18n keys. */
export const BookingError = S.Literals([
  'noDates',
  'noCheckOut',
  'invalidRange',
  'pastDates',
  'noRoom',
  'capacityExceeded',
  'datesUnavailable',
  'availabilityUnknown',
])
export type BookingError = typeof BookingError.Type
