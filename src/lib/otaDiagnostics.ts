import Constants from "expo-constants";
import * as Application from "expo-application";
import * as Updates from "expo-updates";
import type { UseUpdatesReturnType } from "expo-updates";

import {
  buildReleaseDiagnostics,
  buildReleaseDiagnosticsText,
  normalizeReleaseAppVersionSource,
  normalizeReleaseCheckAutomatically,
  safeString,
} from "@/src/shared/release/releaseInfo";
import type { ReleaseDiagnostics } from "@/src/shared/release/releaseInfo.types";

export type OtaDiagnosticsSeverity = ReleaseDiagnostics["severity"];
export type OtaDiagnostics = ReleaseDiagnostics;

type RuntimeManifestRecord = {
  createdAt?: unknown;
  metadata?: unknown;
  extra?: unknown;
};

type ReleaseExtraRecord = {
  appVersionSource?: unknown;
  release?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getRuntimeManifest(updatesState?: Partial<UseUpdatesReturnType>): RuntimeManifestRecord | null {
  const currentManifest = updatesState?.currentlyRunning?.manifest;
  if (isRecord(currentManifest)) {
    return currentManifest as RuntimeManifestRecord;
  }

  if (isRecord(Updates.manifest)) {
    return Updates.manifest as RuntimeManifestRecord;
  }

  return null;
}

function getReleaseConfigExtra(): ReleaseExtraRecord | null {
  const expoConfig = Constants.expoConfig ?? null;
  const extra = expoConfig?.extra;
  if (!isRecord(extra)) return null;
  return extra as ReleaseExtraRecord;
}

function getManifestMetadata(manifest: RuntimeManifestRecord | null): Record<string, unknown> | null {
  if (!manifest || !isRecord(manifest.metadata)) return null;
  return manifest.metadata;
}

function getManifestReleaseExtra(manifest: RuntimeManifestRecord | null): Record<string, unknown> | null {
  if (!manifest || !isRecord(manifest.extra)) return null;
  const extra = manifest.extra;
  if (!isRecord(extra.release)) return null;
  return extra.release;
}

function getExpoConfigReleaseExtra(extra: ReleaseExtraRecord | null): Record<string, unknown> | null {
  if (!extra || !isRecord(extra.release)) return null;
  return extra.release;
}

function toIsoString(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  return safeString(value);
}

function getEnvReleaseMetadata(): Partial<{
  releaseLabel: string;
  gitCommit: string;
  updateGroupId: string;
  updateMessage: string;
}> {
  if (typeof process === "undefined" || !process.env) {
    return {};
  }

  return {
    releaseLabel: safeString(process.env.EXPO_PUBLIC_RELEASE_LABEL, ""),
    gitCommit: safeString(process.env.EXPO_PUBLIC_GIT_COMMIT_SHA, ""),
    updateGroupId: safeString(process.env.EXPO_PUBLIC_UPDATE_GROUP_ID, ""),
    updateMessage: safeString(process.env.EXPO_PUBLIC_UPDATE_MESSAGE, ""),
  };
}

export function getOtaDiagnostics(updatesState?: Partial<UseUpdatesReturnType>): OtaDiagnostics {
  const expoConfig = Constants.expoConfig ?? null;
  const extra = getReleaseConfigExtra();
  const manifest = getRuntimeManifest(updatesState);

  return buildReleaseDiagnostics({
    config: {
      appVersion: safeString(expoConfig?.version),
      configuredIosBuildNumber: safeString(expoConfig?.ios?.buildNumber),
      configuredAndroidVersionCode: safeString(expoConfig?.android?.versionCode),
      runtimeVersion: safeString(Updates.runtimeVersion),
      updatesEnabled: Updates.isEnabled,
      updatesUrl: safeString(expoConfig?.updates?.url),
      projectId: safeString((expoConfig?.extra as { eas?: { projectId?: unknown } } | null | undefined)?.eas?.projectId),
      checkAutomatically: normalizeReleaseCheckAutomatically(Updates.checkAutomatically),
      fallbackToCacheTimeout:
        typeof expoConfig?.updates?.fallbackToCacheTimeout === "number"
          ? expoConfig.updates.fallbackToCacheTimeout
          : null,
      appVersionSource: normalizeReleaseAppVersionSource(extra?.appVersionSource),
    },
    native: {
      appVersion: safeString(Application.nativeApplicationVersion ?? expoConfig?.version),
      nativeBuildVersion: safeString(
        Application.nativeBuildVersion ?? expoConfig?.ios?.buildNumber ?? expoConfig?.android?.versionCode,
      ),
    },
    update: {
      channel: safeString(Updates.channel),
      updateId: safeString(updatesState?.currentlyRunning?.updateId ?? Updates.updateId, "embedded"),
      createdAt: toIsoString(updatesState?.currentlyRunning?.createdAt ?? Updates.createdAt ?? manifest?.createdAt),
      isEmbeddedLaunch: updatesState?.currentlyRunning?.isEmbeddedLaunch ?? Boolean(Updates.isEmbeddedLaunch),
      isEmergencyLaunch: updatesState?.currentlyRunning?.isEmergencyLaunch,
      emergencyLaunchReason: safeString(updatesState?.currentlyRunning?.emergencyLaunchReason, ""),
      manifestMetadata: getManifestMetadata(manifest),
      manifestExtraRelease: getManifestReleaseExtra(manifest),
      expoConfigRelease: getExpoConfigReleaseExtra(extra),
      runtimeVersion: safeString(updatesState?.currentlyRunning?.runtimeVersion ?? Updates.runtimeVersion),
      isStartupProcedureRunning: updatesState?.isStartupProcedureRunning,
      isUpdateAvailable: updatesState?.isUpdateAvailable,
      isUpdatePending: updatesState?.isUpdatePending,
      isChecking: updatesState?.isChecking,
      isDownloading: updatesState?.isDownloading,
      availableUpdateId: safeString(updatesState?.availableUpdate?.updateId, ""),
      availableUpdateCreatedAt: toIsoString(updatesState?.availableUpdate?.createdAt),
      downloadedUpdateId: safeString(updatesState?.downloadedUpdate?.updateId, ""),
      downloadedUpdateCreatedAt: toIsoString(updatesState?.downloadedUpdate?.createdAt),
      checkError: safeString(updatesState?.checkError?.message, ""),
      downloadError: safeString(updatesState?.downloadError?.message, ""),
      lastCheckForUpdateTimeSinceRestart: toIsoString(updatesState?.lastCheckForUpdateTimeSinceRestart),
    },
    envMetadata: getEnvReleaseMetadata(),
  });
}

export function buildOtaDiagnosticsText(diagnostics: OtaDiagnostics): string {
  return buildReleaseDiagnosticsText(diagnostics);
}

export function formatOtaDiagnosticsForClipboard(diagnostics: OtaDiagnostics): string {
  return buildOtaDiagnosticsText(diagnostics);
}
