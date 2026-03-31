import { exportAoaWorkbookWeb } from "./xlsxExport";
import { loadXlsx } from "../runtime/loadXlsx";

jest.mock("../runtime/loadXlsx", () => ({
  loadXlsx: jest.fn(),
}));

const mockLoadXlsx = loadXlsx as jest.MockedFunction<typeof loadXlsx>;

describe("exportAoaWorkbookWeb", () => {
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

  it("loads xlsx lazily and downloads a workbook via browser primitives", async () => {
    const mockBookNew = jest.fn(() => ({ id: "workbook" }));
    const mockAoaToSheet = jest.fn(() => ({ id: "sheet" }));
    const mockBookAppendSheet = jest.fn();
    const mockWrite = jest.fn(() => new Uint8Array([1, 2, 3]));

    mockLoadXlsx.mockResolvedValue({
      utils: {
        book_new: mockBookNew,
        aoa_to_sheet: mockAoaToSheet,
        book_append_sheet: mockBookAppendSheet,
      },
      write: mockWrite,
    } as unknown as Awaited<ReturnType<typeof loadXlsx>>);

    await exportAoaWorkbookWeb({
      data: [["№", "Name"], [1, "Pipe"]],
      sheetName: "Sheet1",
      downloadName: "report.xlsx",
      columns: [{ wch: 12 }],
    });

    expect(mockLoadXlsx).toHaveBeenCalledTimes(1);
    expect(mockBookNew).toHaveBeenCalledTimes(1);
    expect(mockAoaToSheet).toHaveBeenCalledWith([["№", "Name"], [1, "Pipe"]]);
    expect(mockBookAppendSheet).toHaveBeenCalledWith({ id: "workbook" }, { id: "sheet", "!cols": [{ wch: 12 }] }, "Sheet1");
    expect(mockWrite).toHaveBeenCalledWith({ id: "workbook" }, { bookType: "xlsx", type: "array" });
    expect(createObjectUrl).toHaveBeenCalledTimes(1);
    expect(anchor.href).toBe("blob:wave7");
    expect(anchor.download).toBe("report.xlsx");
    expect(appendChild).toHaveBeenCalledWith(anchor);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(removeChild).toHaveBeenCalledWith(anchor);
    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:wave7");
  });
});
