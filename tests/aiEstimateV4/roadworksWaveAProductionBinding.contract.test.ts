import { validateAiEstimateBuyerPackageParity } from "../../src/lib/estimate/artifacts/validateAiEstimateBuyerPackageParity";
import { buildEstimateFromInlineWorkPrompt } from "../../src/lib/estimate/buildEstimateFromInlineWorkPrompt";
import type { EstimateDraftRevision } from "../../src/lib/estimate/estimateDraftRevisionContract";
import { createAiEstimateRuntime } from "../../src/lib/estimate/runtime/createAiEstimateRuntime";
import {
  ROADWORKS_WAVE_A_MIGRATION_VERSION,
  RoadworksWaveAProductionRegistry,
  roadworksWaveANaturalLanguageCases,
} from "../../src/lib/estimate/v4/roadworks";

describe("RoadworksWaveAProductionBindingContract", () => {
  test("owns all 35 registrations without legacy or generic owners", () => {
    expect(RoadworksWaveAProductionRegistry).toHaveLength(35);
    expect(new Set(RoadworksWaveAProductionRegistry.map((item) => item.workId)).size).toBe(35);
    for (const item of RoadworksWaveAProductionRegistry) {
      expect(item.passport.requestedCatalogWorkId).toBe(item.workId);
      expect(item.passport.canonicalWorkId).toBe(item.canonicalWorkId);
      expect(item.parameterSchema.length).toBeGreaterThan(0);
      expect(item.overlayId).toBe(`${item.workId}:overlay:v4`);
      expect(item.migrationVersion).toBe(ROADWORKS_WAVE_A_MIGRATION_VERSION);
      expect(item.technologyFamily).not.toMatch(/^(roadworks|asphalt)$/);
    }
  });

  test("selected catalog work keeps the same canonical ID for all 35 works", () => {
    for (const item of RoadworksWaveAProductionRegistry) {
      const result = buildEstimateFromInlineWorkPrompt({
        rawInput: `${item.professionalNameRu} 120 м2 толщина 50 мм`,
        selectedWorkKey: item.workId,
        selectedTemplateId: item.templateId,
      });
      expect(result.draft?.selectedWork?.selectedWorkKey).toBe(item.workId);
      expect(result.draft?.repairType).toBe(item.workId);
      expect(result.draft?.items.length).toBeGreaterThan(0);
      expect(result.draft?.items.every((row) =>
        row.sourceParameters?.requestedCatalogWorkId === item.workId &&
        row.sourceParameters?.canonicalWorkId === item.canonicalWorkId &&
        row.sourceParameters?.migrationVersion === ROADWORKS_WAVE_A_MIGRATION_VERSION
      )).toBe(true);
      expect(result.draft?.items.some((row) => row.sourceParameters?.asphaltV4 === true)).toBe(false);
    }
  });

  test("routes the existing 105 natural-language cases through the production resolver", () => {
    let resolved = 0;
    for (const item of RoadworksWaveAProductionRegistry) {
      for (const rawInput of roadworksWaveANaturalLanguageCases(item)) {
        const result = buildEstimateFromInlineWorkPrompt({ rawInput });
        expect(result.draft?.selectedWork?.selectedWorkKey).toBe(item.workId);
        expect(result.draft?.selectedWork?.selectedWorkRawInput).toBe(rawInput);
        expect(result.draft?.items[0]?.sourceParameters?.scopeProfile).toBe(item.scopeProfile);
        expect(result.draft?.items[0]?.sourceParameters?.parameterSnapshot).toBeDefined();
        resolved += 1;
      }
    }
    expect(resolved).toBe(105);
  });

  test("preserves canonical revision through serialization, PDF and procurement for all 35", () => {
    let durable = 0;
    let pdfParity = 0;
    let procurementParity = 0;
    for (const [index, item] of RoadworksWaveAProductionRegistry.entries()) {
      const runtime = createAiEstimateRuntime();
      const created = runtime.createDraft({
        estimateDraftId: `wave-a-production-${index}`,
        rawInput: `${item.professionalNameRu} 240 м2 толщина 60 мм`,
        selectedTemplateId: item.templateId,
        selectedWorkKey: item.workId,
        createdAt: "2026-07-23T00:00:00.000Z",
      });
      expect(created.revision.matchedFamily).toBe(item.workId);
      expect(created.revision.boq.rows.length).toBeGreaterThan(0);
      expect(created.revision.boq.rows.every((row) => row.rowId.startsWith(`${item.canonicalWorkId}:`))).toBe(true);

      const reopened = JSON.parse(JSON.stringify(created.revision)) as EstimateDraftRevision;
      expect(reopened.selectedTemplateId).toBe(created.revision.selectedTemplateId);
      expect(reopened.matchedFamily).toBe(item.workId);
      expect(reopened.boq).toEqual(created.revision.boq);
      expect(reopened.params).toEqual(created.revision.params);
      durable += 1;

      const pdf = runtime.buildPdfSnapshot({ revision: reopened });
      expect(pdf.snapshot.rows).toEqual(reopened.boq.rows);
      expect(pdf.pdf.rowsHash).toBe(pdf.snapshot.rowsHash);
      expect(pdf.pdf.revisionId).toBe(reopened.revisionId);
      pdfParity += 1;

      const buyer = runtime.buildBuyerPackage({ revision: pdf.revision, snapshot: pdf.snapshot });
      const expectedIds = reopened.boq.rows
        .filter((row) => row.includedInProcurement && !["work", "labor", "document", "other"].includes(row.rowType))
        .map((row) => row.rowId)
        .sort();
      expect(buyer.buyerPackage.items.map((row) => row.rowId).sort()).toEqual(expectedIds);
      expect(validateAiEstimateBuyerPackageParity({
        snapshot: buyer.snapshot,
        buyerPackage: buyer.buyerPackage,
      })).toBe(true);
      procurementParity += 1;
    }
    expect(durable).toBe(35);
    expect(pdfParity).toBe(35);
    expect(procurementParity).toBe(35);
  });

  test("recalculates each technology family as a new revision and invalidates old artifacts", () => {
    const representatives = [
      ...new Map(RoadworksWaveAProductionRegistry
        .filter((item) => item.scopeProfile === "standard" &&
          ["install", "lay", "compact", "repair", "level"].some((operation) => item.workId.includes(`_${operation}_`)))
        .map((item) => [item.technologyFamily, item])).values(),
    ];
    expect(representatives).toHaveLength(5);
    for (const [index, item] of representatives.entries()) {
      const runtime = createAiEstimateRuntime();
      const initial = runtime.createDraft({
        estimateDraftId: `wave-a-revision-${index}`,
        rawInput: `${item.professionalNameRu} 100 м2 толщина 50 мм`,
        selectedTemplateId: item.templateId,
        selectedWorkKey: item.workId,
        createdAt: "2026-07-23T01:00:00.000Z",
      });
      const withPdf = runtime.buildPdfSnapshot({ revision: initial.revision });
      const beforeById = new Map(withPdf.revision.boq.rows.map((row) => [row.rowId, row.quantity]));
      const changed = runtime.applyParameterOverride({
        revision: withPdf.revision,
        operation: "update_param",
        paramKey: "area_m2",
        rawValue: "200",
        createdAt: "2026-07-23T01:01:00.000Z",
        revisionIndex: 2,
      });
      expect(changed.revision.previousRevisionId).toBe(initial.revision.revisionId);
      expect(changed.revision.matchedFamily).toBe(item.workId);
      expect(changed.revision.selectedTemplateId).toBe(item.templateId);
      expect(changed.revision.artifacts.pdfArtifactId).toBeNull();
      expect(changed.revision.artifacts.buyerHandoffId).toBeNull();
      expect(changed.revision.boq.rows.some((row) => beforeById.get(row.rowId) !== row.quantity)).toBe(true);
      expect(changed.revision.boq.rows.every((row) => row.rowId.startsWith(`${item.canonicalWorkId}:`))).toBe(true);
    }
  });

  test("keeps ambiguous scope/domain records conditional without a certified Asphalt BOQ", () => {
    const conditional = RoadworksWaveAProductionRegistry.filter((item) =>
      item.catalogClassification === "DOMAIN_REVIEW_REQUIRED" ||
      ["prepare", "drain", "finish"].some((operation) => item.workId.includes(`_${operation}_`)),
    );
    expect(conditional.length).toBeGreaterThan(0);
    for (const item of conditional) {
      const result = buildEstimateFromInlineWorkPrompt({
        rawInput: `${item.professionalNameRu} 120 м2`,
        selectedWorkKey: item.workId,
        selectedTemplateId: item.templateId,
      });
      expect(result.draft?.selectedWork?.selectedWorkKey).toBe(item.workId);
      expect(result.draft?.items).toHaveLength(1);
      expect(result.draft?.items[0]).toMatchObject({
        category: "document",
        unitPrice: null,
        priceStatus: "PRICE_MISSING",
      });
      expect(result.draft?.items[0]?.sourceParameters?.executableAsphaltProfile).toBe(false);
      expect(result.draft?.items[0]?.sourceParameters?.applicabilityBlockers).toEqual(expect.arrayContaining([expect.any(String)]));
      expect(result.draft?.items[0]?.sourceParameters?.includedInProcurement).toBe(false);
    }
  });
});
