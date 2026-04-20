import type { DocumentDescriptor } from "../../lib/documents/pdfDocument";
import { buildBuyerProposalPdfManifestContract } from "./buyerProposalPdf.shared";
import {
  clearBuyerProposalPdfDocumentCacheForTests,
  generateBuyerProposalPdfDocument,
} from "./buyerProposalPdf.service";
import type { ProposalHeadLite, ProposalViewLine } from "./buyer.types";

const mockGenerateProposalPdfDocument = jest.fn();
const mockReadStoredJson = jest.fn();
const mockWriteStoredJson = jest.fn();
const mockRemoveStoredValue = jest.fn();
const mockGetInfoAsync = jest.fn();

jest.mock("../../lib/documents/pdfDocumentGenerators", () => ({
  generateProposalPdfDocument: (...args: unknown[]) =>
    mockGenerateProposalPdfDocument(...args),
}));

jest.mock("../../lib/storage/classifiedStorage", () => ({
  readStoredJson: (...args: unknown[]) => mockReadStoredJson(...args),
  writeStoredJson: (...args: unknown[]) => mockWriteStoredJson(...args),
  removeStoredValue: (...args: unknown[]) => mockRemoveStoredValue(...args),
}));

jest.mock("expo-file-system/legacy", () => ({
  getInfoAsync: (...args: unknown[]) => mockGetInfoAsync(...args),
}));

const baseHead: ProposalHeadLite = {
  id: "proposal-1",
  status: "approved",
  submitted_at: "2026-04-20T10:00:00.000Z",
};

const baseLines: ProposalViewLine[] = [
  {
    request_item_id: "ri-1",
    app_code: "MAT",
    name_human: "Cement",
    note: "For slab",
    price: 120,
    qty: 4,
    rik_code: "MAT-1",
    supplier: "Supplier A",
    uom: "bag",
  },
];

const baseArgs = {
  proposalId: "proposal-1",
  title: "Proposal proposal-1",
  fileName: "proposal_proposal-1.pdf",
  head: baseHead,
  lines: baseLines,
};

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
  originModule: "buyer",
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

async function waitForGenerateCallCount(expected: number) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (mockGenerateProposalPdfDocument.mock.calls.length === expected) return;
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
}

describe("buyerProposalPdf.service PDF-PUR-1 reuse", () => {
  beforeEach(() => {
    clearBuyerProposalPdfDocumentCacheForTests();
    mockGenerateProposalPdfDocument.mockReset();
    mockReadStoredJson.mockReset();
    mockWriteStoredJson.mockReset();
    mockRemoveStoredValue.mockReset();
    mockGetInfoAsync.mockReset();
    mockReadStoredJson.mockResolvedValue(null);
    mockWriteStoredJson.mockResolvedValue(undefined);
    mockRemoveStoredValue.mockResolvedValue(undefined);
    mockGetInfoAsync.mockResolvedValue({ exists: true, size: 1024 });
    mockGenerateProposalPdfDocument.mockResolvedValue(generatedDescriptor);
  });

  it("reuses the same generated proposal PDF for a repeat open with the same source version", async () => {
    const first = await generateBuyerProposalPdfDocument(baseArgs);
    const second = await generateBuyerProposalPdfDocument(JSON.parse(JSON.stringify(baseArgs)));

    expect(first.uri).toBe(generatedDescriptor.uri);
    expect(second.uri).toBe(first.uri);
    expect(mockGenerateProposalPdfDocument).toHaveBeenCalledTimes(1);
    expect(mockWriteStoredJson).toHaveBeenCalledTimes(1);
  });

  it("coalesces concurrent identical opens before local render starts twice", async () => {
    const deferred = createDeferred<DocumentDescriptor>();
    mockGenerateProposalPdfDocument.mockImplementationOnce(() => deferred.promise);

    const first = generateBuyerProposalPdfDocument(baseArgs);
    const second = generateBuyerProposalPdfDocument(JSON.parse(JSON.stringify(baseArgs)));

    await waitForGenerateCallCount(1);
    expect(mockGenerateProposalPdfDocument).toHaveBeenCalledTimes(1);

    deferred.resolve(generatedDescriptor);

    await expect(Promise.all([first, second])).resolves.toEqual([
      expect.objectContaining({ uri: generatedDescriptor.uri }),
      expect.objectContaining({ uri: generatedDescriptor.uri }),
    ]);
    expect(mockGenerateProposalPdfDocument).toHaveBeenCalledTimes(1);
  });

  it("uses the persisted same-version descriptor without rebuilding", async () => {
    const manifest = buildBuyerProposalPdfManifestContract(baseArgs);
    mockReadStoredJson.mockResolvedValueOnce({
      version: 1,
      sourceVersion: manifest.sourceVersion,
      artifactVersion: manifest.artifactVersion,
      descriptor: generatedDescriptor,
    });

    const result = await generateBuyerProposalPdfDocument(baseArgs);

    expect(result.uri).toBe(generatedDescriptor.uri);
    expect(mockGenerateProposalPdfDocument).not.toHaveBeenCalled();
    expect(mockWriteStoredJson).not.toHaveBeenCalled();
  });

  it("rebuilds when meaningful visible proposal data changes", async () => {
    await generateBuyerProposalPdfDocument(baseArgs);
    await generateBuyerProposalPdfDocument({
      ...baseArgs,
      lines: [
        {
          ...baseLines[0],
          price: 130,
        },
      ],
    });

    expect(mockGenerateProposalPdfDocument).toHaveBeenCalledTimes(2);
  });

  it("falls back to the original generator when no loaded details snapshot is available", async () => {
    await generateBuyerProposalPdfDocument({
      proposalId: "proposal-1",
      title: "Proposal proposal-1",
      fileName: "proposal_proposal-1.pdf",
    });

    expect(mockGenerateProposalPdfDocument).toHaveBeenCalledTimes(1);
    expect(mockReadStoredJson).not.toHaveBeenCalled();
    expect(mockWriteStoredJson).not.toHaveBeenCalled();
  });
});
