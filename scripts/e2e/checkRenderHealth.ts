import path from "node:path";

import {
  RENDER_ACCEPTANCE_ROOT,
  STOP_AI_ESTIMATE_RENDER_STAGING_PRODUCTION_GRADE_ACCEPTANCE_FAILED_NO_GREEN,
  argValue,
  currentBranch,
  currentSourceSha,
  currentUpstreamSync,
  hasFlag,
  resolveRequiredRenderBaseUrl,
  writeRuntimeJson,
} from "./renderStagingAcceptanceCore";

export const GREEN_AI_ESTIMATE_RENDER_STAGING_HEALTH_READY =
  "GREEN_AI_ESTIMATE_RENDER_STAGING_HEALTH_READY" as const;

type FetchProbe = {
  path: string;
  url: string;
  status: number | null;
  ok: boolean;
  response_time_ms: number;
  content_type: string | null;
  redirect_count: number;
  redirect_loop_detected: boolean;
  auth_wall_detected: boolean;
  app_shell_detected: boolean;
  error: string | null;
  body_sample: string;
};

export type RenderHealthSummary = {
  final_status:
    | typeof GREEN_AI_ESTIMATE_RENDER_STAGING_HEALTH_READY
    | typeof STOP_AI_ESTIMATE_RENDER_STAGING_PRODUCTION_GRADE_ACCEPTANCE_FAILED_NO_GREEN;
  source_sha: string;
  branch: string;
  upstream_sync: string;
  generated_at: string;
  render_url: string | null;
  render_config_detected: boolean;
  render_url_detected: boolean;
  render_health_check_created: true;
  render_home_status_ok: boolean;
  render_request_status_ok: boolean;
  render_redirect_loop_absent: boolean;
  render_auth_wall_absent_or_expected: boolean;
  render_response_time_recorded: boolean;
  render_version_endpoint_exists: boolean;
  render_source_sha_detected: boolean;
  render_source_sha_matches_head: boolean;
  render_branch_matches: boolean;
  render_catalog_version_matches: boolean;
  render_runtime_is_render: boolean;
  version_endpoint_path: string | null;
  version_payload: Record<string, unknown> | null;
  probes: FetchProbe[];
  blockers: string[];
};

function compactError(error: unknown): string {
  return error instanceof Error ? error.message.replace(/\s+/g, " ").slice(0, 240) : String(error).slice(0, 240);
}

