import {
  collectRequestEstimateSelectedWorkUxMojibakeScan,
} from "../../scripts/e2e/runRequestEstimateSelectedWorkUxMojibakeRootCauseScan";

jest.setTimeout(60000);

describe("request estimate selected-work mojibake repair row quality", () => {
  it("does not replace repaired text with generic rows or internal keys", () => {
    const result = collectRequestEstimateSelectedWorkUxMojibakeScan({ caseCount: 8 });

    expect(result.generic_rows_created_by_repair).toBe(0);
    expect(result.internal_keys_created_by_repair).toBe(0);
    expect(result.generic_rows).toEqual([]);
    expect(result.internal_key_rows).toEqual([]);
  });
});
