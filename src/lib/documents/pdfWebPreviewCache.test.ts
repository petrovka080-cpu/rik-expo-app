import { IDBFactory } from "fake-indexeddb";

import { createPdfDocumentDescriptor } from "./pdfDocument";
import {
  clearDocumentSessions,
  createInMemoryDocumentPreviewSession,
  getDocumentSessionSnapshot,
} from "./pdfDocumentSessions";
import {
  __resetWebPdfPreviewCacheForTests,
  clearWebPdfPreviewCacheForSessionBoundary,
  persistWebPdfPreviewSession,
  restoreWebPdfPreviewSession,
} from "./pdfWebPreviewCache";
import { buildWebPdfPreviewCacheKey } from "./pdfWebPreviewIdentity";

describe("persistent web PDF preview cache", () => {
  const identity = {
    tenantId: "tenant-1",
    companyId: "company-1",
    userId: "user-1",
    sessionBoundaryId: "auth-session-1",
    revisionId: "revision-1",
    snapshotHash: "snapshot-1",
    rendererVersion: "renderer-1",
    locale: "ru-KG",
    currency: "KGS",
  };
  const originalDocument = globalThis.document;
  const originalIndexedDb = globalThis.indexedDB;
  const originalFetch = globalThis.fetch;
  const originalCreateObjectUrl = URL.createObjectURL;
  const originalRevokeObjectUrl = URL.revokeObjectURL;

  beforeEach(() => {
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {},
    });
    Object.defineProperty(globalThis, "indexedDB", {
      configurable: true,
      value: new IDBFactory(),
    });
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: jest.fn(() => "blob:restored-pdf"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: jest.fn(),
    });
  });

  afterEach(async () => {
    clearDocumentSessions();
    await __resetWebPdfPreviewCacheForTests();
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: originalDocument,
    });
    Object.defineProperty(globalThis, "indexedDB", {
      configurable: true,
      value: originalIndexedDb,
    });
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: originalFetch,
    });
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: originalCreateObjectUrl,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: originalRevokeObjectUrl,
    });
  });

  it("restores an exact short-route session after memory loss and reuses immutable bytes", async () => {
    const pdfBlob = new Blob(["%PDF-1.7\ncached"], {
      type: "application/pdf",
    });
    const fetchPdf = jest.fn(async () => ({
      ok: true,
      status: 200,
      blob: async () => pdfBlob,
    }));
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: fetchPdf,
    });
    const first = createInMemoryDocumentPreviewSession(
      createPdfDocumentDescriptor({
        uri: "blob:source-pdf",
        title: "Estimate",
        fileName: "pdf-immutable-1.pdf",
        documentType: "request",
        originModule: "reports",
        source: "generated",
        entityId: "request-1",
      }),
    );

    await expect(
      persistWebPdfPreviewSession({
        ...first,
        namespace: "consumer-repair-pdf:pdf-immutable-1",
        identity,
      }),
    ).resolves.toBe(true);

    const second = createInMemoryDocumentPreviewSession(
      createPdfDocumentDescriptor({
        uri: "blob:source-pdf",
        title: "Estimate",
        fileName: "pdf-immutable-1.pdf",
        documentType: "request",
        originModule: "reports",
        source: "generated",
        entityId: "request-1",
      }),
    );
    await persistWebPdfPreviewSession({
      ...second,
      namespace: "consumer-repair-pdf:pdf-immutable-1",
      identity,
    });
    expect(fetchPdf).toHaveBeenCalledTimes(1);

    clearDocumentSessions();
    expect(getDocumentSessionSnapshot(first.session.sessionId).session).toBeNull();
    await expect(
      restoreWebPdfPreviewSession(first.session.sessionId),
    ).resolves.toBe(true);

    const restored = getDocumentSessionSnapshot(first.session.sessionId);
    expect(restored.session?.sessionId).toBe(first.session.sessionId);
    expect(restored.asset).toMatchObject({
      uri: "blob:restored-pdf",
      objectUrlOwnership: "document-session",
      fileName: "pdf-immutable-1.pdf",
      documentType: "request",
      originModule: "reports",
      entityId: "request-1",
    });
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);

    clearDocumentSessions();
    await clearWebPdfPreviewCacheForSessionBoundary();
    await expect(
      restoreWebPdfPreviewSession(first.session.sessionId),
    ).resolves.toBe(false);
  });

  it("rejects a cross-user/company cache activation until the lifecycle boundary is cleared", async () => {
    const pdfBlob = new Blob(["%PDF-1.7\ncached"], { type: "application/pdf" });
    Object.defineProperty(globalThis, "fetch", {
      configurable: true,
      value: jest.fn(async () => ({
        ok: true,
        status: 200,
        blob: async () => pdfBlob,
      })),
    });
    const first = createInMemoryDocumentPreviewSession(
      createPdfDocumentDescriptor({
        uri: "blob:source-pdf",
        title: "Estimate",
        fileName: "pdf-immutable-1.pdf",
        documentType: "request",
        originModule: "reports",
        source: "generated",
      }),
    );
    await persistWebPdfPreviewSession({
      ...first,
      namespace: "consumer-repair-pdf:pdf-immutable-1",
      identity,
    });

    await expect(
      persistWebPdfPreviewSession({
        ...first,
        namespace: "consumer-repair-pdf:pdf-immutable-1",
        identity: {
          ...identity,
          companyId: "company-2",
          userId: "user-2",
          sessionBoundaryId: "auth-session-2",
        },
      }),
    ).rejects.toThrow("principal boundary changed");
  });

  it.each([
    ["tenantId", "tenant-2"],
    ["companyId", "company-2"],
    ["userId", "user-2"],
    ["sessionBoundaryId", "auth-session-2"],
    ["revisionId", "revision-2"],
    ["snapshotHash", "snapshot-2"],
    ["rendererVersion", "renderer-2"],
    ["locale", "ky-KG"],
    ["currency", "USD"],
  ] as const)("changes the immutable cache key when %s changes", (field, value) => {
    const original = buildWebPdfPreviewCacheKey({
      namespace: "consumer-repair-pdf:pdf-immutable-1",
      identity,
    });
    const changed = buildWebPdfPreviewCacheKey({
      namespace: "consumer-repair-pdf:pdf-immutable-1",
      identity: { ...identity, [field]: value },
    });
    expect(changed).not.toBe(original);
  });
});
