import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { useWarehousePdfPreviewBoundary } from "./warehouse.pdf.boundary";

const mockPush = jest.fn();
const mockPrepareAndPreviewPdfDocument = jest.fn();
const mockCreatePdfSource = jest.fn();
const mockRecordCatchDiscipline = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: (...args: unknown[]) => mockPush(...args),
  }),
}));

jest.mock("../../lib/documents/pdfDocumentActions", () => ({
  getPdfFlowErrorMessage: (error: unknown, fallback: string) =>
    error instanceof Error && error.message ? error.message : fallback,
  prepareAndPreviewPdfDocument: (...args: unknown[]) => mockPrepareAndPreviewPdfDocument(...args),
}));

jest.mock("../../lib/pdfFileContract", () => ({
  createPdfSource: (...args: unknown[]) => mockCreatePdfSource(...args),
}));

jest.mock("../../lib/observability/catchDiscipline", () => ({
  recordCatchDiscipline: (...args: unknown[]) => mockRecordCatchDiscipline(...args),
}));

type HookResult = ReturnType<typeof useWarehousePdfPreviewBoundary> | null;

async function renderHarness() {
  const capturedRef: { current: HookResult } = { current: null };
  const notifyError = jest.fn();

  function Harness() {
    capturedRef.current = useWarehousePdfPreviewBoundary({
      busy: {},
      notifyError,
    });
    return null;
  }

  await act(async () => {
    TestRenderer.create(<Harness />);
  });

  const captured = capturedRef.current;
  if (!captured) {
    throw new Error("Warehouse boundary hook did not initialize");
  }
  return { preview: captured, notifyError };
}

describe("warehouse.pdf.boundary", () => {
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

  it("defers warehouse remote source resolution into the guarded PDF open flow", async () => {
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
        getRemoteUrl: expect.any(Function),
        router: expect.any(Object),
      }),
    );

    const prepareArgs = mockPrepareAndPreviewPdfDocument.mock.calls[0][0] as {
      getRemoteUrl: () => Promise<string>;
    };
    await expect(prepareArgs.getRemoteUrl()).resolves.toBe("https://example.com/warehouse.pdf");
    expect(getRemoteUrl).toHaveBeenCalledTimes(1);
    expect(mockCreatePdfSource).toHaveBeenCalledWith("https://example.com/warehouse.pdf");
  });

  it("surfaces a controlled warehouse PDF error instead of failing silently", async () => {
    mockPrepareAndPreviewPdfDocument.mockRejectedValue(new Error("warehouse blocked"));
    const { preview, notifyError } = await renderHarness();

    await act(async () => {
      await preview({
        key: "pdf:warehouse:test",
        label: "Открываю PDF…",
        title: "Складской PDF",
        fileName: "warehouse.pdf",
        documentType: "warehouse_document",
        entityId: "77",
        getRemoteUrl: async () => "https://example.com/warehouse.pdf",
      });
    });

    expect(mockRecordCatchDiscipline).toHaveBeenCalledWith(
      expect.objectContaining({
        screen: "warehouse",
        surface: "warehouse_pdf_open",
        event: "warehouse_pdf_open_failed",
      }),
    );
    expect(notifyError).toHaveBeenCalledWith("PDF", "warehouse blocked");
  });
});
