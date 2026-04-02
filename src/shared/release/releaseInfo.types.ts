export type CanonicalReleaseChannel = "development" | "preview" | "production";

export type ReleaseChannel = CanonicalReleaseChannel | "development-client" | "unknown" | (string & {});

export type ReleaseBranch = CanonicalReleaseChannel | "unknown" | (string & {});

export type ReleaseVerdict = "ok" | "warning" | "error";

export type ReleaseLaunchSource = "embedded" | "ota" | "unknown";

export type ReleaseCheckAutomatically =
  | "ON_LOAD"
  | "ON_ERROR_RECOVERY"
  | "WIFI_ONLY"
  | "NEVER"
  | "unknown";

export type ReleaseAppVersionSource = "remote" | "local" | "unknown";

export type ReleaseUpdateAvailabilityState =
  | "not-checked"
  | "checking"
  | "available"
  | "downloaded-pending-relaunch"
  | "no-update"
  | "check-error"
  | "download-error";

export type ReleaseMetadataSource =
  | "manifest-metadata"
  | "manifest-extra"
  | "expo-config-extra"
  | "env"
  | "unavailable";

export type ReleaseDeliveryKind = "ota" | "new-build";

export type ReleaseChangeClass =
  | "js-ui"
  | "js-logic"
  | "hook-service"
  | "ota-diagnostics"
  | "release-metadata"
  | "native-module"
  | "expo-plugin"
  | "app-config-native"
  | "permission-entitlement"
  | "bundle-identity"
  | "runtime-policy"
  | "native-asset";

export type ReleaseMetadataFields = {
  releaseLabel: string;
  gitCommit: string;
  updateGroupId: string;
  updateMessage: string;
};

export type ReleaseMetadata = ReleaseMetadataFields & {
  metadataSource: ReleaseMetadataSource;
  metadataWarnings: string[];
};

export type RuntimeReleaseSnapshot = {
  nowMs?: number;
  config: {
    appVersion: string;
    configuredIosBuildNumber: string;
    configuredAndroidVersionCode: string;
    runtimeVersion: string;
    updatesEnabled: boolean;
    updatesUrl: string;
    projectId: string;
    checkAutomatically: ReleaseCheckAutomatically;
    fallbackToCacheTimeout: number | null;
    appVersionSource: ReleaseAppVersionSource;
  };
  native: {
    appVersion: string;
    nativeBuildVersion: string;
  };
  update: {
    channel: ReleaseChannel;
    updateId: string;
    createdAt: string;
    isEmbeddedLaunch: boolean;
    isEmergencyLaunch?: boolean;
    emergencyLaunchReason?: string | null;
    manifestMetadata?: Record<string, unknown> | null;
    manifestExtraRelease?: Record<string, unknown> | null;
    expoConfigRelease?: Record<string, unknown> | null;
    runtimeVersion?: string;
    isStartupProcedureRunning?: boolean;
    isUpdateAvailable?: boolean;
    isUpdatePending?: boolean;
    isChecking?: boolean;
    isDownloading?: boolean;
    availableUpdateId?: string;
    availableUpdateCreatedAt?: string;
    downloadedUpdateId?: string;
    downloadedUpdateCreatedAt?: string;
    checkError?: string | null;
    downloadError?: string | null;
    lastCheckForUpdateTimeSinceRestart?: string | null;
  };
  envMetadata?: Partial<ReleaseMetadataFields>;
};

export type ReleaseDiagnostics = ReleaseMetadata & {
  appVersion: string;
  nativeBuild: string;
  nativeAppVersion: string;
  nativeBuildVersion: string;
  configuredAppVersion: string;
  configuredIosBuildNumber: string;
  configuredAndroidVersionCode: string;
  runtimeVersion: string;
  channel: ReleaseChannel;
  expectedBranch: ReleaseBranch;
  updateId: string;
  createdAt: string;
  isEmbeddedLaunch: boolean;
  launchSource: ReleaseLaunchSource;
  isEmergencyLaunch: boolean;
  emergencyLaunchReason: string;
  updatesUrl: string;
  projectId: string;
  checkAutomatically: ReleaseCheckAutomatically;
  fallbackToCacheTimeout: number | null;
  appVersionSource: ReleaseAppVersionSource;
  severity: ReleaseVerdict;
  verdict: ReleaseVerdict;
  issues: string[];
  reasons: string[];
  actions: string[];
  lastUpdateAgeHours: number | null;
  isProbablyOutdated: boolean;
  isChannelMismatch: boolean;
  isRuntimeMismatchSuspected: boolean;
  publishHint: string;
  updateAvailabilityState: ReleaseUpdateAvailabilityState;
  updateAvailabilitySummary: string;
  availableUpdateId: string;
  availableUpdateCreatedAt: string;
  downloadedUpdateId: string;
  downloadedUpdateCreatedAt: string;
  lastCheckForUpdateTimeSinceRestart: string;
  checkError: string;
  downloadError: string;
};

export type ReleaseDecisionRule = {
  changeClass: ReleaseChangeClass;
  delivery: ReleaseDeliveryKind;
  title: string;
  reason: string;
  examples: string[];
};

export type ReleaseConfigBuildProfile = {
  name: string;
  channel: string;
  distribution: string;
  autoIncrement: boolean;
};

export type ReleaseConfigInput = {
  appName: string;
  appSlug: string;
  appVersion: string;
  configuredIosBuildNumber: string;
  configuredAndroidVersionCode: string;
  runtimeVersion: string;
  runtimePolicy: string;
  updatesEnabled: boolean;
  updatesUrl: string;
  projectId: string;
  checkAutomatically: ReleaseCheckAutomatically;
  fallbackToCacheTimeout: number | null;
  appVersionSource: ReleaseAppVersionSource;
  buildProfiles: ReleaseConfigBuildProfile[];
  gitBranch: string;
  gitCommit: string;
  gitDirty: boolean;
};

export type ReleaseConfigSummary = {
  appName: string;
  appSlug: string;
  appVersion: string;
  configuredIosBuildNumber: string;
  configuredAndroidVersionCode: string;
  runtimeVersion: string;
  runtimePolicy: string;
  updatesEnabled: boolean;
  updatesUrl: string;
  projectId: string;
  checkAutomatically: ReleaseCheckAutomatically;
  fallbackToCacheTimeout: number | null;
  appVersionSource: ReleaseAppVersionSource;
  branchByChannel: Record<CanonicalReleaseChannel, string>;
  buildProfiles: ReleaseConfigBuildProfile[];
  sourceOfTruth: string[];
  risks: string[];
  allowed: string[];
  forbidden: string[];
  gitBranch: string;
  gitCommit: string;
  gitDirty: boolean;
};

export type ReleaseDecisionSummary = {
  targetChannel: ReleaseChannel;
  expectedBranch: ReleaseBranch;
  decision: ReleaseDecisionRule;
  configWarnings: string[];
};
