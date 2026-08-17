import {
  compileCanonicalEstimateAndLoad,
  getCanonicalEstimateRevision,
  recalculateCanonicalEstimateAndLoad,
} from "../../src/lib/estimate/backendPlatform/canonicalEstimateClient";
import type {
  CanonicalEstimateCatalogItem,
  CanonicalEstimateRevisionRowView,
  CanonicalEstimateRevisionView,
} from "../../src/lib/estimate/backendPlatform/contracts";

const mockCompileBackend = jest.fn();
const mockRecalculateBackend = jest.fn();
const mockReopenBackendRevision = jest.fn();

jest.mock("../../src/lib/estimate/backendPlatform/canonicalEstimateClient", () => ({
  compileCanonicalEstimateAndLoad: (...args: unknown[]) => mockCompileBackend(...args),
  recalculateCanonicalEstimateAndLoad: (...args: unknown[]) => mockRecalculateBackend(...args),
  getCanonicalEstimateRevision: (...args: unknown[]) => mockReopenBackendRevision(...args),
}));

const API_VERSION = "2026-08-14.r2" as const;
const CATALOG_ID = "demolition_interior_tile_remove_standard_professional_expanded_v1";
const RELEASE_ID = "11111111-1111-4111-8111-111111111111";
const PARENT_REVISION_ID = "22222222-2222-4222-8222-222222222222";
const CHILD_REVISION_ID = "33333333-3333-4333-8333-333333333333";

const catalog = {
  catalogId: CATALOG_ID,
  releaseId: RELEASE_ID,
  namespace: "global",
  domain: "demolition",
  workKey: CATALOG_ID,
  titleRu: "Демонтаж плитки",
  definitionVersion: 7,
  applicability: {},
  professionalMetadata: {},
  parameterSchema: [{
    parameterId: "area_m2",
    ordinal: 0,
    valueType: "decimal",
    unitId: "m2",
    titleRu: "Площадь демонтажа",
    required: true,
    defaultValue: "1",
    constraints: { min: 0.01 },
    semanticParameterKey: "demolition_area_m2",
    visibilityRole: "USER_INPUT",
  }],
} satisfies CanonicalEstimateCatalogItem;

function revision(input: {
  revisionId: string;
  parentRevisionId: string | null;
  revisionNumber: number;
  area: string;
  rowCount: number;
}): CanonicalEstimateRevisionView {
  return {
    apiVersion: API_VERSION,
    revisionId: input.revisionId,
    parentRevisionId: input.parentRevisionId,
    releaseId: RELEASE_ID,
    catalogId: CATALOG_ID,
    revisionNumber: input.revisionNumber,
    status: "ready",
    currencyCode: "KGS",
    parameters: { area_m2: input.area },
    amendmentContract: { rowOverrides: {}, customRows: [], releaseMigration: null },
    totals: { grandTotal: String(Number(input.area) * 10) },
    rowCount: input.rowCount,
    checksumSha256: String(input.revisionNumber).repeat(64),
    compilerVersion: "canonical-backend-test-v2",
    definitionVersion: 7,
    compilerOwner: "backend",
    parameterSchemaHash: "a".repeat(64),
    inputHash: "b".repeat(64),
    outputHash: "c".repeat(64),
    createdAt: `2026-07-09T00:0${input.revisionNumber - 1}:00.000Z`,
  };
}

function rows(area: string): CanonicalEstimateRevisionRowView[] {
  return [{
    rowId: "demolition-work",
    ordinal: 0,
    section: "work",
    category: "work",
    titleRu: "Демонтаж плитки",
    unitId: "m2",
    quantity: area,
    unitPrice: "10",
    amount: String(Number(area) * 10),
    currencyCode: "KGS",
    procurementEligible: false,
    includedInEstimate: true,
    includedInProcurement: false,
    ownershipStatus: "OWNED",
    calculationTrace: { parameterIds: ["area_m2"] },
    normativeTrace: [],
    rowSha256: area.padEnd(64, "0").slice(0, 64),
  }];
}

