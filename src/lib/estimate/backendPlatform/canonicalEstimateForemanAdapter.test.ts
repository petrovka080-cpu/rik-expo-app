import { buildRequestEstimateProfessionalRowEvidence } from "../../../features/consumerRepair/requestEstimateViewModel";
import type { ConsumerRepairRequestItem } from "../../consumerRequests/consumerRequestTypes";
import { buildStructuredEstimateRequestDraft } from "../../estimateStructuredPipeline/structuredEstimateRequestBinding";
import {
  ESTIMATE_PLATFORM_API_VERSION,
  type CanonicalEstimateCatalogItem,
  type CanonicalEstimateRevisionRowView,
  type CanonicalEstimateRevisionView,
} from "./contracts";
import {
  adaptCanonicalCompilationToAssistantProjection,
  adaptCanonicalRevisionToStructuredEstimate,
} from "./canonicalEstimateForemanAdapter";
import { CANONICAL_ESTIMATE_REVISION_CONTRACT_VERSION } from "./canonicalEstimateRevisionWriter";

describe("canonical estimate consumer professional proof", () => {
  it("carries source-confirmed parameter requirements into preliminary rows", () => {
    const catalog: CanonicalEstimateCatalogItem = {
      catalogId: "source-managed-need-catalog",
      releaseId: "22222222-2222-4222-8222-222222222222",
      namespace: "global",
      workKey: "source-managed-work",
      titleRu: "Уплотнение асфальта",
      domain: "roadworks",
      definitionVersion: 1,
      applicability: {},
      professionalMetadata: {},
      parameterSchema: [{
        parameterId: "machine_roller_productivity_m2_per_machine_hour",
        ordinal: 1,
        valueType: "decimal",
        unitId: "m2_machine_hour",
        titleRu: "Производительность катка",
        required: true,
        preliminaryCompilationAllowed: true,
        defaultValue: null,
        constraints: { min: 0.001 },
        visibilityRole: "INTERNAL_ONLY",
        valueSourceRole: "NORM_REQUIRED_BUT_PROJECT_SELECTED",
        formulaConsumers: ["roller-hours"],
      }],
    };
    const revision: CanonicalEstimateRevisionView = {
      apiVersion: ESTIMATE_PLATFORM_API_VERSION,
      revisionId: "11111111-1111-4111-8111-111111111111",
      parentRevisionId: null,
      releaseId: catalog.releaseId,
      catalogId: catalog.catalogId,
      revisionNumber: 1,
      status: "ready",
      sourceRequestText: "Уплотнить асфальт 120 м2",
      displayTitleRu: catalog.titleRu,
      primaryMeasureParameterId: "area_m2",
      primaryMeasureValue: "120",
      primaryMeasureUnitId: "m2",
      currencyCode: "KGS",
      amendmentContract: { rowOverrides: {}, customRows: [], releaseMigration: null },
      preliminaryNeeds: [{
        rowId: "roller",
        ordinal: 0,
        section: "Механизмы",
        category: "Механизмы",
        titleRu: "Каток",
        unitId: "machine_hour",
        quantity: null,
        unitPrice: null,
        needState: "QUANTITY_REQUIRED",
        missingParameterIds: ["machine_roller_productivity_m2_per_machine_hour"],
        selected: true,
        procurementEligible: false,
        formulaId: "roller-hours",
        calculationTrace: {},
        normativeTrace: [],
        needSha256: "d".repeat(64),
      }],
      totals: { amount: "0" },
      rowCount: 0,
      checksumSha256: "a".repeat(64),
      compilerVersion: "canonical-estimate-compile-core-r1",
      parameters: { area_m2: 120 },
      createdAt: "2026-09-11T00:00:00.000Z",
    };

    const draft = buildStructuredEstimateRequestDraft(
      adaptCanonicalRevisionToStructuredEstimate({ catalog, revision, rows: [] }),
    );

    expect(draft.items[0]?.sourceParameters?.missingParameterRequirements).toEqual([expect.objectContaining({
      parameterId: "machine_roller_productivity_m2_per_machine_hour",
      sourceConfirmationRequired: true,
      visibilityRole: "INTERNAL_ONLY",
    })]);
  });

  it("projects an unresolved manual catalog row into the editable draft but not payable PDF rows", () => {
    const catalog: CanonicalEstimateCatalogItem = {
      catalogId: "manual-need-catalog",
      releaseId: "22222222-2222-4222-8222-222222222222",
      namespace: "global",
      workKey: "manual-need-work",
      titleRu: "Контрольная работа",
      domain: "interior_finishes",
      definitionVersion: 1,
      applicability: {},
      professionalMetadata: {},
      parameterSchema: [],
    };
    const revision: CanonicalEstimateRevisionView = {
      apiVersion: ESTIMATE_PLATFORM_API_VERSION,
      revisionId: "11111111-1111-4111-8111-111111111111",
      parentRevisionId: null,
      releaseId: catalog.releaseId,
      catalogId: catalog.catalogId,
      revisionNumber: 1,
      status: "ready",
      sourceRequestText: "Контрольная работа",
      displayTitleRu: catalog.titleRu,
      primaryMeasureParameterId: "area_m2",
      primaryMeasureValue: "1",
      primaryMeasureUnitId: "m2",
      currencyCode: "KGS",
      amendmentContract: { rowOverrides: {}, customRows: [], releaseMigration: null },
      preliminaryNeeds: [{
        rowId: "manual:catalog-rental",
        ordinal: 0,
        section: "Механизмы",
        category: "Механизмы",
        titleRu: "Аренда шлифмашины",
        unitId: "shift",
        quantity: null,
        unitPrice: "900",
        needState: "QUANTITY_REQUIRED",
        missingParameterIds: [],
        selected: true,
        procurementEligible: true,
        formulaId: "manual_custom_quantity",
        calculationTrace: { manualAmendment: { kind: "manual" } },
        normativeTrace: [],
        needSha256: "d".repeat(64),
      }],
      totals: { amount: "0" },
      rowCount: 0,
      checksumSha256: "a".repeat(64),
      compilerVersion: "canonical-estimate-compile-core-r1",
      parameters: { area_m2: 1 },
      createdAt: "2026-09-08T00:00:00.000Z",
    };

    const payload = adaptCanonicalRevisionToStructuredEstimate({ catalog, revision, rows: [] });
    const draft = buildStructuredEstimateRequestDraft(payload);

    expect(payload.rows).toHaveLength(0);
    expect(payload.pdf.rows).toHaveLength(0);
    expect(draft.items).toHaveLength(1);
    expect(draft.items[0]).toMatchObject({
      itemType: "service",
      titleRu: "Аренда шлифмашины",
      quantity: null,
      unitPrice: 900,
      sourceParameters: {
        rowCode: "manual:catalog-rental",
        canonicalBackendOwnershipStatus: "PRELIMINARY_NEED",
        canonicalPreliminaryNeed: true,
        includedInProcurement: false,
        payable: false,
      },
    });
  });

  it("projects backend formula dependencies and exact normative locator into the consumer row", () => {
    const catalog: CanonicalEstimateCatalogItem = {
      catalogId: "drywall-test",
      releaseId: "22222222-2222-4222-8222-222222222222",
      namespace: "global",
      workKey: "drywall-test",
      titleRu: "Заделка стыков",
      domain: "interior_finishes",
      definitionVersion: 1,
      applicability: {},
      professionalMetadata: {},
      parameterSchema: [],
    };
    const revision: CanonicalEstimateRevisionView = {
      apiVersion: ESTIMATE_PLATFORM_API_VERSION,
      revisionId: "revision-child",
      parentRevisionId: "revision-parent",
      releaseId: "release-test",
      catalogId: catalog.catalogId,
      revisionNumber: 2,
      status: "ready",
      sourceRequestText: "Заделать стыки",
      displayTitleRu: catalog.titleRu,
      currencyCode: "KGS",
      amendmentContract: { rowOverrides: {}, customRows: [], releaseMigration: null },
      totals: { amount: "1255" },
      rowCount: 1,
      checksumSha256: "a".repeat(64),
      compilerVersion: "canonical-estimate-compile-core-r1",
      formulaGraphVersion: "formula-r1",
      parameterSchemaHash: "b".repeat(64),
      parameters: { joint_length_m: 10 },
      createdAt: "2026-08-19T00:00:00.000Z",
    };
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
    const draftItem = buildStructuredEstimateRequestDraft(payload).items[0];
    if (!draftItem) throw new Error("canonical adapter did not project a request item");
    const item: ConsumerRepairRequestItem = {
      ...draftItem,
      id: "request-item-1",
      requestDraftId: "request-draft-1",
      currency: draftItem.currency ?? "KGS",
      source: draftItem.source ?? "reference_price_book",
      editableByConsumer: true,
      createdAt: "2026-08-19T00:00:00.000Z",
    };
    const proof = buildRequestEstimateProfessionalRowEvidence(item);

    expect(item.titleRu).toBe(row.titleRu);
    expect(proof).not.toBeNull();
    expect(proof?.parameterLabel).toContain("joint length");
    expect(proof?.normativeLabel).toContain("SELECTED_DRYWALL_SYSTEM_PASSPORT_R3");
    expect(proof?.normativeLabel).toContain("Технический лист: фактический расход материала.");
    expect(proof?.formulaLabel).toContain("Результат: 10 кг");
  });

  it("projects backend sections and AI surface from one immutable compilation", () => {
    const catalog: CanonicalEstimateCatalogItem = {
      catalogId: "r41-surface-test",
      releaseId: "22222222-2222-4222-8222-222222222222",
      namespace: "global",
      workKey: "paving-stone",
      titleRu: "Укладка брусчатки",
      domain: "landscaping",
      definitionVersion: 1,
      applicability: {},
      professionalMetadata: {},
      parameterSchema: [],
    };
    const revision: CanonicalEstimateRevisionView = {
      apiVersion: ESTIMATE_PLATFORM_API_VERSION,
      revisionId: "11111111-1111-4111-8111-111111111111",
      parentRevisionId: null,
      releaseId: "22222222-2222-4222-8222-222222222222",
      catalogId: catalog.catalogId,
      revisionNumber: 1,
      status: "ready",
      sourceRequestText: "смета на укладку брусчатки на 587 кв м",
      displayTitleRu: catalog.titleRu,
      currencyCode: "KGS",
      amendmentContract: { rowOverrides: {}, customRows: [], releaseMigration: null },
      totals: { amount: "0" },
      rowCount: 3,
      checksumSha256: "d".repeat(64),
      compilerVersion: "canonical-estimate-compile-core-r1",
      formulaGraphVersion: "formula-r1",
      parameterSchemaHash: "e".repeat(64),
      parameters: { area_m2: 587 },
      createdAt: "2026-08-23T00:00:00.000Z",
    };
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

  it("projects the immutable primary measure instead of treating the first BOM row as project scope", () => {
    const catalog = {
      catalogId: "roof-test",
      releaseId: "22222222-2222-4222-8222-222222222222",
      namespace: "global",
      workKey: "roof-test",
      titleRu: "Кровельные работы",
      domain: "roofing",
      definitionVersion: 1,
      applicability: {},
      professionalMetadata: {},
      parameterSchema: [],
    } satisfies CanonicalEstimateCatalogItem;
    const revision = {
      apiVersion: ESTIMATE_PLATFORM_API_VERSION,
      revisionId: "11111111-1111-4111-8111-111111111111",
      parentRevisionId: null,
      releaseId: catalog.releaseId,
      catalogId: catalog.catalogId,
      revisionNumber: 1,
      status: "ready",
      sourceRequestText: "Кровельные работы 200 квадратных метров",
      displayTitleRu: "Кровельные работы — 200 м²",
      primaryMeasureParameterId: "area_m2",
      primaryMeasureValue: "200",
      primaryMeasureUnitId: "m2",
      revisionContractVersion: CANONICAL_ESTIMATE_REVISION_CONTRACT_VERSION,
      currencyCode: "KGS",
      amendmentContract: { rowOverrides: {}, customRows: [], releaseMigration: null },
      totals: { amount: "0" },
      rowCount: 1,
      checksumSha256: "d".repeat(64),
      compilerVersion: "canonical-estimate-compile-core-r1",
      formulaGraphVersion: "formula-r1",
      parameterSchemaHash: "e".repeat(64),
      parameters: { area_m2: 200 },
      createdAt: "2026-09-04T00:00:00.000Z",
    } satisfies CanonicalEstimateRevisionView;
    const row = {
      rowId: "material:covering",
      ordinal: 0,
      section: "Материалы",
      category: "material",
      titleRu: "Металлочерепица",
      unitId: "m2",
      quantity: "216",
      unitPrice: null,
      amount: null,
      currencyCode: "KGS",
      procurementEligible: true,
      includedInEstimate: true,
      includedInProcurement: true,
      ownershipStatus: "OWNED",
      calculationTrace: { inputParameterIds: ["area_m2"] },
      normativeTrace: [],
      rowSha256: "f".repeat(64),
    } satisfies CanonicalEstimateRevisionRowView;

    const payload = adaptCanonicalRevisionToStructuredEstimate({ catalog, revision, rows: [row] });

    expect(payload.quantity).toMatchObject({ quantity: 200, unit: "m2" });
    expect(payload.sourceEstimate.input).toMatchObject({ volume: 200, unit: "m2" });
    expect(payload.rows[0]?.quantity).toBe(216);
  });

  it("fails closed when an R6 primary identity disagrees with resolved parameters", () => {
    const catalog = {
      catalogId: "identity-test",
      releaseId: "22222222-2222-4222-8222-222222222222",
      namespace: "global",
      workKey: "identity-test",
      titleRu: "Работа",
      domain: "test",
      definitionVersion: 1,
      applicability: {},
      professionalMetadata: {},
      parameterSchema: [],
    } satisfies CanonicalEstimateCatalogItem;
    const revision = {
      apiVersion: ESTIMATE_PLATFORM_API_VERSION,
      revisionId: "11111111-1111-4111-8111-111111111111",
      parentRevisionId: null,
      releaseId: catalog.releaseId,
      catalogId: catalog.catalogId,
      revisionNumber: 1,
      status: "ready",
      currencyCode: "KGS",
      parameters: { area_m2: 100 },
      primaryMeasureParameterId: "area_m2",
      primaryMeasureValue: "200",
      primaryMeasureUnitId: "m2",
      revisionContractVersion: CANONICAL_ESTIMATE_REVISION_CONTRACT_VERSION,
      amendmentContract: { rowOverrides: {}, customRows: [], releaseMigration: null },
      totals: { amount: "0" },
      rowCount: 0,
      checksumSha256: "d".repeat(64),
      compilerVersion: "canonical-estimate-compile-core-r1",
      createdAt: "2026-09-04T00:00:00.000Z",
    } satisfies CanonicalEstimateRevisionView;

    expect(() => adaptCanonicalRevisionToStructuredEstimate({ catalog, revision, rows: [] }))
      .toThrow(expect.objectContaining({ code: "CANONICAL_REVISION_IDENTITY_INVALID" }));
  });
});
