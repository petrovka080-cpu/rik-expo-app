import fs from "node:fs";
import path from "node:path";

describe("whole-app 50k synthetic fixture smoke contract", () => {
  it("locks the 1k smoke fixture target and smoke green status", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "scripts/e2e/seedWholeApp50kSyntheticFixture.ts"),
      "utf8",
    );

    expect(source).toContain('const GREEN_SMOKE = "GREEN_50K_SYNTHETIC_FIXTURE_SMOKE_READY"');
    expect(source).toContain("consumer_requests: 1_000");
    expect(source).toContain("consumer_request_items: 5_000");
    expect(source).toContain("consumer_media_rows: 2_000");
    expect(source).toContain("consumer_pdf_rows: 1_000");
    expect(source).toContain("marketplace_listings: 1_000");
    expect(source).toContain("events: 5_000");
  });
});
