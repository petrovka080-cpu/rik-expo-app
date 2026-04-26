import { Alert } from "react-native";

import {
  buildForemanRequestPdfDescriptor,
  createForemanHistoryPdfPreviewPlan,
  previewForemanHistoryPdf,
} from "./foreman.requestPdf.service";

const mockCreateGeneratedPdfDocument = jest.fn();
const mockGenerateForemanRequestPdfViaBackend = jest.fn();
const mockPrepareAndPreviewGeneratedPdfFromDescriptorFactory = jest.fn();
const mockRecordCatchDiscipline = jest.fn();

jest.mock("react-native", () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

jest.mock("../../lib/api/foremanRequestPdfBackend.service", () => ({
  generateForemanRequestPdfViaBackend: (...args: unknown[]) =>
    mockGenerateForemanRequestPdfViaBackend(...args),
}));

jest.mock("../../lib/documents/pdfDocumentGenerators", () => ({
  createGeneratedPdfDocument: (...args: unknown[]) => mockCreateGeneratedPdfDocument(...args),
}));

jest.mock("../../lib/documents/pdfDocumentActions", () => ({
  getPdfFlowErrorMessage: (error: unknown, fallback: string) =>
    error instanceof Error && error.message ? error.message : fallback,
}));

jest.mock("../../lib/pdf/pdf.runner", () => ({
  prepareAndPreviewGeneratedPdfFromDescriptorFactory: (...args: unknown[]) =>
    mockPrepareAndPreviewGeneratedPdfFromDescriptorFactory(...args),
}));

jest.mock("../../lib/observability/catchDiscipline", () => ({
  recordCatchDiscipline: (...args: unknown[]) => mockRecordCatchDiscipline(...args),
}));

describe("foreman.requestPdf.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateGeneratedPdfDocument.mockImplementation(async (args: {
      fileSource: { uri: string; kind: string };
      title: string;
      fileName: string;
      documentType: string;
      originModule: string;
      entityId: string;
    }) => ({
      documentType: args.documentType,
      originModule: args.originModule,
      title: args.title,
      fileName: args.fileName,
      uri: args.fileSource.uri,
      fileSource: args.fileSource,
      entityId: args.entityId,
    }));
    mockGenerateForemanRequestPdfViaBackend.mockResolvedValue({
      source: {
        kind: "remote-url",
        uri: "https://example.com/foreman-request.pdf",
      },
      bucketId: "role_pdf_exports",
      storagePath: "foreman/request/artifacts/v1/version/file.pdf",
      signedUrl: "https://example.com/foreman-request.pdf",
      fileName: "request_123.pdf",
      mimeType: "application/pdf",
      generatedAt: "2026-04-04T00:00:00.000Z",
      version: "v1",
      renderBranch: "backend_foreman_request_v1",
      renderer: "browserless_puppeteer",
      sourceKind: "remote-url",
      telemetry: null,
    });
    mockPrepareAndPreviewGeneratedPdfFromDescriptorFactory.mockResolvedValue({
      documentType: "request",
      originModule: "foreman",
      title: "Заявка req-77",
      fileName: "request.pdf",
      uri: "https://example.com/request.pdf",
      fileSource: {
        kind: "remote-url",
        uri: "https://example.com/request.pdf",
      },
    });
  });

  it("builds a generated foreman descriptor from the canonical backend result", async () => {
    const descriptor = await buildForemanRequestPdfDescriptor({
      requestId: "123",
      generatedBy: "Ivan",
      displayNo: "REQ-123",
      status: "pending",
      createdAt: "2026-04-04T00:00:00.000Z",
      updatedAt: "2026-04-04T00:00:00.000Z",
      objectName: "Tower A",
      title: "Request REQ-123",
    });

    expect(mockGenerateForemanRequestPdfViaBackend).toHaveBeenCalledWith({
      version: "v1",
      role: "foreman",
      documentType: "request",
      requestId: "123",
      generatedBy: "Ivan",
      clientSourceFingerprint: expect.stringMatching(/^frq_client_v1_/),
    });
    expect(descriptor.originModule).toBe("foreman");
    expect(descriptor.documentType).toBe("request");
    expect(descriptor.fileSource.kind).toBe("remote-url");
    expect(descriptor.uri).toBe("https://example.com/foreman-request.pdf");
    expect(descriptor.fileName).toBe("request_123.pdf");
    expect(descriptor.title).toBe("Request REQ-123");
  });

  it("builds a lazy history preview plan with dismiss-before-navigate semantics", async () => {
    const plan = createForemanHistoryPdfPreviewPlan({
      requestId: "req-77",
      authIdentityFullName: "Foreman One",
      historyRequests: [
        {
          id: "req-77",
          display_no: "REQ-77/2026",
          status: "draft",
          created_at: "2026-04-26T00:00:00.000Z",
          object_name_ru: "Tower A",
        },
      ],
      requestDetails: {
        foreman_name: "Foreman Two",
        updated_at: "2026-04-26T12:00:00.000Z",
      },
      closeHistory: jest.fn(),
      busy: undefined,
      supabase: {} as never,
      router: { push: jest.fn() } as never,
    });

    expect(plan).not.toBeNull();
    if (!plan) throw new Error("history preview plan missing");
    expect(plan).toEqual(
      expect.objectContaining({
        key: "pdf:history:req-77",
        label: "Открываю PDF…",
        createDescriptor: expect.any(Function),
        onBeforeNavigate: expect.any(Function),
      }),
    );

    await plan.createDescriptor();
    expect(mockGenerateForemanRequestPdfViaBackend).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: "req-77",
        generatedBy: "Foreman Two",
      }),
    );
  });

  it("records observability and shows a controlled alert when guarded history preview fails", async () => {
    mockPrepareAndPreviewGeneratedPdfFromDescriptorFactory.mockRejectedValue(new Error("preview blocked"));

    await previewForemanHistoryPdf({
      requestId: "req-77",
      authIdentityFullName: "Foreman One",
      historyRequests: [],
      requestDetails: null,
      closeHistory: jest.fn(),
      busy: undefined,
      supabase: {} as never,
      router: { push: jest.fn() } as never,
    });

    expect(mockPrepareAndPreviewGeneratedPdfFromDescriptorFactory).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "pdf:history:req-77",
        label: "Открываю PDF…",
        createDescriptor: expect.any(Function),
        onBeforeNavigate: expect.any(Function),
      }),
    );
    expect(mockRecordCatchDiscipline).toHaveBeenCalledWith(
      expect.objectContaining({
        screen: "foreman",
        surface: "foreman_pdf_open",
        event: "foreman_history_pdf_open_failed",
        extra: expect.objectContaining({
          requestId: "req-77",
          action: "openHistoryPdf",
        }),
      }),
    );
    expect(Alert.alert).toHaveBeenCalledWith("PDF", "preview blocked");
  });
});
