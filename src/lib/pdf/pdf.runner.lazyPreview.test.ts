/* eslint-disable import/first */
const mockPrepareAndPreviewPdfDocument = jest.fn();
const mockOpenHtmlAsPdfUniversal = jest.fn();
const mockNormalizeRuTextForHtml = jest.fn((html: string) => html);

jest.mock("../documents/pdfDocumentActions", () => ({
  preparePdfDocument: jest.fn(),
  prepareAndPreviewPdfDocument: (...args: unknown[]) =>
    mockPrepareAndPreviewPdfDocument(...args),
  previewPdfDocument: jest.fn(),
  sharePdfDocument: jest.fn(),
}));

jest.mock("../api/pdf", () => ({
  openHtmlAsPdfUniversal: (...args: unknown[]) => mockOpenHtmlAsPdfUniversal(...args),
}));

jest.mock("../text/encoding", () => ({
  normalizeRuTextForHtml: (html: string) => mockNormalizeRuTextForHtml(html),
}));

import { prepareAndPreviewGeneratedPdfFromDescriptorFactory } from "./pdf.runner";
import type { DocumentDescriptor } from "../documents/pdfDocument";
import type { PdfDeliveryBoundary } from "./withPdfActorBoundary";

const baseDescriptor: DocumentDescriptor = {
  uri: "https://example.com/foreman-request.pdf",
  fileSource: {
    kind: "remote-url",
    uri: "https://example.com/foreman-request.pdf",
  },
  title: "Request PDF",
  fileName: "request.pdf",
  mimeType: "application/pdf",
  documentType: "request",
  originModule: "foreman",
  source: "generated",
  entityId: "REQ-1",
};

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const createBusyRunMock = () => {
  const busyRunMock = jest.fn(async (fn: () => Promise<unknown>, _opts?: { key?: string; label?: string; minMs?: number }) => await fn());
  const busyRun = busyRunMock as unknown as <T>(
    fn: () => Promise<T>,
    opts?: { key?: string; label?: string; minMs?: number },
  ) => Promise<T>;
  return { busyRun, busyRunMock };
};

