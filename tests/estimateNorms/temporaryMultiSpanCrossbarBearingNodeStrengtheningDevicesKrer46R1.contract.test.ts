import {
  TEMPORARY_MULTI_SPAN_CROSSBAR_BEARING_NODE_STRENGTHENING_DEVICES_KRER46_ACCEPTANCE_INPUT,
  TEMPORARY_MULTI_SPAN_CROSSBAR_BEARING_NODE_STRENGTHENING_DEVICES_KRER46_ARTIFACT_SHA256,
  TEMPORARY_MULTI_SPAN_CROSSBAR_BEARING_NODE_STRENGTHENING_DEVICES_KRER46_CATALOG_IDS,
  TEMPORARY_MULTI_SPAN_CROSSBAR_BEARING_NODE_STRENGTHENING_DEVICES_KRER46_FORMULAS,
  TEMPORARY_MULTI_SPAN_CROSSBAR_BEARING_NODE_STRENGTHENING_DEVICES_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  TEMPORARY_MULTI_SPAN_CROSSBAR_BEARING_NODE_STRENGTHENING_DEVICES_KRER46_PARAMETERS,
  TEMPORARY_MULTI_SPAN_CROSSBAR_BEARING_NODE_STRENGTHENING_DEVICES_KRER46_PROFILE_ID,
  TEMPORARY_MULTI_SPAN_CROSSBAR_BEARING_NODE_STRENGTHENING_DEVICES_KRER46_RESOURCES,
  TEMPORARY_MULTI_SPAN_CROSSBAR_BEARING_NODE_STRENGTHENING_DEVICES_KRER46_SHORT_INPUT,
  TEMPORARY_MULTI_SPAN_CROSSBAR_BEARING_NODE_STRENGTHENING_DEVICES_KRER46_SOURCE_METADATA,
  TEMPORARY_MULTI_SPAN_CROSSBAR_BEARING_NODE_STRENGTHENING_DEVICES_KRER46_VARIANTS,
  compileTemporaryMultiSpanCrossbarBearingNodeStrengtheningDevicesKrer46R1,
  resolveTemporaryMultiSpanCrossbarBearingNodeStrengtheningDevicesKrer46Variant,
  validateTemporaryMultiSpanCrossbarBearingNodeStrengtheningDevicesKrer46Completeness,
} from "../../src/lib/estimate/v4/temporaryMultiSpanCrossbarBearingNodeStrengtheningDevicesKrer46R1";

