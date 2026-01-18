import { RefSubject } from "../fx/RefSubject.ts"

export class CurrentPath extends RefSubject.Service<CurrentPath, string>()("@typed/router/CurrentPath") {}
