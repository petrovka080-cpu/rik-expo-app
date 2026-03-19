import Constants from "expo-constants";
import * as Application from "expo-application";
import * as Updates from "expo-updates";

export type OtaDiagnosticsSeverity = "ok" | "warning" | "error";

export type OtaDiagnostics = {
  channel: string;
  runtimeVersion: string;
  updateId: string;
  isEmbeddedLaunch: boolean;
  createdAt: string;
  nativeAppVersion: string;
  nativeBuildVersion: string;
  updatesUrl: string;
  projectId: string;
  expectedBranch: string;
  severity: OtaDiagnosticsSeverity;
  issues: string[];
  actions: string[];
  lastUpdateAgeHours: number | null;
  isProbablyOutdated: boolean;
  isChannelMismatch: boolean;
  isRuntimeMismatchSuspected: boolean;
  appVersion: string;
  nativeBuild: string;
  launchSource: string;
  publishHint: string;
};

const CANONICAL_BRANCH_BY_CHANNEL: Record<string, string> = {
  development: "development",
  preview: "preview",
  production: "production",
};

function safeString(value: unknown, fallback = "unknown"): string {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function pushUnique(target: string[], value: string) {
  if (!target.includes(value)) {
    target.push(value);
  }
}

function getChannel(): string {
  const rawChannel = safeString((Updates as { channel?: string }).channel, "");
  if (rawChannel) return rawChannel;
  return __DEV__ ? "development-client" : "unknown";
}

function getExpectedBranch(channel: string): string {
  return CANONICAL_BRANCH_BY_CHANNEL[channel] ?? (channel && channel !== "unknown" ? channel : "unknown");
}

function getCreatedAtString(): string {
  if (Updates.createdAt instanceof Date && !Number.isNaN(Updates.createdAt.getTime())) {
    return Updates.createdAt.toISOString();
  }

  const manifest = (Updates.manifest as { createdAt?: unknown } | null | undefined) ?? undefined;
  return safeString(manifest?.createdAt, "unknown");
}

function getAgeHours(createdAt: string): number | null {
  if (!createdAt || createdAt === "unknown") return null;

  const timestamp = Date.parse(createdAt);
  if (Number.isNaN(timestamp)) return null;

  return Math.max(0, (Date.now() - timestamp) / (1000 * 60 * 60));
}

export function getOtaDiagnostics(): OtaDiagnostics {
  const expoConfig = Constants.expoConfig ?? null;
  const extra = (expoConfig?.extra ?? {}) as { eas?: { projectId?: unknown } };

  const channel = getChannel();
  const runtimeVersion = safeString(Updates.runtimeVersion, "unknown");
  const updateId = safeString(Updates.updateId, "embedded");
  const isEmbeddedLaunch = Boolean(Updates.isEmbeddedLaunch);
  const createdAt = getCreatedAtString();
  const nativeAppVersion = safeString(
    Application.nativeApplicationVersion ?? expoConfig?.version,
    "unknown",
  );
  const nativeBuildVersion = safeString(
    Application.nativeBuildVersion ?? expoConfig?.ios?.buildNumber ?? expoConfig?.android?.versionCode,
    "unknown",
  );
  const updatesUrl = safeString(expoConfig?.updates?.url, "unknown");
  const projectId = safeString(extra.eas?.projectId, "unknown");
  const expectedBranch = getExpectedBranch(channel);
  const lastUpdateAgeHours = getAgeHours(createdAt);

  const issues: string[] = [];
  const actions: string[] = [];

  const isRuntimeMismatchSuspected = runtimeVersion === "unknown";
  const isChannelMismatch =
    channel === "unknown" ||
    channel === "development-client" ||
    !(channel in CANONICAL_BRANCH_BY_CHANNEL);
  const isProbablyOutdated =
    isEmbeddedLaunch || (lastUpdateAgeHours !== null && lastUpdateAgeHours > 24);

  if (__DEV__) {
    pushUnique(issues, "Приложение запущено в dev-режиме, OTA здесь не отражает production behavior.");
    pushUnique(actions, "Проверяйте OTA на EAS build, а не в Expo development mode.");
  }

  if (!Updates.isEnabled) {
    pushUnique(issues, "expo-updates отключен для текущего запуска.");
    pushUnique(actions, "Проверьте, что используется EAS build с включенным expo-updates.");
  }

  if (channel === "unknown") {
    pushUnique(issues, "Не удалось определить OTA channel текущего билда.");
    pushUnique(actions, "Проверьте, что приложение собрано через EAS build и привязано к нужному channel.");
  } else if (channel === "development-client") {
    pushUnique(issues, "Запущен development client, а не release build с фиксированным OTA channel.");
    pushUnique(actions, "Для реальной OTA-проверки используйте preview или production build.");
  } else if (!(channel in CANONICAL_BRANCH_BY_CHANNEL)) {
    pushUnique(
      issues,
      `Channel "${channel}" не входит в каноническую схему development / preview / production.`,
    );
    pushUnique(actions, "Сверьте channel build-а с release runbook и ожидаемой branch публикации.");
  }

  if (projectId === "unknown" || updatesUrl === "unknown") {
    pushUnique(issues, "Не удалось прочитать updates URL или projectId.");
    pushUnique(actions, "Проверьте app config и Expo project binding.");
  }

  if (isRuntimeMismatchSuspected) {
    pushUnique(issues, "Не удалось определить runtimeVersion.");
    pushUnique(actions, "Проверьте expo-updates config и runtimeVersion в app config.");
  }

  if (isEmbeddedLaunch) {
    pushUnique(issues, "Приложение запущено со встроенного bundle, а не с примененного OTA update.");
    pushUnique(
      actions,
      "Если OTA публиковался недавно, полностью закройте приложение, откройте его, затем закройте и откройте еще раз.",
    );
  }

  if (lastUpdateAgeHours !== null && lastUpdateAgeHours > 24) {
    pushUnique(
      issues,
      `Последний примененный update старше 24 часов (${Math.floor(lastUpdateAgeHours)} ч).`,
    );
    pushUnique(actions, `Проверьте, что update публиковался в branch "${expectedBranch}".`);
  }

  if (isProbablyOutdated) {
    pushUnique(
      actions,
      "Если UI выглядит старым, сделайте два холодных перезапуска после ручной OTA-проверки.",
    );
  }

  if (expectedBranch !== "unknown") {
    pushUnique(actions, `Для этого билда publish нужно делать в branch "${expectedBranch}".`);
  }

  let severity: OtaDiagnosticsSeverity = "ok";
  if (!Updates.isEnabled || projectId === "unknown" || updatesUrl === "unknown" || isRuntimeMismatchSuspected) {
    severity = "error";
  } else if (issues.length > 0 || isProbablyOutdated || isChannelMismatch) {
    severity = "warning";
  }

  return {
    channel,
    runtimeVersion,
    updateId,
    isEmbeddedLaunch,
    createdAt,
    nativeAppVersion,
    nativeBuildVersion,
    updatesUrl,
    projectId,
    expectedBranch,
    severity,
    issues,
    actions,
    lastUpdateAgeHours,
    isProbablyOutdated,
    isChannelMismatch,
    isRuntimeMismatchSuspected,
    appVersion: nativeAppVersion,
    nativeBuild: nativeBuildVersion,
    launchSource: isEmbeddedLaunch ? "embedded" : "downloaded-update",
    publishHint:
      expectedBranch !== "unknown"
        ? `Publish to ${expectedBranch}`
        : "Check the installed build channel before publishing OTA",
  };
}

export function buildOtaDiagnosticsText(diagnostics: OtaDiagnostics): string {
  return [
    `channel: ${diagnostics.channel}`,
    `expectedBranch: ${diagnostics.expectedBranch}`,
    `runtimeVersion: ${diagnostics.runtimeVersion}`,
    `updateId: ${diagnostics.updateId}`,
    `isEmbeddedLaunch: ${String(diagnostics.isEmbeddedLaunch)}`,
    `createdAt: ${diagnostics.createdAt}`,
    `nativeAppVersion: ${diagnostics.nativeAppVersion}`,
    `nativeBuildVersion: ${diagnostics.nativeBuildVersion}`,
    `updatesUrl: ${diagnostics.updatesUrl}`,
    `projectId: ${diagnostics.projectId}`,
    `severity: ${diagnostics.severity}`,
    `lastUpdateAgeHours: ${
      diagnostics.lastUpdateAgeHours == null ? "unknown" : diagnostics.lastUpdateAgeHours.toFixed(1)
    }`,
    `isProbablyOutdated: ${String(diagnostics.isProbablyOutdated)}`,
    `isChannelMismatch: ${String(diagnostics.isChannelMismatch)}`,
    `isRuntimeMismatchSuspected: ${String(diagnostics.isRuntimeMismatchSuspected)}`,
    `launchSource: ${diagnostics.launchSource}`,
    `publishHint: ${diagnostics.publishHint}`,
    "",
    "issues:",
    ...(diagnostics.issues.length ? diagnostics.issues.map((issue) => `- ${issue}`) : ["- none"]),
    "",
    "actions:",
    ...(diagnostics.actions.length ? diagnostics.actions.map((action) => `- ${action}`) : ["- none"]),
  ].join("\n");
}

export function formatOtaDiagnosticsForClipboard(diagnostics: OtaDiagnostics): string {
  return buildOtaDiagnosticsText(diagnostics);
}
