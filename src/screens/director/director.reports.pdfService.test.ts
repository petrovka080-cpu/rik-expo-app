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
      repData: { rows: [{ rik_code: "MAT-1", qty_total: 3 }] },
      repDiscipline: { works: [{ work_type_name: "Work A", total_positions: 1 }] },
    });

    const source = await ((descriptor as unknown) as { getSource: () => Promise<unknown> }).getSource();

    expect(source).toEqual({
      kind: "remote-url",
      uri: "https://example.com/production.pdf",
    });
    expect(mockGenerateDirectorProductionReportPdfViaBackend).toHaveBeenCalledWith(
      expect.objectContaining({
        objectName: "Object A",
        clientSourceFingerprint: expect.any(String),
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

  // ── PDF-Z2: Source fingerprint stability (deterministic versioning) ──────────

  it("PDF-Z2: always passes clientSourceFingerprint when repData is provided", async () => {
    mockGenerateDirectorProductionReportPdfViaBackend.mockResolvedValue({ source: { kind: "remote-url", uri: "https://example.com/p.pdf" } });
    const { buildDirectorProductionReportPdfDescriptor } = loadSubject();

    const descriptor = await buildDirectorProductionReportPdfDescriptor({
      periodFrom: "2026-03-01",
      periodTo: "2026-03-31",
      repData: { rows: [{ rik_code: "MAT-1", qty_total: 5 }] },
      repDiscipline: null,
    });
    await ((descriptor as unknown) as { getSource: () => Promise<unknown> }).getSource();

    const callArg = mockGenerateDirectorProductionReportPdfViaBackend.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(typeof callArg.clientSourceFingerprint).toBe("string");
    expect((callArg.clientSourceFingerprint as string).length).toBeGreaterThan(0);
  });

  it("PDF-Z2: same repData/repDiscipline → same clientSourceFingerprint (stable versioning)", async () => {
    mockGenerateDirectorProductionReportPdfViaBackend.mockResolvedValue({ source: { kind: "remote-url", uri: "https://example.com/p.pdf" } });
    const { buildDirectorProductionReportPdfDescriptor } = loadSubject();

    const repData = { rows: [{ rik_code: "MAT-1", qty_total: 5 }] };
    const repDiscipline = { works: [{ work_type_name: "Work A", total_positions: 2 }] };
    const args = { periodFrom: "2026-03-01", periodTo: "2026-03-31", objectName: "Obj", repData, repDiscipline };

    const d1 = await buildDirectorProductionReportPdfDescriptor(args);
    await ((d1 as unknown) as { getSource: () => Promise<unknown> }).getSource();
    const fp1 = (mockGenerateDirectorProductionReportPdfViaBackend.mock.calls[0]?.[0] as Record<string, unknown>).clientSourceFingerprint;
    mockGenerateDirectorProductionReportPdfViaBackend.mockClear();

    const d2 = await buildDirectorProductionReportPdfDescriptor(args);
    await ((d2 as unknown) as { getSource: () => Promise<unknown> }).getSource();
    const fp2 = (mockGenerateDirectorProductionReportPdfViaBackend.mock.calls[0]?.[0] as Record<string, unknown>).clientSourceFingerprint;

    expect(fp1).toBe(fp2);
  });

  it("PDF-Z2: changed repData → different clientSourceFingerprint (no stale artifact)", async () => {
    mockGenerateDirectorProductionReportPdfViaBackend.mockResolvedValue({ source: { kind: "remote-url", uri: "https://example.com/p.pdf" } });
    const { buildDirectorProductionReportPdfDescriptor } = loadSubject();

    const base = { periodFrom: "2026-03-01", periodTo: "2026-03-31", objectName: "Obj" };

    const d1 = await buildDirectorProductionReportPdfDescriptor({ ...base, repData: { rows: [{ rik_code: "MAT-1", qty_total: 5 }] } });
    await ((d1 as unknown) as { getSource: () => Promise<unknown> }).getSource();
    const fp1 = (mockGenerateDirectorProductionReportPdfViaBackend.mock.calls[0]?.[0] as Record<string, unknown>).clientSourceFingerprint;
    mockGenerateDirectorProductionReportPdfViaBackend.mockClear();

    const d2 = await buildDirectorProductionReportPdfDescriptor({ ...base, repData: { rows: [{ rik_code: "MAT-2", qty_total: 99 }] } });
    await ((d2 as unknown) as { getSource: () => Promise<unknown> }).getSource();
    const fp2 = (mockGenerateDirectorProductionReportPdfViaBackend.mock.calls[0]?.[0] as Record<string, unknown>).clientSourceFingerprint;

    expect(fp1).not.toBe(fp2);
  });
});
