import { buildAiEstimateCatalogIndex } from "../../src/lib/estimate/catalog/buildAiEstimateCatalogIndex";
import { createAiEstimateRuntime } from "../../src/lib/estimate/runtime/createAiEstimateRuntime";

const TARGETS = [
  "commissioning_energy_facility_as_built_estimate_expanded_complex_v1",
  "fuel_oil_facility_rom_concept_expanded_complex_v1",
  "generator_foundation_tender_boq_expanded_complex_v1",
] as const;

describe("passport-backed preliminary quantity trace", () => {
  it.each(TARGETS)("binds the actual primary quantity consumer for %s", (templateId) => {
    const index = buildAiEstimateCatalogIndex();
    const entry = index.byTemplateId.get(templateId);
    expect(entry).toBeDefined();
    const runtime = createAiEstimateRuntime();
    const revision = runtime.createDraft({
      estimateDraftId: `passport-fallback-trace-${templateId}`,
      rawInput: [
        entry?.localizedNameRu ?? templateId,
        "80 m2",
        "length 20 m",
        "width 5 m",
        "height 3 m",
        "diameter 110 mm",
        "voltage 10 kV",
      ].join(" "),
      selectedTemplateId: templateId,
      createdAt: "2026-07-09T00:00:00.000Z",
    }).revision;
    const affected = revision.trace.params.find((parameter) => parameter.key === "area_m2")?.affectsRowIds ?? [];
    expect(affected.length).toBeGreaterThan(0);
    expect(affected.every((rowId) => {
      const declared = revision.boq.rows.find((row) => row.rowId === rowId)?.sourceParameters?.affectedBy;
      return Array.isArray(declared) && declared.includes("area_m2");
    })).toBe(true);

    const recalculated = runtime.applyParameterOverride({
      revision,
      operation: "update_param",
      paramKey: "area_m2",
      rawValue: "85",
      createdAt: "2026-07-09T00:01:00.000Z",
      revisionIndex: 2,
    });
    expect(recalculated.revision.revisionId).not.toBe(revision.revisionId);
    expect(recalculated.diff.changedRowsCount).toBeGreaterThan(0);
    expect(recalculated.diff.changedRows.every(({ rowId }) => affected.includes(rowId))).toBe(true);
  }, 180_000);
});
