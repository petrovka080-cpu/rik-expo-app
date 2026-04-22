import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import {
  normalizeWarehousePdfRemoteUrl,
  resolveWarehousePdfPreviewContract,
  useWarehousePdfPreviewBoundary,
} from "../../src/screens/warehouse/warehouse.pdf.boundary";

const mockPush = jest.fn();
const mockPrepareAndPreviewPdfDocument = jest.fn();
const mockCreatePdfSource = jest.fn();
const mockRecordCatchDiscipline = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: (...args: unknown[]) => mockPush(...args),
  }),
}));

jest.mock("../../src/lib/documents/pdfDocumentActions", () => ({
  getPdfFlowErrorMessage: (error: unknown, fallback: string) =>
    error instanceof Error && error.message ? error.message : fallback,
  prepareAndPreviewPdfDocument: (...args: unknown[]) =>
    mockPrepareAndPreviewPdfDocument(...args),
}));

jest.mock("../../src/lib/pdfFileContract", () => ({
  createPdfSource: (...args: unknown[]) => mockCreatePdfSource(...args),
}));

jest.mock("../../src/lib/observability/catchDiscipline", () => ({
  recordCatchDiscipline: (...args: unknown[]) => mockRecordCatchDiscipline(...args),
}));

type HookResult = ReturnType<typeof useWarehousePdfPreviewBoundary> | null;

async function renderHarness() {
  let captured: HookResult = null;
  const notifyError = jest.fn();

  function Harness() {
    captured = useWarehousePdfPreviewBoundary({
      busy: {},
      notifyError,
    });
    return null;
  }

  await act(async () => {
    TestRenderer.create(React.createElement(Harness));
  });

  if (!captured) {
    throw new Error("Warehouse boundary hook did not initialize");
  }

  return { preview: captured, notifyError };
}

