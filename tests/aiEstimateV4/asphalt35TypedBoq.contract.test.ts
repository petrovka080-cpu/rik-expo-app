import {
  DEFAULT_ROADWORKS_WAVE_A_INPUTS,
  RoadworksWaveAInventory,
  buildAsphalt35NormativeCompositionLedgerV3,
  compileRoadworksWaveAWork,
  getRoadworksWaveAOperation,
  priceRoadworksWaveACompilation,
} from "../../src/lib/estimate/v4/roadworks";

describe("Asphalt 35/35 work-specific formula graph and typed BOQ", () => {
  test("compiles seven deterministic cohorts of five exact professional works", () => {
    const ledger = buildAsphalt35NormativeCompositionLedgerV3();
    for (const cohort of [1, 2, 3, 4, 5, 6, 7] as const) {
      expect(ledger.filter((row) => row.cohort === cohort)).toHaveLength(5);
    }
    expect(new Set(ledger.map((row) => row.workId)).size).toBe(35);
    expect(new Set(ledger.map((row) => row.compositionFingerprint)).size).toBe(35);
  });

  test("puts the complete typed ownership and trace contract on every BOQ row", () => {
    for (const item of RoadworksWaveAInventory) {
      const compilation = compileRoadworksWaveAWork(item.workId, DEFAULT_ROADWORKS_WAVE_A_INPUTS);
      expect(compilation.rows.length).toBeGreaterThanOrEqual(5);
      expect(new Set(compilation.rows.map((row) => row.rowId)).size).toBe(compilation.rows.length);
      for (const row of compilation.rows) {
        expect(row.workKey).toBe(item.workId);
        expect(row.passportId).toBe(`professional-estimate-passport:v4:${item.workId}`);
        expect(row.semanticOwner).toBe(row.passportId);
        expect(row.rowType).toBeTruthy();
        expect(row.formulaId).toBeTruthy();
        expect(row.sourceParameterKeys).toEqual(row.affectedBy);
        expect(row.normativeSourceId).toMatch(/^kg_krer_(?:11|27)_/);
        expect(row.normativeRateIds.length).toBeGreaterThan(0);
        expect(row.uom).toBe(row.unit);
        expect(row.roundingRule).toBeTruthy();
        expect(row.wasteRule).toBeTruthy();
        expect(row.priceSourceId).toBeNull();
        expect(row.priceDate).toBeNull();
        expect(row.revisionId).toBe("REFERENCE_UNSAVED");
      }
    }
  });

  test("never makes control or documentation rows payable or procurable", () => {
    for (const item of RoadworksWaveAInventory) {
      const rows = compileRoadworksWaveAWork(item.workId, DEFAULT_ROADWORKS_WAVE_A_INPUTS).rows;
      const excluded = rows.filter((row) => row.category === "test" || row.category === "document");
      expect(excluded.length).toBeGreaterThanOrEqual(2);
      expect(excluded.every((row) => !row.payable)).toBe(true);
      expect(excluded.every((row) => row.procurementEligibility === "EXCLUDED_CONTROL_DOCUMENT")).toBe(true);
      expect(rows.filter((row) => row.payable).every((row) => row.procurementEligibility !== "EXCLUDED_CONTROL_DOCUMENT"))
        .toBe(true);
    }
  });

  test("requires an explicit dated price for every payable row and produces full reference totals", () => {
    let priced = 0;
    for (const item of RoadworksWaveAInventory) {
      const compilation = compileRoadworksWaveAWork(item.workId, DEFAULT_ROADWORKS_WAVE_A_INPUTS);
      const unitPriceByRowId = Object.fromEntries(
        compilation.rows.filter((row) => row.payable).map((row, index) => [row.rowId, 100 + index]),
      );
      const result = priceRoadworksWaveACompilation(compilation, {
        priceSourceId: `test-fixture:${item.workId}:2026-08-07`,
        priceDate: "2026-08-07",
        currency: "KGS",
        unitPriceByRowId,
      });
      expect(result.monetaryTotal).toBeGreaterThan(0);
      expect(result.rows.filter((row) => row.payable).every((row) =>
        row.unitPrice != null && row.unitPrice > 0 && row.lineTotal > 0 && row.priceDate === "2026-08-07"
      )).toBe(true);
      expect(result.rows.filter((row) => !row.payable).every((row) =>
        row.unitPrice === null && row.lineTotal === 0 && row.priceSourceId === null
      )).toBe(true);
      expect(() => priceRoadworksWaveACompilation(compilation, {
        priceSourceId: "incomplete-fixture",
        priceDate: "2026-08-07",
        currency: "KGS",
        unitPriceByRowId: {},
      })).toThrow("ASPHALT_PRICE_REQUIRED");
      priced += 1;
    }
    expect(priced).toBe(35);
  });

  test("changes thickness-dependent resources without mutating unrelated control/document rows", () => {
    for (const item of RoadworksWaveAInventory.filter((candidate) =>
      ["install", "lay", "repair", "level"].includes(getRoadworksWaveAOperation(candidate.workId) ?? "")
    )) {
      const before = compileRoadworksWaveAWork(item.workId, DEFAULT_ROADWORKS_WAVE_A_INPUTS).rows;
      const after = compileRoadworksWaveAWork(item.workId, {
        ...DEFAULT_ROADWORKS_WAVE_A_INPUTS,
        thickness_mm: DEFAULT_ROADWORKS_WAVE_A_INPUTS.thickness_mm * 2,
      }).rows;
      const changed = before.filter((row, index) => row.quantity !== after[index].quantity);
      expect(changed.length).toBeGreaterThan(0);
      expect(changed.every((row) => row.sourceParameterKeys.includes("thickness_mm"))).toBe(true);
      const changedControlRows = changed.filter((row) => row.category === "test" || row.category === "document");
      expect(changedControlRows.every((row) =>
        row.rowId.endsWith(":temperature_control") && row.sourceParameterKeys.includes("thickness_mm")
      )).toBe(true);
      expect(before.filter((row) =>
        (row.category === "test" || row.category === "document") &&
        !row.sourceParameterKeys.includes("thickness_mm")
      )
        .every((row, index) => row.quantity === after.filter((candidate) =>
          (candidate.category === "test" || candidate.category === "document") &&
          !candidate.sourceParameterKeys.includes("thickness_mm")
        )[index].quantity)).toBe(true);
    }
  });

  test("selects KRER 11 only for industrial floors and KRER 27 only for road/external works", () => {
    for (const item of RoadworksWaveAInventory) {
      const rows = compileRoadworksWaveAWork(item.workId, DEFAULT_ROADWORKS_WAVE_A_INPUTS).rows;
      if (item.scopeProfile === "technical_room") {
        expect(rows.every((row) => row.normativeSourceId === "kg_krer_11_floors_2015")).toBe(true);
        expect(rows.every((row) => row.normativeRateIds.every((id) => id.startsWith("11-01-019-")))).toBe(true);
      } else {
        expect(rows.every((row) => row.normativeSourceId === "kg_krer_27_roadworks_2015")).toBe(true);
        expect(rows.every((row) => row.normativeRateIds.every((id) => id.startsWith("27-")))).toBe(true);
      }
    }
  });
});
