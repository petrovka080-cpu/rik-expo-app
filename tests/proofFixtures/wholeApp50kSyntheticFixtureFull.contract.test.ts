import fs from "node:fs";
import path from "node:path";

describe("whole-app 50k synthetic fixture full contract", () => {
  it("locks the full 50k synthetic row target", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/e2e/seedWholeApp50kSyntheticFixture.ts"),
      "utf8",
    );

    expect(source).toContain("consumer_requests: 50_000");
    expect(source).toContain("consumer_request_items: 250_000");
    expect(source).toContain("consumer_media_rows: 100_000");
    expect(source).toContain("consumer_pdf_rows: 50_000");
    expect(source).toContain("marketplace_listings: 50_000");
    expect(source).toContain("events: 1_000_000");
    expect(source).toContain('const GREEN_READY = "GREEN_50K_SYNTHETIC_FIXTURE_READY"');
  });
});
