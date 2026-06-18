import { Layer } from 'effect'

import { AppConfigLive } from './config'
import { HttpClientLive } from './httpClient'
import { AvailabilityCalendar, AvailabilityCalendarHttp, AvailabilityCalendarMock } from './availabilityCalendar'
import { Reservations, ReservationsHttp, ReservationsMock } from './reservations'
import { RoomCatalog, RoomCatalogHttp, RoomCatalogMock } from './roomCatalog'

export { AppConfig } from './config'
export { HttpClient } from './httpClient'
export { RoomCatalog } from './roomCatalog'
export { AvailabilityCalendar } from './availabilityCalendar'
export { Reservations } from './reservations'

/** The set of domain services the app's commands depend on — the `R` channel
 *  the runtime must satisfy. */
export type BookingServices = RoomCatalog | AvailabilityCalendar | Reservations

// ── Composition root: build the dependency graph from Layers ────────────────
// Each domain port is its own Layer; `mergeAll` puts them side by side, and
// `provide` feeds their dependencies (AppConfig for the mocks; HttpClient —
// itself needing AppConfig — for the HTTP adapters).

const MockServices = Layer.mergeAll(
  RoomCatalogMock,
  AvailabilityCalendarMock,
  ReservationsMock,
).pipe(Layer.provide(AppConfigLive))

const HttpServices = Layer.mergeAll(
  RoomCatalogHttp,
  AvailabilityCalendarHttp,
  ReservationsHttp,
).pipe(Layer.provide(HttpClientLive), Layer.provide(AppConfigLive))

/** The single place that chooses the data feed (parity with `createBookingApi`).
 *  Returns a fully-provided Layer (`R = never`) producing all domain services. */
export const bookingServicesLayer = (): Layer.Layer<BookingServices> =>
  import.meta.env.VITE_API_URL ? HttpServices : MockServices
