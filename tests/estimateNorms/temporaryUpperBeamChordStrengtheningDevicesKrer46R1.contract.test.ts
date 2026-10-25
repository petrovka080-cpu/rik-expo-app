import {
  TEMPORARY_UPPER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_ACCEPTANCE_INPUT,
  TEMPORARY_UPPER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_ARTIFACT_SHA256,
  TEMPORARY_UPPER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_CATALOG_IDS,
  TEMPORARY_UPPER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_FORMULAS,
  TEMPORARY_UPPER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_INDEPENDENT_COMPLETENESS_MAP,
  TEMPORARY_UPPER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_PARAMETERS,
  TEMPORARY_UPPER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_PROFILE_ID,
  TEMPORARY_UPPER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_RESOURCES,
  TEMPORARY_UPPER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_SHORT_INPUT,
  TEMPORARY_UPPER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_SOURCE_METADATA,
  TEMPORARY_UPPER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_VARIANTS,
  compileTemporaryUpperBeamChordStrengtheningDevicesKrer46R1,
  resolveTemporaryUpperBeamChordStrengtheningDevicesKrer46Variant,
  validateTemporaryUpperBeamChordStrengtheningDevicesKrer46Completeness,
} from "../../src/lib/estimate/v4/temporaryUpperBeamChordStrengtheningDevicesKrer46R1";