describe("KRER 46-05-006-01 multi-span-crossbar-bearing-node strengthening devices", () => {
  const expectedShort = ["1", "75.32", "0.33", "0.33", "6.96", "0.44", "0.00001", "0.00004", "0.09", "0.00014", "4.16"];
  const expectedAcceptance = ["3", "225.96", "0.99", "0.99", "20.88", "1.32", "0.00003", "0.00012", "0.27", "0.00042", "12.48"];

  test("owns four distinct appended identities", () => {
    expect(TEMPORARY_MULTI_SPAN_CROSSBAR_BEARING_NODE_STRENGTHENING_DEVICES_KRER46_CATALOG_IDS).toHaveLength(4);
    expect(new Set(TEMPORARY_MULTI_SPAN_CROSSBAR_BEARING_NODE_STRENGTHENING_DEVICES_KRER46_CATALOG_IDS).size).toBe(4);
    expect(TEMPORARY_MULTI_SPAN_CROSSBAR_BEARING_NODE_STRENGTHENING_DEVICES_KRER46_CATALOG_IDS)
      .toEqual(Object.values(TEMPORARY_MULTI_SPAN_CROSSBAR_BEARING_NODE_STRENGTHENING_DEVICES_KRER46_VARIANTS).map((variant) => variant.catalogId));
  });
  test("binds exact lower-chord column 46-05-006-01", () => {
    expect(TEMPORARY_MULTI_SPAN_CROSSBAR_BEARING_NODE_STRENGTHENING_DEVICES_KRER46_PROFILE_ID)
      .toBe("KRER_46_05_006_01_MULTI_SPAN_CROSSBAR_BEARING_NODE_ACCESS_AND_RIGGING_DEVICES");
    expect(TEMPORARY_MULTI_SPAN_CROSSBAR_BEARING_NODE_STRENGTHENING_DEVICES_KRER46_SOURCE_METADATA.exact_locator).toContain("46-05-006-01");
    expect(TEMPORARY_MULTI_SPAN_CROSSBAR_BEARING_NODE_STRENGTHENING_DEVICES_KRER46_SOURCE_METADATA.artifact_sha256)
      .toBe(TEMPORARY_MULTI_SPAN_CROSSBAR_BEARING_NODE_STRENGTHENING_DEVICES_KRER46_ARTIFACT_SHA256);
  });
  test("has exact 3/11/11 shape and complete resource map", () => {
    expect(TEMPORARY_MULTI_SPAN_CROSSBAR_BEARING_NODE_STRENGTHENING_DEVICES_KRER46_PARAMETERS).toHaveLength(3);
    expect(TEMPORARY_MULTI_SPAN_CROSSBAR_BEARING_NODE_STRENGTHENING_DEVICES_KRER46_FORMULAS).toHaveLength(11);
    expect(TEMPORARY_MULTI_SPAN_CROSSBAR_BEARING_NODE_STRENGTHENING_DEVICES_KRER46_RESOURCES).toHaveLength(11);
    expect(validateTemporaryMultiSpanCrossbarBearingNodeStrengtheningDevicesKrer46Completeness()).toBe(true);
  });
  test("preserves every official lower-chord rate", () => {
    expect(TEMPORARY_MULTI_SPAN_CROSSBAR_BEARING_NODE_STRENGTHENING_DEVICES_KRER46_RESOURCES.map((row) => [
      row.source_metadata!.krerResourceCode, row.source_metadata!.normativeRatePerNode,
    ])).toEqual([
      ["46-05-006-01", 1], ["000-1003-0", 75.32], ["KRER_AGGREGATE_MACHINIST_LABOR", 0.33],
      ["02-0075", 0.33], ["03-0160", 6.96], ["40-0001", 0.44], ["01-7211-0001", 0.00001],
      ["01-7211-0002", 0.00004], ["06-0405-0002", 0.09], ["10-0105-0001", 0.00014], ["12-0704-0005", 4.16],
    ]);
    const codes = TEMPORARY_MULTI_SPAN_CROSSBAR_BEARING_NODE_STRENGTHENING_DEVICES_KRER46_RESOURCES.map((row) => row.source_metadata!.krerResourceCode);
    expect(codes).not.toContain("46-05-005-01"); expect(codes).not.toContain("46-05-004-01");
  });
  test("computes the exact one-node fixture", async () => {
    const result = await compileTemporaryMultiSpanCrossbarBearingNodeStrengtheningDevicesKrer46R1(
      { ...TEMPORARY_MULTI_SPAN_CROSSBAR_BEARING_NODE_STRENGTHENING_DEVICES_KRER46_SHORT_INPUT },
    );
    expect(result.preliminaryNeeds).toEqual([]); expect(result.rows.map((row) => row.quantity)).toEqual(expectedShort);
  });
  test("computes exact quantities at 3 nodes", async () => {
    const result = await compileTemporaryMultiSpanCrossbarBearingNodeStrengtheningDevicesKrer46R1(
      { ...TEMPORARY_MULTI_SPAN_CROSSBAR_BEARING_NODE_STRENGTHENING_DEVICES_KRER46_ACCEPTANCE_INPUT },
    );
    expect(result.preliminaryNeeds).toEqual([]); expect(result.rows.map((row) => row.quantity)).toEqual(expectedAcceptance);
  });
  test("fails closed when applicability is missing", async () => {
    const result = await compileTemporaryMultiSpanCrossbarBearingNodeStrengtheningDevicesKrer46R1({ crossbar_bearing_node_count: 3 });
    expect(result.rows).toEqual([]); expect(result.preliminaryNeeds).toHaveLength(11);
  });
  test("rejects wall-crack-sealing profile or explicit non-confirmation", async () => {
    await expect(compileTemporaryMultiSpanCrossbarBearingNodeStrengtheningDevicesKrer46R1({
      ...TEMPORARY_MULTI_SPAN_CROSSBAR_BEARING_NODE_STRENGTHENING_DEVICES_KRER46_SHORT_INPUT,
      multi_span_crossbar_bearing_node_strengthening_devices_profile: "KRER_46_05_005_01_UPPER_BEAM_CHORD_ACCESS_AND_RIGGING_DEVICES",
    })).rejects.toThrow("PROFILE_UNSUPPORTED");
    await expect(compileTemporaryMultiSpanCrossbarBearingNodeStrengtheningDevicesKrer46R1({
      ...TEMPORARY_MULTI_SPAN_CROSSBAR_BEARING_NODE_STRENGTHENING_DEVICES_KRER46_SHORT_INPUT,
      multi_span_crossbar_bearing_node_strengthening_devices_confirmed: false,
    })).rejects.toThrow("PROFILE_NOT_CONFIRMED");
  });
  test("rejects zero or negative length", async () => {
    for (const length of [0, -1]) await expect(compileTemporaryMultiSpanCrossbarBearingNodeStrengtheningDevicesKrer46R1({
      ...TEMPORARY_MULTI_SPAN_CROSSBAR_BEARING_NODE_STRENGTHENING_DEVICES_KRER46_SHORT_INPUT, crossbar_bearing_node_count: length,
    })).rejects.toThrow("parameter below minimum crossbar_bearing_node_count");
  });
  test("keeps machinist labor informational and machines payable", () => {
    expect(TEMPORARY_MULTI_SPAN_CROSSBAR_BEARING_NODE_STRENGTHENING_DEVICES_KRER46_RESOURCES[2]!.resource_graph)
      .toMatchObject({ costTreatment: "INFORMATIONAL_SCOPE", payable: false });
    for (const machine of TEMPORARY_MULTI_SPAN_CROSSBAR_BEARING_NODE_STRENGTHENING_DEVICES_KRER46_RESOURCES.slice(3, 6)) {
      expect(machine.resource_graph).toMatchObject({ costTreatment: "OWN_COST", payable: true });
      expect(machine.procurement_eligible).toBe(true);
    }
  });
  test("keeps wall crack sealing and truss devices out of the completeness map", () => {
    expect(TEMPORARY_MULTI_SPAN_CROSSBAR_BEARING_NODE_STRENGTHENING_DEVICES_KRER46_INDEPENDENT_COMPLETENESS_MAP)
      .toMatchObject({ rateTable: "KRER_46_05_006_01", generatedFromCurrentRows: false });
    expect(TEMPORARY_MULTI_SPAN_CROSSBAR_BEARING_NODE_STRENGTHENING_DEVICES_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries).toHaveLength(14);
    expect(TEMPORARY_MULTI_SPAN_CROSSBAR_BEARING_NODE_STRENGTHENING_DEVICES_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ operationId: "strengthening_devices_removal" }),
        expect.objectContaining({ operationId: "wall_crack_sealing_devices" }),
        expect.objectContaining({ operationId: "truss_strengthening_devices" }),
      ]));
  });
  test("resolves all variants and rejects an unsupported key", () => {
    for (const key of ["standard", "large_area", "small_area", "wet_zone"] as const)
      expect(resolveTemporaryMultiSpanCrossbarBearingNodeStrengtheningDevicesKrer46Variant(key).catalogId).toContain(`_${key}`);
    expect(() => resolveTemporaryMultiSpanCrossbarBearingNodeStrengtheningDevicesKrer46Variant("bad" as never)).toThrow("VARIANT_UNSUPPORTED");
  });
});
