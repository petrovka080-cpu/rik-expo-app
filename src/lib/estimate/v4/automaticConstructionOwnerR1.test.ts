import { buildAutomaticConstructionOwnerR1, type AutomaticParameterSpec } from "./automaticConstructionOwnerR1";
import { NUMERIC_PARAMETER_RELATIONS } from "../backendPlatform/numericParameterRelations";

const config: Parameters<typeof buildAutomaticConstructionOwnerR1>[0] = {
  contract: "numeric-peer-owner-test", semanticOwner: "test-owner",
  sourceId: "test-source", normId: "test-preliminary",
  sourceMetadata: { source_title: "Test fixture, not an engineering norm", source_document_version: "test", definition_hash: "a".repeat(64), exact_locator: "Test only", artifact_sha256: "a".repeat(64) },
  applicabilityRu: "Тест контракта, не строительный профиль",
  ordinary: [], profile: [], conditional: [], excludedUnownedAssumptions: [],
  rows: [{ rowId: "test:row", section: "Test", category: "material", title: "Test", unitId: "mm", formulaId: "test:formula", expression: "left" }],
};
const left: AutomaticParameterSpec = { id: "left", title: "Left", kind: "ordinary", valueType: "decimal", unitId: "mm" };
const right: AutomaticParameterSpec = { id: "right", title: "Right", kind: "ordinary", valueType: "integer", unitId: "mm" };

describe("automatic owner uses existing numeric peer contract", () => {
  it("projects the same peer condition to required inputs and resources without a second entered flag", () => {
    const condition = { kind: "greater_than" as const, parameterId: "left", valueParameterId: "right" };
    const conditional: AutomaticParameterSpec = { id: "wps", title: "WPS", kind: "conditional", valueType: "text", unitId: null, requiredWhen: condition };
    const owner = buildAutomaticConstructionOwnerR1({ ...config, ordinary: [left, right], conditional: [conditional],
      rows: [{ ...config.rows[0]!, inclusion: condition }] });
    expect(owner.parameters[2]).toMatchObject({ required: false, default_value: null, constraints_json: { requiredWhen: condition } });
    expect(owner.parameters[2]?.constraints_json).not.toHaveProperty("forbiddenWhen");
    expect(owner.resources[0]?.inclusion_ast).toEqual(condition);
    expect(owner.runtimeInput).toEqual({});
  });
  it.each([
    ["missing", undefined], ["mismatched units", { ...right, unitId: "m" }], ["nonnumeric", { ...right, valueType: "text" as const }],
  ] as const)("rejects %s inclusion peers in required input and resource paths", (_label, peer) => {
    const condition = { kind: "greater_than" as const, parameterId: "left", valueParameterId: "right" };
    for (const location of ["parameter", "resource"]) {
      expect(() => buildAutomaticConstructionOwnerR1({ ...config, ordinary: [left, ...(peer ? [peer] : [])],
        conditional: location === "parameter" ? [{ id: "wps", title: "WPS", kind: "conditional", valueType: "text", unitId: null, requiredWhen: condition }] : [],
        rows: [{ ...config.rows[0]!, ...(location === "resource" ? { inclusion: condition } : {}) }],
      })).toThrow("AUTOMATIC_INCLUSION_PEER_INVALID:left:right");
    }
  });
  it("copies non-arithmetic resource facts into the existing gate without changing owners that do not declare them", () => {
    const ids = ["right"];
    const owner = buildAutomaticConstructionOwnerR1({ ...config, ordinary: [left, right], rows: [{ ...config.rows[0]!, inputParameterIds: ids }] });
    ids.push("left");
    expect(owner.resources[0]?.resource_graph.inputParameterIds).toEqual(["right"]);
    const unchanged = buildAutomaticConstructionOwnerR1({ ...config, ordinary: [left] });
    expect(unchanged.resources[0]?.resource_graph).not.toHaveProperty("inputParameterIds");
    expect(() => buildAutomaticConstructionOwnerR1({ ...config, ordinary: [left], rows: [{ ...config.rows[0]!, inputParameterIds: ["missing"] }] })).toThrow("AUTOMATIC_RESOURCE_INPUT_PARAMETER_INVALID:test:row");
  });
  it("projects validated formula-output limits through the shared compiler contract", () => {
    const policy = { schemaVersion: "canonical_formula_output_bounds_v1" as const, unitId: "mm", exclusiveMinimum: 15, reasonRu: "Test-only same-unit bound" };
    const owner = buildAutomaticConstructionOwnerR1({ ...config, ordinary: [left], rows: [{ ...config.rows[0]!, formulaOutputBounds: policy }] });
    expect(owner.resources[0]?.resource_graph.formulaOutputBoundsV1).toEqual(policy);
    expect(() => buildAutomaticConstructionOwnerR1({ ...config, rows: [{ ...config.rows[0]!, formulaOutputBounds: { ...policy, unitId: "m" } }] })).toThrow("formula output bounds invalid test:row");
  });
  it.each(NUMERIC_PARAMETER_RELATIONS.map(([rule]) => [rule] as const))("projects %s without a second geometry validator", rule => {
    const owner = buildAutomaticConstructionOwnerR1({ ...config, ordinary: [{ ...left, numericPeerConstraints: { [rule]: "right" } }, right] });
    expect(owner.parameters[0]?.constraints_json).toEqual({ [rule]: "right" });
    expect(owner.parameters[0]?.default_value).toBeNull();
    expect(owner.runtimeInput).toEqual({});
  });

  it.each([
    ["missing peer", undefined, left],
    ["different units", { ...right, unitId: "m" }, left],
    ["nonnumeric peer", { ...right, valueType: "text" }, left],
    ["nonnumeric subject", right, { ...left, valueType: "text" }],
  ] as const)("rejects %s before producing a publishable owner", (_label, peer, subject) => {
    expect(() => buildAutomaticConstructionOwnerR1({
      ...config, ordinary: [{ ...subject, numericPeerConstraints: { greaterThanParameter: "right" } }, ...(peer ? [peer] : [])],
    })).toThrow("AUTOMATIC_NUMERIC_PEER_CONSTRAINT_INVALID:left.greaterThanParameter=right");
  });
});
