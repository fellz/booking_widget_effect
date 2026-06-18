import { Context, Effect, Layer, Schema as S } from 'effect'

import { NetworkError, ServerError } from '../domain/errors'
import { AppConfig } from './config'

/**
 * Shared infrastructure port: the only place that touches `fetch`. It prefixes
 * the configured base URL and turns a rejected request into a typed
 * `NetworkError`. Domain adapters depend on *this*, not on `fetch` directly —
 * so the HTTP concern is wired in one place and injected. (`HttpClient`
 * itself depends on `AppConfig` for the base URL.)
 */
export class HttpClient extends Context.Service<
  HttpClient,
  {
    readonly request: (
      path: string,
      init?: RequestInit,
    ) => Effect.Effect<Response, NetworkError>
  }
>()('HttpClient') {}

export const HttpClientLive = Layer.effect(
  HttpClient,
  Effect.gen(function* () {
    const { baseUrl } = yield* AppConfig
    const base = baseUrl ?? ''
    return {
      request: (path, init) =>
        Effect.tryPromise({
          try: () => fetch(`${base}${path}`, init),
          catch: () => new NetworkError(),
        }),
    }
  }),
)

/** Decode a successful response body, mapping non-2xx and malformed JSON
 *  (a Schema `SchemaError`) to a typed `ServerError`. Shared by the HTTP
 *  domain adapters. */
export const readJson =
  <A, I>(schema: S.Codec<A, I>) =>
  (response: Response): Effect.Effect<A, ServerError> =>
    Effect.gen(function* () {
      if (!response.ok) return yield* Effect.fail(new ServerError({ status: response.status }))
      const json = yield* Effect.tryPromise({
        try: () => response.json(),
        catch: () => new ServerError({ status: response.status }),
      })
      return yield* S.decodeUnknownEffect(schema)(json).pipe(
        Effect.catchTag('SchemaError', () => Effect.fail(new ServerError({ status: 0 }))),
      )
    })
