import type { DocumentDescriptor } from "../../lib/documents/pdfDocument";
import {
  clearAccountantProposalPdfDocumentCacheForTests,
  generateAccountantProposalPdfDocument,
} from "./accountantProposalPdf.service";

const mockBuildProposalPdfHtml = jest.fn();
const mockRenderPdfHtmlToSource = jest.fn();
const mockBuildGeneratedPdfDescriptor = jest.fn();
const mockReadStoredJson = jest.fn();
const mockWriteStoredJson = jest.fn();
const mockRemoveStoredValue = jest.fn();
const mockGetInfoAsync = jest.fn();

jest.mock("../../lib/api/pdf_proposal", () => ({
  buildProposalPdfHtml: (...args: unknown[]) => mockBuildProposalPdfHtml(...args),
}));

jest.mock("../../lib/pdf/pdf.runner", () => ({
  renderPdfHtmlToSource: (...args: unknown[]) => mockRenderPdfHtmlToSource(...args),
  buildGeneratedPdfDescriptor: (...args: unknown[]) =>
    mockBuildGeneratedPdfDescriptor(...args),
}));

jest.mock("../../lib/storage/classifiedStorage", () => ({
  readStoredJson: (...args: unknown[]) => mockReadStoredJson(...args),
  writeStoredJson: (...args: unknown[]) => mockWriteStoredJson(...args),
  removeStoredValue: (...args: unknown[]) => mockRemoveStoredValue(...args),
}));

jest.mock("expo-file-system/legacy", () => ({
  getInfoAsync: (...args: unknown[]) => mockGetInfoAsync(...args),
}));

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

const html = "<html><body><div>Сформировано: 20.04.2026</div><p>Cement</p></body></html>";

const generatedDescriptor: DocumentDescriptor = {
  uri: "file:///cache/proposal_proposal-1.pdf",
  fileSource: {
    kind: "local-file",
    uri: "file:///cache/proposal_proposal-1.pdf",
  },
  title: "Proposal proposal-1",
  fileName: "proposal_proposal-1.pdf",
  mimeType: "application/pdf",
  documentType: "proposal",
  originModule: "accountant",
  source: "generated",
  entityId: "proposal-1",
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

async function waitForCallCount(mock: jest.Mock, expected: number) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (mock.mock.calls.length === expected) return;
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
}

const observabilityGlobal = globalThis as PlatformObservabilityTestGlobal;

function resetObservabilityEvents() {
  observabilityGlobal.__RIK_PLATFORM_OBSERVABILITY__ = {
    seq: 0,
    events: [],
  };
}

function accountantProposalPdfEvents() {
  return (observabilityGlobal.__RIK_PLATFORM_OBSERVABILITY__?.events ?? [])
    .filter((event) =>
      event.screen === "accountant" &&
      event.surface === "accountant_proposal_pdf" &&
      event.event === "accountant_proposal_pdf_ready",
    );
}

