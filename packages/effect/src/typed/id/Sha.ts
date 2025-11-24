import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as ServiceMap from "effect/ServiceMap"

export class Sha extends ServiceMap.Service<Sha>()("@typed/id/ShaHashes", {
  make: Effect.succeed({
    sha1: Effect.fn(function*(data: BufferSource) {
      return new Uint8Array(yield* Effect.promise(() => crypto.subtle.digest("sha-1", data)))
    }),
    sha256: Effect.fn(function*(data: BufferSource) {
      return new Uint8Array(yield* Effect.promise(() => crypto.subtle.digest("sha-256", data)))
    }),
    sha512: Effect.fn(function*(data: BufferSource) {
      return new Uint8Array(yield* Effect.promise(() => crypto.subtle.digest("sha-512", data)))
    })
  })
}) {
  static readonly sha1 = (data: BufferSource) => Sha.asEffect().pipe(Effect.flatMap(({ sha1 }) => sha1(data)))
  static readonly sha256 = (data: BufferSource) => Sha.asEffect().pipe(Effect.flatMap(({ sha256 }) => sha256(data)))
  static readonly sha512 = (data: BufferSource) => Sha.asEffect().pipe(Effect.flatMap(({ sha512 }) => sha512(data)))

  static readonly Default = Layer.effect(Sha, Sha.make)
}
