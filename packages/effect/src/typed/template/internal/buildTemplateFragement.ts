import type * as Template from "../Template.ts"

export function buildTemplateFragment(document: Document, template: Template.Template): DocumentFragment {
  const root = document.createElement("template")
  root.append(...template.nodes.map((node) => buildTemplateNode(document, node)))
  return root.content
}

function buildTemplateNode(document: Document, node: Template.Node): Node {
  switch (node._tag) {
    case "comment":
      return document.createComment(node.value)
    case "comment-part":
      return document.createComment(`c_${node.index}`)
    case "sparse-comment": {
      const comment = document.createComment("")

      for (const n of node.nodes) {
        if (n._tag === "text") {
          comment.appendChild(document.createTextNode(n.value))
        } else {
          comment.appendChild(document.createComment(`c_${n.index}`))
        }
      }

      return comment
    }
    case "doctype":
      return document.implementation.createDocumentType(
        node.name,
        node.publicId ?? "",
        node.systemId ?? ""
      )
    case "element":
      return buildTemplateElement(document, node)
    case "self-closing-element":
      return buildTemplateSelfClosingElement(document, node)
    case "text-only-element":
      return buildTemplateTextOnlyElement(document, node)
    case "text":
      return document.createTextNode(node.value)
    case "node":
      return document.createComment(`/n_${node.index}`)
  }
}

function buildTemplateElement(document: Document, node: Template.ElementNode): HTMLElement {
  const element = document.createElement(node.tagName)
  addStaticAttributes(element, node.attributes)
  element.append(...node.children.map((child) => buildTemplateNode(document, child)))
  return element
}

function addStaticAttributes(element: HTMLElement, attributes: Array<Template.Attribute>): void {
  for (const attribute of attributes) {
    if (attribute._tag === "attribute") {
      element.setAttribute(attribute.name, attribute.value)
    } else if (attribute._tag === "boolean") {
      element.toggleAttribute(attribute.name, true)
    }
  }
}

function buildTemplateSelfClosingElement(document: Document, node: Template.SelfClosingElementNode): HTMLElement {
  const element = document.createElement(node.tagName)
  addStaticAttributes(element, node.attributes)
  return element
}

function buildTemplateTextOnlyElement(document: Document, node: Template.TextOnlyElement): HTMLElement {
  const element = document.createElement(node.tagName)
  addStaticAttributes(element, node.attributes)
  if (node.textContent && node.textContent._tag === "text") {
    element.textContent = node.textContent.value
  }
  return element
}
