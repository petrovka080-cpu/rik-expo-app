import { readFileSync } from "fs";
import { join } from "path";
import React, { useEffect } from "react";
import TestRenderer, { act } from "react-test-renderer";

import { useForemanPdf } from "./hooks/useForemanPdf";

const mockAlert = jest.fn();
const mockPrepareAndPreviewGeneratedPdf = jest.fn();
const mockPrepareAndPreviewGeneratedPdfFromDescriptorFactory = jest.fn();
const mockPrepareAndShareGeneratedPdf = jest.fn();
const mockBuildForemanRequestPdfDescriptor = jest.fn();
const mockRecordCatchDiscipline = jest.fn();

jest.mock("react-native", () => ({
  Alert: {
    alert: (...args: unknown[]) => mockAlert(...args),
  },
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({
    replace: jest.fn(),
    push: jest.fn(),
  }),
}));

jest.mock("../../../src/lib/supabaseClient", () => ({
  supabase: {},
}));

jest.mock("../../../src/lib/documents/pdfDocumentActions", () => ({
  getPdfFlowErrorMessage: (error: unknown, fallback: string) =>
    error instanceof Error && error.message ? error.message : fallback,
}));

jest.mock("../../../src/lib/pdf/pdf.runner", () => ({
  prepareAndPreviewGeneratedPdf: (...args: unknown[]) => mockPrepareAndPreviewGeneratedPdf(...args),
  prepareAndPreviewGeneratedPdfFromDescriptorFactory: (...args: unknown[]) =>
    mockPrepareAndPreviewGeneratedPdfFromDescriptorFactory(...args),
  prepareAndShareGeneratedPdf: (...args: unknown[]) => mockPrepareAndShareGeneratedPdf(...args),
}));

jest.mock("../../../src/lib/observability/catchDiscipline", () => ({
  recordCatchDiscipline: (...args: unknown[]) => mockRecordCatchDiscipline(...args),
}));

jest.mock("./foreman.requestPdf.service", () => ({
  buildForemanRequestPdfDescriptor: (...args: unknown[]) => mockBuildForemanRequestPdfDescriptor(...args),
}));

type HookApi = ReturnType<typeof useForemanPdf>;

function Harness(props: {
  onReady: (api: HookApi) => void;
}) {
  const api = useForemanPdf({
    run: undefined,
    isBusy: undefined,
    show: undefined,
    hide: undefined,
  } as never);

  useEffect(() => {
    props.onReady(api);
  }, [api, props]);

  return null;
}

describe("foreman PDF wave 1 hardening", () => {
  beforeEach(() => {
    mockAlert.mockReset();
    mockPrepareAndPreviewGeneratedPdf.mockReset();
    mockPrepareAndPreviewGeneratedPdfFromDescriptorFactory.mockReset();
    mockPrepareAndShareGeneratedPdf.mockReset();
    mockBuildForemanRequestPdfDescriptor.mockReset();
    mockRecordCatchDiscipline.mockReset();

    mockBuildForemanRequestPdfDescriptor.mockResolvedValue({
      documentType: "request",
      originModule: "foreman",
      title: "Заявка REQ-1",
      fileName: "request.pdf",
      uri: "https://example.com/request.pdf",
      fileSource: {
        kind: "remote-url",
        uri: "https://example.com/request.pdf",
      },
    });
  });

  it("records observability and shows a controlled alert when preview open fails", async () => {
    mockPrepareAndPreviewGeneratedPdfFromDescriptorFactory.mockRejectedValue(new Error("preview blocked"));

    let hookApi: HookApi | null = null;

    await act(async () => {
      TestRenderer.create(
        <Harness
          onReady={(api) => {
            hookApi = api;
          }}
        />,
      );
    });

    expect(hookApi).not.toBeNull();

    await act(async () => {
      await hookApi!.runRequestPdf(
        "preview",
        "REQ-1",
        { foreman_name: "Иван", display_no: "REQ-1" } as never,
        jest.fn().mockResolvedValue(undefined),
      );
    });

    expect(mockPrepareAndPreviewGeneratedPdfFromDescriptorFactory).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "pdf:request:REQ-1",
        createDescriptor: expect.any(Function),
        label: "Открываю PDF…",
      }),
    );
    expect(mockRecordCatchDiscipline).toHaveBeenCalledWith(
      expect.objectContaining({
        screen: "foreman",
        surface: "foreman_pdf_open",
        event: "foreman_request_pdf_open_failed",
      }),
    );
    expect(mockAlert).toHaveBeenCalledWith("PDF", "preview blocked");
  });

  it("passes preview descriptor creation into the guarded preview boundary", async () => {
    mockPrepareAndPreviewGeneratedPdfFromDescriptorFactory.mockResolvedValue(undefined);
    const syncMeta = jest.fn().mockResolvedValue(undefined);
    let hookApi: HookApi | null = null;

    await act(async () => {
      TestRenderer.create(
        <Harness
          onReady={(api) => {
            hookApi = api;
          }}
        />,
      );
    });

    await act(async () => {
      await hookApi!.runRequestPdf(
        "preview",
        "REQ-2",
        { foreman_name: "РРІР°РЅ", display_no: "REQ-2" } as never,
        syncMeta,
      );
    });

    expect(syncMeta).toHaveBeenCalledWith("REQ-2", "onPdfExport");
    expect(mockBuildForemanRequestPdfDescriptor).not.toHaveBeenCalled();
    const prepareArgs = mockPrepareAndPreviewGeneratedPdfFromDescriptorFactory.mock.calls[0]?.[0] as {
      createDescriptor: () => Promise<unknown>;
    };
    await prepareArgs.createDescriptor();
    expect(mockBuildForemanRequestPdfDescriptor).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: "REQ-2",
        generatedBy: "РРІР°РЅ",
        displayNo: "REQ-2",
      }),
    );
    expect(mockPrepareAndPreviewGeneratedPdf).not.toHaveBeenCalled();
  });

  it("keeps touched PDF copy readable on active Wave 1 paths", () => {
    const foremanHookSource = readFileSync(join(__dirname, "hooks", "useForemanPdf.ts"), "utf8");
    const foremanControllerSource = readFileSync(join(__dirname, "useForemanScreenController.ts"), "utf8");
    const warehouseBoundarySource = readFileSync(
      join(__dirname, "..", "warehouse", "warehouse.pdf.boundary.ts"),
      "utf8",
    );

    for (const source of [foremanHookSource, warehouseBoundarySource]) {
      expect(source).not.toContain("РќРµ СѓРґР°Р»РѕСЃСЊ");
      expect(source).not.toContain("РћС‚РєСЂС‹РІР°СЋ");
      expect(source).not.toContain("Р“РѕС‚РѕРІР»СЋ");
    }

    expect(foremanControllerSource).toContain('label: "Открываю PDF…"');
    expect(foremanControllerSource).toContain('getPdfFlowErrorMessage(error, "Не удалось открыть PDF")');
  });
});
