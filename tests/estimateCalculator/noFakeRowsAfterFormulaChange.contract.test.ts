import fs from "node:fs";
import path from "node:path";

import { buildConsumerRepairAiDraft } from "../../src/features/consumerRepair/consumerRepairAiAdapter";
import {
  detectEstimateFakeRows,
  structuredRowsForDetector,
} from "../../src/lib/ai/estimateContinuousDetection";

describe("no fake rows after apartment wet-zone formula change", () => {
  it("keeps expanded apartment rows real, traced, and above wet-zone threshold", () => {
    const source = fs.readFileSync(
      path.resolve(process.cwd(), "src/lib/ai/estimateCompiler/expandedEstimateCompiler.ts"),
      "utf8",
    );
    expect(source).not.toContain('code: "apartment_ceramic_tile_wet_zones", title: "Плитка / керамогранит мокрых зон с запасом", quantityFormula: "q * 0.22"');
    expect(source).toContain('code: "apartment_ceramic_tile_wet_zones", title: "Плитка / керамогранит мокрых зон с запасом", quantityFormula: "q * 0.72"');

    const payload = buildConsumerRepairAiDraft("Капитальный ремонт квартиры 54 кв метра").structuredEstimatePayload!;
    const detector = detectEstimateFakeRows({ rows: structuredRowsForDetector(payload.rows), promptArea: 54 });
    const tile = payload.rows.find((row) => row.rowId.includes("apartment_ceramic_tile_wet_zones"));
    const baseboard = payload.rows.find((row) => row.rowId.includes("apartment_floor_baseboard"));
    const delivery = payload.rows.find((row) => row.rowId.includes("apartment_material_delivery"));

    expect(detector.failure_ids).toEqual([]);
    expect(tile?.quantity).toBeCloseTo(38.88, 2);
    expect(tile?.quantity).toBeGreaterThan(35);
    expect(baseboard?.unit).toBe("linear_m");
    expect(delivery?.unit).toBe("trip");
    expect(payload.rows.every((row) => row.formulaId && row.calculationTrace && row.templateVersion)).toBe(true);
  });
});
