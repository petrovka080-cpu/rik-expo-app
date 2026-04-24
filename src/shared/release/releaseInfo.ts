import type {
  CanonicalReleaseChannel,
  ReleaseAppVersionSource,
  ReleaseBranch,
  ReleaseChangeClass,
  ReleaseCheckAutomatically,
  ReleaseConfigInput,
  ReleaseConfigSummary,
  ReleaseDecisionRule,
  ReleaseDecisionSummary,
  ReleaseDiagnostics,
  ReleaseMetadata,
  ReleaseMetadataSource,
  ReleaseRuntimePolicyTruth,
  ReleaseUpdateAvailabilityState,
  RuntimeReleaseSnapshot,
} from "./releaseInfo.types";

const UNKNOWN = "unknown";
const NOT_PROVIDED = "not-provided";

export const CANONICAL_RELEASE_CHANNELS = ["development", "preview", "production"] as const satisfies readonly CanonicalReleaseChannel[];

export const CANONICAL_BRANCH_BY_CHANNEL: Record<CanonicalReleaseChannel, string> = {
  development: "development",
  preview: "preview",
  production: "production",
};

export const RELEASE_CHANGE_CLASSES = [
  "js-ui",
  "js-logic",
  "hook-service",
  "ota-diagnostics",
  "release-metadata",
  "native-module",
  "expo-plugin",
  "app-config-native",
  "permission-entitlement",
  "bundle-identity",
  "runtime-policy",
  "native-asset",
] as const satisfies readonly ReleaseChangeClass[];

export const RELEASE_SOURCE_OF_TRUTH = [
  "Installed binary identity comes from Application.nativeApplicationVersion / Application.nativeBuildVersion on device.",
  "Installed update identity comes from expo-updates runtime fields: channel, runtimeVersion, updateId, createdAt, launch source.",
  "Release config comes from app.json updates/runtime/version fields plus eas.json build channel and appVersionSource.",
  "Because eas.json uses appVersionSource=remote, actual shipped build numbers are owned by EAS Build counters, not by the local repo.",
] as const;

export const RELEASE_ALLOWED_OTA_SCOPES = [
  "JS/TS code",
  "React components and styles",
  "screen composition",
  "hooks/services/repositories with no native host change",
  "OTA diagnostics and release labels/metadata",
] as const;

export const RELEASE_FORBIDDEN_OTA_SCOPES = [
  "native modules",
  "Expo plugins",
  "permissions or entitlements",
  "bundle/package identity",
  "runtimeVersion policy changes",
  "native assets that require rebuild",
] as const;

