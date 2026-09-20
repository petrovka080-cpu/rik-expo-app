import {
  PVC_ROOF_MEMBRANE_INSTALLATION_ACCEPTANCE_INPUT,
  PVC_ROOF_MEMBRANE_INSTALLATION_CATALOG_ID,
  PVC_ROOF_MEMBRANE_INSTALLATION_FORMULAS,
  PVC_ROOF_MEMBRANE_INSTALLATION_PARAMETERS,
  PVC_ROOF_MEMBRANE_INSTALLATION_RESOURCES,
  PVC_ROOF_MEMBRANE_INSTALLATION_SHORT_INPUT,
  compilePvcRoofMembraneInstallationR1,
} from "../../src/lib/estimate/v4/pvcRoofMembraneInstallationR1";

const REQUIRED_ROW_IDS = [
  "rc09:pvc_membrane_hot_air_install",
  "rc09:reinforced_pvc_roof_membrane_1_5mm",
  "rc09:pvc_membrane_telescopic_fastener",
  "rc09:pvc_membrane_edge_rail",
  "rc09:liquid_pvc_joint_sealant",
  "rc09:automatic_hot_air_roof_welder",
  "rc09:pvc_membrane_weld_probe_test",
] as const;

const CONDITIONAL_ROW_IDS = [
  "rc09:unreinforced_pvc_detail_membrane",
  "rc09:pvc_contact_adhesive",
] as const;

describe("MASTER PVC roof-membrane installation owner", () => {
  test("uses the direct flat-roof owner with the narrow membrane boundary", () => {
    expect(PVC_ROOF_MEMBRANE_INSTALLATION_CATALOG_ID)
      .toBe("canonical-work:base:roofing_interior_flat_roof_install_standard");
    expect(PVC_ROOF_MEMBRANE_INSTALLATION_PARAMETERS).toHaveLength(19);
    expect(PVC_ROOF_MEMBRANE_INSTALLATION_FORMULAS).toHaveLength(9);
    expect(PVC_ROOF_MEMBRANE_INSTALLATION_RESOURCES).toHaveLength(9);
    const serialized = JSON.stringify({
      formulas: PVC_ROOF_MEMBRANE_INSTALLATION_FORMULAS,
      resources: PVC_ROOF_MEMBRANE_INSTALLATION_RESOURCES,
    });
    expect(serialized).not.toMatch(/golden_rate|normFactor|area_m2\s*\*\s*(?:1\.08|5\.5|0\.22|0\.012|0\.018|0\.02)/iu);
    expect(serialized).not.toMatch(/roof_vapour_barrier|roof_insulation|roof_slope_screed|roof_cement_screed|metal_tile_lathing/iu);
  });

  test("turns known 500 m2 into installation work and keeps exact system quantities visible", async () => {
    const compiled = await compilePvcRoofMembraneInstallationR1({
      ...PVC_ROOF_MEMBRANE_INSTALLATION_SHORT_INPUT,
    });
    expect(compiled.rows).toEqual([
      expect.objectContaining({
        row_id: REQUIRED_ROW_IDS[0],
        quantity: "500",
        unit_id: "m2",
      }),
    ]);
    expect(compiled.preliminaryNeeds.map((need) => need.row_id)).toEqual(
      expect.arrayContaining([...REQUIRED_ROW_IDS.slice(1), ...CONDITIONAL_ROW_IDS]),
    );
    expect(compiled.preliminaryNeeds).toHaveLength(8);
    expect(compiled.preliminaryNeeds.every((need) => need.quantity == null)).toBe(true);
  });

  test("compiles the evidence-bound seven-row fixture without unresolved needs", async () => {
    const compiled = await compilePvcRoofMembraneInstallationR1({
      ...PVC_ROOF_MEMBRANE_INSTALLATION_ACCEPTANCE_INPUT,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(7);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[0], quantity: "500", unit_id: "m2" }),
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[1], quantity: "535", unit_id: "m2" }),
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[2], quantity: "2700", unit_id: "piece" }),
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[3], quantity: "112", unit_id: "m" }),
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[4], quantity: "6.4", unit_id: "l" }),
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[5], quantity: "9", unit_id: "machine_hour" }),
      expect.objectContaining({ row_id: REQUIRED_ROW_IDS[6], quantity: "10", unit_id: "test" }),
    ]));
  });

  test("keeps detail membrane and contact adhesive fail-closed", async () => {
    const compiled = await compilePvcRoofMembraneInstallationR1({
      ...PVC_ROOF_MEMBRANE_INSTALLATION_ACCEPTANCE_INPUT,
      detail_membrane_mode: "REQUIRED",
      detail_membrane_designation: "Неармированная ПВХ-мембрана по ведомости деталей",
      detail_membrane_area_m2: 28,
      contact_adhesive_mode: "REQUIRED",
      contact_adhesive_designation: "Контактный клей совместимой кровельной системы",
      contact_adhesive_mass_kg: 18,
    });
    expect(compiled.preliminaryNeeds).toEqual([]);
    expect(compiled.rows).toHaveLength(9);
    expect(compiled.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ row_id: CONDITIONAL_ROW_IDS[0], quantity: "28" }),
      expect.objectContaining({ row_id: CONDITIONAL_ROW_IDS[1], quantity: "18" }),
    ]));
  });

  test("rejects invalid supplied values and unrelated identities", async () => {
    await expect(compilePvcRoofMembraneInstallationR1({
      ...PVC_ROOF_MEMBRANE_INSTALLATION_SHORT_INPUT,
      telescopic_fastener_quantity_piece: -1,
    })).rejects.toMatchObject({ code: "PARAMETER_VALIDATION_FAILED" });
    await expect(compilePvcRoofMembraneInstallationR1(
      { ...PVC_ROOF_MEMBRANE_INSTALLATION_ACCEPTANCE_INPUT },
      { catalogId: `${PVC_ROOF_MEMBRANE_INSTALLATION_CATALOG_ID}:unsupported` },
    )).rejects.toThrow("PVC_ROOF_MEMBRANE_INSTALLATION_CATALOG_UNSUPPORTED");
  });
});
