import { Context, Duration, Effect, Layer, Schema as S } from 'effect'

import { toIsoKey } from '../domain/date'
import { RoomTaken, type SubmitError } from '../domain/errors'
import { type ValidBooking } from '../model'
import { AppConfig } from './config'
import { HttpClient, readJson } from './httpClient'

/** Domain port: placing a reservation. Distinct from reading data — different
 *  failure modes (`RoomTaken`) and a write side effect. */
export class Reservations extends Context.Service<
  Reservations,
  { readonly submit: (booking: ValidBooking) => Effect.Effect<string, SubmitError> }
>()('Reservations') {}

const reference = (booking: ValidBooking): string =>
  `BK-${toIsoKey(booking.checkIn).replace(/-/g, '')}-${booking.room.id.toUpperCase().slice(0, 3)}`

const BookingResponse = S.Struct({ reference: S.String })

export const ReservationsMock = Layer.effect(
  Reservations,
  Effect.gen(function* () {
    const { mockDelays } = yield* AppConfig
    // The first confirm fails with RoomTaken so the failure branch is live in
    // the demo (recoverable on retry); later attempts succeed.
    let attempts = 0
    return {
      submit: booking =>
        Effect.gen(function* () {
          yield* Effect.sleep(Duration.millis(mockDelays.submit))
          attempts += 1
          if (attempts === 1) return yield* Effect.fail(new RoomTaken())
          return reference(booking)
        }),
    }
  }),
)

export const ReservationsHttp = Layer.effect(
  Reservations,
  Effect.gen(function* () {
    const http = yield* HttpClient
    return {
      submit: booking =>
        Effect.gen(function* () {
          const response = yield* http.request('/bookings', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              roomId: booking.room.id,
              checkIn: toIsoKey(booking.checkIn),
              checkOut: toIsoKey(booking.checkOut),
              guests: booking.guests,
            }),
          })
          // 409 = the room was taken between availability check and confirm.
          if (response.status === 409) return yield* Effect.fail(new RoomTaken())
          const body = yield* readJson(BookingResponse)(response)
          return body.reference
        }),
    }
  }),
)
