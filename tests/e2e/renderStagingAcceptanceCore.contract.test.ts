import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { newestSummary } from "../../scripts/e2e/renderStagingAcceptanceCore";

describe("render staging acceptance runtime summaries", () => {
  it("reads summary JSON files with a leading UTF-8 BOM", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "render-summary-bom-"));
    const outDir = path.join(root, "2026-07-09T00-00-00-000Z");
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(
      path.join(outDir, "summary.json"),
      `\uFEFF${JSON.stringify({ final_status: "GREEN_TEST_SUMMARY", source_sha: "test-sha" })}\n`,
      "utf8",
    );

    const result = newestSummary<{ final_status: string }>(
      root,
      (summary) => summary.final_status === "GREEN_TEST_SUMMARY",
    );

    expect(result?.summary.final_status).toBe("GREEN_TEST_SUMMARY");
  });
});