describe("accountantProposalPdf.service PDF-ACC-FINAL reuse", () => {
  beforeEach(() => {
    clearAccountantProposalPdfDocumentCacheForTests();
    resetObservabilityEvents();
    mockBuildProposalPdfHtml.mockReset();
    mockRenderPdfHtmlToSource.mockReset();
    mockBuildGeneratedPdfDescriptor.mockReset();
    mockReadStoredJson.mockReset();
    mockWriteStoredJson.mockReset();
    mockRemoveStoredValue.mockReset();
    mockGetInfoAsync.mockReset();
    mockReadStoredJson.mockResolvedValue(null);
    mockWriteStoredJson.mockResolvedValue(undefined);
    mockRemoveStoredValue.mockResolvedValue(undefined);
    mockGetInfoAsync.mockResolvedValue({ exists: true, size: 1024 });
    mockBuildProposalPdfHtml.mockResolvedValue(html);
    mockRenderPdfHtmlToSource.mockResolvedValue({
      kind: "local-file",
      uri: "file:///cache/proposal_proposal-1.pdf",
    });
    mockBuildGeneratedPdfDescriptor.mockImplementation(async (args: {
      getSource: () => Promise<unknown>;
    }) => {
      await args.getSource();
      return generatedDescriptor;
    });
  });

  it("reuses the generated proposal PDF for repeat opens without rebuilding", async () => {
    const first = await generateAccountantProposalPdfDocument({
      proposalId: "proposal-1",
      fileName: "proposal_proposal-1.pdf",
    });
    const second = await generateAccountantProposalPdfDocument({
      proposalId: "proposal-1",
      fileName: "proposal_proposal-1.pdf",
    });

    expect(first.uri).toBe(generatedDescriptor.uri);
    expect(second.uri).toBe(first.uri);
    expect(mockBuildProposalPdfHtml).toHaveBeenCalledTimes(1);
    expect(mockBuildGeneratedPdfDescriptor).toHaveBeenCalledTimes(1);
    expect(mockRenderPdfHtmlToSource).toHaveBeenCalledTimes(1);
    expect(mockWriteStoredJson).toHaveBeenCalledTimes(1);
  });

  it("emits repeat cache-hit telemetry inside the sub-300ms budget", async () => {
    await generateAccountantProposalPdfDocument({ proposalId: "proposal-1" });
    resetObservabilityEvents();

    await generateAccountantProposalPdfDocument({ proposalId: "proposal-1" });
    await generateAccountantProposalPdfDocument({ proposalId: "proposal-1" });
    await generateAccountantProposalPdfDocument({ proposalId: "proposal-1" });

    const repeatHits = accountantProposalPdfEvents().filter(
      (event) => event.result === "cache_hit" && event.cacheLayer === "memory",
    );
    expect(repeatHits).toHaveLength(3);
    expect(Math.max(...repeatHits.map((event) => Number(event.durationMs ?? 0))))
      .toBeLessThanOrEqual(300);
    expect(mockBuildProposalPdfHtml).toHaveBeenCalledTimes(1);
  });

  it("registers inFlight before storage/source awaits and coalesces identical requests", async () => {
    const readDeferred = createDeferred<null>();
    mockReadStoredJson.mockReturnValueOnce(readDeferred.promise);

    const first = generateAccountantProposalPdfDocument({ proposalId: "proposal-1" });
    const second = generateAccountantProposalPdfDocument({ proposalId: "proposal-1" });

    await waitForCallCount(mockReadStoredJson, 1);
    expect(mockReadStoredJson).toHaveBeenCalledTimes(1);
    expect(mockBuildProposalPdfHtml).not.toHaveBeenCalled();

    readDeferred.resolve(null);
    await expect(Promise.all([first, second])).resolves.toEqual([
      expect.objectContaining({ uri: generatedDescriptor.uri }),
      expect.objectContaining({ uri: generatedDescriptor.uri }),
    ]);
    expect(mockBuildProposalPdfHtml).toHaveBeenCalledTimes(1);
    expect(mockBuildGeneratedPdfDescriptor).toHaveBeenCalledTimes(1);
  });

  it("uses persisted ready descriptor without source preparation", async () => {
    await generateAccountantProposalPdfDocument({ proposalId: "proposal-1" });
    const storedEntry = mockWriteStoredJson.mock.calls[0]?.[1];
    clearAccountantProposalPdfDocumentCacheForTests();
    mockBuildProposalPdfHtml.mockClear();
    mockBuildGeneratedPdfDescriptor.mockClear();
    mockReadStoredJson.mockResolvedValueOnce(storedEntry);

    const result = await generateAccountantProposalPdfDocument({ proposalId: "proposal-1" });

    expect(result.uri).toBe(generatedDescriptor.uri);
    expect(mockBuildProposalPdfHtml).not.toHaveBeenCalled();
    expect(mockBuildGeneratedPdfDescriptor).not.toHaveBeenCalled();
  });

  it("emits persisted warm-hit telemetry inside the sub-800ms budget", async () => {
    await generateAccountantProposalPdfDocument({ proposalId: "proposal-1" });
    const storedEntry = mockWriteStoredJson.mock.calls[0]?.[1];
    mockBuildProposalPdfHtml.mockClear();
    mockBuildGeneratedPdfDescriptor.mockClear();
    resetObservabilityEvents();

    for (let index = 0; index < 3; index += 1) {
      clearAccountantProposalPdfDocumentCacheForTests();
      mockReadStoredJson.mockResolvedValueOnce(storedEntry);
      await generateAccountantProposalPdfDocument({ proposalId: "proposal-1" });
    }

    const warmHits = accountantProposalPdfEvents().filter(
      (event) => event.result === "cache_hit" && event.cacheLayer === "storage",
    );
    expect(warmHits).toHaveLength(3);
    expect(Math.max(...warmHits.map((event) => Number(event.durationMs ?? 0))))
      .toBeLessThanOrEqual(800);
    expect(mockBuildProposalPdfHtml).not.toHaveBeenCalled();
    expect(mockBuildGeneratedPdfDescriptor).not.toHaveBeenCalled();
  });

  it("removes an unusable persisted artifact and rebuilds", async () => {
    await generateAccountantProposalPdfDocument({ proposalId: "proposal-1" });
    const storedEntry = mockWriteStoredJson.mock.calls[0]?.[1];
    clearAccountantProposalPdfDocumentCacheForTests();
    mockBuildProposalPdfHtml.mockClear();
    mockBuildGeneratedPdfDescriptor.mockClear();
    mockReadStoredJson.mockResolvedValueOnce(storedEntry);
    mockGetInfoAsync.mockResolvedValueOnce({ exists: false });

    await generateAccountantProposalPdfDocument({ proposalId: "proposal-1" });

    expect(mockRemoveStoredValue).toHaveBeenCalledTimes(1);
    expect(mockBuildProposalPdfHtml).toHaveBeenCalledTimes(1);
    expect(mockBuildGeneratedPdfDescriptor).toHaveBeenCalledTimes(1);
  });

  it("rebuilds after cache clear when rendered source changes", async () => {
    await generateAccountantProposalPdfDocument({ proposalId: "proposal-1" });
    clearAccountantProposalPdfDocumentCacheForTests();
    mockReadStoredJson.mockResolvedValue(null);
    mockBuildProposalPdfHtml.mockResolvedValueOnce(html.replace("Cement", "Steel"));

    await generateAccountantProposalPdfDocument({ proposalId: "proposal-1" });

    expect(mockBuildProposalPdfHtml).toHaveBeenCalledTimes(2);
    expect(mockBuildGeneratedPdfDescriptor).toHaveBeenCalledTimes(2);
  });
});
