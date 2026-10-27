import { rikQuickSearch as runCanonicalRikQuickSearch } from "../catalog/catalog.search.service";
import { rikQuickSearch } from "./rik";

jest.mock("../catalog/catalog.search.service", () => ({
  rikQuickSearch: jest.fn(),
}));

const mockRunCanonicalRikQuickSearch = runCanonicalRikQuickSearch as jest.Mock;

describe("api/rik compat boundary", () => {
  beforeEach(() => {
    mockRunCanonicalRikQuickSearch.mockReset();
  });

  it("keeps the legacy default limit and delegates to the canonical service", async () => {
    mockRunCanonicalRikQuickSearch.mockResolvedValue([
      {
        rik_code: "RIK-1",
        name_human: "Песок",
        name_human_ru: "Песок",
        uom_code: "меш",
        kind: "material",
        apps: null,
      },
    ]);

    const result = await rikQuickSearch("песок");

    expect(mockRunCanonicalRikQuickSearch).toHaveBeenCalledWith("песок", 50, undefined);
    expect(result).toEqual([
      {
        rik_code: "RIK-1",
        name_human: "Песок",
        name_human_ru: "Песок",
        uom_code: "меш",
        kind: "material",
        apps: null,
      },
    ]);
  });

  it("clamps limit and preserves apps passthrough", async () => {
    mockRunCanonicalRikQuickSearch.mockResolvedValue([]);

    await rikQuickSearch("цемент", 500, ["app-a"]);

    expect(mockRunCanonicalRikQuickSearch).toHaveBeenCalledWith("цемент", 200, ["app-a"]);
  });

  it("returns empty for blank query without delegating", async () => {
    const result = await rikQuickSearch("   ", 10);

    expect(result).toEqual([]);
    expect(mockRunCanonicalRikQuickSearch).not.toHaveBeenCalled();
  });
});
