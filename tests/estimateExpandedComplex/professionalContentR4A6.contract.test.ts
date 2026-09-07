import fs from "node:fs";
import path from "node:path";

import {
  calculateExpandedComplexEstimate,
} from "../../src/lib/ai/expandedComplexWorks";
import {
  buildProfessionalWorkPassport,
  clearProfessionalWorkPassportBuildCaches,
} from "../../src/lib/estimate/buildProfessionalWorkPassport";
import {
  evaluateR4A6PumpStationRows,
  missingR4A6PumpStationP0,
  R4_A6_PUMP_STATION_PARAMETERS,
  R4_A6_PUMP_STATION_ROWS,
  R4_A6_PUMP_STATION_TITLE_RU,
} from "../../src/lib/estimate/r4A6PumpStationProfessional";
import { allExpandedRows } from "./expandedComplexTestHelpers";
import {
  createPumpStationCanonicalBackendAuditRevision,
  recalculatePumpStationCanonicalBackendAuditRevision,
} from "../../scripts/estimate/pumpStationCanonicalBackendAuditAdapter";

const FORBIDDEN_GENERIC_TITLE = /(?:основной материал|несущий каркас|крепёж и метизы|комплект узлов|материал по проекту|основной монтажный цикл|координация спецификаций)/iu;

const COMPLETE_PUMP_INPUT: Record<string, string | number | boolean> = {
  design_flow_m3_h: 60,
  design_head_m: 45,
  duty_pump_count: 2,
  standby_pump_count: 1,
  pump_power_kw: 15,
  suction_manifold_diameter_mm: 150,
  discharge_manifold_diameter_mm: 125,
  suction_manifold_length_m: 12,
  discharge_manifold_length_m: 14,
  power_cable_length_m: 40,
  foundation_length_m: 4,
  foundation_width_m: 3,
  foundation_thickness_m: 0.3,
  automation_scope: "частотное управление и диспетчеризация",
  power_supply_voltage_v: 380,
  ventilation_required: true,
  ventilation_airflow_m3_h: 1200,
  drainage_required: true,
  drainage_sump_volume_m3: 1.2,
  lifting_device_required: true,
  delivery_required: true,
  delivery_distance_km: 30,
};

