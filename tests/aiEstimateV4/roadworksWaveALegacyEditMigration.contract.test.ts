import { createAiEstimateRuntime } from "../../src/lib/estimate/runtime/createAiEstimateRuntime";
import type { ConsumerRepairDraftBundle } from "../../src/lib/consumerRequests";
import {
  RoadworksWaveAProductionRegistry,
  migrateLegacyRoadworkEditToWaveA,
  migrateRoadworksWaveABundleMetadata,
} from "../../src/lib/estimate/v4/roadworks";

describe("RoadworksWaveALegacyEditMigrationContract", () => {
  test("migrates eight legacy roadwork shapes without mutating history or silently dropping rows", () => {
    const representatives = [
      ...new Map(RoadworksWaveAProductionRegistry.map((item) => [item.technologyFamily, item])).values(),
    ];
    expect(representatives).toHaveLength(8);
    for (const [index, item] of representatives.entries()) {
      const runtime = createAiEstimateRuntime();
      const canonical = runtime.createDraft({
        estimateDraftId: `legacy-road-${index}`,
        rawInput: `${item.professionalNameRu} 100 м2 толщина 50 мм`,
        selectedTemplateId: item.templateId,
        selectedWorkKey: item.workId,
        createdAt: "2026-01-01T00:00:00.000Z",
      }).revision;
      const matching = canonical.boq.rows[0];
      const legacy = {
        ...canonical,
        revisionId: `legacy-revision-${index}`,
        selectedTemplateId: `legacy-road-template-${index}`,
        matchedFamily: `legacy-road-work-${index}`,
        artifacts: {
          snapshotId: `legacy-snapshot-${index}`,
          pdfArtifactId: `legacy-pdf-${index}`,
          buyerHandoffId: `legacy-procurement-${index}`,
          artifactsValidForRevisionId: `legacy-revision-${index}`,
        },
        boq: {
          ...canonical.boq,
          rows: [
            {
              ...matching,
              rowId: `legacy-row-mapped-${index}`,
              unitPrice: 777,
              priceStatus: "USER_PRICE_OVERRIDE" as const,
              priceSource: "user" as const,
              priceSourceLabel: "Ручная цена",
              sourceParameters: { legacyUnknownField: "preserve-in-history" },
            },
            {
              ...matching,
              rowId: `legacy-row-unmapped-${index}`,
              titleRu: `Несопоставленная историческая строка ${index}`,
              unitPrice: 999,
              priceStatus: "USER_PRICE_OVERRIDE" as const,
              priceSource: "user" as const,
              priceSourceLabel: "Ручная цена старой технологии",
              sourceParameters: { legacyUnknownField: "must-not-disappear" },
            },
          ],
        },
      };
      const before = structuredClone(legacy);
      const result = migrateLegacyRoadworkEditToWaveA({
        legacyRevision: legacy,
        canonicalWorkId: item.workId,
        rawInput: `${item.professionalNameRu} 150 м2 толщина 60 мм`,
        migrationTimestamp: "2026-07-23T02:00:00.000Z",
      });

      expect(result.historicalRevision).toEqual(before);
      expect(legacy).toEqual(before);
      expect(result.revision.previousRevisionId).toBe(legacy.revisionId);
      expect(result.revision.matchedFamily).toBe(item.workId);
      expect(result.metadata).toMatchObject({
        migratedFromLegacy: true,
        legacyWorkId: `legacy-road-work-${index}`,
        canonicalWorkId: item.workId,
        legacyRevisionId: legacy.revisionId,
        mappedRows: 1,
        unmappedRows: 1,
        preservedPrices: 1,
        invalidatedPrices: 1,
      });
      expect(result.RoadworksLegacyRowIdMap).toHaveLength(2);
      expect(result.unmappedHistoricalRows).toHaveLength(1);
      expect(result.unmappedHistoricalRows[0].sourceParameters?.legacyUnknownField).toBe("must-not-disappear");
      expect(result.revision.boq.rows.find((row) => row.rowId === matching.rowId)?.unitPrice).toBe(777);
      expect(result.revision.boq.rows.some((row) => row.unitPrice === 999)).toBe(false);
      expect(result.revision.artifacts.pdfArtifactId).toBeNull();
      expect(result.revision.artifacts.buyerHandoffId).toBeNull();

      const bundleBase = {
        draft: { id: `legacy-bundle-${index}` },
        estimateComments: [{
          id: `legacy-comment-${index}`,
          ownerUserId: "synthetic-owner",
          estimateId: `legacy-bundle-${index}`,
          revisionId: legacy.revisionId,
          rowId: `legacy-row-unmapped-${index}`,
          text: `Исторический комментарий ${index}`,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          deleted: false,
        }],
        estimateAttachments: [{
          id: `legacy-attachment-${index}`,
          ownerScope: "row" as const,
          estimateId: `legacy-bundle-${index}`,
          revisionId: legacy.revisionId,
          rowId: `legacy-row-mapped-${index}`,
          fileName: "synthetic.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 1234,
          contentHash: "synthetic-content-hash",
          storageReference: "redacted://legacy/reference",
          thumbnailReference: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          deleted: false,
          privacy: "redacted" as const,
          redacted: true,
        }],
      } as unknown as ConsumerRepairDraftBundle;
      const migratedBundle = migrateRoadworksWaveABundleMetadata({
        historicalBundle: bundleBase,
        targetBundle: { ...bundleBase, draft: { ...bundleBase.draft, id: `wave-a-bundle-${index}` } },
        legacyRevisionId: legacy.revisionId,
        newRevisionId: result.revision.revisionId,
        rowMap: result.RoadworksLegacyRowIdMap,
      });
      expect(migratedBundle.estimateComments?.[0]).toMatchObject({
        revisionId: legacy.revisionId,
        rowId: `legacy-row-unmapped-${index}`,
      });
      expect(migratedBundle.estimateAttachments?.[0]).toMatchObject({
        revisionId: result.revision.revisionId,
        rowId: matching.rowId,
        storageReference: "redacted://legacy/reference",
      });

      const pdf = runtime.buildPdfSnapshot({ revision: result.revision });
      const buyer = runtime.buildBuyerPackage({ revision: pdf.revision, snapshot: pdf.snapshot });
      expect(pdf.pdf.revisionId).toBe(result.revision.revisionId);
      expect(buyer.buyerPackage.items.every((row) => row.rowId !== `legacy-row-unmapped-${index}`)).toBe(true);
    }
  });
});
