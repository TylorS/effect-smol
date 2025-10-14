import type { HtmlChunk } from "./HtmlChunk.ts"
import type { Template } from "./Template.ts"

export interface DomEntry {
  readonly template: Template
  readonly content: DocumentFragment
}
export const makeDomEntry = (template: Template, content: DocumentFragment): DomEntry => ({
  template,
  content
})

export interface HtmlEntry {
  readonly template: Template
  readonly chunks: ReadonlyArray<HtmlChunk>
}
