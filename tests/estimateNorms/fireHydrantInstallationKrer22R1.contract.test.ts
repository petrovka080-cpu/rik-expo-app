import {
  FIRE_HYDRANT_INSTALLATION_KRER22_ACCEPTANCE_INPUT,
  FIRE_HYDRANT_INSTALLATION_KRER22_ARTIFACT_SHA256,
  FIRE_HYDRANT_INSTALLATION_KRER22_CATALOG_ID,
  FIRE_HYDRANT_INSTALLATION_KRER22_FORMULAS,
  FIRE_HYDRANT_INSTALLATION_KRER22_INDEPENDENT_COMPLETENESS_MAP,
  FIRE_HYDRANT_INSTALLATION_KRER22_PARAMETERS,
  FIRE_HYDRANT_INSTALLATION_KRER22_RESOURCES,
  FIRE_HYDRANT_INSTALLATION_KRER22_SOURCE_METADATA,
  compileFireHydrantInstallationKrer22R1,
  validateFireHydrantInstallationKrer22Completeness,
} from "../../src/lib/estimate/v4/fireHydrantInstallationKrer22R1";

describe("S27.3 F09 exact KRER 22 fire-hydrant installation owner", () => {
  test("binds the exact official rate and artifact, not a generic water profile", () => {
    expect(FIRE_HYDRANT_INSTALLATION_KRER22_CATALOG_ID)
      .toBe("canonical-work:expanded:fire_hydrants");
    expect(FIRE_HYDRANT_INSTALLATION_KRER22_PARAMETERS).toHaveLength(1);
    expect(FIRE_HYDRANT_INSTALLATION_KRER22_FORMULAS).toHaveLength(7);
    expect(FIRE_HYDRANT_INSTALLATION_KRER22_RESOURCES).toHaveLength(8);
    expect(FIRE_HYDRANT_INSTALLATION_KRER22_SOURCE_METADATA).toMatchObject({
      official_url: "https://minstroy.gov.kg/ru/kyzmat/438/show",
      artifact_sha256: FIRE_HYDRANT_INSTALLATION_KRER22_ARTIFACT_SHA256,
      source_kind: "OFFICIAL_KG_UNIT_RATE",
    });
    expect(FIRE_HYDRANT_INSTALLATION_KRER22_SOURCE_METADATA.exact_locator)
      .toMatch(/22-03-011-03.*109–110/u);
  });

  test("ten hydrants compile all and only eight exact KRER rows", async () => {
    const compiled = await compileFireHydrantInstallationKrer22R1({
      ...FIRE_HYDRANT_INSTALLATION_KRER22_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows.map((row) => ({ rowId: row.row_id, quantity: row.quantity })))
      .toEqual([
        { rowId: "f09:fire_hydrant_installation_operation", quantity: "10" },
        { rowId: "f09:fire_hydrant_installation_labor", quantity: "19.8" },
        { rowId: "f09:fire_hydrant_machinist_labor_aggregate", quantity: "0.2" },
        { rowId: "f09:fire_hydrant_truck_crane_10t", quantity: "0.2" },
        { rowId: "f09:fire_hydrant_onboard_truck_5t", quantity: "0.3" },
        { rowId: "f09:fire_hydrant_bolts_d16", quantity: "0.038" },
        { rowId: "f09:fire_hydrant_pressed_rubber_gasket", quantity: "0.6" },
        { rowId: "f09:fire_hydrant_dn125_product", quantity: "10" },
      ]);
  });

  test("keeps operation and aggregate machinist labor out of duplicate pricing", () => {
    const operation = FIRE_HYDRANT_INSTALLATION_KRER22_RESOURCES.find((row) =>
      row.row_id === "f09:fire_hydrant_installation_operation");
    const machinists = FIRE_HYDRANT_INSTALLATION_KRER22_RESOURCES.find((row) =>
      row.row_id === "f09:fire_hydrant_machinist_labor_aggregate");
    expect(operation?.resource_graph).toMatchObject({
      costTreatment: "INCLUDED_IN_RESOURCE_ROWS",
      payable: false,
      parentCostOwnerId: "f09:fire_hydrant_installation_labor",
    });
    expect(machinists?.resource_graph).toMatchObject({
      costTreatment: "INFORMATIONAL_SCOPE",
      payable: false,
    });
  });

  test("independent completeness map detects a removed required resource", () => {
    expect(FIRE_HYDRANT_INSTALLATION_KRER22_INDEPENDENT_COMPLETENESS_MAP)
      .toMatchObject({ generatedFromCurrentRows: false, rateTable: "KRER_22_03_011_03" });
    expect(FIRE_HYDRANT_INSTALLATION_KRER22_INDEPENDENT_COMPLETENESS_MAP.entries)
      .toHaveLength(8);
    expect(validateFireHydrantInstallationKrer22Completeness()).toBe(true);
    expect(() => validateFireHydrantInstallationKrer22Completeness(
      FIRE_HYDRANT_INSTALLATION_KRER22_RESOURCES.slice(0, -1),
    )).toThrow("FIRE_HYDRANT_INSTALLATION_KRER22_COMPLETENESS_COUNT_MISMATCH");
  });

  test("rejects zero quantity and unrelated catalog identity", async () => {
    await expect(compileFireHydrantInstallationKrer22R1({ hydrant_count: 0 }))
      .rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileFireHydrantInstallationKrer22R1(
      { ...FIRE_HYDRANT_INSTALLATION_KRER22_ACCEPTANCE_INPUT },
      { catalogId: "canonical-work:expanded:fire_hose_cabinet" },
    )).rejects.toThrow("FIRE_HYDRANT_INSTALLATION_KRER22_CATALOG_UNSUPPORTED");
  });

  test("does not silently add adjacent network or internal fire-protection scope", () => {
    const rows = JSON.stringify(FIRE_HYDRANT_INSTALLATION_KRER22_RESOURCES.map((row) => ({
      rowId: row.row_id,
      titleRu: row.title_ru,
      formulaId: row.formula_id,
    })));
    expect(rows).not.toMatch(
      /excavat|backfill|road_restor|pressure_test|well_construction|fire_hose_cabinet|sprinkler|pump_station|землян|обратн.*засып|испытан.*сет/iu,
    );
  });
});
