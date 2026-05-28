import type { WorldConstructionPrimitive } from "../worldConstructionOntology";
import { buildBoqExclusions } from "./buildBoqExclusions";

export function compileExclusionsFromPrimitives(primitive: WorldConstructionPrimitive): string[] {
  return buildBoqExclusions(primitive);
}
