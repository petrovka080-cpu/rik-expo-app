import path from "node:path";

import { resolveCanonicalOrJestEvidencePath } from "../../scripts/audit/runScopedEvidence";

describe("Jest evidence isolation", () => {
  test("routes producer output outside canonical artifacts with a PID-scoped path", () => {
    const root = path.resolve(__dirname, "../..");
    const canonical = path.join(root, "artifacts", "S_EXAMPLE", "matrix.json");
    const resolved = resolveCanonicalOrJestEvidencePath(canonical, root);

    expect(process.env.JEST_WORKER_ID).toBeTruthy();
    expect(resolved).not.toBe(canonical);
    expect(resolved).toContain(path.join(".release-runtime", "test-evidence"));
    expect(resolved).toContain(`jest-${process.env.JEST_WORKER_ID}-pid-${process.pid}`);
    expect(resolved).toContain(path.join("S_EXAMPLE", "matrix.json"));
  });

  test("rejects canonical paths outside the artifacts boundary", () => {
    const root = path.resolve(__dirname, "../..");
    expect(() =>
      resolveCanonicalOrJestEvidencePath(path.join(root, "src", "unexpected.json"), root),
    ).toThrow("JEST_EVIDENCE_PATH_OUTSIDE_ARTIFACTS");
  });
});
