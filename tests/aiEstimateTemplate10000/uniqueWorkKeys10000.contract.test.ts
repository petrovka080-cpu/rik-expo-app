import {
  PRODUCTION_EXPANDED_TEMPLATE_KEYS_10000,
  PRODUCTION_WORK_DEFINITIONS_10000,
} from "../../src/lib/ai/estimateTemplate10000";

describe("unique work keys 10000", () => {
  it("has exactly 10000 unique canonical work keys and template keys", () => {
    const workKeys = new Set(PRODUCTION_WORK_DEFINITIONS_10000.map((definition) => definition.workKey));
    const templateKeys = new Set(PRODUCTION_EXPANDED_TEMPLATE_KEYS_10000);
    const visibleNames = PRODUCTION_WORK_DEFINITIONS_10000.map((definition) => definition.visibleNameRu);

    expect(PRODUCTION_WORK_DEFINITIONS_10000).toHaveLength(10000);
    expect(workKeys.size).toBe(10000);
    expect(templateKeys.size).toBe(10000);
    expect(visibleNames.every((name) => name.trim().length > 0)).toBe(true);
  });
});
