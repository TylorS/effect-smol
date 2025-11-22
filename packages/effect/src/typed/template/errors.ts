export class CouldNotFindCommentError extends Error {
  readonly partIndex: number
  constructor(partIndex: number) {
    super(`Could not find comment for part ${partIndex}`)
    this.partIndex = partIndex
  }
}

export class CouldNotFindRootElement extends Error {
  readonly partIndex: number
  constructor(partIndex: number) {
    super(`Could not find root elements for part ${partIndex}`)
    this.partIndex = partIndex
  }
}

export class CouldNotFindManyCommentError extends Error {
  readonly manyIndex: string
  constructor(manyIndex: string) {
    super(`Could not find comment for many part ${manyIndex}`)
    this.manyIndex = manyIndex
  }
}

export class CouldNotFindTemplateHashError extends Error {
  readonly hash: string
  constructor(hash: string) {
    super(`Could not find template hash ${hash}`)
    this.hash = hash
  }
}

export class CouldNotFindTemplateEndError extends Error {
  readonly hash: string
  constructor(hash: string) {
    super(`Could not find end of template for hash ${hash}`)
    this.hash = hash
  }
}

const constructors = [
  CouldNotFindCommentError,
  CouldNotFindRootElement,
  CouldNotFindManyCommentError,
  CouldNotFindTemplateHashError,
  CouldNotFindTemplateEndError
] as const

export type HydrationError = InstanceType<typeof constructors[number]>

export function isHydrationError(e: unknown): e is HydrationError {
  return constructors.some((c) => e instanceof c)
}
