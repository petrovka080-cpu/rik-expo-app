import { exactPromptLookupScanReal10000 } from "../../scripts/e2e/real10000AcceptanceCore";

describe("open-world construction exact prompt lookup guard", () => {
  it("keeps runtime code free of exact prompt lookup", () => {
    const scan = exactPromptLookupScanReal10000();
    expect(scan.exact_prompt_lookup_found).toBe(false);
    expect(scan.findings).toEqual([]);
  });
});
