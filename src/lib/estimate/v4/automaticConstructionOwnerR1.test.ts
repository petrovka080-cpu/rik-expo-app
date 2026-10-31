import { buildAutomaticConstructionOwnerR1, type AutomaticInclusionCondition, type AutomaticParameterSpec } from "./automaticConstructionOwnerR1";
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
  it("projects mixed logical/literal conditions identically to inputs and resources", () => {
    const condition: AutomaticInclusionCondition = { kind: "and", operands: [
      { kind: "equals", parameterId: "method", value: "selected" },
      { kind: "greater_than", parameterId: "left", value: 0 },
      { kind: "or", operands: [{ kind: "greater_than", parameterId: "left", valueParameterId: "right" },
        { kind: "equals", parameterId: "method", value: "selected" }] },
    ] };
    const owner = buildAutomaticConstructionOwnerR1({ ...config, ordinary: [left, right,
      { id: "method", title: "Method", kind: "ordinary", valueType: "enum", unitId: null, values: ["selected"] }],
      conditional: [{ id: "product", title: "Product", kind: "conditional", valueType: "text", unitId: null, requiredWhen: condition }],
      rows: [{ ...config.rows[0]!, inclusion: condition }] });
    expect(owner.parameters[3]?.constraints_json).toEqual({ minLength: 1, maxLength: 1_000, requiredWhen: condition });
    expect(owner.resources[0]?.inclusion_ast).toEqual(condition);
    expect(owner.runtimeInput).toEqual({});
  });
  it.each([
    ["empty logical node", { kind: "and", operands: [] }],
    ["nonfinite literal", { kind: "greater_than", parameterId: "left", value: NaN }],
  ] as const)("delegates rejection of %s to the existing graph", (_label, condition) => {
    expect(() => buildAutomaticConstructionOwnerR1({ ...config, ordinary: [left],
      rows: [{ ...config.rows[0]!, inclusion: condition }] })).toThrow();
  });
  it.each([undefined, { ...left, valueType: "text" as const }])("rejects undeclared or nonnumeric literal subjects", subject => {
    const condition: AutomaticInclusionCondition = { kind: "and", operands: [{ kind: "greater_than", parameterId: "left", value: 0 }] };
    for (const location of ["parameter", "resource"]) {
      expect(() => buildAutomaticConstructionOwnerR1({ ...config, ordinary: subject ? [subject] : [],
        conditional: location === "parameter" ? [{ id: "product", title: "Product", kind: "conditional", valueType: "text", unitId: null, requiredWhen: condition }] : [],
        rows: [{ ...config.rows[0]!, ...(location === "resource" ? { inclusion: condition } : {}) }],
      })).toThrow("AUTOMATIC_INCLUSION_LITERAL_INVALID:left");
    }
  });
  it("preserves the existing legacy required/forbidden equality contract", () => {
    const owner = buildAutomaticConstructionOwnerR1({ ...config,
      conditional: [{ id: "product", title: "Product", kind: "conditional", valueType: "text", unitId: null,
        requiredWhen: { parameterId: "method", value: "selected" } }] });
    expect(owner.parameters[0]?.constraints_json).toMatchObject({ requiredWhen: { kind: "equals", parameterId: "method", value: "selected" },
      forbiddenWhen: { kind: "equals", parameterId: "method", value: "NOT_REQUIRED" } });
  });
  it("does not label an unknown conditional project fact as a prefilled application profile", () => {
    const condition = { kind: "greater_than" as const, parameterId: "left", valueParameterId: "right" };
    const owner = buildAutomaticConstructionOwnerR1({ ...config, ordinary: [left, right],
      profile: [{ id: "scenario_rate", title: "Scenario", kind: "profile", valueType: "decimal", unitId: "mm", defaultValue: 2 }],
      conditional: [{ id: "wps", title: "WPS", kind: "conditional", valueType: "text", unitId: null, requiredWhen: condition }] });
    const actual = owner.parameters.find(parameter => parameter.parameter_id === "wps")!;
    expect(actual.default_value).toBeNull();
    expect(actual.truth_metadata.guide).toMatchObject({
      guide_short_ru: "WPS: укажите подтверждённое значение из проекта, спецификации или технологической карты.",
      source_role: "PROJECT_DOCUMENTATION", guide_validation_policy: "MANDATORY_BLOCK",
    });
    expect(owner.runtimeInput).toEqual({ scenario_rate: 2 });
    expect(owner.parameters.find(parameter => parameter.parameter_id === "scenario_rate")?.truth_metadata.guide).toMatchObject({
      guide_short_ru: "Scenario: видимое предварительное значение; замените по проекту или спецификации.",
      guide_validation_policy: "ADVISORY_REASON_REQUIRED",
    });
  });
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


