import { constVoid } from "effect/Function"

export const RenderQueueTypeId = "@typed/template/RenderQueue"
export type RenderQueueTypeId = typeof RenderQueueTypeId

type Entry = { task: () => void; dispose: () => void }

export abstract class RenderQueue implements Disposable {
  protected readonly buckets: Array<KeyedPriorityBucket<Entry>> = []
  protected scheduled: Disposable | undefined = undefined

  readonly [RenderQueueTypeId]: RenderQueueTypeId = RenderQueueTypeId

  readonly add: (
    key: unknown,
    task: () => void,
    dispose: () => void,
    priority: number
  ) => Disposable = (key, task, dispose, priority) => {
    insert(this.buckets, priority, key, { task, dispose }, (entry) => entry.dispose())
    this.scheduleNext()
    return disposable(() => remove(this.buckets, priority, key))
  }

  readonly [Symbol.dispose]: () => void = () => {
    if (this.scheduled) {
      dispose(this.scheduled)
      this.scheduled = undefined
    }
    this.buckets.length = 0
  }

  protected abstract schedule(task: (deadline: IdleDeadline) => void): Disposable

  protected runTasks(deadline: IdleDeadline): void {
    this.scheduled = undefined

    while (shouldContinue(deadline) && this.buckets.length > 0) {
      const [_priority, map] = this.buckets.shift()!
      for (const { dispose, task } of map.values()) {
        task()
        dispose()
      }
    }

    this.scheduleNext()
  }

  private scheduleNext(): void {
    if (this.buckets.length === 0) {
      dispose(this)
      return
    }

    if (!this.scheduled) {
      this.scheduled = this.schedule((deadline) => this.runTasks(deadline))
    }
  }
}

// 16ms to match 60fps
const DEFAULT_DURATION_ALLOWED = 16
const SYNC_DEADLINE: IdleDeadline = { timeRemaining: () => Infinity, didTimeout: false }

export class SyncRenderQueue extends RenderQueue {
  protected schedule(task: (deadline: IdleDeadline) => void): Disposable {
    task(SYNC_DEADLINE)
    return disposable(constVoid)
  }
}

export class SetTimeoutRenderQueue extends RenderQueue {
  protected schedule(task: (deadline: IdleDeadline) => void): Disposable {
    const id = setTimeout(() => task(idleDealineFromTime(performance.now(), DEFAULT_DURATION_ALLOWED)), 0)
    return disposable(() => clearTimeout(id))
  }
}

export class RequestAnimationFrameRenderQueue extends RenderQueue {
  readonly durationAllowed: number
  constructor(durationAllowed: number = DEFAULT_DURATION_ALLOWED) {
    super()
    this.durationAllowed = durationAllowed
  }

  protected schedule(task: (deadline: IdleDeadline) => void): Disposable {
    const id = requestAnimationFrame((time) => task(idleDealineFromTime(time, this.durationAllowed)))
    return disposable(() => cancelAnimationFrame(id))
  }
}

export class RequestIdleCallbackRenderQueue extends RenderQueue {
  protected schedule(task: (deadline: IdleDeadline) => void): Disposable {
    const id = requestIdleCallback(task)
    return disposable(() => cancelIdleCallback(id))
  }
}

const NONE = disposable(constVoid)

export class MixedRenderQueue extends RenderQueue {
  private readonly high: RenderQueue
  private readonly mid: RenderQueue
  private readonly low: RenderQueue

  constructor(durationAllowed: number = DEFAULT_DURATION_ALLOWED) {
    super()
    this.high = new SyncRenderQueue()
    this.mid = typeof requestAnimationFrame === "function"
      ? new RequestAnimationFrameRenderQueue(durationAllowed)
      : new SetTimeoutRenderQueue()
    this.low = typeof requestIdleCallback === "function"
      ? new RequestIdleCallbackRenderQueue()
      : new SetTimeoutRenderQueue()
  }

  override readonly add = (key: unknown, task: () => void, dispose: () => void, priority: number): Disposable => {
    if (priority === RenderPriority.Sync) {
      return this.high.add(key, task, dispose, priority)
    } else if (priority > RenderPriority.Sync && priority <= RenderPriority.Raf(RAF_PRIORITY_RANGE)) {
      return this.mid.add(key, task, dispose, priority)
    } else {
      return this.low.add(key, task, dispose, priority)
    }
  }

  // We let the other queues handle the actual scheduling
  protected schedule(): Disposable {
    return NONE
  }

  override [Symbol.dispose]: () => void = () => {
    dispose(this.high)
    dispose(this.mid)
    dispose(this.low)
  }
}

const RAF_PRIORITY_RANGE = 10

export const RenderPriority = {
  Sync: -1,
  Raf: (priority: number) => Math.max(0, Math.min(priority, RAF_PRIORITY_RANGE)),
  Idle: (priority: number) => RAF_PRIORITY_RANGE + priority
} as const

function idleDealineFromTime(startTime: number, durationAllowed: number): IdleDeadline {
  return {
    timeRemaining: () => {
      const elapsed = performance.now() - startTime
      return Math.max(0, durationAllowed - elapsed)
    },
    didTimeout: false
  }
}

function disposable(f: () => void): Disposable {
  return {
    [Symbol.dispose]: f
  }
}

function dispose(self: Disposable): void {
  if (self === NONE) return
  self[Symbol.dispose]()
}

function shouldContinue(deadline: IdleDeadline): boolean {
  return deadline.timeRemaining() > 0
}

type KeyedPriorityBucket<A> = [priority: number, Map<unknown, A>]

function insert<A>(
  buckets: Array<KeyedPriorityBucket<A>>,
  priority: number,
  key: unknown,
  task: A,
  onRemoved: (task: A) => void
): void {
  const index = binarySearch(buckets, priority)
  if (index === buckets.length) {
    buckets.push([priority, new Map([[key, task]])])
  } else {
    const map = buckets[index][1]
    const existing = map.get(key)
    if (existing !== undefined) {
      onRemoved(existing)
    }
    map.set(key, task)
  }
}

function remove<A>(buckets: Array<KeyedPriorityBucket<A>>, priority: number, key: unknown): void {
  const index = binarySearch(buckets, priority)
  if (index === buckets.length) {
    return
  }
  buckets[index][1].delete(key)
}

function binarySearch<A>(buckets: Array<KeyedPriorityBucket<A>>, priority: number): number {
  let low = 0
  let high = buckets.length - 1
  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const [bucketPriority] = buckets[mid]
    if (bucketPriority === priority) {
      return mid
    } else if (bucketPriority < priority) {
      low = mid + 1
    } else {
      high = mid - 1
    }
  }
  return low
}
