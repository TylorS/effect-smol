import { constVoid } from "../../Function.ts"

export const RenderQueueTypeId = "@typed/template/RenderQueue"
export type RenderQueueTypeId = typeof RenderQueueTypeId

export abstract class RenderQueue implements Disposable {
  protected readonly buckets: Array<KeyedPriorityBucket<() => void>> = []
  protected scheduled: Disposable | undefined = undefined

  readonly [RenderQueueTypeId]: RenderQueueTypeId = RenderQueueTypeId

  readonly add: (key: unknown, task: () => void, priority: number) => Disposable = (key, task, priority) => {
    insert(this.buckets, priority, key, task)
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
      for (const task of map.values()) {
        task()
      }
    }

    this.scheduleNext()
  }

  private scheduleNext(): void {
    // Refactored for faster and more direct branching, avoiding unnecessary checks
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

export class SyncRenderQueue extends RenderQueue {
  protected schedule(task: (deadline: IdleDeadline) => void): Disposable {
    task({ timeRemaining: () => Infinity, didTimeout: false })
    return disposable(constVoid)
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
  private readonly sync: SyncRenderQueue
  private readonly raf: RequestAnimationFrameRenderQueue
  private readonly ric: RequestIdleCallbackRenderQueue

  constructor(durationAllowed: number = DEFAULT_DURATION_ALLOWED) {
    super()
    this.sync = new SyncRenderQueue()
    this.raf = new RequestAnimationFrameRenderQueue(durationAllowed)
    this.ric = new RequestIdleCallbackRenderQueue()
  }

  override readonly add = (key: unknown, task: () => void, priority: number): Disposable => {
    if (priority === RenderPriority.Sync) {
      return this.sync.add(key, task, priority)
    } else if (priority > RenderPriority.Sync && priority <= RenderPriority.Raf(RAF_PRIORITY_RANGE)) {
      return this.raf.add(key, task, priority)
    } else {
      return this.ric.add(key, task, priority)
    }
  }

  // We let the other queues handle the actual scheduling
  protected schedule(): Disposable {
    return NONE
  }

  override [Symbol.dispose]: () => void = () => {
    dispose(this.sync)
    dispose(this.raf)
    dispose(this.ric)
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

function insert<A>(buckets: Array<KeyedPriorityBucket<A>>, priority: number, key: unknown, task: A): void {
  const index = binarySearch(buckets, priority)
  if (index === buckets.length) {
    buckets.push([priority, new Map([[key, task]])])
  } else {
    buckets[index][1].set(key, task)
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
