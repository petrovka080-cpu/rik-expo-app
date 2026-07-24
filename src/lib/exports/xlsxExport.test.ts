import {
  buildAoaXlsxWorkbook,
  exportAoaWorkbookWeb,
} from "./xlsxExport";

describe("xlsxExport", () => {
  const createObjectUrl = jest.fn(() => "blob:wave7");
  const revokeObjectUrl = jest.fn();
  const clickSpy = jest.fn();
  const appendChild = jest.fn();
  const removeChild = jest.fn();
  const anchor = {
    href: "",
    download: "",
    click: clickSpy,
  };
  const fakeDocument = {
    createElement: jest.fn(() => anchor),
    body: {
      appendChild,
      removeChild,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    anchor.href = "";
    anchor.download = "";
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: fakeDocument,
    });
    Object.defineProperty(globalThis, "URL", {
      configurable: true,
      value: {
        createObjectURL: createObjectUrl,
        revokeObjectURL: revokeObjectUrl,
      },
    });
  });

  it("builds a deterministic single-sheet OOXML archive without formulas or external links", () => {
    const first = buildAoaXlsxWorkbook({
      data: [["№", "Name"], [1, '=HYPERLINK("https://example.test")']],
      sheetName: "Sheet:/1",
      downloadName: "report.xlsx",
      columns: [{ wch: 12 }],
    });
    const second = buildAoaXlsxWorkbook({
      data: [["№", "Name"], [1, '=HYPERLINK("https://example.test")']],
      sheetName: "Sheet:/1",
      downloadName: "report.xlsx",
      columns: [{ wch: 12 }],
    });
    const archiveText = new TextDecoder().decode(first);

    expect(first).toEqual(second);
    expect([...first.slice(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    expect(archiveText).toContain("[Content_Types].xml");
    expect(archiveText).toContain("xl/worksheets/sheet1.xml");
    expect(archiveText).toContain('sheet name="Sheet 1"');
    expect(archiveText).toContain(
      't="inlineStr"><is><t xml:space="preserve">=HYPERLINK(&quot;https://example.test&quot;)',
    );
    expect(archiveText).not.toContain("<f>");
    expect(archiveText).not.toContain("externalLink");
    expect(archiveText).not.toContain("vbaProject");
  });

  it("rejects unbounded or invalid workbook data", () => {
    expect(() =>
      buildAoaXlsxWorkbook({
        data: [[Number.POSITIVE_INFINITY]],
        sheetName: "Sheet1",
        downloadName: "report.xlsx",
      }),
    ).toThrow("XLSX_EXPORT_NON_FINITE_NUMBER:A1");
    expect(() =>
      buildAoaXlsxWorkbook({
        data: [Array.from({ length: 101 }, (_, index) => index)],
        sheetName: "Sheet1",
        downloadName: "report.xlsx",
      }),
    ).toThrow("XLSX_EXPORT_COLUMN_LIMIT:101:100");
  });

  it("downloads the generated workbook and always revokes the object URL", async () => {
    await exportAoaWorkbookWeb({
      data: [["№", "Name"], [1, "Pipe"]],
      sheetName: "Sheet1",
      downloadName: "report.xlsx",
      columns: [{ wch: 12 }],
    });

    expect(createObjectUrl).toHaveBeenCalledTimes(1);
    expect(anchor.href).toBe("blob:wave7");
    expect(anchor.download).toBe("report.xlsx");
    expect(appendChild).toHaveBeenCalledWith(anchor);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(removeChild).toHaveBeenCalledWith(anchor);
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:wave7");
  });
});
