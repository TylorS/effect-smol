import * as Chunk from "effect/collections/Chunk"

export class PathStack {
  chunk: Chunk.Chunk<number> = Chunk.empty()
  count = 0

  inc() {
    this.count++
  }

  push(): void {
    this.chunk = this.toChunk()
    this.count = 0
  }

  pop(): void {
    this.count = Chunk.lastUnsafe(this.chunk)
    this.chunk = Chunk.dropRight(this.chunk, 1)
  }

  toChunk(): Chunk.Chunk<number> {
    if (Chunk.isEmpty(this.chunk)) {
      return Chunk.of(this.count)
    }

    return Chunk.append(this.chunk, this.count)
  }

  previousChunk() {
    return this.chunk
  }
}
