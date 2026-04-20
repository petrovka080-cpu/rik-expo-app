import type { DocumentDescriptor } from "../../lib/documents/pdfDocument";
import { buildContractorActManifestContract } from "./contractorActPdf.shared";
import {
  clearContractorActPdfRenderCacheForTests,
  renderContractorActPdfDocument,
} from "./contractorPdf.render";
import type { ContractorActPdfData } from "./contractorPdf.data";

const mockRenderPdfHtmlToSource = jest.fn();
const mockReadStoredJson = jest.fn();
const mockWriteStoredJson = jest.fn();
const mockRemoveStoredValue = jest.fn();
const mockGetInfoAsync = jest.fn();

jest.mock("../../lib/pdf/pdf.runner", () => ({
  renderPdfHtmlToSource: (...args: unknown[]) => mockRenderPdfHtmlToSource(...args),
}));

jest.mock("../../lib/documents/pdfDocumentGenerators", () => ({
  createGeneratedPdfDocument: async (args: {
    fileSource: { kind: "local-file" | "remote-url" | "blob"; uri: string };
    title: string;
    fileName?: string;
    documentType: "contractor_act";
    originModule: "contractor";
    entityId?: string | number;
  }) => ({
    uri: args.fileSource.uri,
    fileSource: args.fileSource,
    title: args.title,
    fileName: args.fileName || "contractor_act.pdf",
    mimeType: "application/pdf",
    documentType: args.documentType,
    originModule: args.originModule,
    source: "generated",
    entityId: args.entityId == null ? undefined : String(args.entityId),
  }),
}));

jest.mock("../../lib/storage/classifiedStorage", () => ({
  readStoredJson: (...args: unknown[]) => mockReadStoredJson(...args),
  writeStoredJson: (...args: unknown[]) => mockWriteStoredJson(...args),
  removeStoredValue: (...args: unknown[]) => mockRemoveStoredValue(...args),
}));

jest.mock("expo-file-system/legacy", () => ({
  getInfoAsync: (...args: unknown[]) => mockGetInfoAsync(...args),
}));

const baseData: ContractorActPdfData = {
  mode: "normal",
  work: {
    progress_id: "progress-1",
    work_code: "W-1",
    work_name: "Concrete",
    object_name: "Tower A",
  },
  materials: [
    {
      material_id: "mat-1",
      mat_code: "M-1",
      name: "Cement",
      uom: "bag",
      qty: 2,
      qty_fact: 2,
      available: 0,
      price: 100,
    },
  ],
  actNo: "ACT-1",
  title: "Act ACT-1",
  fileName: "contractor_act_ACT-1.pdf",
  options: {
    actDate: "2026-04-20",
    selectedWorks: [
      {
        name: "Pour concrete",
        unit: "m3",
        price: 500,
        qty: 3,
      },
    ],
    contractorName: "Contractor LLC",
    customerName: "Tower A",
    contractNumber: "CN-1",
    contractDate: "2026-01-01",
    zoneText: "Zone 1 / Level 2",
    mainWorkName: "Concrete",
    actNumber: "ACT-1",
  },
};

const storedDescriptor: DocumentDescriptor = {
  uri: "file:///cache/contractor_act_ACT-1.pdf",
  fileSource: {
    kind: "local-file",
    uri: "file:///cache/contractor_act_ACT-1.pdf",
  },
  title: "Act ACT-1",
  fileName: "contractor_act_ACT-1.pdf",
  mimeType: "application/pdf",
  documentType: "contractor_act",
  originModule: "contractor",
  source: "generated",
  entityId: "progress-1",
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

async function waitForRenderCallCount(expected: number) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (mockRenderPdfHtmlToSource.mock.calls.length === expected) return;
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
}

describe("contractorPdf.render PDF-Z5 reuse", () => {
  beforeEach(() => {
    clearContractorActPdfRenderCacheForTests();
    mockRenderPdfHtmlToSource.mockReset();
    mockReadStoredJson.mockReset();
    mockWriteStoredJson.mockReset();
    mockRemoveStoredValue.mockReset();
    mockGetInfoAsync.mockReset();
    mockReadStoredJson.mockResolvedValue(null);
    mockWriteStoredJson.mockResolvedValue(undefined);
    mockRemoveStoredValue.mockResolvedValue(undefined);
    mockGetInfoAsync.mockResolvedValue({ exists: true, size: 1024 });
    mockRenderPdfHtmlToSource.mockResolvedValue({
      kind: "local-file",
      uri: "file:///cache/contractor_act_ACT-1.pdf",
    });
  });

  it("reuses the same rendered artifact for a repeat open with the same source version", async () => {
    const first = await renderContractorActPdfDocument(baseData);
    const second = await renderContractorActPdfDocument(JSON.parse(JSON.stringify(baseData)));

    expect(first.uri).toBe("file:///cache/contractor_act_ACT-1.pdf");
    expect(second.uri).toBe(first.uri);
    expect(mockRenderPdfHtmlToSource).toHaveBeenCalledTimes(1);
    expect(mockWriteStoredJson).toHaveBeenCalledTimes(1);
  });

  it("coalesces concurrent identical renders before local print starts twice", async () => {
    const renderSource = createDeferred<{ kind: "local-file"; uri: string }>();
    mockRenderPdfHtmlToSource.mockImplementationOnce(() => renderSource.promise);

    const first = renderContractorActPdfDocument(baseData);
    const second = renderContractorActPdfDocument(JSON.parse(JSON.stringify(baseData)));

    await waitForRenderCallCount(1);
    expect(mockRenderPdfHtmlToSource).toHaveBeenCalledTimes(1);

    renderSource.resolve({
      kind: "local-file",
      uri: "file:///cache/contractor_act_ACT-1.pdf",
    });

    await expect(Promise.all([first, second])).resolves.toEqual([
      expect.objectContaining({ uri: "file:///cache/contractor_act_ACT-1.pdf" }),
      expect.objectContaining({ uri: "file:///cache/contractor_act_ACT-1.pdf" }),
    ]);
    expect(mockRenderPdfHtmlToSource).toHaveBeenCalledTimes(1);
  });

  it("uses the persisted same-version artifact without rebuilding", async () => {
    const manifest = buildContractorActManifestContract(baseData);
    mockReadStoredJson.mockResolvedValueOnce({
      version: 1,
      sourceVersion: manifest.sourceVersion,
      artifactVersion: manifest.artifactVersion,
      descriptor: storedDescriptor,
    });

    const result = await renderContractorActPdfDocument(baseData);

    expect(result.uri).toBe(storedDescriptor.uri);
    expect(mockRenderPdfHtmlToSource).not.toHaveBeenCalled();
    expect(mockWriteStoredJson).not.toHaveBeenCalled();
  });

  it("rebuilds when meaningful visible data changes", async () => {
    await renderContractorActPdfDocument(baseData);
    await renderContractorActPdfDocument({
      ...baseData,
      materials: [
        {
          ...baseData.materials[0],
          qty_fact: 5,
        },
      ],
    });

    expect(mockRenderPdfHtmlToSource).toHaveBeenCalledTimes(2);
  });
});
