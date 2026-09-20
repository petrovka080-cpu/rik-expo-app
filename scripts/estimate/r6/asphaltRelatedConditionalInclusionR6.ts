type Json = Record<string, unknown>;

export type RestoredAsphaltRelatedInclusionR6 = {
  ast: Json;
  controllingParameterId: string | null;
  expectedValue: string | boolean | null;
};

const ENUM_BRANCH_VALUE_BY_ASSEMBLY: Readonly<Record<string, string>> = Object.freeze({
  "asphalt-removal-destination-recycling": "RECYCLING",
  "asphalt-removal-cold-milling": "COLD_MILLING",
  "asphalt-removal-mechanical-breakout": "MECHANICAL_BREAKOUT",
});

/**
 * R555 deliberately captured a FULL_APPLICABLE_SCOPE snapshot, but retained
 * the original branch predicate in resource_graph.applicabilityRu. A runtime
 * definition must restore that predicate instead of treating every child
 * assembly as unconditionally payable.
 */
export function restoredR6AsphaltRelatedInclusionAst(input: {
  kind: "ASPHALT_WAVE_A" | "ASPHALT_RELATED" | "GABION";
  applicabilityRu: unknown;
  inherited: Json;
}): RestoredAsphaltRelatedInclusionR6 {
  if (input.kind !== "ASPHALT_RELATED") {
    return { ast: input.inherited, controllingParameterId: null, expectedValue: null };
  }
  const applicability = String(input.applicabilityRu ?? "").trim();
  const match = /^([a-z][a-z0-9_]*)\s*=\s*true\s*;\s*typed child assembly\s+[^:]+:v\d+:([a-z0-9-]+)\s*$/iu
    .exec(applicability);
  if (!match) {
    return { ast: input.inherited, controllingParameterId: null, expectedValue: null };
  }
  const controllingParameterId = match[1];
  const assembly = match[2].toLocaleLowerCase("en-US");
  const expectedValue = ENUM_BRANCH_VALUE_BY_ASSEMBLY[assembly] ?? true;
  return {
    ast: { kind: "equals", parameterId: controllingParameterId, value: expectedValue },
    controllingParameterId,
    expectedValue,
  };
}
