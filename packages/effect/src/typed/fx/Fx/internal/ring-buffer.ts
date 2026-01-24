import { type Effect, flatMap, void as void_ } from "../../../../Effect.ts"

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
  private _head = 0

  get size() {
    return this._size
  }

  push(a: A) {
    this._buffer[this._head] = a
    this._head = (this._head + 1) % this.capacity
    if (this._size < this.capacity) {
      this._size++
    }
  }

  private at(index: number): A {
    if (this._size < this.capacity) {
      return this._buffer[index]
    }
    return this._buffer[(this._head + index) % this.capacity]
  }

  forEach<B, E2, R2>(
    f: (a: A, i: number) => Effect<B, E2, R2>
  ) {
    switch (this._size) {
      case 0:
        return void_
      case 1:
        return f(this.at(0), 0)
      case 2:
        return flatMap(f(this.at(0), 0), () => f(this.at(1), 1))
      case 3:
        return flatMap(
          f(this.at(0), 0),
          () => flatMap(f(this.at(1), 1), () => f(this.at(2), 2))
        )
      default: {
        let eff: Effect<unknown, E2, R2> = f(this.at(0), 0)
        for (let i = 1; i < this._size; i++) {
          const idx = i
          eff = flatMap(eff, () => f(this.at(idx), idx))
        }
        return eff
      }
    }
  }

  clear() {
    this._buffer = Array(this.capacity)
    this._size = 0
    this._head = 0
  }
}
