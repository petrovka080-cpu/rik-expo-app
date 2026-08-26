import { buildRequestEstimateProfessionalRowEvidence } from "../../../features/consumerRepair/requestEstimateViewModel";
import type { ConsumerRepairRequestItem } from "../../consumerRequests/consumerRequestTypes";
import { buildStructuredEstimateRequestDraft } from "../../estimateStructuredPipeline/structuredEstimateRequestBinding";
import type {
  CanonicalEstimateCatalogItem,
  CanonicalEstimateRevisionRowView,
  CanonicalEstimateRevisionView,
} from "./contracts";
import {
  adaptCanonicalCompilationToAssistantProjection,
  adaptCanonicalRevisionToStructuredEstimate,
} from "./canonicalEstimateForemanAdapter";

describe("canonical estimate consumer professional proof", () => {
  it("projects backend formula dependencies and exact normative locator into the consumer row", () => {
    const catalog = {
      catalogId: "drywall-test",
      workKey: "drywall-test",
      titleRu: "Заделка стыков",
      domain: "interior_finishes",
    } as unknown as CanonicalEstimateCatalogItem;
    const revision = {
      revisionId: "revision-child",
      parentRevisionId: "revision-parent",
      releaseId: "release-test",
      catalogId: catalog.catalogId,
      sourceRequestText: "Заделать стыки",
      displayTitleRu: catalog.titleRu,
      currencyCode: "KGS",
      totals: { amount: "1255" },
      checksumSha256: "a".repeat(64),
      formulaGraphVersion: "formula-r1",
      parameterSchemaHash: "b".repeat(64),
      parameters: { joint_length_m: 10 },
      createdAt: "2026-08-19T00:00:00.000Z",
    } as unknown as CanonicalEstimateRevisionView;
    const row = {
      rowId: "material:joint-compound",
      ordinal: 0,
      section: "Материалы",
      category: "material",
      titleRu: "Шпаклёвка стыков",
      unitId: "kg",
      quantity: "10",
      unitPrice: "125.5",
      amount: "1255",
      currencyCode: "KGS",
      procurementEligible: true,
      includedInEstimate: true,
      includedInProcurement: true,
      ownershipStatus: "OWNED",
      calculationTrace: {
        formulaId: "formula:joint-compound",
        inputParameterIds: ["joint_length_m", "compound_kg_m"],
      },
      normativeTrace: [{
        sourceId: "SELECTED_DRYWALL_SYSTEM_PASSPORT_R3",
        exactLocator: "Технический лист: фактический расход материала.",
      }],
      rowSha256: "c".repeat(64),
    } satisfies CanonicalEstimateRevisionRowView;

    const payload = adaptCanonicalRevisionToStructuredEstimate({ catalog, revision, rows: [row] });
    const item = buildStructuredEstimateRequestDraft(payload).items[0] as unknown as ConsumerRepairRequestItem;
    const proof = buildRequestEstimateProfessionalRowEvidence(item);

    expect(item.titleRu).toBe(row.titleRu);
    expect(proof).not.toBeNull();
    expect(proof?.parameterLabel).toContain("joint length");
    expect(proof?.normativeLabel).toContain("SELECTED_DRYWALL_SYSTEM_PASSPORT_R3");
    expect(proof?.normativeLabel).toContain("Технический лист: фактический расход материала.");
    expect(proof?.formulaLabel).toContain("Результат: 10 кг");
  });

  it("projects backend sections and AI surface from one immutable compilation", () => {
    const catalog = {
      catalogId: "r41-surface-test",
      workKey: "paving-stone",
      titleRu: "Укладка брусчатки",
      domain: "landscaping",
    } as unknown as CanonicalEstimateCatalogItem;
    const revision = {
      revisionId: "11111111-1111-4111-8111-111111111111",
      parentRevisionId: null,
      releaseId: "22222222-2222-4222-8222-222222222222",
      catalogId: catalog.catalogId,
      revisionNumber: 1,
      sourceRequestText: "смета на укладку брусчатки на 587 кв м",
      displayTitleRu: catalog.titleRu,
      currencyCode: "KGS",
      totals: { amount: "0" },
      checksumSha256: "d".repeat(64),
      formulaGraphVersion: "formula-r1",
      parameterSchemaHash: "e".repeat(64),
      parameters: { area_m2: 587 },
      createdAt: "2026-08-23T00:00:00.000Z",
    } as unknown as CanonicalEstimateRevisionView;
    const makeRow = (
      rowId: string,
      section: string,
      category: string,
      titleRu: string,
    ): CanonicalEstimateRevisionRowView => ({
      rowId,
      ordinal: 0,
      section,
      category,
      titleRu,
      unitId: "m2",
      quantity: "587",
      unitPrice: null,
      amount: null,
      currencyCode: "KGS",
      procurementEligible: true,
      includedInEstimate: true,
      includedInProcurement: true,
      ownershipStatus: "OWNED",
      calculationTrace: {},
      normativeTrace: [],
      rowSha256: "f".repeat(64),
    });
    const rows = [
      makeRow("material:paver", "Материалы", "paving", "Бетонная тротуарная плитка"),
      makeRow("equipment:plate", "Оборудование", "machine", "Виброплита с защитным ковриком"),
      makeRow("delivery:paver", "Доставка", "trip", "Доставка плитки на объект"),
    ];

    const projection = adaptCanonicalCompilationToAssistantProjection({
      backendCanonical: true,
      catalog,
      revision,
      rows,
    });

    expect(projection?.payload.rows.map((row) => row.sectionType)).toEqual([
      "materials",
      "equipment",
      "delivery",
    ]);
    expect(projection?.presentation.rows.map((row) => row.name)).toEqual(rows.map((row) => row.titleRu));
    expect(projection?.presentation.rows.every((row) => row.sourceLabel === "Утверждённая технологическая карта")).toBe(true);
    expect(projection?.payload.rows.every((row) => !row.sourceId.includes(revision.revisionId))).toBe(true);
    expect(projection?.payload.rows.every((row) => !row.displayUnitPrice.includes("PRICE_MISSING"))).toBe(true);
    expect(projection?.estimatePdfSource).toBeTruthy();
    expect(projection?.revisionId).toBe(revision.revisionId);
    expect(projection?.releaseId).toBe(revision.releaseId);
  });
});
