import {
  STRIP_FOUNDATION_CONCRETE_PLACEMENT_TARGETS,
} from "../v4/stripFoundationConcretePlacementR1";
import {
  concretePlacementPromptDetailsR1,
  extractConcretePlacementCanonicalParametersR1,
} from "./concretePlacementProductionBindingR1";

type Primitive = string | number | boolean;

const CATALOG_IDS: ReadonlySet<string> = new Set(
  STRIP_FOUNDATION_CONCRETE_PLACEMENT_TARGETS.map((target) => target.catalogId),
);

export function stripFoundationConcretePlacementPromptDetailsR1(
  values: Readonly<Record<string, Primitive>>,
): string[] {
  return concretePlacementPromptDetailsR1(values);
}

export function extractStripFoundationConcretePlacementCanonicalParametersR1(input: {
  catalogId: string;
  text: string;
}): Readonly<Record<string, Primitive>> | null {
  if (!CATALOG_IDS.has(input.catalogId)) return null;
  return extractConcretePlacementCanonicalParametersR1(input);
}