function hasAppShell(text: string): boolean {
  return /<html|<div id=["']root["']|expo|react|consumer-repair|request/i.test(text);
}

function authWallDetected(status: number | null, text: string): boolean {
  return status === 401 || status === 403 || /sign in|login required|unauthorized|forbidden/i.test(text);
}

async function fetchProbe(baseUrl: string, probePath: string, required: boolean): Promise<FetchProbe> {
  const started = Date.now();
  const url = `${baseUrl}${probePath}`;
  let currentUrl = url;
  let redirectCount = 0;
  try {
    for (;;) {
      const response = await fetch(currentUrl, { redirect: "manual" });
      const status = response.status;
      const location = response.headers.get("location");
      if (status >= 300 && status < 400 && location) {
        redirectCount += 1;
        if (redirectCount > 8) {
          return {
            path: probePath,
            url,
            status,
            ok: false,
            response_time_ms: Date.now() - started,
            content_type: response.headers.get("content-type"),
            redirect_count: redirectCount,
            redirect_loop_detected: true,
            auth_wall_detected: false,
            app_shell_detected: false,
            error: "redirect_loop_detected",
            body_sample: "",
          };
        }
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }
      const text = await response.text().catch(() => "");
      const contentType = response.headers.get("content-type");
      return {
        path: probePath,
        url,
        status,
        ok: required ? response.ok : response.ok || status === 404,
        response_time_ms: Date.now() - started,
        content_type: contentType,
        redirect_count: redirectCount,
        redirect_loop_detected: false,
        auth_wall_detected: authWallDetected(status, text),
        app_shell_detected: hasAppShell(text),
        error: response.ok || (!required && status === 404) ? null : `HTTP_${status}`,
        body_sample: text.slice(0, 500),
      };
    }
  } catch (error) {
    return {
      path: probePath,
      url,
      status: null,
      ok: false,
      response_time_ms: Date.now() - started,
      content_type: null,
      redirect_count: redirectCount,
      redirect_loop_detected: false,
      auth_wall_detected: false,
      app_shell_detected: false,
      error: compactError(error),
      body_sample: "",
    };
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

async function readVersionPayload(baseUrl: string): Promise<{ path: string | null; payload: Record<string, unknown> | null }> {
  for (const probePath of ["/api/version", "/__version"]) {
    try {
      const response = await fetch(`${baseUrl}${probePath}`);
      if (!response.ok) continue;
      const payload = asRecord(await response.json().catch(() => null));
      if (payload) return { path: probePath, payload };
    } catch {
      // Try the next optional endpoint.
    }
  }
  return { path: null, payload: null };
}

export async function checkRenderHealth(options: {
  url?: string | null;
  writeSummary?: boolean;
} = {}) {
  const sourceSha = currentSourceSha();
  const branch = currentBranch();
  const { baseUrl, blockers: configBlockers } = resolveRequiredRenderBaseUrl({ explicit: options.url });
  if (!baseUrl) {
    const summary: RenderHealthSummary = {
      final_status: STOP_AI_ESTIMATE_RENDER_STAGING_PRODUCTION_GRADE_ACCEPTANCE_FAILED_NO_GREEN,
      source_sha: sourceSha,
      branch,
      upstream_sync: currentUpstreamSync(),
      generated_at: new Date().toISOString(),
      render_url: null,
      render_config_detected: false,
      render_url_detected: false,
      render_health_check_created: true,
      render_home_status_ok: false,
      render_request_status_ok: false,
      render_redirect_loop_absent: false,
      render_auth_wall_absent_or_expected: false,
      render_response_time_recorded: false,
      render_version_endpoint_exists: false,
      render_source_sha_detected: false,
      render_source_sha_matches_head: false,
      render_branch_matches: false,
      render_catalog_version_matches: false,
      render_runtime_is_render: false,
      version_endpoint_path: null,
      version_payload: null,
      probes: [],
      blockers: configBlockers,
    };
    return options.writeSummary === false
      ? { artifactPath: path.join(RENDER_ACCEPTANCE_ROOT, "health", "not-written", "summary.json"), artifact: summary }
      : writeRuntimeJson(path.join(RENDER_ACCEPTANCE_ROOT, "health"), summary);
  }

  const probes = [
    await fetchProbe(baseUrl, "/", true),
    await fetchProbe(baseUrl, "/request", true),
    await fetchProbe(baseUrl, "/health", false),
    await fetchProbe(baseUrl, "/api/health", false),
    await fetchProbe(baseUrl, "/__version", false),
    await fetchProbe(baseUrl, "/api/version", false),
  ];
  const version = await readVersionPayload(baseUrl);
  const versionSourceSha = String(version.payload?.source_sha ?? version.payload?.commit ?? "");
  const versionBranch = String(version.payload?.branch ?? "");
  const catalogVersion = String(version.payload?.catalog_version ?? "");
  const runtime = String(version.payload?.runtime ?? "");
  const home = probes.find((probe) => probe.path === "/");
  const request = probes.find((probe) => probe.path === "/request");
  const blockers = [
    ...configBlockers,
    home?.ok === true ? "" : "render_home_not_ok",
    request?.ok === true ? "" : "render_request_not_ok",
    probes.every((probe) => !probe.redirect_loop_detected) ? "" : "render_redirect_loop_detected",
    request && !request.auth_wall_detected ? "" : "render_request_auth_wall_detected",
    probes.some((probe) => probe.response_time_ms > 0) ? "" : "render_response_time_missing",
    version.payload ? "" : "render_version_endpoint_missing",
    versionSourceSha ? "" : "render_source_sha_missing",
    versionSourceSha === sourceSha ? "" : "render_source_sha_mismatch",
    versionBranch === branch ? "" : "render_branch_mismatch",
    catalogVersion === "catalog:11610" ? "" : "render_catalog_version_mismatch",
    runtime === "render" ? "" : "render_runtime_not_render",
  ].filter(Boolean);
  const summary: RenderHealthSummary = {
    final_status: blockers.length === 0
      ? GREEN_AI_ESTIMATE_RENDER_STAGING_HEALTH_READY
      : STOP_AI_ESTIMATE_RENDER_STAGING_PRODUCTION_GRADE_ACCEPTANCE_FAILED_NO_GREEN,
    source_sha: sourceSha,
    branch,
    upstream_sync: currentUpstreamSync(),
    generated_at: new Date().toISOString(),
    render_url: baseUrl,
    render_config_detected: true,
    render_url_detected: true,
    render_health_check_created: true,
    render_home_status_ok: home?.ok === true,
    render_request_status_ok: request?.ok === true,
    render_redirect_loop_absent: probes.every((probe) => !probe.redirect_loop_detected),
    render_auth_wall_absent_or_expected: request ? !request.auth_wall_detected : false,
    render_response_time_recorded: probes.some((probe) => probe.response_time_ms > 0),
    render_version_endpoint_exists: version.payload != null,
    render_source_sha_detected: versionSourceSha.length > 0,
    render_source_sha_matches_head: versionSourceSha === sourceSha,
    render_branch_matches: versionBranch === branch,
    render_catalog_version_matches: catalogVersion === "catalog:11610",
    render_runtime_is_render: runtime === "render",
    version_endpoint_path: version.path,
    version_payload: version.payload,
    probes,
    blockers,
  };
  return options.writeSummary === false
    ? { artifactPath: path.join(RENDER_ACCEPTANCE_ROOT, "health", "not-written", "summary.json"), artifact: summary }
    : writeRuntimeJson(path.join(RENDER_ACCEPTANCE_ROOT, "health"), summary);
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/e2e/checkRenderHealth.ts")) {
  void checkRenderHealth({
    url: argValue("url"),
    writeSummary: !hasFlag("no-write-summary") || hasFlag("write-summary"),
  })
    .then((result) => {
      console.log(JSON.stringify({
        final_status: result.artifact.final_status,
        render_url_detected: result.artifact.render_url_detected,
        render_request_status_ok: result.artifact.render_request_status_ok,
        render_source_sha_matches_head: result.artifact.render_source_sha_matches_head,
        blockers: result.artifact.blockers.slice(0, 20),
        artifact: result.artifactPath,
      }, null, 2));
      if (result.artifact.blockers.length > 0) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
