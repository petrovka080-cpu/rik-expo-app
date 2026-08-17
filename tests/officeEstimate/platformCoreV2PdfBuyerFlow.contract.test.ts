import {
  buildCanonicalEstimateArtifact,
  compileCanonicalEstimateAndLoad,
  recalculateCanonicalEstimateAndLoad,
} from "../../src/lib/estimate/backendPlatform/canonicalEstimateClient";
import type {
  CanonicalEstimateArtifactView,
  CanonicalEstimateRevisionRowView,
  CanonicalEstimateRevisionView,
} from "../../src/lib/estimate/backendPlatform/contracts";

const mockCompileBackend = jest.fn();
const mockRecalculateBackend = jest.fn();
const mockBuildArtifactBackend = jest.fn();

jest.mock("../../src/lib/estimate/backendPlatform/canonicalEstimateClient", () => ({
  compileCanonicalEstimateAndLoad: (...args: unknown[]) => mockCompileBackend(...args),
  recalculateCanonicalEstimateAndLoad: (...args: unknown[]) => mockRecalculateBackend(...args),
  buildCanonicalEstimateArtifact: (...args: unknown[]) => mockBuildArtifactBackend(...args),
}));

const API_VERSION = "2026-08-14.r2" as const;
const CATALOG_ID = "demolition_interior_tile_remove_standard_professional_expanded_v1";
const RELEASE_ID = "44444444-4444-4444-8444-444444444444";
const PARENT_REVISION_ID = "55555555-5555-4555-8555-555555555555";
const CHILD_REVISION_ID = "66666666-6666-4666-8666-666666666666";

function revision(input: {
  revisionId: string;
  parentRevisionId: string | null;
  revisionNumber: number;
  area: string;
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
    totals: { grandTotal: String(Number(input.area) * 25) },
    rowCount: 2,
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
  return [
    {
      rowId: "work-row",
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
      rowSha256: "d".repeat(64),
    },
    {
      rowId: "material-row",
      ordinal: 1,
      section: "material",
      category: "material",
      titleRu: "Мешок для строительного мусора",
      unitId: "pcs",
      quantity: String(Math.ceil(Number(area) / 2)),
      unitPrice: "30",
      amount: String(Math.ceil(Number(area) / 2) * 30),
      currencyCode: "KGS",
      procurementEligible: true,
      includedInEstimate: true,
      includedInProcurement: true,
      ownershipStatus: "OWNED",
      calculationTrace: { parameterIds: ["area_m2"] },
      normativeTrace: [],
      rowSha256: "e".repeat(64),
    },
  ];
}

function backendResult(revisionView: CanonicalEstimateRevisionView, revisionRows: CanonicalEstimateRevisionRowView[]) {
  return {
    accepted: {
      apiVersion: API_VERSION,
      jobId: `office-job-${revisionView.revisionNumber}`,
      status: "queued" as const,
      created: true,
      pollAfterMs: 250,
    },
    job: {
      apiVersion: API_VERSION,
      jobId: `office-job-${revisionView.revisionNumber}`,
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

function artifact(kind: "pdf" | "procurement"): CanonicalEstimateArtifactView {
  return {
    apiVersion: API_VERSION,
    artifactId: `${kind}-artifact-child`,
    revisionId: CHILD_REVISION_ID,
    releaseId: RELEASE_ID,
    kind,
    status: "ready",
    contentType: kind === "pdf" ? "application/pdf" : "application/json",
    byteSize: 1024,
    sha256: (kind === "pdf" ? "f" : "9").repeat(64),
    metadata: {
      revisionChecksumSha256: "2".repeat(64),
      sourceRowIds: ["work-row", "material-row"],
      procurementRowIds: kind === "procurement" ? ["material-row"] : undefined,
    },
    errorCode: null,
    createdAt: "2026-07-09T00:02:00.000Z",
    updatedAt: "2026-07-09T00:02:00.000Z",
    readyAt: "2026-07-09T00:02:00.000Z",
    signedUrl: `https://artifacts.example/${kind}`,
    signedUrlExpiresAt: "2026-07-09T01:02:00.000Z",
  };
}

describe("platform core v2 office PDF buyer flow", () => {
  beforeEach(() => {
    mockCompileBackend.mockReset();
    mockRecalculateBackend.mockReset();
    mockBuildArtifactBackend.mockReset();
  });

  it("projects PDF and procurement from the same latest canonical backend revision", async () => {
    const parent = revision({ revisionId: PARENT_REVISION_ID, parentRevisionId: null, revisionNumber: 1, area: "98" });
    const child = revision({ revisionId: CHILD_REVISION_ID, parentRevisionId: PARENT_REVISION_ID, revisionNumber: 2, area: "130" });
    const parentRows = rows("98");
    const childRows = rows("130");
    mockCompileBackend.mockResolvedValueOnce(backendResult(parent, parentRows));
    mockRecalculateBackend.mockResolvedValueOnce(backendResult(child, childRows));
    mockBuildArtifactBackend
      .mockResolvedValueOnce(artifact("pdf"))
      .mockResolvedValueOnce(artifact("procurement"));

    const compiled = await compileCanonicalEstimateAndLoad({
      request: {
        idempotencyKey: "office-platform-core-v2-compile",
        catalogId: CATALOG_ID,
        parameters: { area_m2: "98" },
        currencyCode: "KGS",
      },
    });
    const latest = await recalculateCanonicalEstimateAndLoad({
      request: {
        idempotencyKey: "office-platform-core-v2-recalculate",
        parentRevisionId: compiled.revision.revisionId,
        catalogId: CATALOG_ID,
        parameters: { area_m2: "130" },
        currencyCode: "KGS",
      },
    });
    const pdf = await buildCanonicalEstimateArtifact({
      revisionId: latest.revision.revisionId,
      kind: "pdf",
      idempotencyKey: "office-platform-core-v2-pdf",
    });
    const procurement = await buildCanonicalEstimateArtifact({
      revisionId: latest.revision.revisionId,
      kind: "procurement",
      idempotencyKey: "office-platform-core-v2-procurement",
    });

    expect(latest.revision).toMatchObject({
      parentRevisionId: PARENT_REVISION_ID,
      revisionId: CHILD_REVISION_ID,
      releaseId: RELEASE_ID,
      catalogId: CATALOG_ID,
      parameters: { area_m2: "130" },
    });
    expect(latest.rows).toHaveLength(latest.revision.rowCount);
    expect(pdf).toMatchObject({
      revisionId: CHILD_REVISION_ID,
      releaseId: RELEASE_ID,
      status: "ready",
      metadata: { sourceRowIds: latest.rows.map((row) => row.rowId) },
    });
    expect(procurement).toMatchObject({
      revisionId: CHILD_REVISION_ID,
      releaseId: RELEASE_ID,
      status: "ready",
      metadata: { procurementRowIds: ["material-row"] },
    });
    expect(latest.rows.filter((row) => row.includedInProcurement).map((row) => row.rowId)).toEqual(["material-row"]);
    expect(latest.rows.filter((row) => row.includedInProcurement).some((row) => row.category === "work")).toBe(false);
    expect(mockBuildArtifactBackend).toHaveBeenNthCalledWith(1, expect.objectContaining({
      revisionId: CHILD_REVISION_ID,
      kind: "pdf",
    }));
    expect(mockBuildArtifactBackend).toHaveBeenNthCalledWith(2, expect.objectContaining({
      revisionId: CHILD_REVISION_ID,
      kind: "procurement",
    }));
  });
});
