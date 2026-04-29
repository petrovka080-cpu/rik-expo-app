import * as fs from "fs";
import * as path from "path";

import { createBffShadowFixturePorts } from "../../src/shared/scale/bffShadowFixtures";
import {
  BFF_SHADOW_FLOW_DEFINITIONS,
  runLocalBffShadowParity,
} from "../../src/shared/scale/bffShadowHarness";

const projectRoot = path.resolve(__dirname, "../..");

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function listFilesRecursive(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];

  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFilesRecursive(fullPath));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

const shadowFiles = [
  "src/shared/scale/bffShadowPorts.ts",
  "src/shared/scale/bffShadowFixtures.ts",
  "src/shared/scale/bffShadowHarness.ts",
  "tests/scale/bffShadowParity.test.ts",
  "docs/architecture/50k_bff_shadow_parity.md",
  "artifacts/S_50K_BFF_SHADOW_1_parity_matrix.json",
  "artifacts/S_50K_BFF_SHADOW_1_parity_proof.md",
];

describe("S-50K-BFF-SHADOW-1 local BFF shadow parity harness", () => {
  it("covers ten local fixture-only read and mutation flows", async () => {
    const summary = await runLocalBffShadowParity();

    expect(summary.status).toBe("GREEN_LOCAL_SHADOW");
    expect(summary.coveredFlows).toBe(10);
    expect(summary.readFlowsCovered).toBe(5);
    expect(summary.mutationFlowsCovered).toBe(5);
    expect(summary.productionTouched).toBe(false);
    expect(summary.stagingTouched).toBe(false);
    expect(summary.networkUsed).toBe(false);
    expect(summary.results.every((result) => result.status === "match")).toBe(true);
    expect(summary.results.map((result) => result.flow)).toEqual([
      "request.proposal.list",
      "marketplace.catalog.search",
      "warehouse.ledger.list",
      "accountant.invoice.list",
      "director.pending.list",
      "proposal.submit",
      "warehouse.receive.apply",
      "accountant.payment.apply",
      "director.approval.apply",
      "request.item.update",
    ]);
  });

  it("uses fixture ports only and never calls network or Supabase", async () => {
    const fixturePorts = createBffShadowFixturePorts();
    const originalFetch = globalThis.fetch;
    const fetchSpy = jest.fn(() => {
      throw new Error("network is forbidden in local shadow parity");
    }) as unknown as typeof fetch;
    globalThis.fetch = fetchSpy;

    try {
      const summary = await runLocalBffShadowParity({ ports: fixturePorts });

      expect(summary.status).toBe("GREEN_LOCAL_SHADOW");
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(fixturePorts.calls).toHaveLength(10);
      expect(fixturePorts.calls.every((call) => call.pageSize === undefined || call.pageSize === 100)).toBe(true);
      expect(fixturePorts.calls.filter((call) => call.hasIdempotencyKey === true)).toHaveLength(5);
    } finally {
      globalThis.fetch = originalFetch;
    }

    const source = readProjectFile("src/shared/scale/bffShadowHarness.ts");
    expect(source).not.toContain(".from(");
    expect(source).not.toContain(".rpc(");
    expect(source).not.toContain("supabase");
  });

  it("detects missing idempotency as safe mismatches without raw payload output", async () => {
    const summary = await runLocalBffShadowParity({ mutationIdempotencyKey: null });
    const mutationResults = summary.results.filter((result) => result.kind === "mutation");

    expect(summary.status).toBe("PARTIAL");
    expect(mutationResults).toHaveLength(5);
    expect(mutationResults.every((result) => result.status === "mismatch")).toBe(true);
    expect(JSON.stringify(mutationResults)).toContain("IDEMPOTENCY_KEY_REQUIRED");
    expect(JSON.stringify(mutationResults)).not.toContain("test-company-redacted");
    expect(JSON.stringify(mutationResults)).not.toContain("test-request-001");
    expect(JSON.stringify(mutationResults)).not.toContain("user@example.test");
  });

  it("detects pagination mismatch safely", async () => {
    const summary = await runLocalBffShadowParity({ expectedReadPageSize: 50 });
    const readResults = summary.results.filter((result) => result.kind === "read");

    expect(summary.status).toBe("PARTIAL");
    expect(readResults).toHaveLength(5);
    expect(readResults.every((result) => result.status === "mismatch")).toBe(true);
    expect(JSON.stringify(readResults)).toContain("pagination");
    expect(JSON.stringify(readResults)).not.toContain("fixture-token-value");
  });

  it("keeps shadow output free of PII-like values, tokens, and signed URLs", async () => {
    const summary = await runLocalBffShadowParity({ mutationIdempotencyKey: "token=unsafe-secret-value" });
    const output = JSON.stringify(summary);

    expect(output).not.toContain("user@example.test");
    expect(output).not.toContain("+10000000000");
    expect(output).not.toContain("fixture-token-value");
    expect(output).not.toContain("access_token=");
    expect(output).not.toContain("signature=");
  });

  it("documents acceptable differences and skipped flows as zero for this local wave", async () => {
    const summary = await runLocalBffShadowParity();

    expect(summary.results.filter((result) => result.status === "acceptable_difference")).toHaveLength(0);
    expect(summary.results.filter((result) => result.status === "skipped")).toHaveLength(0);
    for (const result of summary.results) {
      expect(result.ignoredFields.length).toBeGreaterThan(0);
      expect(result.productionTouched).toBe(false);
      expect(result.stagingTouched).toBe(false);
      expect(result.networkUsed).toBe(false);
    }
  });

  it("has no production or staging environment reads in the shadow modules", () => {
    for (const file of [
      "src/shared/scale/bffShadowPorts.ts",
      "src/shared/scale/bffShadowFixtures.ts",
      "src/shared/scale/bffShadowHarness.ts",
    ]) {
      const source = readProjectFile(file);
      expect(source).not.toContain("process.env");
      expect(source).not.toContain(".env");
    }
  });

  it("keeps current app runtime from importing the shadow harness", () => {
    const runtimeRoots = [
      path.join(projectRoot, "app"),
      path.join(projectRoot, "src", "screens"),
      path.join(projectRoot, "src", "features"),
      path.join(projectRoot, "src", "lib", "api"),
    ];

    for (const root of runtimeRoots) {
      for (const file of listFilesRecursive(root)) {
        const source = fs.readFileSync(file, "utf8");
        expect(source).not.toContain("shared/scale/bffShadow");
        expect(source).not.toContain("bffShadowHarness");
      }
    }
  });

  it("keeps new files, docs, tests, and artifacts free of server admin credential markers", () => {
    const markerA = ["service", "role"].join("_");
    const markerB = ["SERVICE", "ROLE"].join("_");
    const jwtPrefix = ["e", "y", "J"].join("");
    const liveKeyPrefix = ["sk", "live"].join("_");

    for (const file of shadowFiles) {
      const source = readProjectFile(file);
      expect(source).not.toContain(markerA);
      expect(source).not.toContain(markerB);
      expect(source).not.toContain(jwtPrefix);
      expect(source).not.toContain(liveKeyPrefix);
    }
  });

  it("keeps flow definitions aligned with read/write handler coverage", () => {
    expect(BFF_SHADOW_FLOW_DEFINITIONS).toHaveLength(10);
    expect(BFF_SHADOW_FLOW_DEFINITIONS.filter((flow) => flow.kind === "read")).toHaveLength(5);
    expect(BFF_SHADOW_FLOW_DEFINITIONS.filter((flow) => flow.kind === "mutation")).toHaveLength(5);
  });
});
