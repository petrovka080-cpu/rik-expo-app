import { loadXlsx } from "../runtime/loadXlsx";

type WorkbookColumn = { wch: number };

type ExportAoaWorkbookWebArgs = {
  data: Array<Array<string | number>>;
  sheetName: string;
  downloadName: string;
  columns?: WorkbookColumn[];
};

export async function exportAoaWorkbookWeb(args: ExportAoaWorkbookWebArgs): Promise<void> {
  const XLSX = await loadXlsx();
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(args.data);

  if (args.columns?.length) {
    worksheet["!cols"] = args.columns;
  }

  XLSX.utils.book_append_sheet(workbook, worksheet, args.sheetName);

  const workbookBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([workbookBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = args.downloadName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
