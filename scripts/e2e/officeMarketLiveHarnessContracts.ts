import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";

type MutableEnvironment = Record<string, string | undefined>;

type ReleaseFingerprints = {
  sourceTreeHash: string;
  productSourceHash: string;
  jsBundleFingerprint: string;
};

type JsonRecord = Record<string, any>;

export type OfficeMarketLiveEnvLoadResult = {
  configRoot: string;
  loadedFiles: string[];
};

export type ExternalOfficeRuntimeReceiptProof = {
  metroReceiptPath: string;
  backendReceiptPath: string;
  webPort: 8081;
  backendPort: 8765;
  definitionReleaseId: string;
  searchReleaseId: string;
  capabilityVerified: true;
};

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function readJson(filePath: string): JsonRecord {
  invariant(fs.existsSync(filePath), `STOP_RUNTIME_RECEIPT_MISSING:${path.basename(filePath)}`);
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/u, "")) as JsonRecord;
}

/**
 * Loads only the two guarded live-E2E fixture files. Existing non-empty process
 * values always win, including values supplied by CI or an operator shell.
 * Neither keys nor values are logged or returned.
 */
export function loadOfficeMarketLiveEnv(
  projectRoot = process.cwd(),
  environment: MutableEnvironment = process.env,
): OfficeMarketLiveEnvLoadResult {
  const configuredRoot = String(environment.OFFICE_E2E_ENV_ROOT ?? "").trim();
  const configRoot = path.resolve(configuredRoot || projectRoot);
  const loadedFiles: string[] = [];

  for (const fileName of [".env.staging.local", ".env.office-e2e.local"]) {
    const filePath = path.join(configRoot, fileName);
    if (!fs.existsSync(filePath)) continue;
    const parsed = dotenv.parse(fs.readFileSync(filePath));
    for (const [key, value] of Object.entries(parsed)) {
      if (!String(environment[key] ?? "").trim()) environment[key] = value;
    }
    loadedFiles.push(fileName);
  }

  return { configRoot, loadedFiles };
}

export function verifyExternalOfficeRuntimeReceipts(input: {
  projectRoot: string;
  baseUrl: string;
  sourceSha: string;
  fingerprints: ReleaseFingerprints;
}): ExternalOfficeRuntimeReceiptProof {
  const parsedBaseUrl = new URL(input.baseUrl);
  invariant(parsedBaseUrl.protocol === "http:", "STOP_EXTERNAL_RUNTIME_WEB_PROTOCOL_MISMATCH");
  invariant(
    ["127.0.0.1", "localhost"].includes(parsedBaseUrl.hostname),
    "STOP_EXTERNAL_RUNTIME_WEB_HOST_MISMATCH",
  );
  invariant(parsedBaseUrl.port === "8081", "STOP_EXTERNAL_RUNTIME_WEB_PORT_MISMATCH");

  const runtimeRoot = path.join(
    input.projectRoot,
    ".release-runtime",
    "r568",
    "runtime",
    "whole-app-developer-current",
  );
  const metroReceiptPath = path.join(runtimeRoot, "metro.json");
  const backendReceiptPath = path.join(runtimeRoot, "backend.json");
  const releaseManifestPath = path.join(
    input.projectRoot,
    "data",
    "estimate-benchmarks",
    "r568-local-developer-canonical-release.json",
  );
  const metro = readJson(metroReceiptPath);
  const backend = readJson(backendReceiptPath);
  const release = readJson(releaseManifestPath);
  const tuple = backend.compatibility_tuple ?? {};
  const frontend = backend.frontend_build_identity ?? {};

  invariant(
    metro.schema_version === "rik-expo-app.whole-app-developer-runtime.v1" &&
      metro.runtime_profile === "whole_app_staging_plus_local_estimate",
    "STOP_EXTERNAL_RUNTIME_METRO_PROFILE_MISMATCH",
  );
  invariant(
    backend.schema_version === "rik-expo-app.r568.local-developer-canonical-backend.v1" &&
      [
        "READY_R568_WHOLE_APP_BACKEND_AWAITING_AUTHENTICATED_REQUEST",
        "GREEN_R568_LOCAL_DEVELOPER_CANONICAL_BACKEND_EXACT",
      ].includes(backend.status) &&
      backend.auth_profile === "whole_app_staging",
    "STOP_EXTERNAL_RUNTIME_BACKEND_PROFILE_MISMATCH",
  );
  invariant(
    metro.build_commit === input.sourceSha && tuple.sourceHead === input.sourceSha,
    "STOP_EXTERNAL_RUNTIME_SOURCE_SHA_MISMATCH",
  );
  invariant(
    metro.source_tree_hash === input.fingerprints.sourceTreeHash &&
      tuple.sourceTree === input.fingerprints.sourceTreeHash &&
      tuple.frontendSourceTreeHash === input.fingerprints.sourceTreeHash &&
      frontend.sourceTreeHash === input.fingerprints.sourceTreeHash,
    "STOP_EXTERNAL_RUNTIME_SOURCE_TREE_MISMATCH",
  );
  invariant(
    metro.product_source_hash === input.fingerprints.productSourceHash &&
      tuple.frontendProductSourceHash === input.fingerprints.productSourceHash &&
      frontend.productSourceHash === input.fingerprints.productSourceHash,
    "STOP_EXTERNAL_RUNTIME_PRODUCT_HASH_MISMATCH",
  );
  invariant(
    metro.js_bundle_fingerprint === input.fingerprints.jsBundleFingerprint &&
      tuple.frontendJsBundleFingerprint === input.fingerprints.jsBundleFingerprint &&
      frontend.jsBundleFingerprint === input.fingerprints.jsBundleFingerprint,
    "STOP_EXTERNAL_RUNTIME_JS_FINGERPRINT_MISMATCH",
  );
  invariant(
    metro.definition_release_id === release.definitionReleaseId &&
      tuple.definitionReleaseId === release.definitionReleaseId,
    "STOP_EXTERNAL_RUNTIME_DEFINITION_RELEASE_MISMATCH",
  );
  invariant(
    metro.search_release_id === release.searchReleaseId &&
      tuple.searchReleaseId === release.searchReleaseId,
    "STOP_EXTERNAL_RUNTIME_SEARCH_RELEASE_MISMATCH",
  );
  invariant(
    typeof metro.capability_id === "string" && metro.capability_id.length > 0 &&
      metro.capability_id === tuple.capabilityId &&
      metro.capability_id === backend.capability?.id &&
      ["ACTIVE", "ACTIVE_CONFIGURED"].includes(backend.capability?.status) &&
      new Date(backend.capability?.expires_at ?? 0).getTime() > Date.now(),
    "STOP_EXTERNAL_RUNTIME_CAPABILITY_MISMATCH",
  );
  invariant(
    Number.isInteger(metro.pid) && metro.pid > 0 &&
      Number.isInteger(backend.backend_pid) && backend.backend_pid > 0,
    "STOP_EXTERNAL_RUNTIME_PID_RECEIPT_INVALID",
  );

  return {
    metroReceiptPath,
    backendReceiptPath,
    webPort: 8081,
    backendPort: 8765,
    definitionReleaseId: release.definitionReleaseId,
    searchReleaseId: release.searchReleaseId,
    capabilityVerified: true,
  };
}
