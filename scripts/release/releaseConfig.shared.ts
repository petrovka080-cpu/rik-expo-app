import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildReleaseConfigSummary,
  evaluateReleaseRuntimePolicyTruth,
  normalizeReleaseAppVersionSource,
  normalizeReleaseCheckAutomatically,
  safeString,
} from "../../src/shared/release/releaseInfo";
import type {
  ReleaseConfigBuildProfile,
  ReleaseConfigSummary,
} from "../../src/shared/release/releaseInfo.types";

type AppJsonShape = {
  expo?: {
    name?: unknown;
    slug?: unknown;
    version?: unknown;
    runtimeVersion?: unknown;
    updates?: {
      enabled?: unknown;
      url?: unknown;
      checkAutomatically?: unknown;
      fallbackToCacheTimeout?: unknown;
    };
    extra?: {
      eas?: {
        projectId?: unknown;
      };
      release?: {
        appVersionSource?: unknown;
        runtimePolicy?: unknown;
        runtimeStabilizationProof?: unknown;
      };
    };
    ios?: {
      buildNumber?: unknown;
    };
    android?: {
      versionCode?: unknown;
    };
  };
};

type EasJsonShape = {
  cli?: {
    appVersionSource?: unknown;
  };
  build?: Record<
    string,
    {
      channel?: unknown;
      distribution?: unknown;
      autoIncrement?: unknown;
    }
  >;
};

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

export const PROJECT_ROOT = path.resolve(SCRIPT_DIR, "..", "..");

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function readGitValue(command: string): string {
  return execSync(command, {
    cwd: PROJECT_ROOT,
    stdio: ["ignore", "pipe", "ignore"],
    encoding: "utf8",
  }).trim();
}

function getGitDirty(): boolean {
  return readGitValue("git status --short").length > 0;
}

function getBuildProfiles(easJson: EasJsonShape): ReleaseConfigBuildProfile[] {
  const buildEntries = easJson.build ?? {};

  return Object.entries(buildEntries).map(([name, profile]) => ({
    name,
    channel: safeString(profile.channel),
    distribution: safeString(profile.distribution),
    autoIncrement: profile.autoIncrement === true,
  }));
}

export function loadReleaseConfigSummary(): ReleaseConfigSummary {
  const appJson = readJsonFile<AppJsonShape>(path.join(PROJECT_ROOT, "app.json"));
  const easJson = readJsonFile<EasJsonShape>(path.join(PROJECT_ROOT, "eas.json"));
  const expo = appJson.expo ?? {};
  const releaseExtra = expo.extra?.release;
  const runtimePolicyTruth = evaluateReleaseRuntimePolicyTruth({
    runtimeVersion: expo.runtimeVersion,
    releaseExtra,
  });

  return buildReleaseConfigSummary({
    appName: safeString(expo.name),
    appSlug: safeString(expo.slug),
    appVersion: safeString(expo.version),
    configuredIosBuildNumber: safeString(expo.ios?.buildNumber),
    configuredAndroidVersionCode: safeString(expo.android?.versionCode),
    runtimeVersion: runtimePolicyTruth.resolvedRuntimeVersion,
    runtimePolicy: runtimePolicyTruth.runtimePolicy,
    runtimeVersionStrategy: runtimePolicyTruth.runtimeVersionStrategy,
    runtimePolicyValid: runtimePolicyTruth.runtimePolicyValid,
    runtimePolicyReason: runtimePolicyTruth.runtimePolicyReason,
    runtimeProofConsistent: runtimePolicyTruth.runtimeProofConsistent,
    runtimeProofReason: runtimePolicyTruth.runtimeProofReason,
    updatesEnabled: expo.updates?.enabled === true,
    updatesUrl: safeString(expo.updates?.url),
    projectId: safeString(expo.extra?.eas?.projectId),
    checkAutomatically: normalizeReleaseCheckAutomatically(expo.updates?.checkAutomatically),
    fallbackToCacheTimeout:
      typeof expo.updates?.fallbackToCacheTimeout === "number" ? expo.updates.fallbackToCacheTimeout : null,
    appVersionSource: normalizeReleaseAppVersionSource(
      easJson.cli?.appVersionSource ?? releaseExtra?.appVersionSource,
    ),
    buildProfiles: getBuildProfiles(easJson),
    gitBranch: readGitValue("git branch --show-current"),
    gitCommit: readGitValue("git rev-parse HEAD"),
    gitDirty: getGitDirty(),
  });
}
