import fs from "node:fs";
import path from "node:path";

export type IosBuildSubmitRunMode =
  | "existing_current_ios_build"
  | "new_ios_build_required"
  | "blocked";

export type IosBuildSubmitDecision = {
  mode: IosBuildSubmitRunMode;
  reason: string;
  currentGitCommit: string;
  buildProfile: string;
  submitProfile: string;
  bundleIdentifier: string | null;
  ascAppId: string | null;
  runtimeVersionPolicy: string | null;
  latestMatchingBuildId: string | null;
  latestMatchingBuildStatus: string | null;
  latestMatchingBuildCommit: string | null;
  productionProfilePresent: boolean;
  storeDistribution: boolean;
  iosDeviceBuild: boolean;
  submitProfilePresent: boolean;
  buildRequired: boolean;
  submitAllowedAfterBuild: boolean;
};

export type EasBuildListEntry = {
  id?: unknown;
  status?: unknown;
  platform?: unknown;
  buildProfile?: unknown;
  distribution?: unknown;
  gitCommitHash?: unknown;
  runtimeVersion?: unknown;
  appBuildVersion?: unknown;
  artifacts?: unknown;
};

type IosAppConfig = {
  bundleIdentifier: string | null;
  runtimeVersionPolicy: string | null;
};

type EasReleaseConfig = {
  productionProfilePresent: boolean;
  storeDistribution: boolean;
  iosDeviceBuild: boolean;
  submitProfilePresent: boolean;
  ascAppId: string | null;
};

const DEFAULT_BUILD_PROFILE = "production";
const DEFAULT_SUBMIT_PROFILE = "production";

