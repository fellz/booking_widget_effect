import { Data, Schema as S } from 'effect'

/**
 * Typed error taxonomy for the data boundary. These travel in the Effect `E`
 * channel of the domain services (`RoomCatalog`, `AvailabilityCalendar`,
 * `Reservations`), so every failure mode is named and type-checked end to end —
 * adding one forces every `catchTags` site to handle
 * it (a compile error otherwise). This is the layer the Vue version had no
 * equivalent of: there, a failure was just a caught exception collapsed to a
 * status flag.
 */
export class NetworkError extends Data.TaggedError('NetworkError')<{}> {}
export class ServerError extends Data.TaggedError('ServerError')<{
  readonly status: number
}> {}
/** 409 on submit — the room was taken between availability check and confirm. */
export class RoomTaken extends Data.TaggedError('RoomTaken')<{}> {}

export type LoadError = NetworkError | ServerError
export type SubmitError = NetworkError | ServerError | RoomTaken

/**
 * The user-facing failure reason carried back into the model as data. It is the
 * TEA-side projection of the typed error channel: the single translation point
 * from Effect-world errors to a Message lives in the commands' `catchTags`.
 */
export const FailureReason = S.Literals(['network', 'server', 'roomTaken'])
export type FailureReason = typeof FailureReason.Type
