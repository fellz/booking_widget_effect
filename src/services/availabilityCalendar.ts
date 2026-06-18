import { Context, Duration, Effect, Layer, Schema as S } from 'effect'
import { type CalendarDate } from 'foldkit/calendar'

import { blockedDateKeys } from '../domain/availability'
import { toIsoKey } from '../domain/date'
import { type LoadError } from '../domain/errors'
import { type RoomId } from '../domain/types'
import { AppConfig } from './config'
import { HttpClient, readJson } from './httpClient'

/** Domain port: per-room blocked dates over a window. */
export class AvailabilityCalendar extends Context.Service<
  AvailabilityCalendar,
  {
    readonly blockedKeys: (
      roomId: RoomId,
      from: CalendarDate,
      to: CalendarDate,
    ) => Effect.Effect<ReadonlyArray<string>, LoadError>
  }
>()('AvailabilityCalendar') {}

export const AvailabilityCalendarMock = Layer.effect(
  AvailabilityCalendar,
  Effect.gen(function* () {
    const { mockDelays } = yield* AppConfig
    return {
      blockedKeys: (roomId, from, to) =>
        Effect.gen(function* () {
          yield* Effect.sleep(Duration.millis(mockDelays.calendar))
          return blockedDateKeys(roomId, from, to)
        }),
    }
  }),
)

export const AvailabilityCalendarHttp = Layer.effect(
  AvailabilityCalendar,
  Effect.gen(function* () {
    const http = yield* HttpClient
    return {
      blockedKeys: (roomId, from, to) => {
        const params = new URLSearchParams({ from: toIsoKey(from), to: toIsoKey(to) })
        return http
          .request(`/rooms/${roomId}/calendar?${params}`)
          .pipe(Effect.flatMap(readJson(S.Array(S.String))))
      },
    }
  }),
)
