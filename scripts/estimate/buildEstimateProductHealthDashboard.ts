import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { getEstimateRuntimeCatalogVersion } from "../../src/features/estimates/runtime/estimateFeatureFlags";
import {
  assertEstimateTelemetryCoverage,
  buildCanonicalPilotTelemetryEvents,
} from "../../src/features/estimates/telemetry/estimateTelemetryEvents";
import type { EstimateTelemetryEvent } from "../../src/features/estimates/telemetry/estimateTelemetryTypes";

export type EstimateProductHealthDashboard = ReturnType<typeof buildEstimateProductHealthDashboard>;

const RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-product-pilot-observability", "health-dashboard");

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function timestampForPath(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function writeJson(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function buildEstimateProductHealthDashboard(
  events: readonly EstimateTelemetryEvent[],
  options: {
    sourceSha?: string;
    generatedAt?: string;
    catalogVersion?: string;
  } = {},
) {
  const coverage = assertEstimateTelemetryCoverage(events);
  const eventCounts = events.reduce<Record<string, number>>((counts, event) => {
    counts[event.event_name] = (counts[event.event_name] ?? 0) + 1;
    return counts;
  }, {});
  const blockers = [
    coverage.required_events_covered ? "" : `telemetry_missing:${coverage.missing.join(",")}`,
    coverage.invalid.length === 0 ? "" : `telemetry_invalid:${coverage.invalid.length}`,
    eventCounts.estimate_generated > 0 ? "" : "estimate_generated_event_missing",
    eventCounts.kill_switch_triggered > 0 ? "" : "kill_switch_event_missing",
    eventCounts.fatal_fallback > 0 ? "" : "fatal_fallback_event_missing",
  ].filter(Boolean);

  return {
    final_status: blockers.length === 0
      ? "GREEN_AI_ESTIMATE_PRODUCT_HEALTH_DASHBOARD"
      : "STOP_AI_ESTIMATE_PRODUCT_HEALTH_DASHBOARD_FAILED",
    generated_at: options.generatedAt ?? new Date().toISOString(),
    source_sha: options.sourceSha ?? "unknown",
    catalog_version: options.catalogVersion ?? getEstimateRuntimeCatalogVersion(),
    telemetry_coverage: coverage,
    thresholds: {
      required_events_present: true,
      kill_switch_event_required: true,
      fatal_fallback_event_required: true,
      telemetry_events_must_be_redacted: true,
    },
    metrics: {
      event_counts: eventCounts,
      total_events: events.length,
      pilot_mode_event_count: events.filter((event) => event.context.pilot_mode_enabled).length,
      route_equivalent_not_reported_as_real_browser: true,
    },
    blockers,
  };
}

export function runProductHealthDashboardVerification() {
  const sourceSha = git(["rev-parse", "HEAD"]);
  const dashboard = buildEstimateProductHealthDashboard(buildCanonicalPilotTelemetryEvents(), { sourceSha });
  const outPath = path.join(RUNTIME_ROOT, timestampForPath(), "summary.json");
  writeJson(outPath, dashboard);
  return { dashboard, outPath };
}

if (require.main === module) {
  const { dashboard, outPath } = runProductHealthDashboardVerification();
  console.log(JSON.stringify({ ...dashboard, artifact: outPath }, null, 2));
  if (dashboard.blockers.length > 0) process.exitCode = 1;
}
