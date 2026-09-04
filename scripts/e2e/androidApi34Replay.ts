import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  RELEASE_PIPELINE_ARTIFACT_DIR,
  computeReleaseFingerprints,
} from "../release/computeReleaseFingerprints";
import {
  loadReleaseCandidate,
  writeReleaseCandidate,
} from "../release/releaseCandidateState";

const LOCAL_PROVIDER_CREDENTIALS = path.resolve(
  ".release-runtime/r551/runtime/local-developer/credentials.json",
);
const CANONICAL_BACKEND_RECEIPT = path.resolve(
  ".release-runtime/r568/rc09-r4-production-closeout/r4-a5-exact-ui-confirm-durability-1/10_LOCAL_DEVELOPER_CANONICAL_BACKEND.json",
);

type Json = Record<string, any>;

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function currentGitValue(args: string[]): string {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
    timeout: 10_000,
  }).trim();
}

function exactReplayEnvironment(
  fingerprints: ReturnType<typeof computeReleaseFingerprints>,
): NodeJS.ProcessEnv {
  invariant(
    fs.existsSync(LOCAL_PROVIDER_CREDENTIALS),
    "ANDROID_API34_LOCAL_PROVIDER_CREDENTIALS_MISSING",
  );
  invariant(
    fs.existsSync(CANONICAL_BACKEND_RECEIPT),
    "ANDROID_API34_CANONICAL_BACKEND_RECEIPT_MISSING",
  );
  const credentials = JSON.parse(
    fs.readFileSync(LOCAL_PROVIDER_CREDENTIALS, "utf8"),
  ) as Json;
  const receipt = JSON.parse(
    fs.readFileSync(CANONICAL_BACKEND_RECEIPT, "utf8"),
  ) as Json;
  const providerUrl = String(credentials.provider_url ?? "").trim();
  const publicKey = String(credentials.publishable_key ?? "").trim();
  const provider = new URL(providerUrl);
  invariant(
    credentials.environment === "local_developer" &&
      provider.protocol === "http:" &&
      ["127.0.0.1", "localhost", "::1"].includes(provider.hostname) &&
      provider.port === "54321",
    "ANDROID_API34_LOCAL_PROVIDER_IDENTITY_RED",
  );
  invariant(
    /^sb_publishable_[A-Za-z0-9_-]+$/u.test(publicKey),
    "ANDROID_API34_LOCAL_PROVIDER_PUBLIC_KEY_RED",
  );
  const consumers = Array.isArray(credentials.principals)
    ? credentials.principals.filter(
        (principal: Json) => String(principal.role ?? "") === "consumer",
      )
    : [];
  invariant(
    consumers.length === 1 &&
      String(consumers[0]?.user_id ?? "").trim() &&
      String(consumers[0]?.email ?? "").trim() &&
      String(consumers[0]?.password ?? "").trim(),
    "ANDROID_API34_LOCAL_CONSUMER_PRINCIPAL_RED",
  );

  const tuple = (receipt.compatibility_tuple ?? {}) as Json;
  const head = currentGitValue(["rev-parse", "HEAD"]);
  invariant(
    receipt.status === "GREEN_R568_LOCAL_DEVELOPER_CANONICAL_BACKEND_EXACT" &&
      receipt.capability?.status === "ACTIVE" &&
      Date.parse(String(receipt.capability?.expires_at ?? "")) >
        Date.now() + 60 * 60 * 1_000,
    "ANDROID_API34_CANONICAL_BACKEND_RECEIPT_RED",
  );
  invariant(
    String(tuple.sourceHead ?? "") === head &&
      String(tuple.sourceTree ?? "") === fingerprints.sourceTreeHash &&
      String(tuple.frontendProductSourceHash ?? "") ===
        fingerprints.productSourceHash &&
      String(tuple.frontendJsBundleFingerprint ?? "") ===
        fingerprints.jsBundleFingerprint,
    "ANDROID_API34_CANONICAL_BACKEND_TUPLE_DRIFT",
  );

  const childEnv: NodeJS.ProcessEnv = {
    ...process.env,
    LOCAL_DEVELOPER_REVIEW: "1",
    EXPO_PUBLIC_LOCAL_DEVELOPER_REVIEW: "1",
    EXPO_PUBLIC_APP_ENV: "local_developer",
    EXPO_PUBLIC_RELEASE_LABEL: "LOCAL_DEVELOPMENT",
    EXPO_PUBLIC_SUPABASE_URL: providerUrl,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: publicKey,
    EXPO_PUBLIC_CANONICAL_ESTIMATE_FUNCTION_URL: "http://127.0.0.1:8765",
    EXPO_PUBLIC_CANONICAL_ESTIMATE_ALLOW_INSECURE_LOOPBACK: "true",
    EXPO_PUBLIC_RELEASE_SOURCE_TREE_HASH: String(tuple.sourceTree),
    EXPO_PUBLIC_RELEASE_PRODUCT_SOURCE_HASH: String(
      tuple.frontendProductSourceHash,
    ),
    EXPO_PUBLIC_RELEASE_JS_BUNDLE_FINGERPRINT: String(
      tuple.frontendJsBundleFingerprint,
    ),
    EXPO_PUBLIC_BUILD_COMMIT: head,
    EXPO_PUBLIC_BUILD_BRANCH: currentGitValue(["branch", "--show-current"]),
    EXPO_PUBLIC_CANONICAL_ESTIMATE_DEFINITION_RELEASE_ID: String(
      tuple.definitionReleaseId,
    ),
    EXPO_PUBLIC_CANONICAL_ESTIMATE_SEARCH_RELEASE_ID: String(
      tuple.searchReleaseId,
    ),
    EXPO_PUBLIC_CANONICAL_ESTIMATE_CAPABILITY_ID: String(tuple.capabilityId),
  };
  for (const secretName of [
    "SUPABASE_SERVICE_ROLE_KEY",
    "EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_SECRET_KEY",
    "EXPO_PUBLIC_SUPABASE_SECRET_KEY",
  ]) {
    delete childEnv[secretName];
  }
  return childEnv;
}

