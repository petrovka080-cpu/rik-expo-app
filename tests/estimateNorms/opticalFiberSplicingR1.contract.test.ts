import {
  OPTICAL_FIBER_SPLICING_ACCEPTANCE_INPUT,
  OPTICAL_FIBER_SPLICING_CATALOG_ID,
  OPTICAL_FIBER_SPLICING_FORMULAS,
  OPTICAL_FIBER_SPLICING_PARAMETERS,
  OPTICAL_FIBER_SPLICING_RESOURCES,
  OPTICAL_FIBER_SPLICING_SHORT_INPUT,
  compileOpticalFiberSplicingR1,
} from "../../src/lib/estimate/v4/opticalFiberSplicingR1";

const REQUIRED = [
  "rc09:optical_fiber_fusion_splice",
  "rc09:fiber_splice_heat_shrink_sleeve",
  "rc09:fiber_lint_free_wipe",
  "rc09:fiber_isopropyl_cleaner",
  "rc09:fiber_splice_identification_marker",
  "rc09:fiber_fusion_splicer",
  "rc09:optical_time_domain_reflectometer",
  "rc09:fiber_otdr_measurement_protocol",
] as const;
const CONDITIONAL = ["rc09:fiber_pigtail", "rc09:fiber_splice_tray"] as const;

describe("MASTER optical-fiber splicing owner", () => {
  test("uses the distinct fiber owner without importing historical scalar rates", () => {
    expect(OPTICAL_FIBER_SPLICING_CATALOG_ID)
      .toBe("canonical-work:expanded:fiber_optic_connection");
    expect(OPTICAL_FIBER_SPLICING_PARAMETERS).toHaveLength(20);
    expect(OPTICAL_FIBER_SPLICING_FORMULAS).toHaveLength(10);
    expect(OPTICAL_FIBER_SPLICING_RESOURCES).toHaveLength(10);
    expect(JSON.stringify(OPTICAL_FIBER_SPLICING_FORMULAS))
      .not.toMatch(/golden_rate|normFactor|splice_count\s*\*\s*(?:2|0\.004|0\.12|0\.08|0\.05)/iu);
    expect(OPTICAL_FIBER_SPLICING_RESOURCES.map((row) => row.row_id))
      .not.toEqual(expect.arrayContaining([
        "rc09:fiber_optic_cable_route",
        "rc09:optical_distribution_frame",
        "rc09:server_cabinet",
      ]));
  });

  test("known count gives splice work and one attenuation record per fiber plus local needs", async () => {
    const compiled = await compileOpticalFiberSplicingR1({
      ...OPTICAL_FIBER_SPLICING_SHORT_INPUT,
    });
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED[0], quantity: "48", unit_id: "pcs" }),
      expect.objectContaining({ row_id: REQUIRED[7], quantity: "48", unit_id: "test" }),
    ]));
    expect(compiled.rows).toHaveLength(2);
    expect(compiled.preliminaryNeeds.map((need) => need.row_id))
      .toEqual(expect.arrayContaining([...REQUIRED.slice(1, 7), ...CONDITIONAL]));
    expect(compiled.preliminaryNeeds).toHaveLength(8);
  });

  test("compiles the evidence-bound eight-row fixture", async () => {
    const compiled = await compileOpticalFiberSplicingR1({
      ...OPTICAL_FIBER_SPLICING_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(8);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED[1], quantity: "48", unit_id: "pcs" }),
      expect.objectContaining({ row_id: REQUIRED[2], quantity: "96", unit_id: "pcs" }),
      expect.objectContaining({ row_id: REQUIRED[3], quantity: "0.2", unit_id: "l" }),
      expect.objectContaining({ row_id: REQUIRED[5], quantity: "1.5", unit_id: "shift" }),
      expect.objectContaining({ row_id: REQUIRED[6], quantity: "1", unit_id: "shift" }),
    ]));
  });

  test("keeps pigtails and splice trays conditional", async () => {
    const compiled = await compileOpticalFiberSplicingR1({
      ...OPTICAL_FIBER_SPLICING_ACCEPTANCE_INPUT,
      pigtail_mode: "REQUIRED",
      pigtail_designation: "Пигтейл OS2 LC/UPC по спецификации",
      pigtail_quantity_piece: 48,
      splice_tray_mode: "REQUIRED",
      splice_tray_designation: "Кассета на 24 сварки по спецификации",
      splice_tray_quantity_piece: 2,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(10);
    expect(compiled.rows.map((row) => row.row_id))
      .toEqual(expect.arrayContaining([...CONDITIONAL]));
  });

  test("rejects invalid values and unrelated identities", async () => {
    await expect(compileOpticalFiberSplicingR1({
      ...OPTICAL_FIBER_SPLICING_SHORT_INPUT,
      splice_count: 0,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compileOpticalFiberSplicingR1(
      { ...OPTICAL_FIBER_SPLICING_ACCEPTANCE_INPUT },
      { catalogId: `${OPTICAL_FIBER_SPLICING_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("OPTICAL_FIBER_SPLICING_CATALOG_UNSUPPORTED");
  });
});