describe("KRER 46-05-005-01 upper-beam-chord strengthening devices", () => {
  const expectedShort = [
    "1", "10.26", "0.07", "0.07", "1.36", "0.1", "0.00002", "0.00001",
    "0.01", "0.00004", "0.6",
  ];
  const expectedAcceptance = [
    "35.5", "364.23", "2.485", "2.485", "48.28", "3.55", "0.00071", "0.000355",
    "0.355", "0.00142", "21.3",
  ];

  test("preserves the surviving exact identities and source boundary", () => {
    expect(TEMPORARY_UPPER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_CATALOG_IDS).toHaveLength(2);
    expect(new Set(TEMPORARY_UPPER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_CATALOG_IDS).size).toBe(2);
    expect(TEMPORARY_UPPER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_CATALOG_IDS)
      .toEqual(Object.values(TEMPORARY_UPPER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_VARIANTS)
        .map((variant) => variant.catalogId));
  });

  test("binds exact upper-chord column 46-05-005-01", () => {
    expect(TEMPORARY_UPPER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_PROFILE_ID)
      .toBe("KRER_46_05_005_01_UPPER_BEAM_CHORD_ACCESS_AND_RIGGING_DEVICES");
    expect(TEMPORARY_UPPER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_SOURCE_METADATA.exact_locator)
      .toContain("46-05-005-01");
    expect(TEMPORARY_UPPER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_SOURCE_METADATA.artifact_sha256)
      .toBe(TEMPORARY_UPPER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_ARTIFACT_SHA256);
  });

  test("has exact 3/11/11 shape and complete resource map", () => {
    expect(TEMPORARY_UPPER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_PARAMETERS).toHaveLength(3);
    expect(TEMPORARY_UPPER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_FORMULAS).toHaveLength(11);
    expect(TEMPORARY_UPPER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_RESOURCES).toHaveLength(11);
    expect(validateTemporaryUpperBeamChordStrengtheningDevicesKrer46Completeness()).toBe(true);
  });

  test("preserves every official upper-chord rate", () => {
    expect(TEMPORARY_UPPER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_RESOURCES.map((row) => [
      row.source_metadata!.krerResourceCode,
      row.source_metadata!.normativeRatePerMetre,
    ])).toEqual([
      ["46-05-005-01", 1], ["000-1003-0", 10.26],
      ["KRER_AGGREGATE_MACHINIST_LABOR", 0.07], ["02-0075", 0.07],
      ["03-0160", 1.36], ["40-0001", 0.1], ["01-7211-0001", 0.00002],
      ["01-7211-0002", 0.00001], ["06-0405-0002", 0.01],
      ["10-0105-0001", 0.00004], ["12-0704-0005", 0.6],
    ]);
    const codes = TEMPORARY_UPPER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_RESOURCES
      .map((row) => row.source_metadata!.krerResourceCode);
    expect(codes).not.toContain("46-05-005-02");
    expect(codes).not.toContain("46-05-004-01");
  });

  test("computes the exact one-metre fixture", async () => {
    const result = await compileTemporaryUpperBeamChordStrengtheningDevicesKrer46R1(
      { ...TEMPORARY_UPPER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_SHORT_INPUT },
    );
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.map((row) => row.quantity)).toEqual(expectedShort);
  });

  test("computes exact quantities at 35.5 metres", async () => {
    const result = await compileTemporaryUpperBeamChordStrengtheningDevicesKrer46R1(
      { ...TEMPORARY_UPPER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_ACCEPTANCE_INPUT },
    );
    expect(result.preliminaryNeeds).toEqual([]);
    expect(result.rows.map((row) => row.quantity)).toEqual(expectedAcceptance);
  });

  test("fails closed when applicability is missing", async () => {
    const result = await compileTemporaryUpperBeamChordStrengtheningDevicesKrer46R1({
      upper_beam_chord_length_m: 35.5,
    });
    expect(result.rows).toEqual([]);
    expect(result.preliminaryNeeds).toHaveLength(11);
  });

  test("rejects lower-chord profile or explicit non-confirmation", async () => {
    await expect(compileTemporaryUpperBeamChordStrengtheningDevicesKrer46R1({
      ...TEMPORARY_UPPER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_SHORT_INPUT,
      upper_beam_chord_strengthening_devices_profile:
        "KRER_46_05_005_02_LOWER_BEAM_CHORD_ACCESS_AND_RIGGING_DEVICES",
    })).rejects.toThrow("PROFILE_UNSUPPORTED");
    await expect(compileTemporaryUpperBeamChordStrengtheningDevicesKrer46R1({
      ...TEMPORARY_UPPER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_SHORT_INPUT,
      upper_beam_chord_strengthening_devices_confirmed: false,
    })).rejects.toThrow("PROFILE_NOT_CONFIRMED");
  });

  test("rejects zero or negative length", async () => {
    for (const length of [0, -1]) {
      await expect(compileTemporaryUpperBeamChordStrengtheningDevicesKrer46R1({
        ...TEMPORARY_UPPER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_SHORT_INPUT,
        upper_beam_chord_length_m: length,
      })).rejects.toThrow("parameter below minimum upper_beam_chord_length_m");
    }
  });

  test("keeps machinist labor informational and machines payable", () => {
    expect(TEMPORARY_UPPER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_RESOURCES[2]!.resource_graph)
      .toMatchObject({ costTreatment: "INFORMATIONAL_SCOPE", payable: false });
    for (const machine of TEMPORARY_UPPER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_RESOURCES.slice(3, 6)) {
      expect(machine.resource_graph).toMatchObject({ costTreatment: "OWN_COST", payable: true });
      expect(machine.procurement_eligible).toBe(true);
    }
  });

  test("keeps lower chord and truss devices out of the completeness map", () => {
    expect(TEMPORARY_UPPER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_INDEPENDENT_COMPLETENESS_MAP)
      .toMatchObject({ rateTable: "KRER_46_05_005_01", generatedFromCurrentRows: false });
    expect(TEMPORARY_UPPER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries)
      .toHaveLength(14);
    expect(TEMPORARY_UPPER_BEAM_CHORD_STRENGTHENING_DEVICES_KRER46_INDEPENDENT_COMPLETENESS_MAP.entries)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ operationId: "strengthening_devices_removal" }),
        expect.objectContaining({ operationId: "lower_beam_chord_strengthening_devices" }),
        expect.objectContaining({ operationId: "truss_strengthening_devices" }),
      ]));
  });

  test("resolves all variants and rejects an unsupported key", () => {
    for (const key of ["standard", "wet_zone"] as const) {
      expect(resolveTemporaryUpperBeamChordStrengtheningDevicesKrer46Variant(key).catalogId)
        .toContain(`_${key}`);
    }
    expect(() => resolveTemporaryUpperBeamChordStrengtheningDevicesKrer46Variant("bad" as never))
      .toThrow("VARIANT_UNSUPPORTED");
  });
});