describe("R4-A6 professional BOQ truth contract", () => {
  it("returns NEEDS_INPUT instead of treating 100 m as a pump-station measure", () => {
    const estimate = calculateExpandedComplexEstimate({
      prompt: "строительство повысительной насосной станции 100 м",
      familyId: "booster_pumping_station",
    });
    if (!estimate) throw new Error("R4_A6_PUMP_WITNESS_NOT_RESOLVED");

    expect(estimate.professionalNameRu).toBe(R4_A6_PUMP_STATION_TITLE_RU);
    expect(estimate.estimate_level).toBe("NEEDS_INPUT");
    expect(allExpandedRows(estimate)).toHaveLength(0);
    expect(estimate.input_parameters).not.toHaveProperty("length_m");
    expect(estimate.input_parameters).not.toHaveProperty("capacity");
    expect(estimate.missing_design_inputs.length).toBeGreaterThanOrEqual(17);
    expect(estimate.price_state.finalTotalAllowed).toBe(false);
  });

  it("requires explicit P0 values and produces the authored 31-row pump composition", () => {
    const p0 = R4_A6_PUMP_STATION_PARAMETERS.filter((parameter) => parameter.tier === "P0");
    expect(p0).toHaveLength(19);
    expect(p0.every((parameter) => parameter.defaultValue === null)).toBe(true);
    expect(R4_A6_PUMP_STATION_PARAMETERS.every((parameter) => parameter.defaultValue === null)).toBe(true);
    expect(missingR4A6PumpStationP0({})).toHaveLength(17);
    expect(missingR4A6PumpStationP0(COMPLETE_PUMP_INPUT)).toEqual([]);

    const rows = evaluateR4A6PumpStationRows(COMPLETE_PUMP_INPUT);
    expect(R4_A6_PUMP_STATION_ROWS).toHaveLength(31);
    expect(rows).toHaveLength(31);
    expect(new Set(rows.map((row) => row.rowId)).size).toBe(31);
    expect(rows.every((row) => Number.isFinite(row.quantity) && row.quantity > 0)).toBe(true);
    expect(rows.every((row) => !/[:：]/u.test(row.titleRu))).toBe(true);
    expect(rows.every((row) => !FORBIDDEN_GENERIC_TITLE.test(row.titleRu))).toBe(true);
    expect(rows.filter((row) => row.category === "delivery").map((row) => row.unitId)).toEqual([
      "service",
      "service",
    ]);
  });

  it("preserves the accepted roof witness without making 45 a global minimum", () => {
    const roof = calculateExpandedComplexEstimate({
      prompt: "обрешётка и контробрешётка кровли 200 м², утепление 200 мм, 4 окна",
      familyId: "battens_counterbattens",
    });
    if (!roof) throw new Error("R4_A6_ROOF_WITNESS_NOT_RESOLVED");
    const rows = allExpandedRows(roof);

    expect(rows).toHaveLength(45);
    expect(roof.material_rows).toHaveLength(22);
    expect(roof.work_rows).toHaveLength(4);
    expect(roof.equipment_rows).toHaveLength(7);
    expect(roof.service_rows).toHaveLength(12);
    expect(roof.service_rows.filter((row) => row.group === "logistics")).toHaveLength(3);
    expect(rows.find((row) => row.code === "covering_area_m2")?.quantity).toBe(216);
    expect(rows.filter((row) => row.code.startsWith("professional_"))).toHaveLength(27);
    expect(rows.filter((row) => row.quantityFormula === "1")).toHaveLength(4);
    expect(rows.every((row) => !/[:：]/u.test(row.titleRu))).toBe(true);
    expect(rows.every((row) => !FORBIDDEN_GENERIC_TITLE.test(row.titleRu))).toBe(true);
    expect(rows.filter((row) => row.code.startsWith("professional_")).every((row) =>
      !/\barea_m2\b/u.test(row.quantityFormula) || /\broof_area_m2\b/u.test(row.quantityFormula))).toBe(true);

    const water = calculateExpandedComplexEstimate({
      prompt: "водопровод 500 м, диаметр 110 мм",
      familyId: "village_water_supply",
    });
    if (!water) throw new Error("R4_A6_NATIVE_WATER_NOT_RESOLVED");
    const waterRows = allExpandedRows(water);
    expect(waterRows).not.toHaveLength(45);
    expect(waterRows.some((row) => /^(?:professional|s2b)_/u.test(row.code))).toBe(false);
  });

  it("publishes the pump passport with exact rows, parameters and missing prices", () => {
    clearProfessionalWorkPassportBuildCaches();
    const passport = buildProfessionalWorkPassport(
      "booster_pumping_station_preliminary_boq_expanded_complex_v1",
    );
    if (!passport) throw new Error("R4_A6_PUMP_PASSPORT_NOT_FOUND");

    expect(passport.localizedNameRu).toBe(R4_A6_PUMP_STATION_TITLE_RU);
    expect(passport.boqRecipe.rowCount).toBe(31);
    expect(passport.boqRecipe.allRows.every((row) => row.priceStatus === "PRICE_MISSING")).toBe(true);
    expect(passport.boqRecipe.allRows.every((row) => !/[:：]/u.test(row.titleRu))).toBe(true);
    expect(passport.parameterSchema.required.map((parameter) => parameter.key)).toEqual(
      expect.arrayContaining([
        "design_flow_m3_h",
        "design_head_m",
        "duty_pump_count",
        "standby_pump_count",
        "pump_power_kw",
        "foundation_length_m",
        "foundation_width_m",
        "foundation_thickness_m",
        "automation_scope",
      ]),
    );
  });

  it("uses the shared pump backend for all ten catalog-level regression projections", () => {
    const templateIds = ["pumping_station", "booster_pumping_station"].flatMap((workKey) => [
      `${workKey}_rom_concept_expanded_complex_v1`,
      `${workKey}_preliminary_boq_expanded_complex_v1`,
      `${workKey}_detailed_boq_from_drawings_expanded_complex_v1`,
      `${workKey}_tender_boq_expanded_complex_v1`,
      `${workKey}_as_built_estimate_expanded_complex_v1`,
    ]);
    for (const [index, templateId] of templateIds.entries()) {
      const passport = buildProfessionalWorkPassport(templateId);
      if (!passport) throw new Error(`R4_A6_PUMP_PASSPORT_NOT_FOUND:${templateId}`);
      const first = createPumpStationCanonicalBackendAuditRevision({
        passport,
        estimateDraftId: `pump-station-backend-audit-${index}`,
        rawInput: `${passport.localizedNameRu}: synthetic backend acceptance fixture`,
        createdAt: "2026-09-06T00:00:00.000Z",
        artifacts: {
          snapshotId: `pump-snapshot-${index}`,
          pdfArtifactId: `pump-pdf-${index}`,
          buyerHandoffId: `pump-buyer-${index}`,
          artifactsValidForRevisionId: `pump-revision-${index}`,
        },
      });
      const result = recalculatePumpStationCanonicalBackendAuditRevision({
        passport,
        previous: first,
        operation: "update_param",
        paramKey: "duty_pump_count",
        rawValue: "3 pcs",
        createdAt: "2026-09-06T00:01:00.000Z",
        revisionIndex: 2,
      });

      expect(first.selectedTemplateId).toBe(templateId);
      expect(first.matchedFamily).toBe(passport.workKey);
      expect(first.boq.rows).toHaveLength(31);
      expect(new Set(first.boq.rows.map((row) => row.rowType))).toEqual(
        new Set(["material", "work", "equipment", "service", "transport"]),
      );
      expect(first.boq.rows.some((row) => row.rowType === "document")).toBe(false);
      expect(first.boq.rows.every((row) => row.sourceParameters?.canonicalBackendProjectionV1 === true)).toBe(true);
      expect(result.revision.previousRevisionId).toBe(first.revisionId);
      expect(result.revision.params.duty_pump_count?.value).toBe(3);
      expect(result.diff.changedRowsCount).toBeGreaterThan(0);
      expect(result.diff.staleArtifactsAfterEdit).toEqual({
        snapshotInvalidated: true,
        pdfInvalidated: true,
        buyerHandoffInvalidated: true,
      });
    }
  });

  it("contains no executable fixed-depth padding registry", () => {
    const root = process.cwd();
    const registry = fs.readFileSync(path.join(root, "src/lib/ai/expandedComplexWorks/s2b/registry.ts"), "utf8");
    const expanded = fs.readFileSync(path.join(root, "src/lib/ai/expandedComplexWorks/index.ts"), "utf8");
    expect(registry).not.toMatch(/ensureS2BProfessionalDepth|S2B_PROFESSIONAL_MIN_ROWS|quantityFor/u);
    expect(expanded).not.toMatch(/ensureProfessionalDepth|minimumRows\s*=\s*45/u);
  });
});
