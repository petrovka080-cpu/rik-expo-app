export type LocalDeveloperFullAccessProbe = {
  envValue?: string | null;
  host?: string | null;
  isDev?: boolean;
  isTestRuntime?: boolean;
  platformOS?: string | null;
  releaseChannel?: string | null;
  storageValue?: string | null;
  webdriver?: boolean | null;
};

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const TRUSTED_NON_PRODUCTION_CHANNELS = new Set([
  "development",
  "dev",
  "dev-client",
  "development-build",
  "preview",
  "staging",
  "internal",
  "development-client",
  "internal-ios",
  "internal-android",
  "ios-internal",
  "android-internal",
  "ios-testflight-internal",
  "qa",
  "local",
  "production-emulator",
  "testflight-internal",
]);

const isTruthyFlag = (value: unknown): boolean =>
  ["1", "true", "yes", "on"].includes(
    String(value ?? "").trim().toLowerCase(),
  );

const isFalseyFlag = (value: unknown): boolean =>
  ["0", "false", "no", "off"].includes(
    String(value ?? "").trim().toLowerCase(),
  );

export function isLocalDeveloperFullAccessAllowed(
  probe: LocalDeveloperFullAccessProbe,
): boolean {
  if (isFalseyFlag(probe.envValue) || isFalseyFlag(probe.storageValue)) {
    return false;
  }

  const explicitlyEnabled =
    isTruthyFlag(probe.envValue) || isTruthyFlag(probe.storageValue);
  if (!explicitlyEnabled) return false;

  const releaseChannel = String(probe.releaseChannel ?? "")
    .trim()
    .toLowerCase();
  if (releaseChannel === "production") return false;

  if (probe.platformOS === "web") {
    return (
      probe.isDev === true &&
      LOCAL_HOSTS.has(String(probe.host ?? "").trim().toLowerCase())
    );
  }

  return (
    probe.isDev === true ||
    TRUSTED_NON_PRODUCTION_CHANNELS.has(releaseChannel)
  );
}
