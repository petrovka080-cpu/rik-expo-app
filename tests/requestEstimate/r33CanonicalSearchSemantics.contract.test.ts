import {
  buildGlobalSelectedWorkBinding,
  searchGlobalWorkSmartSuggestions,
} from "../../src/lib/ai/globalEstimate";

const R33_REQUIRED_SEARCH_CASES = [
  { query: "сваи", expectedWorkKey: "foundation_pile_field" },
  { query: "монолит стена", expectedWorkKey: "monolithic_wall" },
  { query: "демонтаж асфальта", expectedWorkKey: "asphalt_demolition" },
  { query: "кабель 3х2.5", expectedWorkKey: "cable_pulling" },
  { query: "труба 110", expectedWorkKey: "sewer_pipe_installation" },
  { query: "влагостойкая перегородка", expectedWorkKey: "moisture_drywall_partition" },
  { query: "кровля металл", expectedWorkKey: "metal_roofing" },
] as const;

describe("R3.3 canonical construction-work search semantics", () => {
  it("returns the intended canonical work first for all seven mandatory Russian queries", () => {
    const failures = R33_REQUIRED_SEARCH_CASES.flatMap(({ query, expectedWorkKey }) => {
      const suggestions = searchGlobalWorkSmartSuggestions({ query, limit: 8 });
      return suggestions[0]?.workKey === expectedWorkKey
        ? []
        : [`${query}: expected=${expectedWorkKey}; actual=${suggestions[0]?.workKey ?? "NONE"}`];
    });

    expect(failures).toEqual([]);
  });

  it("matches word order, prefixes, substring stems, case, hyphens, spaces and е/ё normalization", () => {
    const variants = [
      { query: "асфальт демонтаж", expectedWorkKey: "asphalt_demolition" },
      { query: "влагост перегор", expectedWorkKey: "moisture_drywall_partition" },
      { query: "  КРОВЛЯ---МЕТАЛЛ  ", expectedWorkKey: "metal_roofing" },
      { query: "сваЙ", expectedWorkKey: "foundation_pile_field" },
    ] as const;

    for (const { query, expectedWorkKey } of variants) {
      expect(searchGlobalWorkSmartSuggestions({ query, limit: 8 })[0]?.workKey).toBe(expectedWorkKey);
    }
  });

  it("emits no duplicate canonical identities and retains dimensional text for parameter extraction", () => {
    for (const { query, expectedWorkKey } of R33_REQUIRED_SEARCH_CASES) {
      const suggestions = searchGlobalWorkSmartSuggestions({ query, limit: 8 });
      const workKeys = suggestions.map(({ workKey }) => workKey);
      expect(new Set(workKeys).size).toBe(workKeys.length);

      const selected = buildGlobalSelectedWorkBinding({
        selectedWorkKey: expectedWorkKey,
        rawInput: query,
      });
      expect(selected.rawInput).toBe(query);
      expect(selected.selectedWorkKey).toBe(expectedWorkKey);
      expect(selected.resolverReGuessed).toBe(false);
    }
  });
});
