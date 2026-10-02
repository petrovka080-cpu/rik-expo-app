import {
  CAR_PARK_SMOKE_EXHAUST_ACCEPTANCE_INPUT,
  CAR_PARK_SMOKE_EXHAUST_CATALOG_ID,
  CAR_PARK_SMOKE_EXHAUST_FORMULAS,
  CAR_PARK_SMOKE_EXHAUST_INDEPENDENT_COMPLETENESS_MAP,
  CAR_PARK_SMOKE_EXHAUST_PARAMETERS,
  CAR_PARK_SMOKE_EXHAUST_RESOURCES,
  CAR_PARK_SMOKE_EXHAUST_SHORT_INPUT,
  CAR_PARK_SMOKE_EXHAUST_SOURCE_METADATA,
  compileCarParkSmokeExhaustSystemR1,
} from "../../src/lib/estimate/v4/carParkSmokeExhaustSystemR1";

describe("S27.3 F09 enclosed-car-park smoke-exhaust system owner", () => {
  test("replaces the cross-system generic composition with an exact official boundary", () => {
    expect(CAR_PARK_SMOKE_EXHAUST_CATALOG_ID)
      .toBe("canonical-work:expanded:smoke_exhaust_system");
    expect(CAR_PARK_SMOKE_EXHAUST_PARAMETERS).toHaveLength(25);
    expect(CAR_PARK_SMOKE_EXHAUST_FORMULAS).toHaveLength(17);
    expect(CAR_PARK_SMOKE_EXHAUST_RESOURCES).toHaveLength(25);
    expect(CAR_PARK_SMOKE_EXHAUST_INDEPENDENT_COMPLETENESS_MAP.entries)
      .toHaveLength(25);
    expect(CAR_PARK_SMOKE_EXHAUST_SOURCE_METADATA).toMatchObject({
      official_url: "https://minstroy.gov.kg/ru/document/186/show",
      artifact_sha256: "23a857ff2c7311b8a98bce5681696576e10b4d67b713594a02632fa5d39e32e7",
      effective_from: "2025-09-11",
      source_kind: "OFFICIAL_NORMATIVE_TECHNICAL_BOUNDARY",
    });
  });

  test("known parking area emits only design-basis review and local project needs", async () => {
    const compiled = await compileCarParkSmokeExhaustSystemR1({
      ...CAR_PARK_SMOKE_EXHAUST_SHORT_INPUT,
    });
    expect(compiled.rows).toEqual([
      expect.objectContaining({
        row_id: "f09:smoke_control_design_basis_review",
        quantity: "4870",
        unit_id: "m2",
      }),
    ]);
    expect(compiled.preliminaryNeeds).toHaveLength(24);
    expect(compiled.preliminaryNeeds.map((need) => need.row_id))
      .toEqual(expect.arrayContaining([
        "f09:smoke_exhaust_fan",
        "f09:smoke_control_jet_fan",
        "f09:smoke_control_duct",
        "f09:smoke_control_installation_commissioning_labor",
        "f09:smoke_control_integrated_scenario_test",
      ]));
  });

  test("full project fixture emits the complete system without double-counting components", async () => {
    const compiled = await compileCarParkSmokeExhaustSystemR1({
      ...CAR_PARK_SMOKE_EXHAUST_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(25);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: "f09:smoke_exhaust_fan", quantity: "2" }),
      expect.objectContaining({ row_id: "f09:smoke_control_jet_fan", quantity: "12" }),
      expect.objectContaining({ row_id: "f09:smoke_control_duct", quantity: "1200" }),
      expect.objectContaining({ row_id: "f09:smoke_control_installation_commissioning_labor", quantity: "1600" }),
      expect.objectContaining({ row_id: "f09:smoke_control_integrated_scenario_test", quantity: "6" }),
    ]));
    const includedComponents = CAR_PARK_SMOKE_EXHAUST_RESOURCES.filter((row) =>
      row.resource_graph.costTreatment === "INCLUDED_IN_RESOURCE_ROWS");
    expect(includedComponents).toHaveLength(12);
    expect(includedComponents.every((row) =>
      row.resource_graph.parentCostOwnerId
        === "f09:smoke_control_installation_commissioning_labor")).toBe(true);
  });

  test("contains no heating, boiler or radiator substitution and no hidden rate", () => {
    const actualRows = JSON.stringify(CAR_PARK_SMOKE_EXHAUST_RESOURCES.map((row) => ({
      rowId: row.row_id,
      titleRu: row.title_ru,
      formulaId: row.formula_id,
    })));
    expect(actualRows).not.toMatch(/отоплен|радиатор|кот[её]л|heating|boiler|radiator/iu);
    expect(CAR_PARK_SMOKE_EXHAUST_FORMULAS)
      .not.toEqual(expect.arrayContaining([
        expect.objectContaining({ expression_source: expect.stringMatching(/[*/]|normFactor/iu) }),
      ]));
  });

  test("rejects invalid project quantities and unrelated identities", async () => {
    await expect(compileCarParkSmokeExhaustSystemR1({
      ...CAR_PARK_SMOKE_EXHAUST_ACCEPTANCE_INPUT,
      jet_fan_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileCarParkSmokeExhaustSystemR1(
      { ...CAR_PARK_SMOKE_EXHAUST_ACCEPTANCE_INPUT },
      { catalogId: `${CAR_PARK_SMOKE_EXHAUST_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("CAR_PARK_SMOKE_EXHAUST_CATALOG_UNSUPPORTED");
  });
});