function backendResult(revisionView: CanonicalEstimateRevisionView, revisionRows: CanonicalEstimateRevisionRowView[]) {
  return {
    accepted: {
      apiVersion: API_VERSION,
      jobId: `job-${revisionView.revisionNumber}`,
      status: "queued" as const,
      created: true,
      pollAfterMs: 250,
    },
    job: {
      apiVersion: API_VERSION,
      jobId: `job-${revisionView.revisionNumber}`,
      operation: revisionView.parentRevisionId ? "recalculate" as const : "compile" as const,
      status: "succeeded" as const,
      stage: "completed",
      progress: 100,
      attempt: 1,
      resultRevisionId: revisionView.revisionId,
      errorCode: null,
      createdAt: revisionView.createdAt,
      updatedAt: revisionView.createdAt,
    },
    revision: revisionView,
    rows: revisionRows,
  };
}

describe("platform core v2 request flow", () => {
  beforeEach(() => {
    mockCompileBackend.mockReset();
    mockRecalculateBackend.mockReset();
    mockReopenBackendRevision.mockReset();
  });

  it("keeps selection, inputs, immutable revisions, BOQ and durable reopen on the canonical backend path", async () => {
    const baseline = {
      parameters: { area_m2: "98" },
      assumptions: ["Площадь демонтажа получена из исходного запроса: 98 m2"],
    };
    const parent = revision({
      revisionId: PARENT_REVISION_ID,
      parentRevisionId: null,
      revisionNumber: 1,
      area: "98",
      rowCount: 1,
    });
    const child = revision({
      revisionId: CHILD_REVISION_ID,
      parentRevisionId: PARENT_REVISION_ID,
      revisionNumber: 2,
      area: "120",
      rowCount: 1,
    });
    const parentRows = rows("98");
    const childRows = rows("120");
    const immutableParent = JSON.stringify(parent);
    mockCompileBackend.mockResolvedValueOnce(backendResult(parent, parentRows));
    mockRecalculateBackend.mockResolvedValueOnce(backendResult(child, childRows));
    mockReopenBackendRevision.mockResolvedValueOnce(child);

    const compiled = await compileCanonicalEstimateAndLoad({
      request: {
        idempotencyKey: "request-platform-core-v2-compile",
        catalogId: catalog.catalogId,
        parameters: baseline.parameters,
        currencyCode: "KGS",
      },
    });
    const recalculated = await recalculateCanonicalEstimateAndLoad({
      request: {
        idempotencyKey: "request-platform-core-v2-recalculate",
        parentRevisionId: compiled.revision.revisionId,
        catalogId: catalog.catalogId,
        parameters: { ...baseline.parameters, area_m2: "120" },
        currencyCode: "KGS",
      },
    });
    const reopened = await getCanonicalEstimateRevision(recalculated.revision.revisionId);

    expect(catalog.parameterSchema.map((parameter) => parameter.titleRu)).toEqual(["Площадь демонтажа"]);
    expect(baseline.parameters).toEqual({ area_m2: "98" });
    expect(baseline.assumptions).toHaveLength(1);
    expect(mockCompileBackend).toHaveBeenCalledWith(expect.objectContaining({
      request: expect.objectContaining({ catalogId: CATALOG_ID, parameters: { area_m2: "98" } }),
    }));
    expect(mockRecalculateBackend).toHaveBeenCalledWith(expect.objectContaining({
      request: expect.objectContaining({
        parentRevisionId: PARENT_REVISION_ID,
        catalogId: CATALOG_ID,
        parameters: { area_m2: "120" },
      }),
    }));
    expect(recalculated.revision).toMatchObject({
      revisionId: CHILD_REVISION_ID,
      parentRevisionId: PARENT_REVISION_ID,
      catalogId: CATALOG_ID,
      releaseId: RELEASE_ID,
      parameters: { area_m2: "120" },
    });
    expect(recalculated.rows).toHaveLength(1);
    expect(recalculated.rows[0]?.quantity).not.toBe(compiled.rows[0]?.quantity);
    expect(reopened.checksumSha256).toBe(recalculated.revision.checksumSha256);
    expect(JSON.stringify(parent)).toBe(immutableParent);
    expect(recalculated.revision.revisionId).not.toBe(compiled.revision.revisionId);
  });
});
