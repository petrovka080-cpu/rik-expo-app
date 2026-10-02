import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { FIRE_R5_OFFICIAL_SOURCES } from "../fireBackendR5/fireR5Sources";

type Json = Record<string, unknown>;

const CONTRACT = "rik-expo-app.s27-3.f09-fire-official-source-reuse-audit.v1";
const EXPECTED_BRANCH = "codex/r4-a5-clean-08b18902";
const HISTORICAL_ROOT = resolve(process.env.S273_F09_HISTORICAL_FIRE_NORMS_ROOT ??
  "C:/dev/rik-expo-app-batch009-fire-life-safety-r5/.release-runtime/"
  + "batch009-fire-r5/evidence/03-norms");
const OUTPUT_ROOT = resolve(".release-runtime/r568/s27-3/f09-fire-current-lineage");
const OUTPUT_PATH = resolve(process.env.S273_F09_SOURCE_AUDIT_OUTPUT_PATH
  ?? join(OUTPUT_ROOT, "03_official_source_reuse_audit.json"));
const SNAPSHOT_ROOT = join(OUTPUT_ROOT, "official-snapshots");
const DEFAULT_SELECTED_SOURCE_IDS = [
  "fire_rules_kr_2025",
  "sp_kr_21_101_2024",
  "krerm_11_2015",
] as const;
const SELECTED_SOURCE_IDS = new Set(
  String(process.env.S273_F09_SELECTED_SOURCE_IDS ?? DEFAULT_SELECTED_SOURCE_IDS.join(","))
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);
const ALLOWED_HOSTS = new Set(["minstroy.gov.kg", "cbd.minjust.gov.kg"]);

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Json)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, stable(child)]));
  }
  return value;
}

function atomicWrite(path: string, value: string | Buffer): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  writeFileSync(temporary, value);
  renameSync(temporary, path);
}

function atomicJson(path: string, value: unknown): void {
  atomicWrite(path, `${JSON.stringify(stable(value), null, 2)}\n`);
}

function git(...args: string[]): string {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 30_000,
  }).trim();
}