describe("prepareAndPreviewGeneratedPdfFromDescriptorFactory", () => {
  beforeEach(() => {
    mockPrepareAndPreviewPdfDocument.mockReset();
    mockOpenHtmlAsPdfUniversal.mockReset();
    mockNormalizeRuTextForHtml.mockClear();
  });

  it("runs descriptor creation inside the busy guard and avoids a nested busy run", async () => {
    mockPrepareAndPreviewPdfDocument.mockResolvedValueOnce(baseDescriptor);
    const createDescriptor = jest.fn(async () => baseDescriptor);
    const { busyRun, busyRunMock } = createBusyRunMock();
    const router = { push: jest.fn() };
    const onBeforeNavigate = jest.fn();

    const result = await prepareAndPreviewGeneratedPdfFromDescriptorFactory({
      busy: {
        run: busyRun,
      },
      supabase: {},
      key: "pdf:request:REQ-1",
      label: "Opening PDF...",
      createDescriptor,
      router,
      onBeforeNavigate,
    });

    expect(result).toBe(baseDescriptor);
    expect(busyRunMock).toHaveBeenCalledWith(expect.any(Function), {
      key: "pdf:request:REQ-1",
      label: "Opening PDF...",
      minMs: 200,
    });
    expect(createDescriptor).toHaveBeenCalledTimes(1);
    expect(mockPrepareAndPreviewPdfDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        busy: undefined,
        supabase: {},
        key: "pdf:request:REQ-1",
        label: "Opening PDF...",
        descriptor: baseDescriptor,
        router,
        openFlowStartedAt: expect.any(Number),
        onBeforeNavigate,
      }),
    );
  });

  it("coalesces duplicate preview taps before descriptor creation resolves", async () => {
    const descriptor = createDeferred<DocumentDescriptor>();
    const createDescriptor = jest.fn(() => descriptor.promise);
    const { busyRun, busyRunMock } = createBusyRunMock();
    mockPrepareAndPreviewPdfDocument.mockImplementation(
      async (args: { descriptor: DocumentDescriptor }) => args.descriptor,
    );

    const first = prepareAndPreviewGeneratedPdfFromDescriptorFactory({
      busy: {
        run: busyRun,
      },
      supabase: {},
      key: "pdf:request:REQ-2",
      label: "Opening PDF...",
      createDescriptor,
      router: { push: jest.fn() },
    });
    const second = prepareAndPreviewGeneratedPdfFromDescriptorFactory({
      busy: {
        run: busyRun,
      },
      supabase: {},
      key: "pdf:request:REQ-2",
      label: "Opening PDF...",
      createDescriptor,
      router: { push: jest.fn() },
    });

    for (let i = 0; i < 20 && createDescriptor.mock.calls.length === 0; i++) await Promise.resolve();
    expect(createDescriptor).toHaveBeenCalledTimes(1);
    expect(busyRunMock).toHaveBeenCalledTimes(1);
    expect(mockPrepareAndPreviewPdfDocument).not.toHaveBeenCalled();

    descriptor.resolve({
      ...baseDescriptor,
      entityId: "REQ-2",
      fileName: "request-2.pdf",
    });

    await expect(Promise.all([first, second])).resolves.toEqual([
      expect.objectContaining({ entityId: "REQ-2", fileName: "request-2.pdf" }),
      expect.objectContaining({ entityId: "REQ-2", fileName: "request-2.pdf" }),
    ]);
    expect(mockPrepareAndPreviewPdfDocument).toHaveBeenCalledTimes(1);
  });

  it.each(["", "   ", undefined])("does not coalesce absent/empty key %p with or without an actor boundary", async key => {
    for (const guarded of [false, true]) {
      const pending = [createDeferred<DocumentDescriptor>(), createDeferred<DocumentDescriptor>()];
      const factories = pending.map(item => jest.fn(() => item.promise));
      const boundary: PdfDeliveryBoundary | undefined = guarded ? { actorId: "actor-A", key: "actor-A:1", assertActive: jest.fn(), assertCurrent: jest.fn(async () => {}) } : undefined;
      const { busyRun, busyRunMock } = createBusyRunMock();
      mockPrepareAndPreviewPdfDocument.mockImplementation(async (args: { descriptor: DocumentDescriptor }) => args.descriptor);
      const tasks = factories.map(createDescriptor => prepareAndPreviewGeneratedPdfFromDescriptorFactory({
        supabase: {}, busy: { run: busyRun }, key: key as string, label: "Opening", createDescriptor, deliveryBoundary: boundary,
      }));
      for (let i = 0; i < 20; i++) await Promise.resolve();
      expect(factories[0]).toHaveBeenCalledTimes(1); expect(factories[1]).toHaveBeenCalledTimes(1);
      expect(busyRunMock).toHaveBeenCalledTimes(2);
      expect(busyRunMock.mock.calls.every(call => (call[1] as { key: string }).key === "")).toBe(true);
      pending[0].resolve({ ...baseDescriptor, entityId: "first-unkeyed" });
      pending[1].resolve({ ...baseDescriptor, entityId: "second-unkeyed" });
      expect((await Promise.all(tasks)).map(result => result.entityId)).toEqual(["first-unkeyed", "second-unkeyed"]);
    }
  });

  it("coalesces explicit keys only inside the same actor generation and releases a rejected factory", async () => {
    const a = createDeferred<DocumentDescriptor>(); const b = createDeferred<DocumentDescriptor>();
    const boundary = (key: string): PdfDeliveryBoundary => ({ actorId: key.split(":")[0], key, assertActive: jest.fn(), assertCurrent: jest.fn(async () => {}) });
    const aBoundary = boundary("actor-A:1"); const bBoundary = boundary("actor-B:2");
    const aFactory = jest.fn(() => a.promise); const joined = jest.fn(async () => baseDescriptor); const bFactory = jest.fn(() => b.promise);
    mockPrepareAndPreviewPdfDocument.mockImplementation(async (args: { descriptor: DocumentDescriptor }) => args.descriptor);
    const args = { supabase: {}, key: "pdf:request:shared", label: "Opening" };
    const first = prepareAndPreviewGeneratedPdfFromDescriptorFactory({ ...args, createDescriptor: aFactory, deliveryBoundary: aBoundary });
    const duplicate = prepareAndPreviewGeneratedPdfFromDescriptorFactory({ ...args, createDescriptor: joined, deliveryBoundary: aBoundary });
    const otherActor = prepareAndPreviewGeneratedPdfFromDescriptorFactory({ ...args, createDescriptor: bFactory, deliveryBoundary: bBoundary });
    for (let i = 0; i < 20; i++) await Promise.resolve();
    expect(aFactory).toHaveBeenCalledTimes(1); expect(joined).not.toHaveBeenCalled(); expect(bFactory).toHaveBeenCalledTimes(1);
    const failures = Promise.allSettled([first, duplicate]); a.reject(new Error("factory failed"));
    b.resolve({ ...baseDescriptor, entityId: "actor-B-result" });
    expect(await failures).toEqual([expect.objectContaining({ status: "rejected" }), expect.objectContaining({ status: "rejected" })]);
    expect((await otherActor).entityId).toBe("actor-B-result");
    const retry = jest.fn(async () => ({ ...baseDescriptor, entityId: "retry-A" }));
    expect((await prepareAndPreviewGeneratedPdfFromDescriptorFactory({ ...args, createDescriptor: retry, deliveryBoundary: aBoundary })).entityId).toBe("retry-A");
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
