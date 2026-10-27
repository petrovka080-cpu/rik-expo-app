import type { DocumentDescriptor } from "../../lib/documents/pdfDocument";
import {
  clearAccountantAttachmentPdfPreviewCacheForTests,
  resolveAccountantAttachmentPreview,
} from "./accountantAttachmentPdf.service";

const mockGetLatestProposalAttachmentPreview = jest.fn();
const mockIsPdfLike = jest.fn();
const mockReadStoredJson = jest.fn();
const mockWriteStoredJson = jest.fn();
const mockRemoveStoredValue = jest.fn();
const mockGetInfoAsync = jest.fn();

jest.mock("../../lib/files", () => ({
  getLatestProposalAttachmentPreview: (...args: unknown[]) =>
    mockGetLatestProposalAttachmentPreview(...args),
  isPdfLike: (...args: unknown[]) => mockIsPdfLike(...args),
}));

jest.mock("../../lib/storage/classifiedStorage", () => ({
  readStoredJson: (...args: unknown[]) => mockReadStoredJson(...args),
  writeStoredJson: (...args: unknown[]) => mockWriteStoredJson(...args),
  removeStoredValue: (...args: unknown[]) => mockRemoveStoredValue(...args),
}));

jest.mock("expo-file-system/legacy", () => ({
  getInfoAsync: (...args: unknown[]) => mockGetInfoAsync(...args),
}));

const pdfPreview = {
  url: "https://storage.example.test/invoice.pdf?token=one",
  fileName: "invoice.pdf",
  row: {
    id: "att-1",
    proposal_id: "proposal-1",
    bucket_id: "proposal-attachments",
    storage_path: "proposal-1/invoice.pdf",
    file_name: "invoice.pdf",
    group_key: "invoice",
    created_at: "2026-04-20T10:00:00.000Z",
    url: "https://storage.example.test/invoice.pdf?token=one",
    signed_url: "https://storage.example.test/invoice.pdf?token=one",
  },
};

const nonPdfPreview = {
  ...pdfPreview,
  url: "https://storage.example.test/invoice.xlsx?token=one",
  fileName: "invoice.xlsx",
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

type PlatformObservabilityTestEvent = {
  screen?: string;
  surface?: string;
  event?: string;
  result?: string;
  durationMs?: number | null;
  cacheLayer?: string | null;
};

type PlatformObservabilityTestGlobal = typeof globalThis & {
  __RIK_PLATFORM_OBSERVABILITY__?: {
    seq: number;
    events: PlatformObservabilityTestEvent[];
  };
};

const observabilityGlobal = globalThis as PlatformObservabilityTestGlobal;

function resetObservabilityEvents() {
  observabilityGlobal.__RIK_PLATFORM_OBSERVABILITY__ = {
    seq: 0,
    events: [],
  };
}

function accountantAttachmentPdfEvents() {
  return (observabilityGlobal.__RIK_PLATFORM_OBSERVABILITY__?.events ?? [])
    .filter((event) =>
      event.screen === "accountant" &&
      event.surface === "accountant_attachment_pdf" &&
      event.event === "accountant_attachment_pdf_ready",
    );
}

async function waitForCallCount(mock: jest.Mock, expected: number) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (mock.mock.calls.length === expected) return;
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
}

