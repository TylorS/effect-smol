export const PART_REGEX = /(\{\{(\d+)\}\})/g
export const STRICT_PART_REGEX = /^(\{\{(\d+)\}\})/
export const PART_STRING = (i: number) => `{{${i}}}`

export const TEMPLATE_START_COMMENT = (hash: string, many?: number) => `<!--t${hash}${many ? `_${many}` : ""}-->`
export const TEMPLATE_END_COMMENT = (hash: string, many?: number) => `<!--/t${hash}${many ? `_${many}` : ""}-->`

export const TEXT_START = "<!--txt-->"

export const TYPED_NODE_START = (i: number) => `<!--n${i}-->`
export const TYPED_NODE_END = (i: number) => `<!--/n${i}-->`

const typedTemplateStartCommentRegex = /<!--[t|n|txt](.*?)-->/g
const typedTemplateEndCommentRegex = /<!--\/[t|n|txt](.*?)-->/g

export const isTemplateStartComment = (comment: { nodeValue: string }) =>
  typedTemplateStartCommentRegex.test(comment.nodeValue)

export const isTemplateEndComment = (comment: { nodeValue: string }) =>
  typedTemplateEndCommentRegex.test(comment.nodeValue)

export const stripTypedTemplateComments = (html: string) =>
  html.replace(typedTemplateStartCommentRegex, "").replace(typedTemplateEndCommentRegex, "")