export const RELEASE_DECISION_MATRIX: Record<ReleaseChangeClass, ReleaseDecisionRule> = {
  "js-ui": {
    changeClass: "js-ui",
    delivery: "ota",
    title: "JS/UI-only patch",
    reason: "This change stays inside the existing native host and compatible runtime.",
    examples: ["screen text", "layout cleanup", "button wiring", "React component composition"],
  },
  "js-logic": {
    changeClass: "js-logic",
    delivery: "ota",
    title: "JS business logic patch",
    reason: "The runtime host is unchanged, so the fix can ship as an OTA update.",
    examples: ["hook logic", "service mapping", "validation rules in TS", "state orchestration"],
  },
  "hook-service": {
    changeClass: "hook-service",
    delivery: "ota",
    title: "Hook/service refactor without native host change",
    reason: "The change is still fully implemented in JS and remains runtime-compatible.",
    examples: ["repository cleanup", "query shaping", "client-side adapter", "diagnostic helper"],
  },
  "ota-diagnostics": {
    changeClass: "ota-diagnostics",
    delivery: "ota",
    title: "Diagnostics-only patch",
    reason: "Release visibility changes are JS-only and do not require a new host binary.",
    examples: ["Profile OTA diagnostics card", "release lineage labels", "clipboard diagnostics text"],
  },
  "release-metadata": {
    changeClass: "release-metadata",
    delivery: "ota",
    title: "Non-native release metadata update",
    reason: "Optional metadata embedded in JS/update manifests can travel with OTA safely.",
    examples: ["release label", "git commit label", "update group note"],
  },
  "native-module": {
    changeClass: "native-module",
    delivery: "new-build",
    title: "Native module change",
    reason: "The installed binary host must include the new native code.",
    examples: ["new Expo module", "React Native native package", "native SDK integration"],
  },
  "expo-plugin": {
    changeClass: "expo-plugin",
    delivery: "new-build",
    title: "Expo plugin/config plugin change",
    reason: "Plugin changes alter native project generation and require rebuilt binaries.",
    examples: ["expo-router plugin config", "expo-updates plugin change", "speech recognition plugin options"],
  },
  "app-config-native": {
    changeClass: "app-config-native",
    delivery: "new-build",
    title: "Native-affecting app config change",
    reason: "Native-facing app config changes must be baked into a fresh binary.",
    examples: ["updates URL", "bundle identifier", "package name", "native permission strings"],
  },
  "permission-entitlement": {
    changeClass: "permission-entitlement",
    delivery: "new-build",
    title: "Permission or entitlement change",
    reason: "OS-level permissions and entitlements live in the binary, not in OTA JS.",
    examples: ["Info.plist permission", "Android manifest permission", "push capability", "associated domains"],
  },
  "bundle-identity": {
    changeClass: "bundle-identity",
    delivery: "new-build",
    title: "Package identity change",
    reason: "Application identity is native and cannot be changed by OTA.",
    examples: ["ios.bundleIdentifier", "android.package", "scheme used by native app identity"],
  },
  "runtime-policy": {
    changeClass: "runtime-policy",
    delivery: "new-build",
    title: "Runtime policy change",
    reason: "Changing runtimeVersion or its policy changes update compatibility and requires new binaries.",
    examples: ["runtimeVersion bump", "switch to fingerprint policy", "runtime compatibility break"],
  },
  "native-asset": {
    changeClass: "native-asset",
    delivery: "new-build",
    title: "Native asset change",
    reason: "Native-hosted assets need to be rebuilt into the binary.",
    examples: ["app icon", "splash asset", "native app icon set", "notification icon asset"],
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function evaluateReleaseRuntimePolicyTruth(params: {
  runtimeVersion: unknown;
  releaseExtra?: {
    runtimePolicy?: unknown;
    runtimeStabilizationProof?: unknown;
  } | null;
}): ReleaseRuntimePolicyTruth {
  let resolvedRuntimeVersion = "unknown";
  let runtimePolicy = "unknown";
  let runtimeVersionStrategy: ReleaseRuntimePolicyTruth["runtimeVersionStrategy"] = "unknown";
  let runtimePolicyValid = false;
  let runtimePolicyReason =
    'runtimeVersion is missing or unresolved. Use expo.runtimeVersion = { "policy": "fingerprint" }.';

  if (typeof params.runtimeVersion === "string" && params.runtimeVersion.trim().length > 0) {
    const fixedRuntime = params.runtimeVersion.trim();
    resolvedRuntimeVersion = fixedRuntime;
    runtimePolicy = `fixed(${fixedRuntime})`;
    runtimeVersionStrategy = "fixed";
    runtimePolicyReason =
      'Static runtimeVersion strings are invalid for this repo. Use expo.runtimeVersion = { "policy": "fingerprint" }.';
  } else if (isRecord(params.runtimeVersion) && typeof params.runtimeVersion.policy === "string") {
    const policy = safeString(params.runtimeVersion.policy);
    resolvedRuntimeVersion = `policy:${policy}`;
    runtimePolicy = `policy:${policy}`;

    if (policy === "fingerprint") {
      runtimeVersionStrategy = "fingerprint";
      runtimePolicyValid = true;
      runtimePolicyReason = "runtimeVersion uses the fingerprint policy.";
    } else {
      runtimePolicyReason = `Unsupported runtimeVersion policy "${policy}". Repo-safe policy is "fingerprint".`;
    }
  }

  const releaseExtra = params.releaseExtra ?? null;
  const extraRuntimePolicy = safeString(releaseExtra?.runtimePolicy);
  const proof = isRecord(releaseExtra?.runtimeStabilizationProof) ? releaseExtra.runtimeStabilizationProof : null;
  const proofRuntimeVersionStrategy = safeString(proof?.runtimeVersionStrategy);
  const proofFixedRuntime = safeString(proof?.fixedRuntime, "");

  if (extraRuntimePolicy !== runtimePolicy) {
    return {
      resolvedRuntimeVersion,
      runtimePolicy,
      runtimeVersionStrategy,
      runtimePolicyValid,
      runtimePolicyReason,
      runtimeProofConsistent: false,
      runtimeProofReason: `extra.release.runtimePolicy must equal "${runtimePolicy}", but found "${extraRuntimePolicy}".`,
    };
  }

  if (!proof) {
    return {
      resolvedRuntimeVersion,
      runtimePolicy,
      runtimeVersionStrategy,
      runtimePolicyValid,
      runtimePolicyReason,
      runtimeProofConsistent: false,
      runtimeProofReason:
        "extra.release.runtimeStabilizationProof is missing. Release proof must mirror the active runtime policy.",
    };
  }

  if (runtimeVersionStrategy === "fingerprint") {
    if (proofRuntimeVersionStrategy !== "fingerprint") {
      return {
        resolvedRuntimeVersion,
        runtimePolicy,
        runtimeVersionStrategy,
        runtimePolicyValid,
        runtimePolicyReason,
        runtimeProofConsistent: false,
        runtimeProofReason:
          'extra.release.runtimeStabilizationProof.runtimeVersionStrategy must be "fingerprint" when runtimeVersion uses the fingerprint policy.',
      };
    }

    if (proofFixedRuntime.length > 0) {
      return {
        resolvedRuntimeVersion,
        runtimePolicy,
        runtimeVersionStrategy,
        runtimePolicyValid,
        runtimePolicyReason,
        runtimeProofConsistent: false,
        runtimeProofReason:
          "extra.release.runtimeStabilizationProof still contains fixedRuntime, which is stale after switching to fingerprint.",
      };
    }
  }

  if (runtimeVersionStrategy === "fixed" && proofFixedRuntime !== resolvedRuntimeVersion) {
    return {
      resolvedRuntimeVersion,
      runtimePolicy,
      runtimeVersionStrategy,
      runtimePolicyValid,
      runtimePolicyReason,
      runtimeProofConsistent: false,
      runtimeProofReason:
        "extra.release.runtimeStabilizationProof.fixedRuntime must match the configured static runtimeVersion.",
    };
  }

  return {
    resolvedRuntimeVersion,
    runtimePolicy,
    runtimeVersionStrategy,
    runtimePolicyValid,
    runtimePolicyReason,
    runtimeProofConsistent: true,
    runtimeProofReason: "release extra truth matches the configured runtime policy.",
  };
}

export function safeString(value: unknown, fallback = UNKNOWN): string {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function safeBoolean(value: unknown): boolean {
  return value === true;
}

function pushUnique(target: string[], value: string) {
  if (!target.includes(value)) {
    target.push(value);
  }
}

export function isCanonicalReleaseChannel(channel: string): channel is CanonicalReleaseChannel {
  return (CANONICAL_RELEASE_CHANNELS as readonly string[]).includes(channel);
}

export function getExpectedReleaseBranch(channel: string): ReleaseBranch {
  if (isCanonicalReleaseChannel(channel)) {
    return CANONICAL_BRANCH_BY_CHANNEL[channel];
  }

  if (!channel || channel === UNKNOWN) return UNKNOWN;
  return channel;
}

export function normalizeReleaseChangeClass(value: string): ReleaseChangeClass | null {
  return (RELEASE_CHANGE_CLASSES as readonly string[]).includes(value) ? (value as ReleaseChangeClass) : null;
}

function getAgeHours(createdAt: string, nowMs: number): number | null {
  if (!createdAt || createdAt === UNKNOWN) return null;

  const timestamp = Date.parse(createdAt);
  if (Number.isNaN(timestamp)) return null;

  return Math.max(0, (nowMs - timestamp) / (1000 * 60 * 60));
}

function pickMetadataValue(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = safeString(record[key], "");
    if (value) return value;
  }

  return NOT_PROVIDED;
}

function parseMetadataSource(
  source: Record<string, unknown> | null | undefined,
  metadataSource: ReleaseMetadataSource,
): ReleaseMetadata | null {
  if (!isRecord(source)) return null;

  const releaseLabel = pickMetadataValue(source, ["releaseLabel", "label", "release"]);
  const gitCommit = pickMetadataValue(source, ["gitCommit", "commit", "commitSha", "gitSha"]);
  const updateGroupId = pickMetadataValue(source, ["updateGroupId", "groupId", "updateGroup"]);
  const updateMessage = pickMetadataValue(source, ["updateMessage", "message"]);

  if (
    releaseLabel === NOT_PROVIDED &&
    gitCommit === NOT_PROVIDED &&
    updateGroupId === NOT_PROVIDED &&
    updateMessage === NOT_PROVIDED
  ) {
    return null;
  }

  return {
    releaseLabel,
    gitCommit,
    updateGroupId,
    updateMessage,
    metadataSource,
    metadataWarnings: [],
  };
}

function resolveReleaseMetadata(snapshot: RuntimeReleaseSnapshot): ReleaseMetadata {
  const fromManifestMetadata = parseMetadataSource(snapshot.update.manifestMetadata, "manifest-metadata");
  if (fromManifestMetadata) return fromManifestMetadata;

  const fromManifestExtra = parseMetadataSource(snapshot.update.manifestExtraRelease, "manifest-extra");
  if (fromManifestExtra) return fromManifestExtra;

  const fromExpoConfig = parseMetadataSource(snapshot.update.expoConfigRelease, "expo-config-extra");
  if (fromExpoConfig) return fromExpoConfig;

  const envRecord = isRecord(snapshot.envMetadata) ? snapshot.envMetadata : null;
  const fromEnv = parseMetadataSource(envRecord, "env");
  if (fromEnv) return fromEnv;

  return {
    releaseLabel: NOT_PROVIDED,
    gitCommit: NOT_PROVIDED,
    updateGroupId: NOT_PROVIDED,
    updateMessage: NOT_PROVIDED,
    metadataSource: "unavailable",
    metadataWarnings: ["Optional release metadata was not embedded in this bundle or OTA manifest."],
  };
}

function resolveUpdateAvailability(snapshot: RuntimeReleaseSnapshot): {
  state: ReleaseUpdateAvailabilityState;
  summary: string;
} {
  const checkError = safeString(snapshot.update.checkError, "");
  if (checkError) {
    return {
      state: "check-error",
      summary: `Update check failed: ${checkError}`,
    };
  }

  const downloadError = safeString(snapshot.update.downloadError, "");
  if (downloadError) {
    return {
      state: "download-error",
      summary: `Update download failed: ${downloadError}`,
    };
  }

  const hasDownloadedUpdate =
    safeBoolean(snapshot.update.isUpdatePending) || safeString(snapshot.update.downloadedUpdateId, "") !== "";
  if (hasDownloadedUpdate) {
    return {
      state: "downloaded-pending-relaunch",
      summary: "A newer update was downloaded and is waiting for a relaunch.",
    };
  }

  if (
    safeBoolean(snapshot.update.isDownloading) ||
    safeBoolean(snapshot.update.isChecking) ||
    safeBoolean(snapshot.update.isStartupProcedureRunning)
  ) {
    return {
      state: "checking",
      summary: "The app is currently checking or downloading an update.",
    };
  }

  const hasAvailableUpdate =
    safeBoolean(snapshot.update.isUpdateAvailable) || safeString(snapshot.update.availableUpdateId, "") !== "";
  if (hasAvailableUpdate) {
    return {
      state: "available",
      summary: "A newer update is available on this channel but is not applied yet.",
    };
  }

  if (safeString(snapshot.update.lastCheckForUpdateTimeSinceRestart, "") !== "") {
    return {
      state: "no-update",
      summary: "No newer update was found on this channel during this app session.",
    };
  }

  return {
    state: "not-checked",
    summary: "No in-session update result is available yet.",
  };
}

export function recommendReleaseDelivery(changeClass: ReleaseChangeClass): ReleaseDecisionRule {
  return RELEASE_DECISION_MATRIX[changeClass];
}

export function buildReleaseDecisionSummary(params: {
  changeClass: ReleaseChangeClass;
  targetChannel: string;
  configWarnings?: string[];
}): ReleaseDecisionSummary {
  return {
    targetChannel: safeString(params.targetChannel),
    expectedBranch: getExpectedReleaseBranch(safeString(params.targetChannel)),
    decision: recommendReleaseDelivery(params.changeClass),
    configWarnings: params.configWarnings ?? [],
  };
}

export function buildReleaseConfigSummary(input: ReleaseConfigInput): ReleaseConfigSummary {
  const risks: string[] = [];

  if (input.appVersionSource === "remote") {
    pushUnique(
      risks,
      "appVersionSource=remote means local ios.buildNumber/android.versionCode are not authoritative for shipped binaries; EAS Build owns the real counters.",
    );
  }

  if (!input.runtimePolicyValid) {
    pushUnique(risks, input.runtimePolicyReason);
  }

  if (!input.runtimeProofConsistent) {
    pushUnique(risks, input.runtimeProofReason);
  }

  if (input.runtimePolicy.startsWith("fixed")) {
    pushUnique(
      risks,
      "runtimeVersion is pinned. OTA remains valid only while the native host stays compatible; changing the runtime policy requires new builds.",
    );
  } else if (input.runtimePolicy === "policy:fingerprint") {
    pushUnique(
      risks,
      "runtimeVersion uses the fingerprint policy. Native/runtime-affecting changes require fresh builds before publishing compatible OTA updates.",
    );
  }

  if (input.checkAutomatically === "ON_LOAD" && input.fallbackToCacheTimeout === 0) {
    pushUnique(
      risks,
      "Current startup policy is ON_LOAD + fallbackToCacheTimeout=0, so OTA normally downloads on one launch and applies on the next cold launch.",
    );
  }

  if (!input.updatesEnabled) {
    pushUnique(risks, "expo-updates is disabled in app config, so OTA delivery would not work for this binary.");
  }

  for (const profile of input.buildProfiles) {
    if (!isCanonicalReleaseChannel(profile.channel)) {
      pushUnique(
        risks,
        `Build profile "${profile.name}" points at non-canonical channel "${profile.channel}". This weakens branch/channel lineage.`,
      );
    }
  }

  return {
    appName: input.appName,
    appSlug: input.appSlug,
    appVersion: input.appVersion,
    configuredIosBuildNumber: input.configuredIosBuildNumber,
    configuredAndroidVersionCode: input.configuredAndroidVersionCode,
    runtimeVersion: input.runtimeVersion,
    runtimePolicy: input.runtimePolicy,
    runtimeVersionStrategy: input.runtimeVersionStrategy,
    runtimePolicyValid: input.runtimePolicyValid,
    runtimePolicyReason: input.runtimePolicyReason,
    runtimeProofConsistent: input.runtimeProofConsistent,
    runtimeProofReason: input.runtimeProofReason,
    updatesEnabled: input.updatesEnabled,
    updatesUrl: input.updatesUrl,
    projectId: input.projectId,
    checkAutomatically: input.checkAutomatically,
    fallbackToCacheTimeout: input.fallbackToCacheTimeout,
    appVersionSource: input.appVersionSource,
    branchByChannel: CANONICAL_BRANCH_BY_CHANNEL,
    buildProfiles: input.buildProfiles,
    sourceOfTruth: [...RELEASE_SOURCE_OF_TRUTH],
    risks,
    allowed: [...RELEASE_ALLOWED_OTA_SCOPES],
    forbidden: [...RELEASE_FORBIDDEN_OTA_SCOPES],
    gitBranch: input.gitBranch,
    gitCommit: input.gitCommit,
    gitDirty: input.gitDirty,
  };
}

export function buildReleaseDiagnostics(snapshot: RuntimeReleaseSnapshot): ReleaseDiagnostics {
  const nowMs = snapshot.nowMs ?? Date.now();
  const metadata = resolveReleaseMetadata(snapshot);

  const channel = safeString(snapshot.update.channel);
  const expectedBranch = getExpectedReleaseBranch(channel);
  const runtimeVersion = safeString(snapshot.update.runtimeVersion ?? snapshot.config.runtimeVersion);
  const rawUpdateId = safeString(snapshot.update.updateId, "");
  const updateId =
    rawUpdateId && rawUpdateId !== UNKNOWN
      ? rawUpdateId
      : snapshot.update.isEmbeddedLaunch
        ? "embedded"
        : UNKNOWN;
  const createdAt = safeString(snapshot.update.createdAt);
  const lastUpdateAgeHours = getAgeHours(createdAt, nowMs);
  const hasReliableOtaIdentity =
    updateId !== UNKNOWN &&
    updateId !== "embedded" &&
    channel !== UNKNOWN &&
    runtimeVersion !== UNKNOWN;
  const launchSource = snapshot.update.isEmbeddedLaunch
    ? "embedded"
    : hasReliableOtaIdentity
      ? "ota"
      : "unknown";
  const availability = resolveUpdateAvailability(snapshot);

  const issues: string[] = [];
  const actions: string[] = [];

  const isRuntimeMismatchSuspected = runtimeVersion === UNKNOWN;
  const isNativeBuildUnknown = snapshot.native.nativeBuildVersion === UNKNOWN;
  const isChannelMismatch =
    channel === UNKNOWN || channel === "development-client" || !isCanonicalReleaseChannel(channel);
  const isProbablyOutdated =
    snapshot.update.isEmbeddedLaunch || (lastUpdateAgeHours !== null && lastUpdateAgeHours > 24);

  if (!snapshot.config.updatesEnabled) {
    pushUnique(issues, "expo-updates is disabled for this binary.");
    pushUnique(actions, "Do not expect OTA delivery until a build with expo-updates enabled is installed.");
  }

  if (snapshot.config.projectId === UNKNOWN || snapshot.config.updatesUrl === UNKNOWN) {
    pushUnique(issues, "The project binding is incomplete: projectId or updates URL is missing.");
    pushUnique(actions, "Verify app.json extra.eas.projectId and updates.url before blaming OTA.");
  }

  if (isRuntimeMismatchSuspected) {
    pushUnique(issues, "Runtime version could not be determined.");
    pushUnique(actions, "Verify runtimeVersion in app config and the installed binary lineage.");
  }

  if (isNativeBuildUnknown) {
    pushUnique(issues, "Native build version could not be determined.");
    pushUnique(
      actions,
      "If this snapshot came from web/desktop, native build lineage is unavailable there by design. If this came from iOS/Android, verify the installed binary was produced by EAS Build.",
    );
  }

  if (channel === UNKNOWN) {
    pushUnique(issues, "The installed build channel is unknown.");
    pushUnique(actions, "Verify that this binary was produced by EAS Build and bound to a canonical channel.");
  } else if (channel === "development-client") {
    pushUnique(issues, "This launch comes from a development client, not from a release binary.");
    pushUnique(actions, "Use preview or production builds when validating OTA behavior.");
  } else if (!isCanonicalReleaseChannel(channel)) {
    pushUnique(issues, `Channel "${channel}" is outside the canonical development/preview/production topology.`);
    pushUnique(actions, "Bring the build back to the canonical channel->branch mapping before release.");
  }

  if (snapshot.update.isEmergencyLaunch) {
    pushUnique(issues, "The app launched in emergency fallback mode.");
    if (snapshot.update.emergencyLaunchReason) {
      pushUnique(actions, `Inspect emergency reason: ${snapshot.update.emergencyLaunchReason}`);
    }
  }

  if (launchSource === "unknown") {
    pushUnique(issues, "Launch source could not be proven from the current release identity.");
    pushUnique(
      actions,
      "Use the diagnostics together with a known iOS/Android EAS build; when lineage fields stay unknown, do not treat this snapshot as proof that OTA applied.",
    );
  }

  if (snapshot.update.isEmbeddedLaunch) {
    pushUnique(issues, "The current launch is still using the embedded bundle.");
    if (snapshot.config.checkAutomatically === "ON_LOAD" && snapshot.config.fallbackToCacheTimeout === 0) {
      pushUnique(actions, "Cold-launch once to download and a second time to apply the OTA update.");
    } else {
      pushUnique(actions, "Cold relaunch the app to allow the downloaded OTA update to apply.");
    }
  }

  if (lastUpdateAgeHours !== null && lastUpdateAgeHours > 24) {
    pushUnique(issues, `The currently running update is older than 24 hours (${Math.floor(lastUpdateAgeHours)} h).`);
    pushUnique(actions, `Confirm that the latest update was published to branch "${expectedBranch}".`);
  }

  switch (availability.state) {
    case "available":
      pushUnique(issues, "A newer OTA update is available on the current channel.");
      pushUnique(actions, "Allow the app to finish its startup check or relaunch to fetch the update.");
      break;
    case "downloaded-pending-relaunch":
      pushUnique(issues, "A newer OTA update was downloaded but is waiting for relaunch.");
      pushUnique(actions, "Fully close and relaunch the app to apply the downloaded update.");
      break;
    case "check-error":
      pushUnique(issues, availability.summary);
      pushUnique(actions, "Capture diagnostics and verify network reachability before retrying.");
      break;
    case "download-error":
      pushUnique(issues, availability.summary);
      pushUnique(actions, "Capture diagnostics and retry on stable network.");
      break;
    case "no-update":
      pushUnique(actions, "No newer OTA was found in this session; if UI still looks stale, verify runtime/channel/build lineage.");
      break;
    default:
      break;
  }

  if (metadata.metadataWarnings.length > 0) {
    for (const warning of metadata.metadataWarnings) {
      pushUnique(actions, warning);
    }
  }

  if (expectedBranch !== UNKNOWN) {
    pushUnique(actions, `For this binary, publish OTA only to branch "${expectedBranch}".`);
  }

  if (issues.length === 0) {
    pushUnique(issues, "Update applied successfully within the current runtime lineage.");
  }

  let severity: ReleaseDiagnostics["severity"] = "ok";
  if (!snapshot.config.updatesEnabled || snapshot.config.projectId === UNKNOWN || snapshot.config.updatesUrl === UNKNOWN || isRuntimeMismatchSuspected) {
    severity = "error";
  } else if (
    snapshot.update.isEmbeddedLaunch ||
    snapshot.update.isEmergencyLaunch ||
    isChannelMismatch ||
    (lastUpdateAgeHours !== null && lastUpdateAgeHours > 24) ||
    availability.state === "available" ||
    availability.state === "downloaded-pending-relaunch" ||
    availability.state === "check-error" ||
    availability.state === "download-error"
  ) {
    severity = "warning";
  }

  return {
    ...metadata,
    appVersion: snapshot.native.appVersion,
    nativeBuild: snapshot.native.nativeBuildVersion,
    nativeAppVersion: snapshot.native.appVersion,
    nativeBuildVersion: snapshot.native.nativeBuildVersion,
    configuredAppVersion: snapshot.config.appVersion,
    configuredIosBuildNumber: snapshot.config.configuredIosBuildNumber,
    configuredAndroidVersionCode: snapshot.config.configuredAndroidVersionCode,
    runtimeVersion,
    channel,
    expectedBranch,
    updateId,
    createdAt,
    isEmbeddedLaunch: snapshot.update.isEmbeddedLaunch,
    launchSource,
    isEmergencyLaunch: snapshot.update.isEmergencyLaunch === true,
    emergencyLaunchReason: safeString(snapshot.update.emergencyLaunchReason, NOT_PROVIDED),
    updatesUrl: snapshot.config.updatesUrl,
    projectId: snapshot.config.projectId,
    checkAutomatically: snapshot.config.checkAutomatically,
    fallbackToCacheTimeout: snapshot.config.fallbackToCacheTimeout,
    appVersionSource: snapshot.config.appVersionSource,
    severity,
    verdict: severity,
    issues,
    reasons: issues,
    actions,
    lastUpdateAgeHours,
    isProbablyOutdated,
    isChannelMismatch,
    isRuntimeMismatchSuspected,
    publishHint:
      expectedBranch !== UNKNOWN
        ? `Publish OTA to branch "${expectedBranch}" only.`
        : "Resolve the build channel before publishing OTA.",
    updateAvailabilityState: availability.state,
    updateAvailabilitySummary: availability.summary,
    availableUpdateId: safeString(snapshot.update.availableUpdateId, NOT_PROVIDED),
    availableUpdateCreatedAt: safeString(snapshot.update.availableUpdateCreatedAt, NOT_PROVIDED),
    downloadedUpdateId: safeString(snapshot.update.downloadedUpdateId, NOT_PROVIDED),
    downloadedUpdateCreatedAt: safeString(snapshot.update.downloadedUpdateCreatedAt, NOT_PROVIDED),
    lastCheckForUpdateTimeSinceRestart: safeString(snapshot.update.lastCheckForUpdateTimeSinceRestart, NOT_PROVIDED),
    checkError: safeString(snapshot.update.checkError, NOT_PROVIDED),
    downloadError: safeString(snapshot.update.downloadError, NOT_PROVIDED),
  };
}

export function buildReleaseDiagnosticsText(diagnostics: ReleaseDiagnostics): string {
  return [
    `appVersion: ${diagnostics.appVersion}`,
    `nativeBuildVersion: ${diagnostics.nativeBuildVersion}`,
    `runtimeVersion: ${diagnostics.runtimeVersion}`,
    `channel: ${diagnostics.channel}`,
    `expectedBranch: ${diagnostics.expectedBranch}`,
    `updateId: ${diagnostics.updateId}`,
    `launchSource: ${diagnostics.launchSource}`,
    `isEmbeddedLaunch: ${String(diagnostics.isEmbeddedLaunch)}`,
    `createdAt: ${diagnostics.createdAt}`,
    `updateAvailability: ${diagnostics.updateAvailabilityState}`,
    `updateAvailabilitySummary: ${diagnostics.updateAvailabilitySummary}`,
    `availableUpdateId: ${diagnostics.availableUpdateId}`,
    `downloadedUpdateId: ${diagnostics.downloadedUpdateId}`,
    `lastCheckForUpdateTimeSinceRestart: ${diagnostics.lastCheckForUpdateTimeSinceRestart}`,
    `checkAutomatically: ${diagnostics.checkAutomatically}`,
    `fallbackToCacheTimeout: ${
      diagnostics.fallbackToCacheTimeout == null ? UNKNOWN : diagnostics.fallbackToCacheTimeout
    }`,
    `updatesUrl: ${diagnostics.updatesUrl}`,
    `projectId: ${diagnostics.projectId}`,
    `severity: ${diagnostics.severity}`,
    `releaseLabel: ${diagnostics.releaseLabel}`,
    `gitCommit: ${diagnostics.gitCommit}`,
    `updateGroupId: ${diagnostics.updateGroupId}`,
    `updateMessage: ${diagnostics.updateMessage}`,
    `metadataSource: ${diagnostics.metadataSource}`,
    "",
    "reasons:",
    ...(diagnostics.reasons.length ? diagnostics.reasons.map((reason) => `- ${reason}`) : ["- none"]),
    "",
    "actions:",
    ...(diagnostics.actions.length ? diagnostics.actions.map((action) => `- ${action}`) : ["- none"]),
  ].join("\n");
}

export function buildReleaseConfigText(summary: ReleaseConfigSummary): string {
  return [
    `app: ${summary.appName} (${summary.appSlug})`,
    `appVersion: ${summary.appVersion}`,
    `configuredIosBuildNumber: ${summary.configuredIosBuildNumber}`,
    `configuredAndroidVersionCode: ${summary.configuredAndroidVersionCode}`,
    `runtimeVersion: ${summary.runtimeVersion}`,
    `runtimePolicy: ${summary.runtimePolicy}`,
    `runtimeVersionStrategy: ${summary.runtimeVersionStrategy}`,
    `runtimePolicyValid: ${String(summary.runtimePolicyValid)}`,
    `runtimeProofConsistent: ${String(summary.runtimeProofConsistent)}`,
    `updatesEnabled: ${String(summary.updatesEnabled)}`,
    `checkAutomatically: ${summary.checkAutomatically}`,
    `fallbackToCacheTimeout: ${summary.fallbackToCacheTimeout == null ? UNKNOWN : summary.fallbackToCacheTimeout}`,
    `appVersionSource: ${summary.appVersionSource}`,
    `updatesUrl: ${summary.updatesUrl}`,
    `projectId: ${summary.projectId}`,
    `gitBranch: ${summary.gitBranch}`,
    `gitCommit: ${summary.gitCommit}`,
    `gitDirty: ${String(summary.gitDirty)}`,
    "",
    "channelBranchMapping:",
    ...CANONICAL_RELEASE_CHANNELS.map((channel) => `- ${channel} -> ${summary.branchByChannel[channel]}`),
    "",
    "risks:",
    ...(summary.risks.length ? summary.risks.map((risk) => `- ${risk}`) : ["- none"]),
  ].join("\n");
}

export function normalizeReleaseAppVersionSource(value: unknown): ReleaseAppVersionSource {
  const source = safeString(value);
  if (source === "remote" || source === "local") return source;
  return "unknown";
}

export function normalizeReleaseCheckAutomatically(value: unknown): ReleaseCheckAutomatically {
  const checkAutomatically = safeString(value);
  if (
    checkAutomatically === "ON_LOAD" ||
    checkAutomatically === "ON_ERROR_RECOVERY" ||
    checkAutomatically === "WIFI_ONLY" ||
    checkAutomatically === "NEVER"
  ) {
    return checkAutomatically;
  }

  return "unknown";
}
