import fs from "fs";
import path from "path";

import {
  buildObservabilityOpsReport,
  writeObservabilityOpsArtifacts,
} from "../../scripts/audit/observabilityOps.shared";
import { containsSensitiveOpsText } from "../../src/lib/ops/productionOpsTelemetry";

const repoRoot = path.resolve(__dirname, "../..");

const REQUIRED_ARTIFACTS = [
  "artifacts/S_OBSERVABILITY_metrics_coverage.json",
  "artifacts/S_OBSERVABILITY_rate_limits.json",
  "artifacts/S_OBSERVABILITY_pii_audit.json",
  "artifacts/S_OBSERVABILITY_alerts.json",
  "artifacts/S_OBSERVABILITY_matrix.json",
  "artifacts/S_OBSERVABILITY_proof.md",
] as const;

describe("observability artifacts PII boundary", () => {
  it("writes the Wave 09 artifacts without PII, tokens, service role, or raw provider payloads", () => {
    writeObservabilityOpsArtifacts(
      buildObservabilityOpsReport({
        fullJestPassed: true,
        releaseVerifyPassed: true,
      }),
    );

    for (const artifact of REQUIRED_ARTIFACTS) {
      const fullPath = path.join(repoRoot, artifact);
      expect(fs.existsSync(fullPath)).toBe(true);
      const text = fs.readFileSync(fullPath, "utf8");
      expect(text).not.toContain("person@example.test");
      expect(text).not.toContain("+996 555");
      expect(text).not.toContain("secret-token");
      expect(text).not.toContain("access_token=secret");
      expect(text).not.toContain("providerPayload");
      expect(text).not.toContain("rawPrompt");
      expect(text).not.toContain("service_role");
      expect(containsSensitiveOpsText(text)).toBe(false);
    }

    const matrix = JSON.parse(
      fs.readFileSync(path.join(repoRoot, "artifacts/S_OBSERVABILITY_matrix.json"), "utf8"),
    ) as Record<string, unknown>;
    expect(matrix.final_status).toBe("GREEN_OBSERVABILITY_OPS_RATE_LIMIT_READY");
    expect(matrix.pii_in_logs_found).toBe(false);
    expect(matrix.pii_in_artifacts_found).toBe(false);
    expect(matrix.fake_green_claimed).toBe(false);
  });
});
