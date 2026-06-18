import { Context, Duration, Effect, Layer, Schema as S } from 'effect'

import { type LoadError } from '../domain/errors'
import { ROOMS } from '../domain/rooms'
import { Room } from '../domain/types'
import { AppConfig } from './config'
import { HttpClient, readJson } from './httpClient'

/** Domain port: the room catalogue. */
export class RoomCatalog extends Context.Service<
  RoomCatalog,
  { readonly all: Effect.Effect<ReadonlyArray<Room>, LoadError> }
>()('RoomCatalog') {}

/** In-memory adapter — depends on AppConfig for its simulated latency. */
export const RoomCatalogMock = Layer.effect(
  RoomCatalog,
  Effect.gen(function* () {
    const { mockDelays } = yield* AppConfig
    return {
      all: Effect.gen(function* () {
        yield* Effect.sleep(Duration.millis(mockDelays.rooms))
        return ROOMS
      }),
    }
  }),
)

/** HTTP adapter — depends on the shared HttpClient port. */
export const RoomCatalogHttp = Layer.effect(
  RoomCatalog,
  Effect.gen(function* () {
    const http = yield* HttpClient
    return {
      all: http.request('/rooms').pipe(Effect.flatMap(readJson(S.Array(Room)))),
    }
  }),
)
