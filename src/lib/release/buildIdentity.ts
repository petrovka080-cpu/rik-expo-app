import Constants from "expo-constants";

export type BuildIdentity = {
  commit: string;
  branch: string;
  buildTime: string;
  appVersion: string;
  runtimeVersion: string;
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
  };
}

export function serializeBuildIdentity(identity: BuildIdentity = getBuildIdentity()): string {
  return JSON.stringify(identity);
}
