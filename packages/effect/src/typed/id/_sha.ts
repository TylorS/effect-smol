import * as Effect from "effect/Effect"

export const sha1 = (data: BufferSource) =>
  Effect.promise(() => crypto.subtle.digest("SHA-1", data).then((buffer) => new Uint8Array(buffer)))

export const sha512 = (data: BufferSource) =>
  Effect.promise(() => crypto.subtle.digest("SHA-512", data).then((buffer) => new Uint8Array(buffer)))
