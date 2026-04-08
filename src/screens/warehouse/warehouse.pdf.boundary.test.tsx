import React from "react";
import TestRenderer, { act } from "react-test-renderer";
import { useWarehousePdfPreviewBoundary } from "./warehouse.pdf.boundary";

const mockPush = jest.fn();
const mockGenerateWarehousePdfDocument = jest.fn();
const mockPrepareAndPreviewPdfDocument = jest.fn();
const mockCreatePdfSource = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: (...args: unknown[]) => mockPush(...args),
  }),
}));

jest.mock("../../lib/documents/pdfDocumentGenerators", () => ({
  generateWarehousePdfDocument: (...args: unknown[]) => mockGenerateWarehousePdfDocument(...args),
}));

jest.mock("../../lib/documents/pdfDocumentActions", () => ({
  getPdfFlowErrorMessage: (error: unknown, fallback: string) =>
    error instanceof Error && error.message ? error.message : fallback,
  prepareAndPreviewPdfDocument: (...args: unknown[]) => mockPrepareAndPreviewPdfDocument(...args),
}));

jest.mock("../../lib/pdfFileContract", () => ({
  createPdfSource: (...args: unknown[]) => mockCreatePdfSource(...args),
}));

type HookResult = ReturnType<typeof useWarehousePdfPreviewBoundary> | null;

async function renderHarness() {
  let captured: HookResult = null;

  function Harness() {
    captured = useWarehousePdfPreviewBoundary({
      busy: {},
      notifyError: jest.fn(),
    });
    return null;
  }

  await act(async () => {
    TestRenderer.create(<Harness />);
  });

  if (!captured) {
    throw new Error("Warehouse boundary hook did not initialize");
  }
  return captured;
}

describe("warehouse.pdf.boundary", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockGenerateWarehousePdfDocument.mockReset();
    mockPrepareAndPreviewPdfDocument.mockReset();
    mockCreatePdfSource.mockReset();
    mockCreatePdfSource.mockImplementation((uri: string) => ({
      kind: "remote-url",
      uri,
    }));
    mockGenerateWarehousePdfDocument.mockImplementation(async (args: unknown) => args);
    mockPrepareAndPreviewPdfDocument.mockResolvedValue(undefined);
  });

  it("builds warehouse preview on canonical remote PdfSource without getRemoteUrl fallback", async () => {
    const preview = await renderHarness();

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

    expect(mockGenerateWarehousePdfDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        documentType: "warehouse_document",
        getSource: expect.any(Function),
      }),
    );
    expect(mockGenerateWarehousePdfDocument).not.toHaveBeenCalledWith(
      expect.objectContaining({
        getUri: expect.any(Function),
      }),
    );

    const generatorArgs = mockGenerateWarehousePdfDocument.mock.calls[0][0] as {
      getSource: () => Promise<unknown>;
    };
    await expect(generatorArgs.getSource()).resolves.toEqual({
      kind: "remote-url",
      uri: "https://example.com/warehouse.pdf",
    });
    expect(mockCreatePdfSource).toHaveBeenCalledWith("https://example.com/warehouse.pdf");

    expect(mockPrepareAndPreviewPdfDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        descriptor: expect.any(Object),
        router: expect.any(Object),
      }),
    );
    expect(mockPrepareAndPreviewPdfDocument.mock.calls[0][0]).not.toHaveProperty("getRemoteUrl");
  });
});
