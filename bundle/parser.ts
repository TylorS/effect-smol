import { parse } from "#dist/@typed/template/Parser"

console.time("parse")
const template = parse(["<div>", "</div>"])
console.timeEnd("parse")
console.dir(template, { depth: null })
