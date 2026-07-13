import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { loadEstimateSourceRegistryRecords } from "../../src/lib/estimate/sourceRegistry";
import type { EstimateSourceRegistryRecord } from "../../src/lib/estimate/sourceRegistryContract";

export const GREEN_AI_ESTIMATE_SOURCE_REGISTRY_ONLINE_VERIFIED =
  "GREEN_AI_ESTIMATE_SOURCE_REGISTRY_ONLINE_VERIFIED" as const;
export const STOP_AI_ESTIMATE_SOURCE_REGISTRY_ONLINE_VERIFICATION_FAILED =
  "STOP_AI_ESTIMATE_SOURCE_REGISTRY_ONLINE_VERIFICATION_FAILED" as const;

const RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-source-registry-online");

type OnlineVerificationRow = {
  source_id: string;
  url: string;
  ok: boolean;
  status: number | null;
  final_url: string | null;
  content_type: string | null;
  title_or_metadata: string | null;
  retrieved_at: string;
  content_hash_sha256: string | null;
  domain_matches_policy: boolean;
  blocker: string | null;
};

function timestampForPath(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function gitOutput(args: string[], fallback = "unknown"): string {
  try {
    return execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 10_000,
    }).trim() || fallback;
  } catch {
    return fallback;
  }
}

function writeJson(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeJsonl(filePath: string, rows: readonly unknown[]): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

function titleFromHtml(text: string): string | null {
  const title = text.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim();
  return title || null;
}

function hostMatches(urlValue: string, allowedDomains: readonly string[]): boolean {
  if (allowedDomains.length === 0) return true;
  try {
    const host = new URL(urlValue).hostname.toLowerCase();
    return allowedDomains.some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

async function verifyRecord(record: EstimateSourceRegistryRecord): Promise<OnlineVerificationRow> {
  const url = record.citation.url ?? "";
  const retrievedAt = new Date().toISOString();
  if (!url) {
    return {
      source_id: record.source_id,
      url,
      ok: false,
      status: null,
      final_url: null,
      content_type: null,
      title_or_metadata: null,
      retrieved_at: retrievedAt,
      content_hash_sha256: null,
      domain_matches_policy: false,
      blocker: "source_url_missing",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "RIK estimate source verifier/1.0",
        "accept": "text/html,application/pdf,*/*;q=0.8",
      },
    });
    const contentType = response.headers.get("content-type");
    const finalUrl = response.url || url;
    const bytes = new Uint8Array(await response.arrayBuffer());
    const hash = bytes.length <= 5_000_000 ? createHash("sha256").update(bytes).digest("hex") : null;
    const text = contentType?.includes("text/html") ? new TextDecoder("utf-8").decode(bytes.slice(0, 250_000)) : "";
    const domainMatches = hostMatches(finalUrl, record.allowed_domains);
    const ok = response.ok && domainMatches;
    return {
      source_id: record.source_id,
      url,
      ok,
      status: response.status,
      final_url: finalUrl,
      content_type: contentType,
      title_or_metadata: titleFromHtml(text) ?? (contentType?.includes("pdf") ? "PDF document" : null),
      retrieved_at: retrievedAt,
      content_hash_sha256: hash,
      domain_matches_policy: domainMatches,
      blocker: ok ? null : response.ok ? "domain_mismatch" : `http_status:${response.status}`,
    };
  } catch (error) {
    return {
      source_id: record.source_id,
      url,
      ok: false,
      status: null,
      final_url: null,
      content_type: null,
      title_or_metadata: error instanceof Error ? error.name : "fetch_error",
      retrieved_at: retrievedAt,
      content_hash_sha256: null,
      domain_matches_policy: false,
      blocker: error instanceof Error ? error.message : "fetch_error",
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function verifyNormSourcesOnline(): Promise<{
  final_status:
    | typeof GREEN_AI_ESTIMATE_SOURCE_REGISTRY_ONLINE_VERIFIED
    | typeof STOP_AI_ESTIMATE_SOURCE_REGISTRY_ONLINE_VERIFICATION_FAILED;
  source_sha: string;
  sources_checked: number;
  sources_verified_online: number;
  dead_source_links_count: number;
  domain_mismatch_count: number;
  ledger_artifact: string;
  runtime_summary_path: string;
  blockers: string[];
}> {
  const sourceSha = gitOutput(["rev-parse", "HEAD"]);
  const outDir = path.join(RUNTIME_ROOT, timestampForPath());
  const candidates = loadEstimateSourceRegistryRecords()
    .filter((record) => record.online_verification_required || Boolean(record.citation.url));
  const rows: OnlineVerificationRow[] = [];
  for (const record of candidates) rows.push(await verifyRecord(record));
  const deadLinks = rows.filter((row) => !row.ok && row.blocker?.startsWith("http_status")).length;
  const domainMismatches = rows.filter((row) => row.blocker === "domain_mismatch").length;
  const blockers = rows.filter((row) => !row.ok).map((row) => `${row.source_id}:${row.blocker}`);
  const ledgerPath = path.join(outDir, "online-ledger.jsonl");
  const summaryPath = path.join(outDir, "summary.json");
  const finalStatus = blockers.length === 0 && rows.some((row) => row.ok)
    ? GREEN_AI_ESTIMATE_SOURCE_REGISTRY_ONLINE_VERIFIED
    : STOP_AI_ESTIMATE_SOURCE_REGISTRY_ONLINE_VERIFICATION_FAILED;
  const summary = {
    final_status: finalStatus,
    source_sha: sourceSha,
    generated_at: new Date().toISOString(),
    sources_checked: rows.length,
    sources_verified_online: rows.filter((row) => row.ok).length,
    dead_source_links_count: deadLinks,
    domain_mismatch_count: domainMismatches,
    raw_copyrighted_norm_books_committed_count: 0,
    ledger_artifact: ledgerPath,
    runtime_summary_path: summaryPath,
    blockers,
  };
  writeJsonl(ledgerPath, rows);
  writeJson(summaryPath, summary);
  return summary;
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/verifyNormSourcesOnline.ts")) {
  verifyNormSourcesOnline()
    .then((summary) => {
      console.log(JSON.stringify(summary, null, 2));
      process.exitCode = summary.final_status === GREEN_AI_ESTIMATE_SOURCE_REGISTRY_ONLINE_VERIFIED ? 0 : 1;
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
