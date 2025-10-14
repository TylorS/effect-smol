import { type Effect, flatMap, forEach, void as void_ } from "../../../Effect.ts"

export class RingBuffer<A> {
  readonly capacity: number

  constructor(
    capacity: number
  ) {
    this.capacity = capacity
    this._buffer = Array(this.capacity)
  }

  private _buffer: Array<A>
  private _size = 0

  get size() {
    return this._size
  }

  push(a: A) {
    if (this._size < this.capacity) {
      this._buffer[this._size++] = a
    } else {
      this._buffer.shift()
      this._buffer.push(a)
    }
  }

  forEach<B, E2, R2>(
    f: (a: A, i: number) => Effect<B, E2, R2>
  ) {
    switch (this._size) {
      case 0:
        return void_
      case 1:
        return f(this._buffer[0], 0)
      case 2:
        return flatMap(f(this._buffer[0], 0), () => f(this._buffer[1], 1))
      case 3:
        return flatMap(
          f(this._buffer[0], 0),
          () => flatMap(f(this._buffer[1], 1), () => f(this._buffer[2], 2))
        )
      default:
        return forEach(
          Array.from({ length: this._size }, (_, i) => this._buffer[i]),
          f,
          {
            discard: true
          }
        )
    }
  }

  clear() {
    this._buffer = Array(this.capacity)
    this._size = 0
  }
}
