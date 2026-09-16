import { compileCanonicalEstimateCore } from "../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore";
import {
  MASONRY_BRICK_WALL_BIA_TN10_EXACT_INPUT,
  MASONRY_BRICK_WALL_BIA_TN10_FORMULAS,
  MASONRY_BRICK_WALL_BIA_TN10_PARAMETERS,
  MASONRY_BRICK_WALL_BIA_TN10_RESOURCES,
} from "../../src/lib/estimate/v4/masonryBrickWallBiaTn10R1";

function compileDbDriven(parameters: Record<string, unknown>) {
  return compileCanonicalEstimateCore({
    operation: "compile",
    compilerVersion: "canonical-estimate-compiler.db-driven-contract-test.r1",
    catalogId: "masonry_brick_wall_bia_tn10_db_driven_test",
    primaryMeasureParameterId: "measured_net_brick_wall_area_m2",
    parameterDefinitions: [...MASONRY_BRICK_WALL_BIA_TN10_PARAMETERS],
    formulaDefinitions: [...MASONRY_BRICK_WALL_BIA_TN10_FORMULAS],
    resourceDefinitions: [...MASONRY_BRICK_WALL_BIA_TN10_RESOURCES],
    submittedParameters: parameters,
    confirmedParameters: {},
    currencyCode: "KGS",
    priceItems: [],
    maximumResourceRows: 40,
    hashJson: async (value) => JSON.stringify(value),
  });
}

describe("DB-driven BIA TN 10 conditional quantity policy", () => {
  it("compiles the complete applicable scope through the shared canonical core", async () => {
    const result = await compileDbDriven({ ...MASONRY_BRICK_WALL_BIA_TN10_EXACT_INPUT });

    expect(result.rows).toHaveLength(18);
    expect(result.rows.map((row) => row.category)).toEqual(expect.arrayContaining([
      "material",
      "construction_work",
      "equipment",
      "service",
      "delivery",
    ]));
  });

  it.each([
    [
      "an applicable connector row with zero quantity",
      { wall_connectors_applicable: true, wall_connector_quantity_piece: 0 },
      "MASONRY_FULL_SCOPE_APPLICABLE_QUANTITY_REQUIRED:wall_connector_quantity_piece",
    ],
    [
      "a non-applicable DPC row retaining quantity",
      { dpc_applicable: false, dpc_area_m2: 1 },
      "MASONRY_FULL_SCOPE_NOT_APPLICABLE_QUANTITY_CONFLICT:dpc_area_m2",
    ],
    [
      "wall dimensions inconsistent with the stated gross area",
      { wall_layout_length_m: 41 },
      "MASONRY_FULL_SCOPE_GROSS_GEOMETRY_CONFLICT",
    ],
  ])("rejects %s", async (_label, changedParameters, expectedCode) => {
    await expect(compileDbDriven({
      ...MASONRY_BRICK_WALL_BIA_TN10_EXACT_INPUT,
      ...changedParameters,
    })).rejects.toMatchObject({ code: expectedCode });
  });

  it("fails closed when the policy is detached from the resource inclusion graph", async () => {
    const resources = MASONRY_BRICK_WALL_BIA_TN10_RESOURCES.map((resource) =>
      resource.row_id === "material:bia-tn10:wall-connectors"
        ? { ...resource, inclusion_ast: { kind: "literal", value: true } }
        : resource);

    await expect(compileCanonicalEstimateCore({
      operation: "compile",
      compilerVersion: "canonical-estimate-compiler.db-driven-contract-test.r1",
      catalogId: "masonry_brick_wall_bia_tn10_invalid_policy_test",
      primaryMeasureParameterId: "measured_net_brick_wall_area_m2",
      parameterDefinitions: [...MASONRY_BRICK_WALL_BIA_TN10_PARAMETERS],
      formulaDefinitions: [...MASONRY_BRICK_WALL_BIA_TN10_FORMULAS],
      resourceDefinitions: resources,
      submittedParameters: { ...MASONRY_BRICK_WALL_BIA_TN10_EXACT_INPUT },
      confirmedParameters: {},
      currencyCode: "KGS",
      priceItems: [],
      maximumResourceRows: 40,
      hashJson: async (value) => JSON.stringify(value),
    })).rejects.toMatchObject({ code: "DEFINITION_INTEGRITY_FAILED" });
  });
});
