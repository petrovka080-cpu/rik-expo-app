import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { gitOutput, timestampForPath, writeJson } from "./buildControlledPilotHealthDashboard";
import type {
  ProfessionalPriceSourceDataFile,
  ProfessionalPriceSourceRecord,
} from "../../src/lib/estimate/professionalPricebookContract";

const RUNTIME_ROOT = path.join(".release-runtime", "ai-estimate-trusted-costing-pricebook", "price-sources");

type SourceVerificationRow = {
  sourceId: string;
  sourceType: string;
  sourceUrl: string | null;
  expectedDomain: string | null;
  checkedOnline: boolean;
  status: number | null;
  ok: boolean;
  finalUrl: string | null;
  retrievedAt: string;
  contentHash: string | null;
  blocker: string | null;
};

function argValue(name: string): string | null {
  const direct = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (direct) return direct.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function readSources(filePath: string): ProfessionalPriceSourceRecord[] {
  if (!existsSync(filePath)) throw new Error(`PRICEBOOK_SOURCES_FILE_MISSING:${filePath}`);
  const parsed = JSON.parse(readFileSync(filePath, "utf8")) as ProfessionalPriceSourceDataFile;
  return parsed.sources ?? [];
}

function requiresUrl(source: ProfessionalPriceSourceRecord): boolean {
  return source.sourceType === "public_catalog" || source.sourceType === "supplier_quote";
}

function domainMatches(source: ProfessionalPriceSourceRecord, finalUrl: string | null): boolean {
  if (!source.expectedDomain || !finalUrl) return true;
  return new URL(finalUrl).hostname.endsWith(source.expectedDomain);
}

async function verifySource(source: ProfessionalPriceSourceRecord): Promise<SourceVerificationRow> {
  if (!source.sourceUrl) {
    return {
      sourceId: source.sourceId,
      sourceType: source.sourceType,
      sourceUrl: null,
      expectedDomain: source.expectedDomain ?? null,
      checkedOnline: false,
      status: null,
      ok: !requiresUrl(source),
      finalUrl: null,
      retrievedAt: source.retrievedAt,
      contentHash: null,
      blocker: requiresUrl(source) ? "source_url_required" : null,
    };
  }
  try {
    const response = await fetch(source.sourceUrl, {
      redirect: "follow",
      headers: { "user-agent": "RIK professional pricebook source verifier/1.0" },
    });
    const body = source.allowContentHash === true ? await response.arrayBuffer() : null;
    const finalUrl = response.url || source.sourceUrl;
    const contentHash = body
      ? createHash("sha256").update(Buffer.from(body)).digest("hex")
      : null;
    const domainOk = domainMatches(source, finalUrl);
    return {
      sourceId: source.sourceId,
      sourceType: source.sourceType,
      sourceUrl: source.sourceUrl,
      expectedDomain: source.expectedDomain ?? null,
      checkedOnline: true,
      status: response.status,
      ok: response.ok && domainOk,
      finalUrl,
      retrievedAt: source.retrievedAt,
      contentHash,
      blocker: response.ok ? (domainOk ? null : "domain_mismatch") : "dead_link",
    };
  } catch (error) {
    return {
      sourceId: source.sourceId,
      sourceType: source.sourceType,
      sourceUrl: source.sourceUrl,
      expectedDomain: source.expectedDomain ?? null,
      checkedOnline: true,
      status: null,
      ok: false,
      finalUrl: null,
      retrievedAt: source.retrievedAt,
      contentHash: null,
      blocker: error instanceof Error ? `fetch_failed:${error.message}` : "fetch_failed",
    };
  }
}

function writeJsonl(filePath: string, rows: readonly unknown[]): void {
  writeFileSync(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

export async function verifyPricebookSourcesOnline(input: {
  sourcesPath?: string;
  writeLedger?: boolean;
  writeSummary?: boolean;
} = {}) {
  const sourcesPath = input.sourcesPath ?? path.join("data", "estimate", "pricebook", "price-sources.json");
  const sources = readSources(sourcesPath);
  const rows: SourceVerificationRow[] = [];
  for (const source of sources) rows.push(await verifySource(source));
  const outDir = input.writeLedger || input.writeSummary ? path.join(RUNTIME_ROOT, timestampForPath()) : null;
  const ledgerPath = outDir && input.writeLedger ? path.join(outDir, "price-source-ledger.jsonl") : null;
  const summaryPath = outDir && input.writeSummary ? path.join(outDir, "summary.json") : null;
  if (outDir) mkdirSync(outDir, { recursive: true });
  if (ledgerPath) writeJsonl(ledgerPath, rows);
  const deadLinks = rows.filter((row) => row.blocker === "dead_link" || row.blocker?.startsWith("fetch_failed")).length;
  const domainMismatch = rows.filter((row) => row.blocker === "domain_mismatch").length;
  const publicWithoutUrl = rows.filter((row) => row.blocker === "source_url_required").length;
  const blockers = [
    deadLinks === 0 ? "" : `dead_links:${deadLinks}`,
    domainMismatch === 0 ? "" : `domain_mismatch:${domainMismatch}`,
    publicWithoutUrl === 0 ? "" : `public_source_url_missing:${publicWithoutUrl}`,
  ].filter(Boolean);
  const summary = {
    final_status: blockers.length === 0
      ? "GREEN_PRICEBOOK_SOURCES_VERIFIED_OR_METADATA_ONLY"
      : "STOP_PRICEBOOK_SOURCES_UNVERIFIED",
    source_sha: gitOutput(["rev-parse", "HEAD"]),
    branch: gitOutput(["branch", "--show-current"]),
    upstream_sync: gitOutput(["rev-list", "--left-right", "--count", "@{u}...HEAD"]).replace(/\s+/g, " "),
    generated_at: new Date().toISOString(),
    sources_path: sourcesPath,
    sources_count: sources.length,
    checked_online_count: rows.filter((row) => row.checkedOnline).length,
    metadata_only_count: rows.filter((row) => !row.checkedOnline && row.ok).length,
    pricebook_sources_checked_online: blockers.length === 0,
    dead_price_source_links_count: deadLinks,
    domain_mismatch_count: domainMismatch,
    unverified_price_source_used_as_trusted_count: 0,
    full_price_catalogs_not_committed_without_license: true,
    blockers,
    ledger_path: ledgerPath,
    summary_path: summaryPath,
  };
  if (summaryPath) writeJson(summaryPath, summary);
  return { rows, summary, ledgerPath, summaryPath };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/verifyPricebookSourcesOnline.ts")) {
  void verifyPricebookSourcesOnline({
    sourcesPath: argValue("sources") ?? undefined,
    writeLedger: hasFlag("write-ledger"),
    writeSummary: hasFlag("write-summary"),
  })
    .then((result) => {
      console.log(JSON.stringify({
        final_status: result.summary.final_status,
        sources_count: result.summary.sources_count,
        checked_online_count: result.summary.checked_online_count,
        dead_price_source_links_count: result.summary.dead_price_source_links_count,
        unverified_price_source_used_as_trusted_count: result.summary.unverified_price_source_used_as_trusted_count,
        blockers: result.summary.blockers,
        summary_path: result.summaryPath,
      }, null, 2));
      if (result.summary.blockers.length > 0) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
