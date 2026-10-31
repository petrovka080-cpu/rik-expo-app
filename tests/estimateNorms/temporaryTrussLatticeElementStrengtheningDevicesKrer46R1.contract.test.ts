import {
  TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_ACCEPTANCE_INPUT,
  TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_ARTIFACT_SHA256,
  TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_CATALOG_IDS,
  TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_FORMULAS,
  TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_PARAMETERS,
  TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_PROFILE_ID,
  TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_RESOURCES,
  TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_SHORT_INPUT,
  TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_SOURCE_METADATA,
  TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_VARIANTS,
  compileTemporaryTrussLatticeElementStrengtheningDevicesKrer46R1,
  resolveTemporaryTrussLatticeElementStrengtheningDevicesKrer46Variant,
  validateTemporaryTrussLatticeElementStrengtheningDevicesKrer46Completeness,
} from "../../src/lib/estimate/v4/temporaryTrussLatticeElementStrengtheningDevicesKrer46R1";

describe("KRER 46-05-003 first and subsequent truss-lattice element devices", () => {
  const expectedShort = [
    "1", "31.72", "0.15", "0.15", "3.48", "0.23", "0.0109", "0.0001",
    "0.00006", "0.00019", "1.32",
  ];
  const expectedAcceptance = [
    "3", "73.58", "0.37", "0.37", "9.04", "0.55", "0.02852", "0.0003",
    "0.00018", "0.00057", "3.46",
  ];

  test("keeps the actual technologies and removes area-only identities", () => {
    expect(TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_CATALOG_IDS).toEqual([
      "canonical-work:master:temporary_truss_lattice_element_strengthening_devices_standard",
      "canonical-work:master:temporary_truss_lattice_element_strengthening_devices_wet_zone",
    ]);
    expect(TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_VARIANTS).not.toHaveProperty("small_area");
    expect(TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_VARIANTS).not.toHaveProperty("large_area");
  });

  test("binds the first and subsequent columns of exact table 46-05-003", () => {
    expect(TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_PROFILE_ID)
      .toBe("KRER_46_05_003_FIRST_AND_SUBSEQUENT_TRUSS_LATTICE_ELEMENTS_ACCESS_AND_RIGGING_DEVICES");
    expect(TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_SOURCE_METADATA.exact_locator)
      .toContain("46-05-003-01");
    expect(TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_SOURCE_METADATA.exact_locator)
      .toContain("46-05-003-02");
    expect(TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_SOURCE_METADATA.artifact_sha256)
      .toBe(TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_ARTIFACT_SHA256);
  });

  test("has the exact three user parameters and eleven formulas/resources", () => {
    expect(TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_PARAMETERS).toHaveLength(3);
    expect(TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_FORMULAS).toHaveLength(11);
    expect(TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_RESOURCES).toHaveLength(11);
    expect(validateTemporaryTrussLatticeElementStrengtheningDevicesKrer46Completeness()).toBe(true);
  });

  test("preserves exact first-element and subsequent-element resource rates", () => {
    expect(TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_RESOURCES.map((row) => [
      row.source_metadata!.krerResourceCode,
      row.source_metadata!.normativeFirstElementRate,
      row.source_metadata!.normativeSubsequentElementRate,
    ])).toEqual([
      ["46-05-003-01+46-05-003-02", 1, 1],
      ["000-1003-1", 31.72, 20.93],
      ["KRER_AGGREGATE_MACHINIST_LABOR", 0.15, 0.11],
      ["02-0075", 0.15, 0.11],
      ["03-0160", 3.48, 2.78],
      ["40-0001", 0.23, 0.16],
      ["01-6901-0001", 0.0109, 0.00881],
      ["01-7211-0001", 0.0001, 0.0001],
      ["01-7211-0002", 0.00006, 0.00006],
      ["10-0105-0001", 0.00019, 0.00019],
      ["12-0704-0005", 1.32, 1.07],
    ]);
    const rowCodes = TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_RESOURCES
      .map((row) => row.source_metadata!.krerResourceCode);
    expect(rowCodes).not.toContain("46-05-002-02");
    expect(rowCodes).not.toContain("46-05-004-01");
  });

  test("computes the exact first-element fixture", async () => {
    const result = await compileTemporaryTrussLatticeElementStrengtheningDevicesKrer46R1(
      { ...TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_SHORT_INPUT },
    );
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.map((row) => row.quantity)).toEqual(expectedShort);
  });

  test("applies column 01 once and column 02 to two subsequent elements", async () => {
    const result = await compileTemporaryTrussLatticeElementStrengtheningDevicesKrer46R1(
      { ...TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_ACCEPTANCE_INPUT },
    );
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.map((row) => row.quantity)).toEqual(expectedAcceptance);
  });

  test("fails closed when applicability is missing", async () => {
    const result = await compileTemporaryTrussLatticeElementStrengtheningDevicesKrer46R1({
      truss_lattice_element_count: 3,
    });
    expect(result.rows).toEqual([]);
    expect(result.preliminaryNeeds).toHaveLength(11);
  });

  test("rejects the length-based adjacent profile or explicit non-confirmation", async () => {
    await expect(compileTemporaryTrussLatticeElementStrengtheningDevicesKrer46R1({
      ...TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_SHORT_INPUT,
      truss_lattice_element_strengthening_devices_profile:
        "KRER_46_05_002_02_TRUSS_LATTICE_STRENGTHENING_ACCESS_AND_RIGGING_DEVICES",
    })).rejects.toThrow("PROFILE_UNSUPPORTED");
    await expect(compileTemporaryTrussLatticeElementStrengtheningDevicesKrer46R1({
      ...TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_SHORT_INPUT,
      truss_lattice_element_strengthening_devices_confirmed: false,
    })).rejects.toThrow("PROFILE_NOT_CONFIRMED");
  });

  test("rejects zero and fractional element counts", async () => {
    await expect(compileTemporaryTrussLatticeElementStrengtheningDevicesKrer46R1({
      ...TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_SHORT_INPUT,
      truss_lattice_element_count: 0,
    })).rejects.toThrow("parameter below minimum truss_lattice_element_count");
    await expect(compileTemporaryTrussLatticeElementStrengtheningDevicesKrer46R1({
      ...TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_SHORT_INPUT,
      truss_lattice_element_count: 1.5,
    })).rejects.toThrow("invalid integer truss_lattice_element_count");
  });

  test("keeps machinist labor informational and machines payable", () => {
    const machinist = TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_RESOURCES[2]!;
    expect(machinist.resource_graph).toMatchObject({
      costTreatment: "INFORMATIONAL_SCOPE",
      payable: false,
    });
    for (const machine of TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_RESOURCES.slice(3, 6)) {
      expect(machine.resource_graph).toMatchObject({ costTreatment: "OWN_COST", payable: true });
      expect(machine.procurement_eligible).toBe(true);
    }
  });

  test("has an independently authored complete operation map", () => {
    expect(TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_INDEPENDENT_COMPLETENESS_MAP)
      .toMatchObject({
        rateTable: "KRER_46_05_003_01_AND_02",
        generatedFromCurrentRows: false,
      });
    expect(TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries)
      .toHaveLength(14);
    expect(TEMPORARY_TRUSS_LATTICE_ELEMENT_STRENGTHENING_DEVICES_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ operationId: "strengthening_devices_removal" }),
        expect.objectContaining({ operationId: "first_and_subsequent_truss_lattice_element_rate_application" }),
        expect.objectContaining({ operationId: "length_based_truss_strengthening_devices" }),
      ]));
  });

  test("resolves all variants and rejects an unsupported key", () => {
    for (const key of ["standard", "wet_zone"] as const) {
      expect(resolveTemporaryTrussLatticeElementStrengtheningDevicesKrer46Variant(key).catalogId)
        .toContain(`_${key}`);
    }
    for (const key of ["large_area", "small_area", "bad"] as const) {
      expect(() => resolveTemporaryTrussLatticeElementStrengtheningDevicesKrer46Variant(key as never))
        .toThrow("VARIANT_UNSUPPORTED");
    }
  });
});
