import { uncapitalize } from "effect/String"

export function keyToPartType(key: string) {
  switch (key[0]) {
    case "?":
      return ["boolean", key.slice(1)] as const
    case ".": {
      const propertyName = key.slice(1)

      if (propertyName === "data") {
        return ["data"] as const
      } else if (
        propertyName === "props" || propertyName === "properties"
      ) {
        return ["properties"] as const
      } else {
        return ["property", propertyName] as const
      }
    }
    case "@":
      return ["event", uncapitalize(key.slice(1))] as const
    case "o": {
      if (key[1] === "n") {
        const name = uncapitalize(key.slice(2))
        return ["event", name] as const
      }
    }
  }

  const lower = key.toLowerCase()

  if (lower === "ref") {
    return ["ref"] as const
  } else if (lower === "class" || lower === "classname") {
    return ["class"] as const
  } else {
    return ["attr", key] as const
  }
}
