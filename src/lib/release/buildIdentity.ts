import Constants from "expo-constants";

type ReleaseBuildIdentity = {
  sourceTreeHash: string;
  productSourceHash: string;
  nativeBuildFingerprint: string;
  jsBundleFingerprint: string;
  proofHarnessHash: string;
  candidateHash: string;
  apkBuildKey: string;
  buildCreatedAt: string;
};

const RELEASE_BUILD_IDENTITY: ReleaseBuildIdentity = {
  sourceTreeHash: publicEnv("EXPO_PUBLIC_RELEASE_SOURCE_TREE_HASH") || "unknown",
  productSourceHash:
    publicEnv("EXPO_PUBLIC_RELEASE_PRODUCT_SOURCE_HASH") ||
    publicEnv("EXPO_PUBLIC_RELEASE_SOURCE_TREE_HASH") ||
    "unknown",
  nativeBuildFingerprint:
    publicEnv("EXPO_PUBLIC_RELEASE_NATIVE_BUILD_FINGERPRINT") || "unknown",
  jsBundleFingerprint:
    publicEnv("EXPO_PUBLIC_RELEASE_JS_BUNDLE_FINGERPRINT") || "unknown",
  proofHarnessHash: publicEnv("EXPO_PUBLIC_RELEASE_PROOF_HARNESS_HASH") || "unknown",
  candidateHash: publicEnv("EXPO_PUBLIC_RELEASE_CANDIDATE_HASH") || "unknown",
  apkBuildKey: publicEnv("EXPO_PUBLIC_RELEASE_APK_BUILD_KEY") || "unknown",
  buildCreatedAt: publicEnv("EXPO_PUBLIC_RELEASE_BUILD_CREATED_AT") || "unknown",
};

export type BuildIdentity = {
  commit: string;
  branch: string;
  buildTime: string;
  appVersion: string;
  runtimeVersion: string;
  release: typeof RELEASE_BUILD_IDENTITY;
};

function publicEnv(name: string): string {
  return String(process.env[name] ?? "").trim();
}

function safeValue(value: string, fallback = "unknown"): string {
  return value.length > 0 ? value : fallback;
}

export function getBuildIdentity(): BuildIdentity {
  const expoConfig = Constants.expoConfig;
  const runtimeVersion =
    typeof expoConfig?.runtimeVersion === "string"
      ? expoConfig.runtimeVersion
      : typeof expoConfig?.runtimeVersion === "object"
        ? `policy:${safeValue(String(expoConfig.runtimeVersion.policy ?? ""))}`
        : "unknown";

  return {
    commit: safeValue(publicEnv("EXPO_PUBLIC_BUILD_COMMIT")),
    branch: safeValue(publicEnv("EXPO_PUBLIC_BUILD_BRANCH")),
    buildTime: safeValue(publicEnv("EXPO_PUBLIC_BUILD_TIME")),
    appVersion: safeValue(expoConfig?.version ?? ""),
    runtimeVersion: safeValue(runtimeVersion),
    release: RELEASE_BUILD_IDENTITY,
  };
}

export function serializeBuildIdentity(identity: BuildIdentity = getBuildIdentity()): string {
  return JSON.stringify(identity);
}
