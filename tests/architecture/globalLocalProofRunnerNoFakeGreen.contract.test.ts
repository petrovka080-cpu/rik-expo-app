import fs from "node:fs";
import path from "node:path";

describe("global local estimate platform proof runner", () => {
  const source = fs.readFileSync(
    path.resolve(process.cwd(), "scripts/e2e/runGlobalLocalEstimatePlatformProof.ts"),
    "utf8",
  );

  it("keeps foundation replay explicit and blocks production green without live evidence", () => {
    expect(source).toContain("FOUNDATION_ONLY");
    expect(source).toContain("GLOBAL_LOCAL_REQUIRE_LIVE");
    expect(source).toContain("BLOCKED_GLOBAL_LOCAL_LIVE_WEB_ANDROID_PDF_NOT_RUN");
    expect(source).toContain("BLOCKED_GLOBAL_LOCAL_CLOSEOUT_NOT_RUN");
    expect(source).toContain("GREEN_AI_ESTIMATE_GLOBAL_LOCAL_CONTEXT_RATE_SOURCE_PLATFORM_READY");
    expect(source).toContain('readArtifact("web_results.json")');
    expect(source).toContain('readArtifact("android_api34_results.json")');
    expect(source).toContain('readArtifact("pdf_text_extract.json")');
    expect(source).toContain("api36_rejected");
  });

  it("exits non-zero for blocked production proof instead of silently passing a blocked matrix", () => {
    expect(source).toContain('matrix.final_status !== "GREEN_AI_ESTIMATE_GLOBAL_LOCAL_CONTEXT_RATE_SOURCE_PLATFORM_READY"');
    expect(source).toContain("process.exitCode = 1");
    expect(source).toContain("Live evidence ready");
    expect(source).toContain("Closeout ready");
  });
});
