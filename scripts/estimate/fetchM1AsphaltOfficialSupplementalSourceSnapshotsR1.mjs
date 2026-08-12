import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const SCHEMA = "m1-asphalt-five-p0-remediation-r1:official-source-supplemental-discovery:v1";
const argv = Object.fromEntries(process.argv.slice(2).map((argument) => {
  const [key, ...rest] = argument.replace(/^--/u, "").split("=");
  return [key, rest.join("=") || true];
}));
const outputRoot = path.resolve(String(argv["output-root"] ?? path.join(
  ".release-runtime", "master-11610-group-batches-r1", "03-m1-asphalt-five-p0-remediation-r1",
  "normative-sources",
)));
const retrievedAtUtc = String(argv["retrieved-at-utc"] ?? "");

const SOURCES = Object.freeze([
  { sourceId: "TJ_TAJIKSTANDARD_OFFICIAL_CATALOG", jurisdiction: "TJ", url: "https://www.standard.tj/ru/CatalogStandartov" },
  { sourceId: "TM_TURKMENSTANDARTLARY_OFFICIAL_INFORMATION_CENTER", jurisdiction: "TM", url: "https://tds.gov.tm/ru/69-turkmen-standartlari-bilgi-merkezi" },
  { sourceId: "EASC_OFFICIAL_INTERSTATE_STANDARDS_CATALOG", jurisdiction: "EASC", url: "https://easc.by/informatsionnye-resursy/katalogi-standartov" },
  { sourceId: "CIS_OFFICIAL_EASC_ORGAN_RECORD", jurisdiction: "CIS", url: "https://www.old.e-cis.info/page.php?id=2374" },
]);

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stripTags(value) {
  return value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, " ")
    .replace(/<[^>]+>/gu, " ")
    .replace(/&nbsp;|&#160;/giu, " ")
    .replace(/&quot;/giu, '"')
    .replace(/&amp;/giu, "&")
    .replace(/&lt;/giu, "<")
    .replace(/&gt;/giu, ">")
    .replace(/\s+/gu, " ")
    .trim();
}

function extractTitle(html) {
  return stripTags(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/iu)?.[1] ?? "");
}

async function fetchWithRetry(url) {
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await fetch(url, {
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "user-agent": "Codex-M1-Asphalt-Remediation-R1/1.0",
          accept: "text/html,application/xhtml+xml,*/*;q=0.8",
        },
      });
      return { response, attempt };
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}

function writeImmutable(relative, value) {
  const file = path.join(outputRoot, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  invariant(!existsSync(file), `IMMUTABLE_SNAPSHOT_ALREADY_EXISTS:${relative}`);
  writeFileSync(file, value);
}

invariant(retrievedAtUtc, "RETRIEVED_AT_UTC_REQUIRED");
invariant(!Number.isNaN(Date.parse(retrievedAtUtc)), "RETRIEVED_AT_UTC_INVALID");

const results = [];
for (const source of SOURCES) {
  try {
    const { response, attempt } = await fetchWithRetry(source.url);
    const buffer = Buffer.from(await response.arrayBuffer());
    const hash = sha256(buffer);
    const snapshotFile = `snapshots/${source.sourceId}.${hash.slice(0, 16)}.html`;
    writeImmutable(snapshotFile, buffer);
    results.push({
      ...source,
      retrievedAtUtc,
      attempt,
      status: response.status,
      ok: response.ok,
      finalUrl: response.url,
      contentType: response.headers.get("content-type") ?? "application/octet-stream",
      bytes: buffer.length,
      sha256: hash,
      snapshotFile,
      pageTitle: extractTitle(buffer.toString("utf8")),
      fetchVerdict: response.ok ? "SNAPSHOT_FETCHED_STATUS_REVIEW_REQUIRED" : "HTTP_ERROR_STATUS_REVIEW_REQUIRED",
    });
  } catch (error) {
    results.push({
      ...source,
      retrievedAtUtc,
      ok: false,
      errorName: error?.name ?? "Error",
      errorMessage: error?.message ?? String(error),
      errorCause: error?.cause?.message ?? null,
      fetchVerdict: "NETWORK_ERROR_NOT_SOURCE_STATUS_PROOF",
    });
  }
}

const manifest = {
  schemaVersion: SCHEMA,
  retrievedAtUtc,
  sourceCount: SOURCES.length,
  fetchedCount: results.filter((result) => result.fetchVerdict === "SNAPSHOT_FETCHED_STATUS_REVIEW_REQUIRED").length,
  failedCount: results.filter((result) => result.fetchVerdict !== "SNAPSHOT_FETCHED_STATUS_REVIEW_REQUIRED").length,
  sources: results,
  automaticAdmissionPerformed: false,
  verdict: "SUPPLEMENTAL_OFFICIAL_DISCOVERY_COMPLETE_STATUS_AND_APPLICABILITY_REVIEW_REQUIRED",
};
writeImmutable("discovery/OFFICIAL_SOURCE_SUPPLEMENTAL_DISCOVERY_FETCH.json", `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  verdict: manifest.verdict,
  sourceCount: manifest.sourceCount,
  fetchedCount: manifest.fetchedCount,
  failedCount: manifest.failedCount,
  sources: results.map(({ sourceId, status, bytes, sha256: hash, pageTitle, fetchVerdict, errorMessage }) => ({
    sourceId, status: status ?? null, bytes: bytes ?? null, sha256: hash ?? null, pageTitle: pageTitle ?? null,
    fetchVerdict, errorMessage: errorMessage ?? null,
  })),
}, null, 2)}\n`);
