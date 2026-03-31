const mockGenerateDirectorPdfDocument = jest.fn();
const mockGenerateDirectorProductionReportPdfViaBackend = jest.fn();
const mockGenerateDirectorSubcontractReportPdfViaBackend = jest.fn();

jest.mock("../../lib/documents/pdfDocumentGenerators", () => ({
  generateDirectorPdfDocument: (...args: unknown[]) => mockGenerateDirectorPdfDocument(...args),
}));

jest.mock("../../lib/api/directorProductionReportPdfBackend.service", () => ({
  generateDirectorProductionReportPdfViaBackend: (...args: unknown[]) =>
    mockGenerateDirectorProductionReportPdfViaBackend(...args),
}));

jest.mock("../../lib/api/directorSubcontractReportPdfBackend.service", () => ({
  generateDirectorSubcontractReportPdfViaBackend: (...args: unknown[]) =>
    mockGenerateDirectorSubcontractReportPdfViaBackend(...args),
}));

const loadSubject = () =>
  require("./director.reports.pdfService") as typeof import("./director.reports.pdfService");

describe("director.reports.pdfService", () => {
  beforeEach(() => {
    jest.resetModules();
    mockGenerateDirectorPdfDocument.mockReset();
    mockGenerateDirectorProductionReportPdfViaBackend.mockReset();
    mockGenerateDirectorSubcontractReportPdfViaBackend.mockReset();
    mockGenerateDirectorPdfDocument.mockImplementation(async (args: unknown) => args);
  });

  it("uses backend source for production report without local fallback", async () => {
    mockGenerateDirectorProductionReportPdfViaBackend.mockResolvedValue({
      source: {
        kind: "remote-url",
        uri: "https://example.com/production.pdf",
      },
    });

    const { buildDirectorProductionReportPdfDescriptor } = loadSubject();
    const descriptor = await buildDirectorProductionReportPdfDescriptor({
      periodFrom: "2026-03-01",
      periodTo: "2026-03-30",
      objectName: "Object A",
    });

    const source = await ((descriptor as unknown) as { getSource: () => Promise<unknown> }).getSource();

    expect(source).toEqual({
      kind: "remote-url",
      uri: "https://example.com/production.pdf",
    });
    expect(mockGenerateDirectorProductionReportPdfViaBackend).toHaveBeenCalledWith(
      expect.objectContaining({
        objectName: "Object A",
      }),
    );
  });

  it("surfaces production backend failure instead of falling back to client render", async () => {
    mockGenerateDirectorProductionReportPdfViaBackend.mockRejectedValue(new Error("backend failed"));

    const { buildDirectorProductionReportPdfDescriptor } = loadSubject();
    const descriptor = await buildDirectorProductionReportPdfDescriptor({
      periodFrom: "2026-03-01",
      periodTo: "2026-03-30",
      objectName: "Object A",
    });

    await expect((((descriptor as unknown) as { getSource: () => Promise<unknown> }).getSource())).rejects.toThrow(
      "backend failed",
    );
  });

  it("uses backend source for subcontract report without local fallback", async () => {
    mockGenerateDirectorSubcontractReportPdfViaBackend.mockResolvedValue({
      source: {
        kind: "remote-url",
        uri: "https://example.com/subcontract.pdf",
      },
    });

    const { buildDirectorSubcontractReportPdfDescriptor } = loadSubject();
    const descriptor = await buildDirectorSubcontractReportPdfDescriptor({
      periodFrom: "2026-03-01",
      periodTo: "2026-03-30",
      objectName: "Object B",
    });

    const source = await ((descriptor as unknown) as { getSource: () => Promise<unknown> }).getSource();

    expect(source).toEqual({
      kind: "remote-url",
      uri: "https://example.com/subcontract.pdf",
    });
    expect(mockGenerateDirectorSubcontractReportPdfViaBackend).toHaveBeenCalledWith(
      expect.objectContaining({
        objectName: "Object B",
      }),
    );
  });
});
