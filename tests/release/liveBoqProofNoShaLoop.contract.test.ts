import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PROJECT_ROOT = path.resolve(__dirname, "..", "..");

describe("live BOQ proof no SHA loop", () => {
  it("records source lineage fields in refresh artifacts", () => {
    const failureRunner = fs.readFileSync(
      path.join(PROJECT_ROOT, "scripts/e2e/runLiveRequestEmbeddedAiPdfBoqCatalogFailureReproduction.ts"),
      "utf8",
    );
    const webSpec = fs.readFileSync(
      path.join(PROJECT_ROOT, "tests/e2e/liveRequestEmbeddedAiProfessionalBoqPdfCatalog.web.spec.ts"),
      "utf8",
    );
    const androidRunner = fs.readFileSync(
      path.join(PROJECT_ROOT, "scripts/e2e/runAndroidApi34LiveRequestEmbeddedAiProfessionalBoqPdfCatalogSmoke.ts"),
      "utf8",
    );

    for (const source of [failureRunner, webSpec, androidRunner]) {
      expect(source).toContain("source_code_head");
      expect(source).toContain("artifact_commit_head");
      expect(source).toContain("current_head_at_write_time");
      expect(source).toContain("artifact_only_supersession_allowed");
      expect(source).toContain("fake_green_claimed");
    }
  });

  it("verifies existing live BOQ artifacts without refreshing them", () => {
    const result = spawnSync(
      "node",
      ["node_modules/tsx/dist/cli.mjs", "scripts/e2e/runLiveRequestEmbeddedAiProfessionalBoqPdfCatalogProof.ts", "--mode=verify"],
      {
        cwd: PROJECT_ROOT,
        encoding: "utf8",
        shell: process.platform === "win32",
        timeout: 30_000,
      },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("GREEN_LIVE_REQUEST_EMBEDDED_AI_PROFESSIONAL_BOQ_PDF_CATALOG_READY");
  });
});
