let xlsxModulePromise: Promise<typeof import("xlsx")> | null = null;

export function loadXlsx(): Promise<typeof import("xlsx")> {
  if (!xlsxModulePromise) {
    xlsxModulePromise = import("xlsx");
  }
  return xlsxModulePromise;
}

export function resetXlsxLoaderForTests() {
  xlsxModulePromise = null;
}