function readJsonRecord(filePath: string): Record<string, unknown> | null {
  if (!fs.existsSync(filePath)) return null;
  const parsed: unknown = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return isRecord(parsed) ? parsed : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function boolValue(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

export function readIosAppConfig(projectRoot: string): IosAppConfig {
  const appJson = readJsonRecord(path.join(projectRoot, "app.json"));
  const expo = isRecord(appJson?.expo) ? appJson.expo : null;
  const ios = isRecord(expo?.ios) ? expo.ios : null;
  const runtimeVersion = isRecord(expo?.runtimeVersion) ? expo.runtimeVersion : null;

  return {
    bundleIdentifier: stringValue(ios?.bundleIdentifier),
    runtimeVersionPolicy: stringValue(runtimeVersion?.policy),
  };
}

export function readEasReleaseConfig(projectRoot: string): EasReleaseConfig {
  const easJson = readJsonRecord(path.join(projectRoot, "eas.json"));
  const build = isRecord(easJson?.build) ? easJson.build : null;
  const production = isRecord(build?.[DEFAULT_BUILD_PROFILE]) ? build[DEFAULT_BUILD_PROFILE] : null;
  const ios = isRecord(production?.ios) ? production.ios : null;
  const submit = isRecord(easJson?.submit) ? easJson.submit : null;
  const submitProduction = isRecord(submit?.[DEFAULT_SUBMIT_PROFILE]) ? submit[DEFAULT_SUBMIT_PROFILE] : null;
  const submitIos = isRecord(submitProduction?.ios) ? submitProduction.ios : null;
  const distribution = stringValue(production?.distribution);
  const simulator = boolValue(ios?.simulator);

  return {
    productionProfilePresent: Boolean(production),
    storeDistribution: distribution === "store",
    iosDeviceBuild: simulator === false,
    submitProfilePresent: Boolean(submitIos),
    ascAppId: stringValue(submitIos?.ascAppId),
  };
}

export function parseEasBuildList(raw: string): EasBuildListEntry[] {
  const parsed: unknown = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed.filter(isRecord) : [];
}

function buildField(entry: EasBuildListEntry, key: keyof EasBuildListEntry): string | null {
  return stringValue(entry[key]);
}

export function findLatestCurrentIosProductionBuild(
  builds: readonly EasBuildListEntry[],
  currentGitCommit: string,
): EasBuildListEntry | null {
  return builds.find((entry) => {
    const platform = buildField(entry, "platform");
    const status = buildField(entry, "status");
    const profile = buildField(entry, "buildProfile");
    const distribution = buildField(entry, "distribution");
    const commit = buildField(entry, "gitCommitHash");
    return (
      platform === "IOS" &&
      status === "FINISHED" &&
      profile === DEFAULT_BUILD_PROFILE &&
      distribution === "STORE" &&
      commit === currentGitCommit
    );
  }) ?? null;
}

export function decideIosBuildSubmit(params: {
  projectRoot: string;
  currentGitCommit: string;
  builds: readonly EasBuildListEntry[];
}): IosBuildSubmitDecision {
  const appConfig = readIosAppConfig(params.projectRoot);
  const easConfig = readEasReleaseConfig(params.projectRoot);
  const latestMatchingBuild = findLatestCurrentIosProductionBuild(params.builds, params.currentGitCommit);
  const configReady =
    Boolean(appConfig.bundleIdentifier) &&
    appConfig.runtimeVersionPolicy === "fingerprint" &&
    easConfig.productionProfilePresent &&
    easConfig.storeDistribution &&
    easConfig.iosDeviceBuild &&
    easConfig.submitProfilePresent &&
    Boolean(easConfig.ascAppId);

  if (!configReady) {
    return {
      mode: "blocked",
      reason: "iOS production build/submit config is incomplete.",
      currentGitCommit: params.currentGitCommit,
      buildProfile: DEFAULT_BUILD_PROFILE,
      submitProfile: DEFAULT_SUBMIT_PROFILE,
      bundleIdentifier: appConfig.bundleIdentifier,
      ascAppId: easConfig.ascAppId,
      runtimeVersionPolicy: appConfig.runtimeVersionPolicy,
      latestMatchingBuildId: null,
      latestMatchingBuildStatus: null,
      latestMatchingBuildCommit: null,
      productionProfilePresent: easConfig.productionProfilePresent,
      storeDistribution: easConfig.storeDistribution,
      iosDeviceBuild: easConfig.iosDeviceBuild,
      submitProfilePresent: easConfig.submitProfilePresent,
      buildRequired: false,
      submitAllowedAfterBuild: false,
    };
  }

  if (latestMatchingBuild) {
    return {
      mode: "existing_current_ios_build",
      reason: "A finished production iOS build exists for the current HEAD.",
      currentGitCommit: params.currentGitCommit,
      buildProfile: DEFAULT_BUILD_PROFILE,
      submitProfile: DEFAULT_SUBMIT_PROFILE,
      bundleIdentifier: appConfig.bundleIdentifier,
      ascAppId: easConfig.ascAppId,
      runtimeVersionPolicy: appConfig.runtimeVersionPolicy,
      latestMatchingBuildId: buildField(latestMatchingBuild, "id"),
      latestMatchingBuildStatus: buildField(latestMatchingBuild, "status"),
      latestMatchingBuildCommit: buildField(latestMatchingBuild, "gitCommitHash"),
      productionProfilePresent: easConfig.productionProfilePresent,
      storeDistribution: easConfig.storeDistribution,
      iosDeviceBuild: easConfig.iosDeviceBuild,
      submitProfilePresent: easConfig.submitProfilePresent,
      buildRequired: false,
      submitAllowedAfterBuild: true,
    };
  }

  const latestIosProduction = params.builds.find((entry) => {
    return (
      buildField(entry, "platform") === "IOS" &&
      buildField(entry, "buildProfile") === DEFAULT_BUILD_PROFILE &&
      buildField(entry, "distribution") === "STORE"
    );
  });

  return {
    mode: "new_ios_build_required",
    reason: "No finished production iOS build exists for the current HEAD.",
    currentGitCommit: params.currentGitCommit,
    buildProfile: DEFAULT_BUILD_PROFILE,
    submitProfile: DEFAULT_SUBMIT_PROFILE,
    bundleIdentifier: appConfig.bundleIdentifier,
    ascAppId: easConfig.ascAppId,
    runtimeVersionPolicy: appConfig.runtimeVersionPolicy,
    latestMatchingBuildId: buildField(latestIosProduction ?? {}, "id"),
    latestMatchingBuildStatus: buildField(latestIosProduction ?? {}, "status"),
    latestMatchingBuildCommit: buildField(latestIosProduction ?? {}, "gitCommitHash"),
    productionProfilePresent: easConfig.productionProfilePresent,
    storeDistribution: easConfig.storeDistribution,
    iosDeviceBuild: easConfig.iosDeviceBuild,
    submitProfilePresent: easConfig.submitProfilePresent,
    buildRequired: true,
    submitAllowedAfterBuild: true,
  };
}

export function buildIosProductionBuildArgs(): readonly string[] {
  return [
    "build",
    "--platform",
    "ios",
    "--profile",
    DEFAULT_BUILD_PROFILE,
    "--non-interactive",
    "--json",
  ];
}

export function buildIosSubmitArgs(buildId: string): readonly string[] {
  return [
    "submit",
    "--platform",
    "ios",
    "--profile",
    DEFAULT_SUBMIT_PROFILE,
    "--id",
    buildId,
    "--non-interactive",
    "--wait",
  ];
}
