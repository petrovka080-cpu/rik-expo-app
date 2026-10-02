import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  loadOfficeMarketLiveEnv,
  verifyExternalOfficeRuntimeReceipts,
} from "../../scripts/e2e/officeMarketLiveHarnessContracts";

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

describe("office/market live harness contracts", () => {
  let root: string;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "office-market-live-contract-"));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("loads guarded fixture env from OFFICE_E2E_ENV_ROOT without overriding non-empty values", () => {
    const configRoot = path.join(root, "shared-env");
    fs.mkdirSync(configRoot, { recursive: true });
    fs.writeFileSync(
      path.join(configRoot, ".env.staging.local"),
      "STAGING_SUPABASE_URL=https://fixture.invalid\nPRESERVED_VALUE=fixture\nWHITESPACE_VALUE=filled\n",
      "utf8",
    );
    fs.writeFileSync(
      path.join(configRoot, ".env.office-e2e.local"),
      "E2E_FOREMAN_EMAIL=foreman@example.invalid\n",
      "utf8",
    );
    const environment = {
      OFFICE_E2E_ENV_ROOT: configRoot,
      PRESERVED_VALUE: "shell",
      WHITESPACE_VALUE: "   ",
    };

    const loaded = loadOfficeMarketLiveEnv(root, environment);

    expect(loaded).toEqual({
      configRoot,
      loadedFiles: [".env.staging.local", ".env.office-e2e.local"],
    });
    expect(environment).toMatchObject({
      STAGING_SUPABASE_URL: "https://fixture.invalid",
      PRESERVED_VALUE: "shell",
      WHITESPACE_VALUE: "filled",
      E2E_FOREMAN_EMAIL: "foreman@example.invalid",
    });
  });

  it("accepts only the exact current external runtime tuple", () => {
    const runtimeRoot = path.join(root, ".release-runtime", "r568", "runtime", "whole-app-developer-current");
    const releasePath = path.join(root, "data", "estimate-benchmarks", "r568-local-developer-canonical-release.json");
    const fingerprints = {
      sourceTreeHash: "source-tree",
      productSourceHash: "product-source",
      jsBundleFingerprint: "js-bundle",
    };
    const sourceSha = "head-sha";
    const capabilityId = "capability-id";
    writeJson(releasePath, {
      definitionReleaseId: "definition-release",
      searchReleaseId: "search-release",
    });
    writeJson(path.join(runtimeRoot, "metro.json"), {
      schema_version: "rik-expo-app.whole-app-developer-runtime.v1",
      runtime_profile: "whole_app_staging_plus_local_estimate",
      pid: 123,
      source_tree_hash: fingerprints.sourceTreeHash,
      product_source_hash: fingerprints.productSourceHash,
      js_bundle_fingerprint: fingerprints.jsBundleFingerprint,
      build_commit: sourceSha,
      definition_release_id: "definition-release",
      search_release_id: "search-release",
      capability_id: capabilityId,
    });
    fs.writeFileSync(
      path.join(runtimeRoot, "metro.json"),
      `\uFEFF${fs.readFileSync(path.join(runtimeRoot, "metro.json"), "utf8")}`,
      "utf8",
    );
    writeJson(path.join(runtimeRoot, "backend.json"), {
      schema_version: "rik-expo-app.r568.local-developer-canonical-backend.v1",
      status: "READY_R568_WHOLE_APP_BACKEND_AWAITING_AUTHENTICATED_REQUEST",
      auth_profile: "whole_app_staging",
      backend_pid: 456,
      compatibility_tuple: {
        sourceHead: sourceSha,
        sourceTree: fingerprints.sourceTreeHash,
        frontendSourceTreeHash: fingerprints.sourceTreeHash,
        frontendProductSourceHash: fingerprints.productSourceHash,
        frontendJsBundleFingerprint: fingerprints.jsBundleFingerprint,
        definitionReleaseId: "definition-release",
        searchReleaseId: "search-release",
        capabilityId,
      },
      frontend_build_identity: {
        sourceTreeHash: fingerprints.sourceTreeHash,
        productSourceHash: fingerprints.productSourceHash,
        jsBundleFingerprint: fingerprints.jsBundleFingerprint,
      },
      capability: {
        id: capabilityId,
        status: "ACTIVE_CONFIGURED",
        expires_at: new Date(Date.now() + 60_000).toISOString(),
      },
    });

    expect(verifyExternalOfficeRuntimeReceipts({
      projectRoot: root,
      baseUrl: "http://127.0.0.1:8081",
      sourceSha,
      fingerprints,
    })).toMatchObject({
      webPort: 8081,
      backendPort: 8765,
      definitionReleaseId: "definition-release",
      searchReleaseId: "search-release",
      capabilityVerified: true,
    });

    const metroPath = path.join(runtimeRoot, "metro.json");
    const drifted = JSON.parse(fs.readFileSync(metroPath, "utf8").replace(/^\uFEFF/u, ""));
    drifted.js_bundle_fingerprint = "stale-bundle";
    writeJson(metroPath, drifted);
    expect(() => verifyExternalOfficeRuntimeReceipts({
      projectRoot: root,
      baseUrl: "http://127.0.0.1:8081",
      sourceSha,
      fingerprints,
    })).toThrow("STOP_EXTERNAL_RUNTIME_JS_FINGERPRINT_MISMATCH");
  });
});