async function exactFetch(url: string): Promise<{
  body: Buffer;
  contentType: string;
  finalUrl: string;
  status: number;
}> {
  const parsed = new URL(url);
  invariant(parsed.protocol === "https:" && ALLOWED_HOSTS.has(parsed.hostname),
    `STOP_S273_F09_SOURCE_HOST:${url}`);
  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetch(parsed, {
        headers: { "user-agent": "RIK-S273-F09-FIRE-SOURCE-AUDIT/1.0" },
        redirect: "follow",
        signal: AbortSignal.timeout(60_000),
      });
      const final = new URL(response.url);
      invariant(final.protocol === "https:" && ALLOWED_HOSTS.has(final.hostname),
        `STOP_S273_F09_SOURCE_REDIRECT:${response.url}`);
      return {
        body: Buffer.from(await response.arrayBuffer()),
        contentType: response.headers.get("content-type") ?? "",
        finalUrl: final.href,
        status: response.status,
      };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function main(): Promise<void> {
  invariant(git("branch", "--show-current") === EXPECTED_BRANCH,
    "STOP_S273_F09_SOURCE_WRONG_BRANCH");
  const historicalRegistryPath = join(HISTORICAL_ROOT, "OFFICIAL_SOURCE_SNAPSHOTS.jsonl");
  const historicalRegistryBytes = readFileSync(historicalRegistryPath);
  const historicalRows = historicalRegistryBytes.toString("utf8").trim().split(/\r?\n/u)
    .filter(Boolean).map((line) => JSON.parse(line) as Json);
  const selectedSources = FIRE_R5_OFFICIAL_SOURCES.filter((source) =>
    SELECTED_SOURCE_IDS.has(source.sourceId));
  invariant(selectedSources.length === SELECTED_SOURCE_IDS.size,
    `STOP_S273_F09_SOURCE_SELECTION:${selectedSources.length}`);

  const results = [];
  for (const source of selectedSources) {
    const historical = historicalRows.find((row) => row.sourceId === source.sourceId);
    invariant(historical, `STOP_S273_F09_HISTORICAL_SOURCE_MISSING:${source.sourceId}`);
    const page = await exactFetch(source.officialPageUrl);
    invariant(page.status === 200 && page.body.length > 1_000,
      `STOP_S273_F09_SOURCE_PAGE:${source.sourceId}:${page.status}:${page.body.length}`);
    const pagePath = join(SNAPSHOT_ROOT, `${source.sourceId}.html`);
    atomicWrite(pagePath, page.body);

    let pdfResult: Json | null = null;
    if (source.directPdfUrl) {
      const pdf = await exactFetch(source.directPdfUrl);
      const currentPdfSha256 = sha256(pdf.body);
      invariant(pdf.status === 200 && pdf.body.subarray(0, 5).toString("ascii") === "%PDF-",
        `STOP_S273_F09_SOURCE_PDF:${source.sourceId}:${pdf.status}`);
      invariant(currentPdfSha256 === historical.pdfSha256,
        `STOP_S273_F09_SOURCE_PDF_DRIFT:${source.sourceId}:${String(historical.pdfSha256)}:${currentPdfSha256}`);
      const historicalPdfPath = join(HISTORICAL_ROOT, "official-snapshots", `${source.sourceId}.pdf`);
      invariant(sha256(readFileSync(historicalPdfPath)) === currentPdfSha256,
        `STOP_S273_F09_HISTORICAL_PDF_BYTES_DRIFT:${source.sourceId}`);
      const pdfPath = join(SNAPSHOT_ROOT, `${source.sourceId}.pdf`);
      atomicWrite(pdfPath, pdf.body);
      pdfResult = {
        bytes: pdf.body.length,
        contentType: pdf.contentType,
        finalUrl: pdf.finalUrl,
        historicalSnapshotSha256: historical.pdfSha256,
        currentSha256: currentPdfSha256,
        exactHistoricalMatch: true,
        currentSnapshotPath: pdfPath,
      };
    }

    results.push({
      sourceId: source.sourceId,
      documentCode: source.documentCode,
      role: source.role,
      declaredStatus: source.status,
      page: {
        bytes: page.body.length,
        contentType: page.contentType,
        finalUrl: page.finalUrl,
        historicalSha256: historical.pageSha256,
        currentSha256: sha256(page.body),
        exactHistoricalMatch: sha256(page.body) === historical.pageSha256,
        currentSnapshotPath: pagePath,
      },
      pdf: pdfResult,
    });
    process.stdout.write(`${source.sourceId} page=${page.status} pdf=${pdfResult ? "EXACT" : "N/A"}\n`);
  }

  const report = {
    schemaVersion: CONTRACT,
    generatedAtUtc: new Date().toISOString(),
    source: {
      branch: git("branch", "--show-current"),
      head: git("rev-parse", "HEAD"),
      historicalRegistryPath,
      historicalRegistrySha256: sha256(historicalRegistryBytes),
    },
    results,
    summary: {
      selectedSources: results.length,
      liveOfficialPagesHttp200: results.length,
      selectedPdfSources: results.filter((row) => row.pdf).length,
      exactHistoricalPdfMatches: results.filter((row) => row.pdf?.exactHistoricalMatch === true).length,
      copiedCurrentEvidenceFiles: results.length
        + results.filter((row) => row.pdf).length,
      databaseWrites: 0,
      productionAccessed: false,
    },
    decision: {
      historicalBatchReusableAsRelease: false,
      exactOfficialSourceBytesReusableForCurrentClaimReview: true,
      formulasOrCompositionAcceptedByThisAudit: false,
    },
    status: "GREEN_S27_3_F09_FIRE_OFFICIAL_SOURCE_BYTES_CURRENT",
  };
  atomicJson(OUTPUT_PATH, report);
  process.stdout.write(`${JSON.stringify(report.summary)}\n`);
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
