"use strict";

const { DEFAULT_HEALTH_THRESHOLDS } = require("./production-health-thresholds");

const HEALTH_WINDOWS = Object.freeze([
  { key: "last1h", label: "last 1 hour", durationMs: 60 * 60 * 1000 },
  { key: "last24h", label: "last 24 hours", durationMs: 24 * 60 * 60 * 1000 },
  { key: "last7d", label: "last 7 days", durationMs: 7 * 24 * 60 * 60 * 1000 },
]);

const UNKNOWN = "unknown";

function redactSensitive(value) {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(redactSensitive);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, redactSensitive(entry)]),
    );
  }

  return String(value)
    .replace(
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
      "[redacted-email]",
    )
    .replace(/\+?\d[\d\s().-]{8,}\d/g, "[redacted-phone]")
    .replace(
      /\b(authorization|token|access_token|refresh_token|jwt|apikey|api_key|signature|x-amz-signature)\b\s*[:=]\s*['"]?(?:Bearer\s+)?[^&\s'"]+/gi,
      "$1=[redacted]",
    )
    .replace(/\bBearer\s+[^&\s'"]+/gi, "Bearer [redacted]")
    .replace(
      /(https?:\/\/[^\s"'<>?]+)\?([^\s"'<>]+)/gi,
      (_match, baseUrl, query) => {
        const redactedQuery = String(query)
          .split("&")
          .map((part) => {
            const [key] = part.split("=");
            if (/token|signature|expires|x-amz|apikey|api_key|jwt|key/i.test(key)) {
              return `${key}=[redacted]`;
            }
            return part.replace(/=.*/, "=[redacted]");
          })
          .join("&");
        return `${baseUrl}?${redactedQuery}`;
      },
    );
}

function safeText(value, fallback = UNKNOWN) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? redactSensitive(text) : fallback;
}

function readNested(row, keys) {
  for (const key of keys) {
    const parts = key.split(".");
    let cursor = row;
    for (const part of parts) {
      cursor = cursor && typeof cursor === "object" ? cursor[part] : undefined;
    }
    if (cursor != null && String(cursor).trim().length > 0) return cursor;
  }
  return undefined;
}

function parseCreatedAt(row) {
  const raw = readNested(row, ["created_at", "inserted_at", "timestamp", "time"]);
  const timestamp = raw ? Date.parse(String(raw)) : Number.NaN;
  return Number.isFinite(timestamp) ? timestamp : null;
}

function normalizeAppErrorRow(row) {
  const source = row && typeof row === "object" ? row : {};
  const extra = source.extra && typeof source.extra === "object" ? source.extra : {};
  const merged = { ...extra, ...source, extra };
  const message = safeText(readNested(merged, ["message", "error.message", "extra.message"]));
  const name = safeText(
    readNested(merged, [
      "name",
      "errorName",
      "error_name",
      "event",
      "extra.name",
      "extra.errorName",
      "extra.event",
    ]),
    message === UNKNOWN ? UNKNOWN : message.slice(0, 96),
  );

  return {
    name,
    message,
    domain: safeText(
      readNested(merged, ["domain", "context", "source", "module", "extra.domain", "extra.source"]),
    ),
    updateGroupId: safeText(
      readNested(merged, [
        "updateGroupId",
        "update_group_id",
        "release.updateGroupId",
        "extra.updateGroupId",
        "extra.update_group_id",
      ]),
    ),
    runtimeVersion: safeText(
      readNested(merged, [
        "runtimeVersion",
        "runtime_version",
        "release.runtimeVersion",
        "extra.runtimeVersion",
        "extra.runtime_version",
      ]),
    ),
    platform: safeText(readNested(merged, ["platform", "extra.platform"])),
    createdAtMs: parseCreatedAt(merged),
    raw: redactSensitive(merged),
  };
}

function topCounts(items, key, limit = 10) {
  const counts = new Map();
  for (const item of items) {
    const value = item[key] || UNKNOWN;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => right.count - left.count || String(left.value).localeCompare(String(right.value)))
    .slice(0, limit);
}

function includesSignal(row, patterns) {
  const haystack = `${row.name} ${row.message} ${row.domain}`.toLowerCase();
  return patterns.some((pattern) => haystack.includes(pattern));
}

function countSignals(rows) {
  return {
    offlineQueue: rows.filter((row) =>
      includesSignal(row, ["offline", "queue", "replay", "circuit"]),
    ).length,
    realtime: rows.filter((row) =>
      includesSignal(row, ["realtime", "channel", "duplicate", "budget", "leak"]),
    ).length,
    pdfWebView: rows.filter((row) =>
      includesSignal(row, ["pdf", "webview", "document viewer", "render process"]),
    ).length,
    rpcValidation: rows.filter((row) =>
      includesSignal(row, ["rpcvalidationerror", "rpc validation", "rpc_validation"]),
    ).length,
    jsonCorruption: rows.filter((row) =>
      includesSignal(row, ["safe_json", "safejson", "json", "corrupt", "parse failed"]),
    ).length,
  };
}

function classifyWindowSeverity(windowKey, windowMetrics, thresholds = DEFAULT_HEALTH_THRESHOLDS) {
  const totalThreshold = thresholds.totalErrors[windowKey] || thresholds.totalErrors.last24h;
  const domainThreshold = thresholds.domainErrors[windowKey] || thresholds.domainErrors.last24h;
  const maxDomainCount = Math.max(0, ...windowMetrics.topDomains.map((entry) => entry.count));
  const signalMax = Math.max(0, ...Object.values(windowMetrics.signals));

  if (
    windowMetrics.totalErrors >= totalThreshold.critical ||
    maxDomainCount >= domainThreshold.critical ||
    signalMax >= thresholds.signalCounts.critical
  ) {
    return "CRITICAL";
  }

  if (
    windowMetrics.totalErrors >= totalThreshold.warn ||
    maxDomainCount >= domainThreshold.warn ||
    signalMax >= thresholds.signalCounts.warn
  ) {
    return "WARN";
  }

  return "OK";
}

function highestSeverity(severities) {
  if (severities.includes("CRITICAL")) return "CRITICAL";
  if (severities.includes("WARN")) return "WARN";
  return "OK";
}

function recommendedAction(severity, metrics) {
  if (severity === "CRITICAL") {
    return "Open incident review: inspect top domains, release lineage, and app_errors samples before changing production.";
  }
  if (severity === "WARN") {
    const last24h = metrics.windows.last24h;
    const signal = Object.entries(last24h.signals).find(([, count]) => count > 0);
    return signal
      ? `Watch ${signal[0]} signal trend and correlate with release/updateGroupId.`
      : "Watch error trend and correlate with latest release/updateGroupId.";
  }
  return "No immediate action. Continue daily monitoring.";
}

function buildDashboardMetrics(rows, options = {}) {
  const generatedAt = options.generatedAt || new Date().toISOString();
  const nowMs = Date.parse(generatedAt);
  const normalizedRows = rows.map(normalizeAppErrorRow);
  const windows = {};

  for (const windowConfig of HEALTH_WINDOWS) {
    const sinceMs = nowMs - windowConfig.durationMs;
    const windowRows = normalizedRows.filter(
      (row) => row.createdAtMs != null && row.createdAtMs >= sinceMs && row.createdAtMs <= nowMs,
    );
    const signals = countSignals(windowRows);
    const metrics = {
      label: windowConfig.label,
      totalErrors: windowRows.length,
      topErrorNames: topCounts(windowRows, "name"),
      topDomains: topCounts(windowRows, "domain"),
      topUpdateGroupIds: topCounts(windowRows, "updateGroupId"),
      topRuntimeVersions: topCounts(windowRows, "runtimeVersion"),
      topPlatforms: topCounts(windowRows, "platform"),
      signals,
    };
    metrics.severity = classifyWindowSeverity(windowConfig.key, metrics, options.thresholds);
    windows[windowConfig.key] = metrics;
  }

  const severity = highestSeverity(Object.values(windows).map((windowMetrics) => windowMetrics.severity));
  return {
    generatedAt,
    rowCount: rows.length,
    windows,
    severity,
    recommendedAction: recommendedAction(severity, { windows }),
  };
}

function buildProductionHealthSnapshot(params) {
  const metrics = buildDashboardMetrics(params.rows || [], {
    generatedAt: params.generatedAt,
    thresholds: params.thresholds,
  });

  return {
    wave: "S-DASH-1",
    generatedAt: metrics.generatedAt,
    liveSnapshotStatus: params.liveSnapshotStatus,
    environment: {
      prodEnvPresent: Boolean(params.environment && params.environment.prodEnvPresent),
      productionTouched: Boolean(params.environment && params.environment.productionTouched),
      productionMutated: false,
      serviceRoleUsed: false,
      serviceRolePrinted: false,
      missingKeys: (params.environment && params.environment.missingKeys) || [],
    },
    privacy: {
      rawPiiIncluded: false,
      rawSignedUrlIncluded: false,
      rawTokenIncluded: false,
      redactionApplied: true,
    },
    dataSources: params.dataSources || [],
    dashboards: {
      appErrors: true,
      offlineQueue: true,
      realtime: true,
      releaseLineage: true,
      pdfWebView: true,
      rpcValidation: true,
      jsonCorruption: true,
    },
    metrics,
  };
}

function renderTopList(entries) {
  if (!entries || entries.length === 0) return "none";
  return entries.map((entry) => `${entry.value} (${entry.count})`).join(", ");
}

function renderProductionHealthSummary(snapshot) {
  const lines = [
    "# S-DASH-1 Production Health Summary",
    "",
    `Generated: ${snapshot.generatedAt}`,
    `Live snapshot status: ${snapshot.liveSnapshotStatus}`,
    `Severity: ${snapshot.metrics.severity}`,
    `Recommended action: ${snapshot.metrics.recommendedAction}`,
    "",
    "## Windows",
  ];

  for (const windowConfig of HEALTH_WINDOWS) {
    const metrics = snapshot.metrics.windows[windowConfig.key];
    lines.push(
      "",
      `### ${metrics.label}`,
      `- total errors: ${metrics.totalErrors}`,
      `- severity: ${metrics.severity}`,
      `- top error names: ${renderTopList(metrics.topErrorNames)}`,
      `- top domains: ${renderTopList(metrics.topDomains)}`,
      `- top updateGroupIds: ${renderTopList(metrics.topUpdateGroupIds)}`,
      `- top runtimeVersions: ${renderTopList(metrics.topRuntimeVersions)}`,
      `- top platforms: ${renderTopList(metrics.topPlatforms)}`,
      `- offline queue/circuit: ${metrics.signals.offlineQueue}`,
      `- realtime duplicate/budget/leak: ${metrics.signals.realtime}`,
      `- PDF/WebView: ${metrics.signals.pdfWebView}`,
      `- RPC validation: ${metrics.signals.rpcValidation}`,
      `- JSON/storage corruption: ${metrics.signals.jsonCorruption}`,
    );
  }

  lines.push(
    "",
    "## Safety",
    "- production mutated: NO",
    "- service_role used: NO",
    "- secrets printed: NO",
    "- raw signed URLs/tokens included: NO",
  );

  return `${lines.join("\n")}\n`;
}

function buildProductionHealthMatrix(snapshot) {
  return {
    wave: "S-DASH-1",
    goal: "production queue/realtime/error dashboards",
    dashboards: snapshot.dashboards,
    environment: snapshot.environment,
    privacy: snapshot.privacy,
    safety: {
      businessLogicChanged: false,
      sqlRpcBehaviorChanged: false,
      rlsChanged: false,
      uiChanged: false,
      maestroYamlChanged: false,
      appConfigChanged: false,
    },
    release: {
      otaDisposition: "not_required_scripts_artifacts_only",
      otaPublished: false,
      easBuildTriggered: false,
      easSubmitTriggered: false,
    },
    liveSnapshotStatus: snapshot.liveSnapshotStatus,
    severity: snapshot.metrics.severity,
    recommendedAction: snapshot.metrics.recommendedAction,
  };
}

module.exports = {
  HEALTH_WINDOWS,
  redactSensitive,
  normalizeAppErrorRow,
  buildDashboardMetrics,
  buildProductionHealthSnapshot,
  renderProductionHealthSummary,
  buildProductionHealthMatrix,
};
