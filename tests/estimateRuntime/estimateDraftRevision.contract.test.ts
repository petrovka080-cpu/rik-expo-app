import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { recalculateEstimateDraftRevision } from "../../src/lib/estimate/recalculateEstimateDraftRevision";
import { parseUserParamPatch } from "../../src/lib/estimate/parseUserParamPatch";
import { validateEstimateDraftRevision } from "../../src/lib/estimate/validateEstimateDraftRevision";

describe("estimate draft revision contract", () => {
  it("creates initial prompt revision and recalculates a new revision after param edit", () => {
    const r1 = createEstimateDraftRevision({
      estimateDraftId: "draft-gabion",
      rawInput: "габион стена длина 150 метров высота 30 метров толщина 1 метр",
      createdAt: "2026-07-07T00:00:00.000Z",
    });
    const patch = parseUserParamPatch({
      revision: r1,
      operation: "update_param",
      paramKey: "length_m",
      rawValue: "100 м",
    });
    const { revision: r2, diff } = recalculateEstimateDraftRevision(r1, patch, {
      createdAt: "2026-07-07T00:01:00.000Z",
      revisionIndex: 2,
    });

    expect(validateEstimateDraftRevision(r1).valid).toBe(true);
    expect(validateEstimateDraftRevision(r2).valid).toBe(true);
    expect(r1.selectedTemplateId).toBe(r2.selectedTemplateId);
    expect(r2.previousRevisionId).toBe(r1.revisionId);
    expect(r2.params.length_m.value).toBe(100);
    expect(r2.params.volume_m3.value).toBe(3000);
    expect(r2.trace.revisionId).toBe(r2.revisionId);
    expect(diff.changedRowsCount).toBeGreaterThan(0);
    expect(diff.changedParams.some((item) => item.key === "length_m")).toBe(true);
    expect(r2.artifacts.pdfArtifactId).toBeNull();
    expect(r2.artifacts.buyerHandoffId).toBeNull();
  });

  it("preserves catalog-passport lineage while recalculating a canonical road projection", () => {
    const templateId = "village_road_construction_rom_concept_expanded_complex_v1";
    const originalPrompt = "Строительство сельской дороги площадью 100 м2";
    const r1 = createEstimateDraftRevision({
      estimateDraftId: "draft-village-road-lineage",
      rawInput: originalPrompt,
      selectedTemplateId: templateId,
      selectedTemplateName: "Строительство сельской дороги",
      createdAt: "2026-07-07T00:00:00.000Z",
      paramOverrides: {
        selectedRoadScope: {
          value: "FULL_ROAD_INFRASTRUCTURE",
          source: "user_input",
          sourceText: "test:explicit-road-scope",
          lastChangedAt: "2026-07-07T00:00:00.000Z",
        },
      },
    });
    const patch = parseUserParamPatch({
      revision: r1,
      operation: "update_param",
      paramKey: "area_m2",
      rawValue: "120 м2",
    });
    const { revision: r2 } = recalculateEstimateDraftRevision(r1, patch, {
      createdAt: "2026-07-07T00:01:00.000Z",
      revisionIndex: 2,
    });

    expect(r1.resolvedIdentity).toBeDefined();
    expect(r2.resolvedIdentity).toMatchObject({
      requestedCatalogWorkId: templateId,
      passportId: r1.resolvedIdentity?.passportId,
      parameterSchemaId: r1.resolvedIdentity?.parameterSchemaId,
      calculationStrategyId: r1.resolvedIdentity?.calculationStrategyId,
      canonicalModelId: r1.resolvedIdentity?.canonicalModelId,
      semanticOwner: r1.resolvedIdentity?.semanticOwner,
      originalPrompt,
    });
    expect(r2.resolvedIdentity?.resolvedParameters.area_m2?.value).toBe(120);
    expect(r2.resolvedIdentity?.checksum).not.toBe(r1.resolvedIdentity?.checksum);
  });

  it("derives full-road scope from an exact village-road construction selection", () => {
    const templateId = "village_road_construction_rom_concept_expanded_complex_v1";
    const revision = createEstimateDraftRevision({
      estimateDraftId: "draft-village-road-exact-scope",
      rawInput: "Строительство сельской дороги площадью 100 м2",
      selectedTemplateId: templateId,
      selectedTemplateName: "Строительство сельской дороги",
      createdAt: "2026-07-07T00:00:00.000Z",
    });

    expect(revision.resolvedIdentity?.selectedScope).toBe("FULL_ROAD_INFRASTRUCTURE");
    expect(revision.boq.rows.length).toBeGreaterThan(0);
  });

  it("keeps the other calculator geometry inputs stable when one bridge dimension changes", () => {
    const templateId = "bridge_construction_rom_concept_expanded_complex_v1";
    const r1 = createEstimateDraftRevision({
      estimateDraftId: "draft-bridge-geometry-edit",
      rawInput: "Мост длиной 30 м шириной 8,5 м",
      selectedTemplateId: templateId,
      selectedTemplateName: "Строительство моста",
      createdAt: "2026-07-07T00:00:00.000Z",
    });
    const patch = parseUserParamPatch({
      revision: r1,
      operation: "update_param",
      paramKey: "width_m",
      rawValue: "11,46 м",
    });
    const { revision: r2, diff } = recalculateEstimateDraftRevision(r1, patch, {
      createdAt: "2026-07-07T00:01:00.000Z",
      revisionIndex: 2,
    });

    expect(r2.params.length_m.value).toBe(30);
    expect(r2.params.width_m.value).toBe(11.46);
    expect(r2.params.deck_area_m2.value).toBeCloseTo(343.8);
    expect(diff.changedRows.some((row) => row.rowId === "deck_concrete_m3")).toBe(true);
    expect(diff.changedRows.some((row) => row.rowId === "bridge_piles_pcs")).toBe(false);
  });

  it("exposes well depth as an editable traced calculator input", () => {
    const templateId = "well_construction_rom_concept_expanded_complex_v1";
    const r1 = createEstimateDraftRevision({
      estimateDraftId: "draft-well-depth-edit",
      rawInput: "Строительство водозаборной скважины глубиной 80 м диаметром 160 мм",
      selectedTemplateId: templateId,
      selectedTemplateName: "Строительство водозаборной скважины",
      createdAt: "2026-07-07T00:00:00.000Z",
    });
    const affectedRows = new Set(
      r1.trace.params.find((parameter) => parameter.key === "depth_m")?.affectsRowIds ?? [],
    );
    const patch = parseUserParamPatch({
      revision: r1,
      operation: "update_param",
      paramKey: "depth_m",
      rawValue: "100 м",
    });
    const { revision: r2, diff } = recalculateEstimateDraftRevision(r1, patch, {
      createdAt: "2026-07-07T00:01:00.000Z",
      revisionIndex: 2,
    });

    expect(r2.params.depth_m.value).toBe(100);
    expect(diff.changedRowsCount).toBeGreaterThan(0);
    expect(diff.changedRows.every((row) => affectedRows.has(row.rowId))).toBe(true);
  });
});
