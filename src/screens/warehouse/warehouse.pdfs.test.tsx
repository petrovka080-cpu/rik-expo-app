import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { useWarehousePdf } from "./warehouse.pdfs";

const mockPreviewWarehousePdf = jest.fn();
const mockGenerateWarehousePdfViaBackend = jest.fn();
const mockBoundarySuccess = jest.fn();
const mockBoundaryError = jest.fn();

jest.mock("../../lib/pdf/canonicalPdfObservability", () => ({
  beginCanonicalPdfBoundary: () => ({
    success: (...args: unknown[]) => mockBoundarySuccess(...args),
    error: (...args: unknown[]) => mockBoundaryError(...args),
  }),
}));

jest.mock("../../lib/api/warehousePdfBackend.service", () => ({
  generateWarehousePdfViaBackend: (...args: unknown[]) =>
    mockGenerateWarehousePdfViaBackend(...args),
}));

jest.mock("./warehouse.pdf.boundary", () => ({
  buildWarehousePdfBusyKey: (args: Record<string, unknown>) => JSON.stringify(args),
  createWarehousePdfFileName: (args: { documentType: string; title: string; entityId?: string }) =>
    `${args.documentType}_${args.title}_${args.entityId ?? "none"}.pdf`,
  useWarehousePdfPreviewBoundary: () => mockPreviewWarehousePdf,
}));

type HookResult = ReturnType<typeof useWarehousePdf> | null;

async function renderHarness(props: Parameters<typeof useWarehousePdf>[0]) {
  let captured: HookResult = null;

  function Harness() {
    captured = useWarehousePdf(props);
    return null;
  }

  await act(async () => {
    TestRenderer.create(<Harness />);
  });
  if (!captured) {
    throw new Error("Warehouse PDF hook did not initialize");
  }
  return captured;
}

describe("warehouse.pdfs canonical backend path", () => {
  beforeEach(() => {
    mockPreviewWarehousePdf.mockReset();
    mockGenerateWarehousePdfViaBackend.mockReset();
    mockBoundarySuccess.mockReset();
    mockBoundaryError.mockReset();
    mockPreviewWarehousePdf.mockResolvedValue(undefined);
    mockGenerateWarehousePdfViaBackend.mockResolvedValue({
      source: {
        kind: "remote-url",
        uri: "https://example.com/warehouse.pdf",
      },
      bucketId: "role_pdf_exports",
      storagePath: "warehouse/path/file.pdf",
      signedUrl: "https://example.com/warehouse.pdf",
      fileName: "warehouse.pdf",
      mimeType: "application/pdf",
      generatedAt: "2026-04-04T00:00:00.000Z",
      version: "v1",
      renderBranch: "backend_warehouse_pdf_v1",
      renderer: "browserless_puppeteer",
      sourceKind: "remote-url",
      telemetry: null,
    });
  });

  it("routes issue document PDF through the warehouse backend contract", async () => {
    const actions = await renderHarness({
      busy: {},
      reportsMode: "issue",
      periodFrom: "2026-04-01",
      periodTo: "2026-04-30",
      warehousemanFio: "Складовщик",
      notifyError: jest.fn(),
      orgName: "GOX",
      warehouseName: "Main Warehouse",
    });

    await act(async () => {
      await actions.onPdfDocument(77);
    });

    expect(mockPreviewWarehousePdf).toHaveBeenCalledTimes(1);
    const previewRequest = mockPreviewWarehousePdf.mock.calls[0][0] as {
      getRemoteUrl: () => Promise<string>;
    };

    await expect(previewRequest.getRemoteUrl()).resolves.toBe("https://example.com/warehouse.pdf");
    expect(mockGenerateWarehousePdfViaBackend).toHaveBeenCalledWith({
      version: "v1",
      role: "warehouse",
      documentType: "warehouse_document",
      documentKind: "issue_form",
      issueId: 77,
      generatedBy: "Складовщик",
      companyName: "GOX",
      warehouseName: "Main Warehouse",
    });
  });

  it("routes incoming register PDF through the warehouse backend contract", async () => {
    const actions = await renderHarness({
      busy: {},
      reportsMode: "incoming",
      periodFrom: "2026-04-01",
      periodTo: "2026-04-30",
      warehousemanFio: "Складовщик",
      notifyError: jest.fn(),
      orgName: "GOX",
      warehouseName: "Main Warehouse",
    });

    await act(async () => {
      await actions.onPdfRegister();
    });

    expect(mockPreviewWarehousePdf).toHaveBeenCalledTimes(1);
    const previewRequest = mockPreviewWarehousePdf.mock.calls[0][0] as {
      getRemoteUrl: () => Promise<string>;
    };

    await expect(previewRequest.getRemoteUrl()).resolves.toBe("https://example.com/warehouse.pdf");
    expect(mockGenerateWarehousePdfViaBackend).toHaveBeenCalledWith({
      version: "v1",
      role: "warehouse",
      documentType: "warehouse_register",
      documentKind: "incoming_register",
      periodFrom: "2026-04-01",
      periodTo: "2026-04-30",
      generatedBy: "Складовщик",
      companyName: "GOX",
      warehouseName: "Main Warehouse",
    });
  });
});