function main(): void {
  fs.mkdirSync(RELEASE_PIPELINE_ARTIFACT_DIR, { recursive: true });
  const fingerprints = computeReleaseFingerprints();
  const result = spawnSync(
    process.execPath,
    [
      "node_modules/tsx/dist/cli.mjs",
      "scripts/e2e/runAndroidApi34LiveRequestEmbeddedAiProfessionalBoqPdfCatalogSmoke.ts",
      "--mode=refresh",
      "--skip-install",
    ],
    {
      cwd: process.cwd(),
      stdio: "inherit",
      shell: false,
      env: exactReplayEnvironment(fingerprints),
    },
  );
  const passed = result.status === 0;
  const artifact = {
    final_status: passed
      ? "GREEN_ANDROID_API34_REPLAY_READY"
      : "BLOCKED_ANDROID_API34_REPLAY_FAILED",
    ...fingerprints,
    replay_exit_code: result.status,
    gradle_invoked: false,
    apk_install_invoked: false,
    avd_recreated: false,
    fake_green_claimed: false,
  };
  fs.writeFileSync(
    path.join(RELEASE_PIPELINE_ARTIFACT_DIR, "android_replay.json"),
    `${JSON.stringify(artifact, null, 2)}\n`,
    "utf8",
  );
  if (passed) {
    const candidate = loadReleaseCandidate();
    writeReleaseCandidate({
      ...candidate,
      android_replays_for_candidate: candidate.android_replays_for_candidate + 1,
      updated_at: new Date().toISOString(),
    });
  }
  console.log(JSON.stringify(artifact, null, 2));
  if (!passed) process.exit(1);
}

main();
