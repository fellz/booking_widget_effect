import { Context, Effect, Layer } from 'effect'

/** Mock network latencies (ms) for the in-memory adapter. */
export interface MockDelays {
  readonly rooms: number
  readonly calendar: number
  readonly submit: number
}

/**
 * Application configuration as a service. Reading config is a dependency like
 * any other, so it is injected via a `Layer` rather than read ad-hoc from
 * `import.meta.env` deep inside the code. `HttpClient` and the mock adapters
 * both depend on it — see the Layer wiring in `index.ts`.
 */
export class AppConfig extends Context.Service<
  AppConfig,
  {
    readonly baseUrl: string | null
    readonly mockDelays: MockDelays
  }
>()('AppConfig') {}

export const AppConfigLive = Layer.effect(
  AppConfig,
  Effect.sync(() => ({
    baseUrl: import.meta.env.VITE_API_URL ?? null,
    mockDelays: { rooms: 900, calendar: 800, submit: 1200 },
  })),
)