test("default automatic owner keeps one physical row without opting into operation composition", () => {
  const input = {...config, ordinary:[left]}, before = JSON.stringify(input);
  const owner = buildAutomaticConstructionOwnerR1(input);
  expect(owner.resources).toHaveLength(1);
  expect(owner.formulas).toHaveLength(1);
  expect(owner.formulas[0]).toMatchObject({formula_id:"test:formula", expression_source:"left", output_unit_id:"mm", input_parameter_ids:["left"]});
  expect(owner.resources[0]).toMatchObject({row_id:"test:row", formula_id:"test:formula", unit_id:"mm", cost_owner_id:"test:row", procurement_eligible:false});
  expect(owner.resources[0]!.resource_graph).toMatchObject({costTreatment:"OWN_COST", costOwner:"resource", semanticOwnerId:"test-owner:test:row"});
  expect(Object.hasOwn(owner.resources[0]!.resource_graph, "operationCompositionV1")).toBe(false);
  expect(owner.runtimeInput).toEqual({});
  expect(owner.runtimeClassification).toEqual({});
  expect(owner.runtimeSourceIds).toEqual({});
  expect(JSON.stringify(input)).toBe(before);
});

test("the old public owner API retains the exact shared definition functions", () => {
  const oldApi = require("./automaticConstructionOwnerR1");
  const definitions = require("./automaticConstructionDefinitionR1");
  expect(Object.keys(oldApi).sort()).toEqual([
    "buildAutomaticConstructionOwnerR1", "compileAutomaticConstructionOwnerR1", "unresolvedApplicationNormTruthR1",
  ]);
  expect(oldApi.buildAutomaticConstructionOwnerR1).toBe(definitions.buildAutomaticConstructionOwnerR1);
  expect(oldApi.unresolvedApplicationNormTruthR1).toBe(definitions.unresolvedApplicationNormTruthR1);
  expect(oldApi.buildAutomaticConstructionOwnerR1({...config, ordinary:[left]}))
    .toEqual(definitions.buildAutomaticConstructionOwnerR1({...config, ordinary:[left]}));
});

test("roof definition validation loads with the canonical compiler runtime blocked", () => {
  jest.resetModules();
  jest.doMock("../backendPlatform/canonicalEstimateCompileCore", () => {throw new Error("COMPILER_MUST_STAY_ON_SERVER");});
  try {
    jest.isolateModules(() => {
      expect(() => require("../backendPlatform/canonicalEstimateCompileCore")).toThrow("COMPILER_MUST_STAY_ON_SERVER");
    });
    jest.isolateModules(() => {
      const definitions = require("./automaticConstructionDefinitionR1");
      const roof = require("./sourcePinnedRoofNormOwnerR1");
      const pack = require("../../../../data/estimate-benchmarks/source-packs/roof-valley-torch-two-companion-s27-67.json");
      const model = roof.sourcePinnedRoofNormOwnerR1(pack);
      expect(model.resources).toHaveLength(pack.rates.length);
      expect(model.resources.every((row: {row_sha256:string}) => /^eh_[a-f0-9]{16}$/u.test(row.row_sha256))).toBe(true);
      expect(model.runtimeInput).toEqual({});
      expect(definitions.buildAutomaticConstructionOwnerR1({...config, ordinary:[left]}).resources).toHaveLength(1);
    });
  } finally {
    jest.dontMock("../backendPlatform/canonicalEstimateCompileCore");
    jest.resetModules();
  }
});
