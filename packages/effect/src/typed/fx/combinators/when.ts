import { dual } from "../../../Function.ts"
import type { Scope } from "../../../Scope.ts"
import { succeed } from "../constructors/succeed.ts"
import type { Fx } from "../Fx.ts"
import { switchMap } from "./switchMap.ts"

const if_: {
  <B, E2, R2, C, E3, R3>(
    matchers: {
      onTrue: Fx<B, E2, R2>
      onFalse: Fx<C, E3, R3>
    }
  ): <E, R>(condition: Fx<boolean, E, R>) => Fx<B | C, E | E2 | E3, R | R2 | R3 | Scope>

  <E, R, B, E2, R2, C, E3, R3>(
    condition: Fx<boolean, E, R>,
    matchers: {
      onTrue: Fx<B, E2, R2>
      onFalse: Fx<C, E3, R3>
    }
  ): Fx<B | C, E | E2 | E3, R | R2 | R3 | Scope>
} = dual(2, <E, R, B, E2, R2, C, E3, R3>(
  condition: Fx<boolean, E, R>,
  matchers: {
    onTrue: Fx<B, E2, R2>
    onFalse: Fx<C, E3, R3>
  }
): Fx<B | C, E | E2 | E3, R | R2 | R3 | Scope> => {
  return switchMap(
    condition,
    (pass): Fx<B | C, E2 | E3, R2 | R3> => pass ? matchers.onTrue : matchers.onFalse
  )
})

export { if_ as if }

export const when = <E, R, B, C>(
  condition: Fx<boolean, E, R>,
  matchers: {
    onTrue: B
    onFalse: C
  }
): Fx<B | C, E, R | Scope> => {
  return if_(condition, { onTrue: succeed(matchers.onTrue), onFalse: succeed(matchers.onFalse) })
}
