import fs from "node:fs";
import path from "node:path";

import { buildReleasePipelineNoTimeoutMobileRuntimeReport } from "../../scripts/release/releasePipelineNoTimeoutMobileRuntime.shared";

describe("Jest shard timeout isolation", () => {
  it("keeps a bisecting shard runner ready for exact hanging test isolation", () => {
    const runner = fs.readFileSync(
      path.join(process.cwd(), "scripts/test/runJestGreenCloseoutShards.ts"),
      "utf8",
    );
    const legacyRunner = fs.readFileSync(
      path.join(process.cwd(), "scripts/test/runJestCloseoutShards.ts"),
      "utf8",
    );
    const report = buildReleasePipelineNoTimeoutMobileRuntimeReport();

    expect(runner).toContain("runJestCloseoutShards.ts");
    expect(runner).toContain("S_RELEASE_PIPELINE");
    expect(legacyRunner).toContain("bisect");
    expect(legacyRunner).toContain("detectOpenHandles");
    expect(legacyRunner).toContain("timeout");
    expect(report.matrix.jest_shard_isolation_ready).toBe(true);
    expect(report.matrix.full_jest_timeout).toBe(false);
  });
});
