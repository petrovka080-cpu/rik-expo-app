import { readFileSync } from "fs";
import { join } from "path";
import { createAccountantRefreshHandlers } from "../../src/screens/accountant/accountant.actions";
import { TABS } from "../../src/screens/accountant/types";

const mockRecordPlatformObservability = jest.fn();

jest.mock("../../src/lib/observability/platformObservability", () => ({
  recordPlatformObservability: (...args: unknown[]) =>
    mockRecordPlatformObservability(...args),
}));

const root = join(__dirname, "..", "..");
const read = (relativePath: string) =>
  readFileSync(join(root, relativePath), "utf8");

const touchedRuntimeFiles = [
  "src/screens/accountant/accountant.actions.ts",
  "src/screens/warehouse/warehouse.reports.ts",
  "src/screens/foreman/foreman.dicts.repo.ts",
  "src/screens/contractor/hooks/useContractorScreenData.ts",
];

describe("S_ERROR_01_TRY_CATCH_GAPS_BATCH_A", () => {
  beforeEach(() => {
    mockRecordPlatformObservability.mockClear();
  });

  it("records accountant refresh failures without swallowing the rejected load", async () => {
    const failure = new Error(
      "failed to refresh https://example.invalid/report.pdf?token=fake",
    );
    const setRefreshing = jest.fn();
    const setHistoryRefreshing = jest.fn();
    const handlers = createAccountantRefreshHandlers({
      loadInbox: jest.fn().mockRejectedValue(failure),
      loadHistory: jest.fn().mockResolvedValue(undefined),
      setRefreshing,
      setHistoryRefreshing,
      tabRef: { current: TABS[0] },
      historyTab: TABS[4],
    });

    await expect(handlers.onRefresh()).rejects.toBe(failure);

    expect(setRefreshing).toHaveBeenNthCalledWith(1, true);
    expect(setRefreshing).toHaveBeenNthCalledWith(2, false);
    expect(mockRecordPlatformObservability).toHaveBeenCalledWith(
      expect.objectContaining({
        screen: "accountant",
        surface: "refresh",
        category: "reload",
        event: "accountant_manual_inbox_refresh_failed",
        result: "error",
        errorClass: "Error",
      }),
    );
    const event = mockRecordPlatformObservability.mock.calls[0]?.[0];
    expect(event).not.toHaveProperty("errorMessage");
    expect(JSON.stringify(event)).not.toContain("example.invalid");
    expect(JSON.stringify(event)).not.toContain("fake");
  });

  it("adds rethrowing redacted observability to warehouse report line loads", () => {
    const source = read("src/screens/warehouse/warehouse.reports.ts");

    expect(source).toContain("recordWarehouseReportLineLoadFailure");
    expect(source).toContain('event: `warehouse_${lineKind}_lines_load_failed`');
    expect(source).toContain('sourceKind: `warehouse:${lineKind}_lines`');
    expect((source.match(/throw error;/g) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(source).not.toContain("errorMessage:");
  });

  it("records foreman dictionary fallback errors without changing empty-option fallback", () => {
    const source = read("src/screens/foreman/foreman.dicts.repo.ts");

    expect(source).toContain("recordForemanDictFallback");
    expect(source).toContain('fallback: "empty_options"');
    expect(source).toContain('recordForemanDictFallback("ref_object_types", obj.error)');
    expect(source).toContain('recordForemanDictFallback("ref_levels", lvl.error)');
    expect(source).toContain('recordForemanDictFallback("ref_systems", sys.error)');
    expect(source).toContain('recordForemanDictFallback("ref_zones", zone.error)');
    expect(source).toContain('recordForemanDictFallback("rik_apps", apps.error)');
    expect(source).toContain('recordForemanDictFallback("rik_item_apps", fallback.error)');
    expect(source).not.toContain("errorMessage:");
  });

  it("records contractor loadWorks degraded fallback without raw console error logging", () => {
    const source = read("src/screens/contractor/hooks/useContractorScreenData.ts");

    expect(source).toContain("recordContractorLoadWorksFailure");
    expect(source).toContain('event: "contractor_load_works_failed"');
    expect(source).toContain('fallback: "empty_rows_screen_contract"');
    expect(source).toContain("recordContractorLoadWorksFailure(error);");
    expect(source).toContain("loadError: error");
    expect(source).not.toContain('console.error("loadWorks exception:"');
    expect(source).not.toContain("errorMessage:");
  });

  it("keeps the touched batch free of empty catch blocks and raw diagnostic sinks", () => {
    for (const relativePath of touchedRuntimeFiles) {
      const source = read(relativePath);
      expect(source).not.toMatch(/catch\s*\{\s*\}/);
      expect(source).not.toContain("console.error");
      expect(source).not.toContain("console.warn");
      expect(source).not.toContain("body:");
      expect(source).not.toContain("payload:");
      expect(source).not.toContain("url:");
      expect(source).not.toContain("uri:");
    }
  });
});
