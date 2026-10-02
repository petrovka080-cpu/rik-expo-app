import {
  TEMPORARY_TRUSS_CHORD_STRENGTHENING_DEVICES_KRER46_ACCEPTANCE_INPUT,
  TEMPORARY_TRUSS_CHORD_STRENGTHENING_DEVICES_KRER46_ARTIFACT_SHA256,
  TEMPORARY_TRUSS_CHORD_STRENGTHENING_DEVICES_KRER46_CATALOG_IDS,
  TEMPORARY_TRUSS_CHORD_STRENGTHENING_DEVICES_KRER46_FORMULAS,
  TEMPORARY_TRUSS_CHORD_STRENGTHENING_DEVICES_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  TEMPORARY_TRUSS_CHORD_STRENGTHENING_DEVICES_KRER46_PARAMETERS,
  TEMPORARY_TRUSS_CHORD_STRENGTHENING_DEVICES_KRER46_PROFILE_ID,
  TEMPORARY_TRUSS_CHORD_STRENGTHENING_DEVICES_KRER46_RESOURCES,
  TEMPORARY_TRUSS_CHORD_STRENGTHENING_DEVICES_KRER46_SHORT_INPUT,
  TEMPORARY_TRUSS_CHORD_STRENGTHENING_DEVICES_KRER46_SOURCE_METADATA,
  TEMPORARY_TRUSS_CHORD_STRENGTHENING_DEVICES_KRER46_VARIANTS,
  compileTemporaryTrussChordStrengtheningDevicesKrer46R1,
  resolveTemporaryTrussChordStrengtheningDevicesKrer46Variant,
  validateTemporaryTrussChordStrengtheningDevicesKrer46Completeness,
} from "../../src/lib/estimate/v4/temporaryTrussChordStrengtheningDevicesKrer46R1";

