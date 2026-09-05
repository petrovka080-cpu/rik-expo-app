import {
  R4_A6_GROUP50_SCENARIO_KINDS,
  assertR4A6Group50CaseSet,
  buildR4A6Group50Case,
  type R4A6Group50Parameter,
} from "./group50ScenarioContract";

const parameters: R4A6Group50Parameter[] = [
  {
    parameter_id: "area_m2",
    value_type: "decimal",
    required: true,
    default_value: null,
    constraints_json: { min: 0.001, max: 1_000_000 },
  },
  {
    parameter_id: "delivery_required",
    value_type: "boolean",
    required: false,
    default_value: null,
    constraints_json: {},
  },
  {
    parameter_id: "quality_level",
    value_type: "enum",
    required: false,
    default_value: null,
    constraints_json: { values: ["standard", "enhanced"] },
  },
  {
    parameter_id: "delivery_distance_km",
    value_type: "decimal",
    required: false,
    default_value: null,
    constraints_json: {
      min: 1,
      max: 10_000,
      requiredWhen: { parameterId: "delivery_required", equals: true },
    },
  },
];

describe("R4-A6 Group50 scenario contract", () => {
  it("defines exactly fifty distinct required scenario kinds", () => {
    expect(R4_A6_GROUP50_SCENARIO_KINDS).toHaveLength(50);
    expect(new Set(R4_A6_GROUP50_SCENARIO_KINDS)).toHaveProperty("size", 50);
    expect(R4_A6_GROUP50_SCENARIO_KINDS).toEqual(expect.arrayContaining([
      "nominal_p0",
      "invalid_p0",
      "missing_p0",
      "professional_pdf_projection",
      "procurement_projection",
      "history_projection",
      "restart_edit",
      "duplicate_double_count_detection",
    ]));
  });

  it("builds fifty unique canonical input fingerprints for one-member groups", () => {
    const cases = R4_A6_GROUP50_SCENARIO_KINDS.map((_kind, caseOrdinal) =>
      buildR4A6Group50Case({
        groupId: "group-1",
        caseOrdinal,
        catalogId: "work-1",
        definitionVersionId: "definition-1",
        parameters,
        baseline: {
          area_m2: 100,
          delivery_required: false,
          quality_level: "standard",
        },
      }));
    expect(() => assertR4A6Group50CaseSet(cases)).not.toThrow();
    expect(cases.find((item) => item.scenarioKind === "invalid_p0")).toMatchObject({
      expectedOutcome: "PARAMETER_VALIDATION_FAILED",
    });
    expect(cases.find((item) => item.scenarioKind === "missing_p0")).toMatchObject({
      expectedOutcome: "PARAMETER_VALIDATION_FAILED",
      missingParameterId: "area_m2",
    });
    expect(cases.find((item) => item.scenarioKind === "inclusion_branch_on")?.parameterPatch)
      .toMatchObject({ delivery_required: true, delivery_distance_km: 1 });
  });

  it("fails closed on a duplicate fingerprint", () => {
    const cases = R4_A6_GROUP50_SCENARIO_KINDS.map((_kind, caseOrdinal) =>
      buildR4A6Group50Case({
        groupId: "group-1",
        caseOrdinal,
        catalogId: "work-1",
        definitionVersionId: "definition-1",
        parameters,
        baseline: { area_m2: 100 },
      }));
    cases[49] = { ...cases[49]!, inputFingerprint: cases[0]!.inputFingerprint };
    expect(() => assertR4A6Group50CaseSet(cases)).toThrow(
      "STOP_GROUP50_DUPLICATE_INPUT_FINGERPRINT",
    );
  });

  it("resolves a missing submitted P0 from its accepted baseline default", () => {
    const item = buildR4A6Group50Case({
      groupId: "group-default",
      caseOrdinal: R4_A6_GROUP50_SCENARIO_KINDS.indexOf("missing_p0"),
      catalogId: "work-default",
      definitionVersionId: "definition-default",
      parameters: [{
        parameter_id: "area_m2",
        value_type: "decimal",
        required: true,
        default_value: 100,
        constraints_json: { min: 0.001, max: 1_000_000 },
      }],
      baseline: { area_m2: 100 },
    });
    expect(item).toMatchObject({
      scenarioKind: "missing_p0",
      missingParameterId: "area_m2",
      expectedOutcome: "GREEN",
    });
    expect(item.parameterPatch).not.toHaveProperty("area_m2");
  });
});
