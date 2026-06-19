type ReleaseBuildIdentity = {
  sourceTreeHash: string;
  nativeBuildFingerprint: string;
  jsBundleFingerprint: string;
  buildCreatedAt: string;
};

const readPublicEnv = (name: string): string => String(process.env[name] ?? "").trim();

export const RELEASE_BUILD_IDENTITY: ReleaseBuildIdentity = {
  sourceTreeHash: readPublicEnv("EXPO_PUBLIC_RELEASE_SOURCE_TREE_HASH") || "unknown",
  nativeBuildFingerprint:
    readPublicEnv("EXPO_PUBLIC_RELEASE_NATIVE_BUILD_FINGERPRINT") || "unknown",
  jsBundleFingerprint:
    readPublicEnv("EXPO_PUBLIC_RELEASE_JS_BUNDLE_FINGERPRINT") || "unknown",
  buildCreatedAt: readPublicEnv("EXPO_PUBLIC_RELEASE_BUILD_CREATED_AT") || "unknown",
};
