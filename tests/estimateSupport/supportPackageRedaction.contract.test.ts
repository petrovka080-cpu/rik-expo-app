import { buildEstimateSupportPackage } from "../../scripts/estimate/exportEstimateSupportPackage";

describe("estimate support package redaction", () => {
  it("exports a redacted package with PDF and procurement lineage", () => {
    const supportPackage = buildEstimateSupportPackage({
      prompt: "road construction 1 km width 6 m asphalt phone +996700000000 email user@example.com",
      generatedAt: "2026-07-04T00:00:00.000Z",
    });
    const serialized = JSON.stringify(supportPackage);
    expect(supportPackage.raw_prompt_included).toBe(false);
    expect(serialized).not.toContain("+996700000000");
    expect(serialized).not.toContain("user@example.com");
    expect((supportPackage.pdf as { generated?: boolean }).generated).toBe(true);
    expect(supportPackage.procurement_package).toBeTruthy();
  });
});
