import { readRequestEstimateRuntimeSource } from "./requestEstimateArchitectureTestHelpers";

describe("request estimate release no inline payload mutation", () => {
  it("uses draft reducers and payload builders instead of mutating payloads inline", () => {
    const source = readRequestEstimateRuntimeSource();
    expect(source).toContain("buildConsumerRepairCanonicalDraftPayload");
    expect(source).not.toMatch(/\bpayload\.items\.push\(|\bpayload\.items\s*=\s*\[/);
  });
});
