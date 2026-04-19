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
  const busyRunMock = jest.fn(async (fn: () => Promise<unknown>) => await fn());
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

    await Promise.resolve();
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
});