describe("accountantAttachmentPdf.service PDF-ACC-FINAL reuse", () => {
  beforeEach(() => {
    clearAccountantAttachmentPdfPreviewCacheForTests();
    resetObservabilityEvents();
    mockGetLatestProposalAttachmentPreview.mockReset();
    mockIsPdfLike.mockReset();
    mockReadStoredJson.mockReset();
    mockWriteStoredJson.mockReset();
    mockRemoveStoredValue.mockReset();
    mockGetInfoAsync.mockReset();
    mockReadStoredJson.mockResolvedValue(null);
    mockWriteStoredJson.mockResolvedValue(undefined);
    mockRemoveStoredValue.mockResolvedValue(undefined);
    mockGetInfoAsync.mockResolvedValue({ exists: true, size: 1024 });
    mockGetLatestProposalAttachmentPreview.mockResolvedValue(pdfPreview);
    mockIsPdfLike.mockReturnValue(true);
  });

  it("reuses invoice PDF preview for repeat opens without another attachment lookup", async () => {
    const first = await resolveAccountantAttachmentPreview({
      proposalId: "proposal-1",
      groupKey: "invoice",
      title: "Счёт",
    });
    const second = await resolveAccountantAttachmentPreview({
      proposalId: "proposal-1",
      groupKey: "invoice",
      title: "Счёт",
    });

    expect(first.kind).toBe("pdf");
    expect(second.kind).toBe("pdf");
    expect((second as { descriptor: DocumentDescriptor }).descriptor.uri)
      .toBe((first as { descriptor: DocumentDescriptor }).descriptor.uri);
    expect(mockGetLatestProposalAttachmentPreview).toHaveBeenCalledTimes(1);
    expect(mockWriteStoredJson).toHaveBeenCalledTimes(1);
  });

  it("emits repeat PDF cache-hit telemetry inside the sub-300ms budget", async () => {
    await resolveAccountantAttachmentPreview({
      proposalId: "proposal-1",
      groupKey: "invoice",
      title: "Счёт",
    });
    resetObservabilityEvents();

    await resolveAccountantAttachmentPreview({
      proposalId: "proposal-1",
      groupKey: "invoice",
      title: "Счёт",
    });
    await resolveAccountantAttachmentPreview({
      proposalId: "proposal-1",
      groupKey: "invoice",
      title: "Счёт",
    });
    await resolveAccountantAttachmentPreview({
      proposalId: "proposal-1",
      groupKey: "invoice",
      title: "Счёт",
    });

    const repeatHits = accountantAttachmentPdfEvents().filter(
      (event) => event.result === "cache_hit" && event.cacheLayer === "memory",
    );
    expect(repeatHits).toHaveLength(3);
    expect(Math.max(...repeatHits.map((event) => Number(event.durationMs ?? 0))))
      .toBeLessThanOrEqual(300);
    expect(mockGetLatestProposalAttachmentPreview).toHaveBeenCalledTimes(1);
  });

  it("registers inFlight before storage/lookup awaits and coalesces identical requests", async () => {
    const readDeferred = createDeferred<null>();
    mockReadStoredJson.mockReturnValueOnce(readDeferred.promise);

    const first = resolveAccountantAttachmentPreview({
      proposalId: "proposal-1",
      groupKey: "invoice",
      title: "Счёт",
    });
    const second = resolveAccountantAttachmentPreview({
      proposalId: "proposal-1",
      groupKey: "invoice",
      title: "Счёт",
    });

    await waitForCallCount(mockReadStoredJson, 1);
    expect(mockReadStoredJson).toHaveBeenCalledTimes(1);
    expect(mockGetLatestProposalAttachmentPreview).not.toHaveBeenCalled();

    readDeferred.resolve(null);
    await expect(Promise.all([first, second])).resolves.toEqual([
      expect.objectContaining({ kind: "pdf" }),
      expect.objectContaining({ kind: "pdf" }),
    ]);
    expect(mockGetLatestProposalAttachmentPreview).toHaveBeenCalledTimes(1);
  });

  it("uses persisted ready descriptor without another attachment lookup", async () => {
    await resolveAccountantAttachmentPreview({
      proposalId: "proposal-1",
      groupKey: "invoice",
      title: "Счёт",
    });
    const storedEntry = mockWriteStoredJson.mock.calls[0]?.[1];
    clearAccountantAttachmentPdfPreviewCacheForTests();
    mockGetLatestProposalAttachmentPreview.mockClear();
    mockReadStoredJson.mockResolvedValueOnce(storedEntry);

    const result = await resolveAccountantAttachmentPreview({
      proposalId: "proposal-1",
      groupKey: "invoice",
      title: "Счёт",
    });

    expect(result.kind).toBe("pdf");
    expect(mockGetLatestProposalAttachmentPreview).not.toHaveBeenCalled();
  });

  it("emits persisted warm-hit telemetry inside the sub-800ms budget", async () => {
    await resolveAccountantAttachmentPreview({
      proposalId: "proposal-1",
      groupKey: "invoice",
      title: "Счёт",
    });
    const storedEntry = mockWriteStoredJson.mock.calls[0]?.[1];
    mockGetLatestProposalAttachmentPreview.mockClear();
    resetObservabilityEvents();

    for (let index = 0; index < 3; index += 1) {
      clearAccountantAttachmentPdfPreviewCacheForTests();
      mockReadStoredJson.mockResolvedValueOnce(storedEntry);
      await resolveAccountantAttachmentPreview({
        proposalId: "proposal-1",
        groupKey: "invoice",
        title: "Счёт",
      });
    }

    const warmHits = accountantAttachmentPdfEvents().filter(
      (event) => event.result === "cache_hit" && event.cacheLayer === "storage",
    );
    expect(warmHits).toHaveLength(3);
    expect(Math.max(...warmHits.map((event) => Number(event.durationMs ?? 0))))
      .toBeLessThanOrEqual(800);
    expect(mockGetLatestProposalAttachmentPreview).not.toHaveBeenCalled();
  });

  it("removes an unusable persisted local artifact and refreshes the attachment", async () => {
    const localDescriptor: DocumentDescriptor = {
      uri: "file:///cache/invoice.pdf",
      fileSource: {
        kind: "local-file",
        uri: "file:///cache/invoice.pdf",
      },
      title: "Счёт",
      fileName: "invoice.pdf",
      mimeType: "application/pdf",
      documentType: "attachment_pdf",
      originModule: "accountant",
      source: "attachment",
      entityId: "proposal-1",
    };
    await resolveAccountantAttachmentPreview({
      proposalId: "proposal-1",
      groupKey: "invoice",
      title: "Счёт",
    });
    const storedEntry = {
      ...mockWriteStoredJson.mock.calls[0]?.[1],
      descriptor: localDescriptor,
    };
    clearAccountantAttachmentPdfPreviewCacheForTests();
    mockGetLatestProposalAttachmentPreview.mockClear();
    mockReadStoredJson.mockResolvedValueOnce(storedEntry);
    mockGetInfoAsync.mockResolvedValueOnce({ exists: false });

    await resolveAccountantAttachmentPreview({
      proposalId: "proposal-1",
      groupKey: "invoice",
      title: "Счёт",
    });

    expect(mockRemoveStoredValue).toHaveBeenCalledTimes(1);
    expect(mockGetLatestProposalAttachmentPreview).toHaveBeenCalledTimes(1);
  });

  it("returns non-PDF attachments without writing a PDF manifest", async () => {
    mockGetLatestProposalAttachmentPreview.mockResolvedValueOnce(nonPdfPreview);
    mockIsPdfLike.mockReturnValueOnce(false);

    const result = await resolveAccountantAttachmentPreview({
      proposalId: "proposal-1",
      groupKey: "invoice",
      title: "Счёт",
    });

    expect(result).toEqual({
      kind: "file",
      url: nonPdfPreview.url,
      fileName: nonPdfPreview.fileName,
    });
    expect(mockWriteStoredJson).not.toHaveBeenCalled();
  });
});