describe("warehouse.pdf.boundary phase 7 contract", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockPrepareAndPreviewPdfDocument.mockReset();
    mockCreatePdfSource.mockReset();
    mockRecordCatchDiscipline.mockReset();
    mockCreatePdfSource.mockImplementation((uri: string) => ({
      kind: "remote-url",
      uri,
    }));
    mockPrepareAndPreviewPdfDocument.mockResolvedValue(undefined);
  });

  it("classifies a null request as invalid", () => {
    expect(resolveWarehousePdfPreviewContract(null)).toEqual({
      kind: "invalid",
      reason: "invalid_request",
      errorMessage: "Warehouse PDF request is invalid",
    });
  });

  it("classifies an undefined request as invalid", () => {
    expect(resolveWarehousePdfPreviewContract(undefined)).toEqual({
      kind: "invalid",
      reason: "invalid_request",
      errorMessage: "Warehouse PDF request is invalid",
    });
  });

  it("rejects a partial payload when the file name is missing", () => {
    expect(
      resolveWarehousePdfPreviewContract({
        key: "pdf:warehouse:test",
        label: "Opening warehouse PDF...",
        title: "Warehouse PDF",
        documentType: "warehouse_document",
        getRemoteUrl: async () => "https://example.com/warehouse.pdf",
      }),
    ).toEqual({
      kind: "invalid",
      reason: "missing_file_name",
      errorMessage: "Warehouse PDF file name is missing",
    });
  });

  it("rejects a malformed payload when the document type is invalid", () => {
    expect(
      resolveWarehousePdfPreviewContract({
        key: "pdf:warehouse:test",
        label: "Opening warehouse PDF...",
        title: "Warehouse PDF",
        fileName: "warehouse.pdf",
        documentType: "unexpected_type",
        getRemoteUrl: async () => "https://example.com/warehouse.pdf",
      }),
    ).toEqual({
      kind: "invalid",
      reason: "invalid_document_type",
      errorMessage: "Warehouse PDF document type is invalid",
    });
  });

  it("normalizes a ready request and treats a blank optional entityId as loaded-empty", async () => {
    const contract = resolveWarehousePdfPreviewContract({
      key: " pdf:warehouse:test ",
      label: " Opening warehouse PDF... ",
      title: " Warehouse PDF ",
      fileName: " warehouse.pdf ",
      documentType: "warehouse_document",
      entityId: "   ",
      getRemoteUrl: async () => "https://example.com/warehouse.pdf",
    });

    expect(contract).toMatchObject({
      kind: "ready",
      request: {
        key: "pdf:warehouse:test",
        label: "Opening warehouse PDF...",
        title: "Warehouse PDF",
        fileName: "warehouse.pdf",
        documentType: "warehouse_document",
        entityId: undefined,
      },
      supabase: {},
    });

    if (contract.kind !== "ready") {
      throw new Error("Expected a ready warehouse PDF contract");
    }

    await expect(contract.request.getRemoteUrl()).resolves.toBe(
      "https://example.com/warehouse.pdf",
    );
  });

  it("rejects null, undefined, empty, and malformed remote URL payloads deterministically", () => {
    expect(() => normalizeWarehousePdfRemoteUrl(null)).toThrow(
      "Warehouse PDF source URI is invalid",
    );
    expect(() => normalizeWarehousePdfRemoteUrl(undefined)).toThrow(
      "Warehouse PDF source URI is invalid",
    );
    expect(() => normalizeWarehousePdfRemoteUrl("   ")).toThrow(
      "Warehouse PDF source URI is missing",
    );
    expect(() => normalizeWarehousePdfRemoteUrl({})).toThrow(
      "Warehouse PDF source URI is invalid",
    );
  });

  it("keeps the success path unchanged and passes a non-null preview supabase contract", async () => {
    const { preview } = await renderHarness();
    const getRemoteUrl = jest.fn(async () => "https://example.com/warehouse.pdf");

    await act(async () => {
      await preview({
        key: "pdf:warehouse:test",
        label: "Opening warehouse PDF...",
        title: "Warehouse PDF",
        fileName: "warehouse.pdf",
        documentType: "warehouse_document",
        entityId: "77",
        getRemoteUrl,
      });
    });

    expect(getRemoteUrl).not.toHaveBeenCalled();
    expect(mockPrepareAndPreviewPdfDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        supabase: {},
        key: "pdf:warehouse:test",
        label: "Opening warehouse PDF...",
        descriptor: expect.objectContaining({
          title: "Warehouse PDF",
          fileName: "warehouse.pdf",
          documentType: "warehouse_document",
          originModule: "warehouse",
          source: "generated",
          mimeType: "application/pdf",
          entityId: "77",
        }),
      }),
    );
  });

  it("surfaces an invalid request instead of drifting into a hidden fallback", async () => {
    const { preview, notifyError } = await renderHarness();

    await act(async () => {
      await preview({
        key: "   ",
        label: "Opening warehouse PDF...",
        title: "Warehouse PDF",
        fileName: "warehouse.pdf",
        documentType: "warehouse_document",
        getRemoteUrl: async () => "https://example.com/warehouse.pdf",
      });
    });

    expect(mockPrepareAndPreviewPdfDocument).not.toHaveBeenCalled();
    expect(mockRecordCatchDiscipline).toHaveBeenCalledWith(
      expect.objectContaining({
        screen: "warehouse",
        surface: "warehouse_pdf_open",
        event: "warehouse_pdf_open_failed",
      }),
    );
    expect(notifyError).toHaveBeenCalledWith("PDF", "Warehouse PDF busy key is missing");
  });

  it("keeps terminal failures explicit for a ready request with malformed source payload", async () => {
    const { preview, notifyError } = await renderHarness();

    mockPrepareAndPreviewPdfDocument.mockImplementationOnce(
      async (args: { getRemoteUrl: () => Promise<string> }) => {
        await args.getRemoteUrl();
      },
    );

    await act(async () => {
      await preview({
        key: "pdf:warehouse:test",
        label: "Opening warehouse PDF...",
        title: "Warehouse PDF",
        fileName: "warehouse.pdf",
        documentType: "warehouse_document",
        getRemoteUrl: async () => null,
      });
    });

    expect(mockRecordCatchDiscipline).toHaveBeenCalledWith(
      expect.objectContaining({
        screen: "warehouse",
        surface: "warehouse_pdf_open",
        event: "warehouse_pdf_open_failed",
      }),
    );
    expect(notifyError).toHaveBeenCalledWith("PDF", "Warehouse PDF source URI is invalid");
  });

  it("keeps terminal PDF-open failures explicit for a ready request", async () => {
    const { preview, notifyError } = await renderHarness();
    mockPrepareAndPreviewPdfDocument.mockRejectedValueOnce(
      new Error("warehouse blocked"),
    );

    await act(async () => {
      await preview({
        key: "pdf:warehouse:test",
        label: "Opening warehouse PDF...",
        title: "Warehouse PDF",
        fileName: "warehouse.pdf",
        documentType: "warehouse_document",
        entityId: "77",
        getRemoteUrl: async () => "https://example.com/warehouse.pdf",
      });
    });

    expect(notifyError).toHaveBeenCalledWith("PDF", "warehouse blocked");
  });
});
