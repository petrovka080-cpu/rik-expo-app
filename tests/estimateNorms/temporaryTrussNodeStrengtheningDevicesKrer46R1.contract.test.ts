import {
  TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_ACCEPTANCE_INPUT,
  TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_ARTIFACT_SHA256,
  TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_CATALOG_IDS,
  TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_FORMULAS,
  TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_PARAMETERS,
  TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_PROFILE_ID,
  TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_RESOURCES,
  TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_SHORT_INPUT,
  TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_SOURCE_METADATA,
  TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_VARIANTS,
  compileTemporaryTrussNodeStrengtheningDevicesKrer46R1,
  resolveTemporaryTrussNodeStrengtheningDevicesKrer46Variant,
  validateTemporaryTrussNodeStrengtheningDevicesKrer46Completeness,
} from "../../src/lib/estimate/v4/temporaryTrussNodeStrengtheningDevicesKrer46R1";

describe("KRER 46-05-004-01 truss-node strengthening devices", () => {
  const expectedShort = [
    "1", "35.64", "0.04", "0.04", "3.48", "0.07", "0.00515", "0.00006",
    "0.00004", "0.00012", "0.49",
  ];
  const expectedAcceptance = [
    "3", "106.92", "0.12", "0.12", "10.44", "0.21", "0.01545", "0.00018",
    "0.00012", "0.00036", "1.47",
  ];

  test("keeps the actual technologies and removes area-only identities", () => {
    expect(TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_CATALOG_IDS).toEqual([
      "canonical-work:master:temporary_truss_node_strengthening_devices_standard",
      "canonical-work:master:temporary_truss_node_strengthening_devices_wet_zone",
    ]);
    expect(TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_VARIANTS).not.toHaveProperty("small_area");
    expect(TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_VARIANTS).not.toHaveProperty("large_area");
  });

  test("binds exact table 46-05-004-01 and its official artifact", () => {
    expect(TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_PROFILE_ID)
      .toBe("KRER_46_05_004_01_TRUSS_NODE_ACCESS_AND_RIGGING_DEVICES");
    expect(TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_SOURCE_METADATA.exact_locator)
      .toContain("46-05-004-01");
    expect(TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_SOURCE_METADATA.artifact_sha256)
      .toBe(TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_ARTIFACT_SHA256);
  });

  test("has the exact three user parameters and eleven formulas/resources", () => {
    expect(TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_PARAMETERS).toHaveLength(3);
    expect(TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_FORMULAS).toHaveLength(11);
    expect(TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_RESOURCES).toHaveLength(11);
    expect(validateTemporaryTrussNodeStrengtheningDevicesKrer46Completeness()).toBe(true);
  });

  test("preserves all exact per-node resource rates", () => {
    expect(TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_RESOURCES.map((row) => [
      row.source_metadata!.krerResourceCode,
      row.source_metadata!.normativeRatePerTrussNode,
    ])).toEqual([
      ["46-05-004-01", 1],
      ["000-1003-0", 35.64],
      ["KRER_AGGREGATE_MACHINIST_LABOR", 0.04],
      ["02-0075", 0.04],
      ["03-0160", 3.48],
      ["40-0001", 0.07],
      ["01-6901-0001", 0.00515],
      ["01-7211-0001", 0.00006],
      ["01-7211-0002", 0.00004],
      ["10-0105-0001", 0.00012],
      ["12-0704-0005", 0.49],
    ]);
    const rowCodes = TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_RESOURCES
      .map((row) => row.source_metadata!.krerResourceCode);
    expect(rowCodes).not.toContain("46-05-002-01");
    expect(rowCodes).not.toContain("46-05-003-01+46-05-003-02");
    expect(rowCodes).not.toContain("46-05-005-01");
  });

  test("computes the exact one-node fixture", async () => {
    const result = await compileTemporaryTrussNodeStrengtheningDevicesKrer46R1(
      { ...TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_SHORT_INPUT },
    );
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.map((row) => row.quantity)).toEqual(expectedShort);
  });

  test("multiplies every official row by three nodes", async () => {
    const result = await compileTemporaryTrussNodeStrengtheningDevicesKrer46R1(
      { ...TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_ACCEPTANCE_INPUT },
    );
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.map((row) => row.quantity)).toEqual(expectedAcceptance);
  });

  test("fails closed when applicability is missing", async () => {
    const result = await compileTemporaryTrussNodeStrengtheningDevicesKrer46R1({
      truss_node_count: 3,
    });
    expect(result.rows).toEqual([]);
    expect(result.preliminaryNeeds).toHaveLength(11);
  });

  test("rejects adjacent element profile or explicit non-confirmation", async () => {
    await expect(compileTemporaryTrussNodeStrengtheningDevicesKrer46R1({
      ...TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_SHORT_INPUT,
      truss_node_strengthening_devices_profile:
        "KRER_46_05_003_FIRST_AND_SUBSEQUENT_TRUSS_LATTICE_ELEMENTS_ACCESS_AND_RIGGING_DEVICES",
    })).rejects.toThrow("PROFILE_UNSUPPORTED");
    await expect(compileTemporaryTrussNodeStrengtheningDevicesKrer46R1({
      ...TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_SHORT_INPUT,
      truss_node_strengthening_devices_confirmed: false,
    })).rejects.toThrow("PROFILE_NOT_CONFIRMED");
  });

  test("rejects zero and fractional node counts", async () => {
    await expect(compileTemporaryTrussNodeStrengtheningDevicesKrer46R1({
      ...TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_SHORT_INPUT,
      truss_node_count: 0,
    })).rejects.toThrow("parameter below minimum truss_node_count");
    await expect(compileTemporaryTrussNodeStrengtheningDevicesKrer46R1({
      ...TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_SHORT_INPUT,
      truss_node_count: 1.5,
    })).rejects.toThrow("invalid integer truss_node_count");
  });

  test("keeps machinist labor informational and machines payable", () => {
    const machinist = TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_RESOURCES[2]!;
    expect(machinist.resource_graph).toMatchObject({
      costTreatment: "INFORMATIONAL_SCOPE",
      payable: false,
    });
    for (const machine of TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_RESOURCES.slice(3, 6)) {
      expect(machine.resource_graph).toMatchObject({ costTreatment: "OWN_COST", payable: true });
      expect(machine.procurement_eligible).toBe(true);
    }
  });

  test("has an independent complete operation map with adjacent tables excluded", () => {
    expect(TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_INDEPENDENT_COMPLETENESS_MAP)
      .toMatchObject({ rateTable: "KRER_46_05_004_01", generatedFromCurrentRows: false });
    expect(TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries)
      .toHaveLength(14);
    expect(TEMPORARY_TRUSS_NODE_STRENGTHENING_DEVICES_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ operationId: "strengthening_devices_removal" }),
        expect.objectContaining({ operationId: "length_based_truss_strengthening_devices" }),
        expect.objectContaining({ operationId: "individual_truss_lattice_element_devices" }),
      ]));
  });

  test("resolves all variants and rejects an unsupported key", () => {
    for (const key of ["standard", "wet_zone"] as const) {
      expect(resolveTemporaryTrussNodeStrengtheningDevicesKrer46Variant(key).catalogId)
        .toContain(`_${key}`);
    }
    for (const key of ["large_area", "small_area", "bad"] as const) {
      expect(() => resolveTemporaryTrussNodeStrengtheningDevicesKrer46Variant(key as never))
        .toThrow("VARIANT_UNSUPPORTED");
    }
  });
});
