import { assert, describe, it } from "@effect/vitest"
import { Effect } from "effect"
import * as Cause from "effect/Cause"
import * as Exit from "effect/Exit"
import * as Option from "effect/Option"
import * as Result from "effect/Result"
import * as AsyncData from "effect/typed/async-data/AsyncData"

describe("AsyncData", () => {
  describe("constructors", () => {
    it.effect("NoData", () =>
      Effect.gen(function*() {
        const data = AsyncData.NoData
        assert(AsyncData.isNoData(data))
        assert(data._tag === "NoData")
      }))

    it.effect("loading without progress", () =>
      Effect.gen(function*() {
        const data = AsyncData.loading()
        assert(AsyncData.isLoading(data))
        assert(data._tag === "Loading")
        assert(data.progress === undefined)
      }))

    it.effect("loading with progress", () =>
      Effect.gen(function*() {
        const progress = { loaded: 50, total: 100 }
        const data = AsyncData.loading(progress)
        assert(AsyncData.isLoading(data))
        assert(data.progress?.loaded === 50)
        assert(data.progress?.total === 100)
      }))

    it.effect("success without progress", () =>
      Effect.gen(function*() {
        const data = AsyncData.success(42)
        assert(AsyncData.isSuccess(data))
        assert(data._tag === "Success")
        assert(data.value === 42)
        assert(data.progress === undefined)
      }))

    it.effect("success with progress", () =>
      Effect.gen(function*() {
        const progress = { loaded: 75, total: 100 }
        const data = AsyncData.success(42, progress)
        assert(AsyncData.isSuccess(data))
        assert(data.value === 42)
        assert(data.progress?.loaded === 75)
        assert(data.progress?.total === 100)
      }))

    it.effect("failure without progress", () =>
      Effect.gen(function*() {
        const cause = Cause.fail("error")
        const data = AsyncData.failure(cause)
        assert(AsyncData.isFailure(data))
        assert(data._tag === "Failure")
        assert(data.cause === cause)
        assert(data.progress === undefined)
      }))

    it.effect("failure with progress", () =>
      Effect.gen(function*() {
        const cause = Cause.fail("error")
        const progress = { loaded: 25 }
        const data = AsyncData.failure(cause, progress)
        assert(AsyncData.isFailure(data))
        assert(data.progress?.loaded === 25)
        assert(data.progress?.total === undefined)
      }))

    it.effect("optimistic", () =>
      Effect.gen(function*() {
        const previous = AsyncData.success(10)
        const data = AsyncData.optimistic(previous, 20)
        assert(AsyncData.isOptimistic(data))
        assert(data._tag === "Optimistic")
        assert(data.value === 20)
        assert(data.previous === previous)
      }))
  })

  describe("type guards", () => {
    it.effect("isNoData", () =>
      Effect.gen(function*() {
        assert(AsyncData.isNoData(AsyncData.NoData))
        assert(!AsyncData.isNoData(AsyncData.loading()))
        assert(!AsyncData.isNoData(AsyncData.success(1)))
      }))

    it.effect("isLoading", () =>
      Effect.gen(function*() {
        assert(AsyncData.isLoading(AsyncData.loading()))
        assert(!AsyncData.isLoading(AsyncData.NoData))
        assert(!AsyncData.isLoading(AsyncData.success(1)))
      }))

    it.effect("isSuccess", () =>
      Effect.gen(function*() {
        assert(AsyncData.isSuccess(AsyncData.success(1)))
        assert(!AsyncData.isSuccess(AsyncData.NoData))
        assert(!AsyncData.isSuccess(AsyncData.loading()))
      }))

    it.effect("isFailure", () =>
      Effect.gen(function*() {
        const cause = Cause.fail("error")
        assert(AsyncData.isFailure(AsyncData.failure(cause)))
        assert(!AsyncData.isFailure(AsyncData.NoData))
        assert(!AsyncData.isFailure(AsyncData.success(1)))
      }))

    it.effect("isOptimistic", () =>
      Effect.gen(function*() {
        const previous = AsyncData.success(10)
        const data = AsyncData.optimistic(previous, 20)
        assert(AsyncData.isOptimistic(data))
        assert(!AsyncData.isOptimistic(AsyncData.NoData))
        assert(!AsyncData.isOptimistic(AsyncData.success(1)))
      }))

    it.effect("isAsyncData", () =>
      Effect.gen(function*() {
        assert(AsyncData.isAsyncData(AsyncData.NoData))
        assert(AsyncData.isAsyncData(AsyncData.loading()))
        assert(AsyncData.isAsyncData(AsyncData.success(1)))
        assert(AsyncData.isAsyncData(AsyncData.failure(Cause.fail("error"))))
        assert(!AsyncData.isAsyncData(null))
        assert(!AsyncData.isAsyncData({}))
        assert(!AsyncData.isAsyncData({ _tag: "Invalid" }))
      }))

    it.effect("isRefreshing", () =>
      Effect.gen(function*() {
        const progress = { loaded: 50 }
        const successWithProgress = AsyncData.success(1, progress)
        const failureWithProgress = AsyncData.failure(Cause.fail("error"), progress)
        assert(AsyncData.isRefreshing(successWithProgress))
        assert(AsyncData.isRefreshing(failureWithProgress))
        assert(!AsyncData.isRefreshing(AsyncData.success(1)))
        assert(!AsyncData.isRefreshing(AsyncData.loading()))
      }))

    it.effect("isPending", () =>
      Effect.gen(function*() {
        assert(AsyncData.isPending(AsyncData.loading()))
        const progress = { loaded: 50 }
        assert(AsyncData.isPending(AsyncData.success(1, progress)))
        assert(AsyncData.isPending(AsyncData.failure(Cause.fail("error"), progress)))
        assert(!AsyncData.isPending(AsyncData.NoData))
        assert(!AsyncData.isPending(AsyncData.success(1)))
      }))
  })

  describe("extractors", () => {
    it.effect("getSuccess", () =>
      Effect.gen(function*() {
        const successData = AsyncData.success(42)
        const successOption = AsyncData.getSuccess(successData)
        assert(Option.isSome(successOption))
        assert(successOption.value === 42)
        assert(Option.isNone(AsyncData.getSuccess(AsyncData.NoData)))
        assert(Option.isNone(AsyncData.getSuccess(AsyncData.loading())))
        const previous = AsyncData.success(10)
        const optimistic = AsyncData.optimistic(previous, 20)
        const optimisticOption = AsyncData.getSuccess(optimistic)
        assert(Option.isSome(optimisticOption))
        assert(optimisticOption.value === 20)
      }))

    it.effect("getCause", () =>
      Effect.gen(function*() {
        const cause = Cause.fail("error")
        const failureData = AsyncData.failure(cause)
        const causeOption = AsyncData.getCause(failureData)
        assert(Option.isSome(causeOption))
        assert(causeOption.value === cause)
        assert(Option.isNone(AsyncData.getCause(AsyncData.NoData)))
        assert(Option.isNone(AsyncData.getCause(AsyncData.loading())))
        assert(Option.isNone(AsyncData.getCause(AsyncData.success(1))))
      }))

    it.effect("getError", () =>
      Effect.gen(function*() {
        const error = "error"
        const cause = Cause.fail(error)
        const failureData = AsyncData.failure(cause)
        const errorOption = AsyncData.getError(failureData)
        assert(Option.isSome(errorOption))
        assert(errorOption.value === error)
        assert(Option.isNone(AsyncData.getError(AsyncData.NoData)))
        assert(Option.isNone(AsyncData.getError(AsyncData.loading())))
        assert(Option.isNone(AsyncData.getError(AsyncData.success(1))))
      }))
  })

  describe("transformations", () => {
    it.effect("map", () =>
      Effect.gen(function*() {
        const data = AsyncData.success(5)
        const mapped = AsyncData.map(data, (n) => n * 2)
        assert(AsyncData.isSuccess(mapped))
        assert(mapped.value === 10)
        const noData = AsyncData.NoData
        const mappedNoData = AsyncData.map(noData, (n: number) => n * 2)
        assert(AsyncData.isNoData(mappedNoData))
        const optimistic = AsyncData.optimistic(AsyncData.success(5), 10)
        const mappedOptimistic = AsyncData.map(optimistic, (n) => n * 2)
        assert(AsyncData.isOptimistic(mappedOptimistic))
        assert(mappedOptimistic.value === 20)
        assert(AsyncData.isSuccess(mappedOptimistic.previous))
        assert(mappedOptimistic.previous.value === 10)
      }))

    it.effect("map preserves progress", () =>
      Effect.gen(function*() {
        const progress = { loaded: 50, total: 100 }
        const data = AsyncData.success(5, progress)
        const mapped = AsyncData.map(data, (n) => n * 2)
        assert(AsyncData.isSuccess(mapped))
        assert(mapped.progress?.loaded === 50)
        assert(mapped.progress?.total === 100)
      }))

    it.effect("flatMap", () =>
      Effect.gen(function*() {
        const data = AsyncData.success(5)
        const flatMapped = AsyncData.flatMap(data, (n) => AsyncData.success(n * 2))
        assert(AsyncData.isSuccess(flatMapped))
        assert(flatMapped.value === 10)
        const noData = AsyncData.NoData
        const flatMappedNoData = AsyncData.flatMap(noData, (n: number) => AsyncData.success(n * 2))
        assert(AsyncData.isNoData(flatMappedNoData))
        const optimistic = AsyncData.optimistic(AsyncData.success(5), 10)
        const flatMappedOptimistic = AsyncData.flatMap(optimistic, (n) => AsyncData.success(n * 2))
        assert(AsyncData.isSuccess(flatMappedOptimistic))
        assert(flatMappedOptimistic.value === 20)
        const optimisticToOptimistic = AsyncData.optimistic(AsyncData.success(5), 10)
        const flatMappedOptimistic2 = AsyncData.flatMap(optimisticToOptimistic, (n, prev) =>
          AsyncData.optimistic(prev, n * 2))
        assert(AsyncData.isOptimistic(flatMappedOptimistic2))
        assert(flatMappedOptimistic2.value === 20)
      }))

    it.effect("mapError", () =>
      Effect.gen(function*() {
        const cause = Cause.fail("error")
        const data = AsyncData.failure(cause)
        const mapped = AsyncData.mapError(data, (e) => `mapped: ${e}`)
        assert(AsyncData.isFailure(mapped))
        const error = Cause.errorOption(mapped.cause)
        assert(Option.isSome(error))
        assert(error.value === "mapped: error")
        const noData = AsyncData.NoData
        const mappedNoData = AsyncData.mapError(noData, (e: string) => `mapped: ${e}`)
        assert(AsyncData.isNoData(mappedNoData))
        const optimistic = AsyncData.optimistic(AsyncData.failure(cause), 10)
        const mappedOptimistic = AsyncData.mapError(optimistic, (e) => `mapped: ${e}`)
        assert(AsyncData.isOptimistic(mappedOptimistic))
        assert(AsyncData.isFailure(mappedOptimistic.previous))
      }))

    it.effect("mapError preserves progress", () =>
      Effect.gen(function*() {
        const progress = { loaded: 50 }
        const cause = Cause.fail("error")
        const data = AsyncData.failure(cause, progress)
        const mapped = AsyncData.mapError(data, (e) => `mapped: ${e}`)
        assert(AsyncData.isFailure(mapped))
        assert(mapped.progress?.loaded === 50)
      }))
  })

  describe("utilities", () => {
    it.effect("startLoading from NoData", () =>
      Effect.gen(function*() {
        const data = AsyncData.NoData
        const started = AsyncData.startLoading(data)
        assert(AsyncData.isLoading(started))
      }))

    it.effect("startLoading from Success", () =>
      Effect.gen(function*() {
        const data = AsyncData.success(42)
        const progress = { loaded: 50 }
        const started = AsyncData.startLoading(data, progress)
        assert(AsyncData.isSuccess(started))
        assert(started.value === 42)
        assert(started.progress?.loaded === 50)
      }))

    it.effect("startLoading from Failure", () =>
      Effect.gen(function*() {
        const cause = Cause.fail("error")
        const data = AsyncData.failure(cause)
        const progress = { loaded: 50 }
        const started = AsyncData.startLoading(data, progress)
        assert(AsyncData.isFailure(started))
        assert(started.cause === cause)
        assert(started.progress?.loaded === 50)
      }))

    it.effect("startLoading from Optimistic", () =>
      Effect.gen(function*() {
        const previous = AsyncData.success(10)
        const data = AsyncData.optimistic(previous, 20)
        const progress = { loaded: 50 }
        const started = AsyncData.startLoading(data, progress)
        assert(AsyncData.isOptimistic(started))
        assert(started.value === 20)
        assert(AsyncData.isSuccess(started.previous))
        assert(started.previous.progress?.loaded === 50)
      }))

    it.effect("stopLoading from Success with progress", () =>
      Effect.gen(function*() {
        const progress = { loaded: 50 }
        const data = AsyncData.success(42, progress)
        const stopped = AsyncData.stopLoading(data)
        assert(AsyncData.isSuccess(stopped))
        assert(stopped.value === 42)
        assert(stopped.progress === undefined)
      }))

    it.effect("stopLoading from Failure with progress", () =>
      Effect.gen(function*() {
        const cause = Cause.fail("error")
        const progress = { loaded: 50 }
        const data = AsyncData.failure(cause, progress)
        const stopped = AsyncData.stopLoading(data)
        assert(AsyncData.isFailure(stopped))
        assert(stopped.cause === cause)
        assert(stopped.progress === undefined)
      }))

    it.effect("stopLoading from Optimistic", () =>
      Effect.gen(function*() {
        const previous = AsyncData.success(10, { loaded: 50 })
        const data = AsyncData.optimistic(previous, 20)
        const stopped = AsyncData.stopLoading(data)
        assert(AsyncData.isOptimistic(stopped))
        assert(stopped.value === 20)
        assert(AsyncData.isSuccess(stopped.previous))
        assert(stopped.previous.progress === undefined)
      }))

    it.effect("stopLoading from NoData", () =>
      Effect.gen(function*() {
        const data = AsyncData.NoData
        const stopped = AsyncData.stopLoading(data)
        assert(AsyncData.isNoData(stopped))
      }))

    it.effect("match", () =>
      Effect.gen(function*() {
        const noDataResult = AsyncData.match(AsyncData.NoData, {
          NoData: () => "no-data",
          Loading: () => "loading",
          Failure: () => "failure",
          Success: () => "success",
          Optimistic: () => "optimistic"
        })
        assert(noDataResult === "no-data")

        const loadingResult = AsyncData.match(AsyncData.loading(), {
          NoData: () => "no-data",
          Loading: () => "loading",
          Failure: () => "failure",
          Success: () => "success",
          Optimistic: () => "optimistic"
        })
        assert(loadingResult === "loading")

        const successResult = AsyncData.match(AsyncData.success(42), {
          NoData: () => "no-data",
          Loading: () => "loading",
          Failure: () => "failure",
          Success: (value) => `success-${value}`,
          Optimistic: () => "optimistic"
        })
        assert(successResult === "success-42")

        const cause = Cause.fail("error")
        const failureResult = AsyncData.match(AsyncData.failure(cause), {
          NoData: () => "no-data",
          Loading: () => "loading",
          Failure: (cause) => `failure-${Cause.errorOption(cause).pipe(Option.getOrElse(() => "unknown"))}`,
          Success: () => "success",
          Optimistic: () => "optimistic"
        })
        assert(failureResult === "failure-error")

        const previous = AsyncData.success(10)
        const optimisticResult = AsyncData.match(AsyncData.optimistic(previous, 20), {
          NoData: () => "no-data",
          Loading: () => "loading",
          Failure: () => "failure",
          Success: () => "success",
          Optimistic: (value) => `optimistic-${value}`
        })
        assert(optimisticResult === "optimistic-20")
      }))

    it.effect("fromExit Success", () =>
      Effect.gen(function*() {
        const exit = Exit.succeed(42)
        const data = AsyncData.fromExit(exit)
        assert(AsyncData.isSuccess(data))
        assert(data.value === 42)
      }))

    it.effect("fromExit Failure", () =>
      Effect.gen(function*() {
        const cause = Cause.fail("error")
        const exit = Exit.failCause(cause)
        const data = AsyncData.fromExit(exit)
        assert(AsyncData.isFailure(data))
        assert(data.cause === cause)
      }))

    it.effect("fromResult Success", () =>
      Effect.gen(function*() {
        const result = Result.succeed(42)
        const data = AsyncData.fromResult(result)
        assert(AsyncData.isSuccess(data))
        assert(data.value === 42)
      }))

    it.effect("fromResult Failure", () =>
      Effect.gen(function*() {
        const result = Result.fail("error")
        const data = AsyncData.fromResult(result)
        assert(AsyncData.isFailure(data))
        const error = Cause.errorOption(data.cause)
        assert(Option.isSome(error))
        assert(error.value === "error")
      }))
  })
})