describe("KRER 46-05-002-01 devices for strengthening truss chords", () => {
  const expectedShort = [
    "1", "6.34", "0.01", "0.01", "0.58", "0.02", "0.00136", "0.00001",
    "0.00006", "0.00018", "0.25",
  ];
  const expectedAcceptance = [
    "35.5", "225.07", "0.355", "0.355", "20.59", "0.71", "0.04828",
    "0.000355", "0.00213", "0.00639", "8.875",
  ];

  test("owns four distinct appended identities", () => {
    expect(TEMPORARY_TRUSS_CHORD_STRENGTHENING_DEVICES_KRER46_CATALOG_IDS).toHaveLength(4);
    expect(new Set(TEMPORARY_TRUSS_CHORD_STRENGTHENING_DEVICES_KRER46_CATALOG_IDS).size).toBe(4);
    expect(TEMPORARY_TRUSS_CHORD_STRENGTHENING_DEVICES_KRER46_CATALOG_IDS)
      .toEqual(Object.values(TEMPORARY_TRUSS_CHORD_STRENGTHENING_DEVICES_KRER46_VARIANTS)
        .map((variant) => variant.catalogId));
  });

  test("binds only exact official rate column 46-05-002-01", () => {
    expect(TEMPORARY_TRUSS_CHORD_STRENGTHENING_DEVICES_KRER46_PROFILE_ID)
      .toBe("KRER_46_05_002_01_TRUSS_CHORD_STRENGTHENING_ACCESS_AND_RIGGING_DEVICES");
    expect(TEMPORARY_TRUSS_CHORD_STRENGTHENING_DEVICES_KRER46_SOURCE_METADATA.exact_locator)
      .toContain("46-05-002-01");
    expect(TEMPORARY_TRUSS_CHORD_STRENGTHENING_DEVICES_KRER46_SOURCE_METADATA.artifact_sha256)
      .toBe(TEMPORARY_TRUSS_CHORD_STRENGTHENING_DEVICES_KRER46_ARTIFACT_SHA256);
  });

  test("has the exact three user parameters and eleven formulas/resources", () => {
    expect(TEMPORARY_TRUSS_CHORD_STRENGTHENING_DEVICES_KRER46_PARAMETERS).toHaveLength(3);
    expect(TEMPORARY_TRUSS_CHORD_STRENGTHENING_DEVICES_KRER46_FORMULAS).toHaveLength(11);
    expect(TEMPORARY_TRUSS_CHORD_STRENGTHENING_DEVICES_KRER46_RESOURCES).toHaveLength(11);
    expect(validateTemporaryTrussChordStrengtheningDevicesKrer46Completeness()).toBe(true);
  });

  test("preserves all exact per-metre codes and rates for column 01", () => {
    expect(TEMPORARY_TRUSS_CHORD_STRENGTHENING_DEVICES_KRER46_RESOURCES.map((row) => [
      row.source_metadata!.krerResourceCode,
      row.source_metadata!.normativeRatePerM,
    ])).toEqual([
      ["46-05-002-01", 1],
      ["000-1002-9", 6.34],
      ["KRER_AGGREGATE_MACHINIST_LABOR", 0.01],
      ["02-0075", 0.01],
      ["03-0160", 0.58],
      ["40-0001", 0.02],
      ["01-6901-0001", 0.00136],
      ["01-7211-0001", 0.00001],
      ["01-7211-0002", 0.00006],
      ["10-0105-0001", 0.00018],
      ["12-0704-0005", 0.25],
    ]);
    const rowCodes = TEMPORARY_TRUSS_CHORD_STRENGTHENING_DEVICES_KRER46_RESOURCES
      .map((row) => row.source_metadata!.krerResourceCode);
    expect(rowCodes).not.toContain("46-05-002-02");
    expect(rowCodes).not.toContain("000-1002-2");
    expect(rowCodes).not.toContain("01-7413-0001");
  });

  test("computes the exact one-metre fixture", async () => {
    const result = await compileTemporaryTrussChordStrengtheningDevicesKrer46R1(
      { ...TEMPORARY_TRUSS_CHORD_STRENGTHENING_DEVICES_KRER46_SHORT_INPUT },
    );
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.map((row) => row.quantity)).toEqual(expectedShort);
  });

  test("computes the exact 35.5-metre acceptance fixture", async () => {
    const result = await compileTemporaryTrussChordStrengtheningDevicesKrer46R1(
      { ...TEMPORARY_TRUSS_CHORD_STRENGTHENING_DEVICES_KRER46_ACCEPTANCE_INPUT },
    );
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.map((row) => row.quantity)).toEqual(expectedAcceptance);
  });

  test("fails closed when applicability is missing", async () => {
    const result = await compileTemporaryTrussChordStrengtheningDevicesKrer46R1({
      truss_length_m: 100,
    });
    expect(result.rows).toEqual([]);
    expect(result.preliminaryNeeds).toHaveLength(11);
  });

  test("rejects the adjacent lattice profile or explicit non-confirmation", async () => {
    await expect(compileTemporaryTrussChordStrengtheningDevicesKrer46R1({
      ...TEMPORARY_TRUSS_CHORD_STRENGTHENING_DEVICES_KRER46_SHORT_INPUT,
      truss_strengthening_devices_profile:
        "KRER_46_05_002_02_TRUSS_LATTICE_STRENGTHENING_ACCESS_AND_RIGGING_DEVICES",
    })).rejects.toThrow("PROFILE_UNSUPPORTED");
    await expect(compileTemporaryTrussChordStrengtheningDevicesKrer46R1({
      ...TEMPORARY_TRUSS_CHORD_STRENGTHENING_DEVICES_KRER46_SHORT_INPUT,
      truss_chord_strengthening_devices_confirmed: false,
    })).rejects.toThrow("PROFILE_NOT_CONFIRMED");
  });

  test("keeps machinist labor informational and machines payable", () => {
    const machinist = TEMPORARY_TRUSS_CHORD_STRENGTHENING_DEVICES_KRER46_RESOURCES[2]!;
    expect(machinist.resource_graph).toMatchObject({
      costTreatment: "INFORMATIONAL_SCOPE",
      payable: false,
    });
    for (const machine of TEMPORARY_TRUSS_CHORD_STRENGTHENING_DEVICES_KRER46_RESOURCES.slice(3, 6)) {
      expect(machine.resource_graph).toMatchObject({ costTreatment: "OWN_COST", payable: true });
      expect(machine.procurement_eligible).toBe(true);
    }
  });

  test("has an independently authored complete operation map", () => {
    expect(TEMPORARY_TRUSS_CHORD_STRENGTHENING_DEVICES_KRER46_INDEPENDENT_COMPLETENESS_MAP)
      .toMatchObject({
        rateTable: "KRER_46_05_002_01",
        generatedFromCurrentRows: false,
      });
    expect(TEMPORARY_TRUSS_CHORD_STRENGTHENING_DEVICES_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries)
      .toHaveLength(13);
    expect(TEMPORARY_TRUSS_CHORD_STRENGTHENING_DEVICES_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ operationId: "strengthening_devices_removal" }),
        expect.objectContaining({ operationId: "truss_lattice_strengthening_devices" }),
      ]));
  });

  test("resolves all variants and rejects an unsupported key", () => {
    for (const key of ["standard", "large_area", "small_area", "wet_zone"] as const) {
      expect(resolveTemporaryTrussChordStrengtheningDevicesKrer46Variant(key).catalogId)
        .toContain(`_${key}`);
    }
    expect(() => resolveTemporaryTrussChordStrengtheningDevicesKrer46Variant("bad" as never))
      .toThrow("VARIANT_UNSUPPORTED");
  });
});
