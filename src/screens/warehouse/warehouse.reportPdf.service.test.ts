const mockExportWarehouseHtmlPdf = jest.fn();
const mockApiFetchIssuedMaterialsReportFast = jest.fn();
const mockGetWarehouseDayMaterialsReportPdfSource = jest.fn();
const mockGetWarehouseIncomingMaterialsReportPdfSource = jest.fn();
const mockGetWarehouseObjectWorkReportPdfSource = jest.fn();

jest.mock("../../lib/pdf/pdf.warehouse", () => ({
  buildWarehouseIncomingMaterialsReportHtml: jest.fn(() => "<html />"),
  buildWarehouseIncomingRegisterHtml: jest.fn(() => "<html />"),
  buildWarehouseIssueFormHtml: jest.fn(() => "<html />"),
  buildWarehouseIssuesRegisterHtml: jest.fn(() => "<html />"),
  buildWarehouseMaterialsReportHtml: jest.fn(() => "<html />"),
  buildWarehouseObjectWorkReportHtml: jest.fn(() => "<html />"),
  exportWarehouseHtmlPdf: (...args: unknown[]) => mockExportWarehouseHtmlPdf(...args),
}));

jest.mock("./warehouse.stock.read", () => ({
  apiFetchIssuedMaterialsReportFast: (...args: unknown[]) => mockApiFetchIssuedMaterialsReportFast(...args),
}));

jest.mock("./warehouse.dayMaterialsReport.pdf.service", () => ({
  getWarehouseDayMaterialsReportPdfSource: (...args: unknown[]) => mockGetWarehouseDayMaterialsReportPdfSource(...args),
}));

jest.mock("./warehouse.incomingMaterialsReport.pdf.service", () => ({
  getWarehouseIncomingMaterialsReportPdfSource: (...args: unknown[]) =>
    mockGetWarehouseIncomingMaterialsReportPdfSource(...args),
}));

jest.mock("./warehouse.objectWorkReport.pdf.service", () => ({
  getWarehouseObjectWorkReportPdfSource: (...args: unknown[]) => mockGetWarehouseObjectWorkReportPdfSource(...args),
}));

import { createWarehouseReportPdfService } from "./warehouse.reportPdf.service";

describe("warehouse.reportPdf.service", () => {
  beforeEach(() => {
    mockExportWarehouseHtmlPdf.mockReset();
    mockApiFetchIssuedMaterialsReportFast.mockReset();
    mockGetWarehouseDayMaterialsReportPdfSource.mockReset();
    mockGetWarehouseIncomingMaterialsReportPdfSource.mockReset();
    mockGetWarehouseObjectWorkReportPdfSource.mockReset();
    mockExportWarehouseHtmlPdf.mockResolvedValue("https://example.com/report.pdf");
  });

  const createService = (overrides?: {
    ensureIssueLines?: (issueId: number) => Promise<unknown>;
  }) =>
    createWarehouseReportPdfService({
      supabase: {} as never,
      normalizedIssueHeads: [
        {
          issue_id: "42",
          event_dt: "2026-04-02T08:00:00.000Z",
        } as never,
      ],
      normalizedIncomingHeads: [],
      periodFrom: "2026-04-01",
      periodTo: "2026-04-30",
      orgName: "GOX",
      warehouseName: "Main Warehouse",
      nameByCode: {},
      ensureIssueLines: async () => [],
      ...(overrides as Partial<Parameters<typeof createWarehouseReportPdfService>[0]>),
    });

  it("fails in a controlled way when issue PDF lines payload is not an array", async () => {
    const service = createService({
      ensureIssueLines: async () => ({ rows: [] }),
    });

    await expect(service.buildIssueHtml(42)).rejects.toThrow(
      "warehouse issue PDF lines returned invalid rows payload",
    );
    expect(mockExportWarehouseHtmlPdf).not.toHaveBeenCalled();
  });

  it("fails in a controlled way when materials report rows payload is not an array", async () => {
    mockApiFetchIssuedMaterialsReportFast.mockResolvedValueOnce({ rows: [] });
    const service = createService();

    await expect(service.buildMaterialsReportPdf()).rejects.toThrow(
      "warehouse materials report returned invalid rows payload",
    );
    expect(mockExportWarehouseHtmlPdf).not.toHaveBeenCalled();
  });

  it("fails in a controlled way when object-work rows payload is not an array", async () => {
    mockGetWarehouseObjectWorkReportPdfSource.mockResolvedValueOnce({
      rows: { bad: true },
      docsTotal: 0,
    });
    const service = createService();

    await expect(service.buildObjectWorkReportPdf()).rejects.toThrow(
      "warehouse object-work report returned invalid rows payload",
    );
    expect(mockExportWarehouseHtmlPdf).not.toHaveBeenCalled();
  });
});
