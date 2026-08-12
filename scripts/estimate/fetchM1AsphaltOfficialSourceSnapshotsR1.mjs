import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const SCHEMA = "m1-asphalt-five-p0-remediation-r1:official-source-discovery:v1";
const argv = Object.fromEntries(process.argv.slice(2).map((argument) => {
  const [key, ...rest] = argument.replace(/^--/u, "").split("=");
  return [key, rest.join("=") || true];
}));
const repoRoot = process.cwd();
const outputRoot = path.resolve(String(argv["output-root"] ?? path.join(
  ".release-runtime", "master-11610-group-batches-r1", "03-m1-asphalt-five-p0-remediation-r1",
  "normative-sources",
)));
const retrievedAtUtc = String(argv["retrieved-at-utc"] ?? "");

const SOURCES = Object.freeze([
  { sourceId: "KG_MINSTROY_DOCUMENT_REGISTRY_PAGE", jurisdiction: "KG", url: "https://minstroy.gov.kg/ru/document/" },
  { sourceId: "KG_MINSTROY_CONSTRUCTION_NORMS_PAGE", jurisdiction: "KG", url: "https://minstroy.gov.kg/ru/kyzmat/11" },
  { sourceId: "KG_KRER_27_CATALOG_PAGE", jurisdiction: "KG", url: "https://minstroy.gov.kg/ru/kyzmat/443/show" },
  { sourceId: "KG_KYRGYZSTANDARD_GOST_9128_2013_CATALOG_PAGE", jurisdiction: "KG", url: "https://standarts.nism.gov.kg/ru/catalog/4500-smesi-asfalytobetonnie-polimerasfalytobetonnie-asfalytobeton-polimerasfalytobeton-dlya-avtomobilynih-dorog-i-aerodromov-tehnicheskie-usloviya/show" },
  { sourceId: "EAEU_TR_TS_014_2011_OFFICIAL_PAGE", jurisdiction: "EAEU", url: "https://eec.eaeunion.org/comission/department/deptexreg/tr/bezopAutodorog.php" },
  { sourceId: "RU_ROSSTANDART_OFFICIAL_FUND", jurisdiction: "RU", url: "https://protect.gost.ru/" },
  { sourceId: "KZ_OFFICIAL_STANDARDS_ROAD_CATALOG", jurisdiction: "KZ", url: "https://new-shop.ksm.kz/egfntd/ntdgo/kad/" },
  { sourceId: "UZ_OFFICIAL_TECHNICAL_REGULATION_SYSTEM", jurisdiction: "UZ", url: "https://tris.uz/en" },
  { sourceId: "AM_OFFICIAL_NATIONAL_STANDARDS_CATALOG", jurisdiction: "AM", url: "https://www.armstandard.am/en" },
  { sourceId: "AZ_OFFICIAL_STANDARDS_INSTITUTE", jurisdiction: "AZ", url: "https://azstand.gov.az/" },
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

function extractLinks(html, baseUrl) {
  const links = [];
  const pattern = /<a\b[^>]*href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/giu;
  for (const match of html.matchAll(pattern)) {
    const rawHref = match[1] ?? match[2] ?? match[3] ?? "";
    try {
      const href = new URL(rawHref, baseUrl).href;
      links.push({ href, text: stripTags(match[4] ?? "") });
    } catch {
      // Invalid/non-URL anchors are excluded from official locator discovery.
    }
  }
  const unique = new Map();
  for (const link of links) unique.set(`${link.href}\u0000${link.text}`, link);
  return [...unique.values()].sort((left, right) => left.href.localeCompare(right.href) || left.text.localeCompare(right.text));
}

async function fetchOnce(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    return await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "user-agent": "Codex-M1-Asphalt-Remediation-R1/1.0",
        accept: "text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8",
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchWithRetry(url) {
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      return { response: await fetchOnce(url), attempt };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

function extensionFor(contentType) {
  if (contentType.includes("pdf")) return "pdf";
  if (contentType.includes("json")) return "json";
  if (contentType.includes("xml")) return "xml";
  return "html";
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
    const contentType = response.headers.get("content-type") ?? "application/octet-stream";
    const hash = sha256(buffer);
    const extension = extensionFor(contentType);
    const snapshotFile = `snapshots/${source.sourceId}.${hash.slice(0, 16)}.${extension}`;
    writeImmutable(snapshotFile, buffer);
    const text = /(?:html|text|json|xml)/iu.test(contentType) ? buffer.toString("utf8") : "";
    results.push({
      ...source,
      retrievedAtUtc,
      attempt,
      status: response.status,
      ok: response.ok,
      finalUrl: response.url,
      contentType,
      etag: response.headers.get("etag"),
      lastModified: response.headers.get("last-modified"),
      bytes: buffer.length,
      sha256: hash,
      snapshotFile,
      pageTitle: text ? extractTitle(text) : null,
      links: text ? extractLinks(text, response.url) : [],
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
  httpErrorCount: results.filter((result) => result.fetchVerdict === "HTTP_ERROR_STATUS_REVIEW_REQUIRED").length,
  networkErrorCount: results.filter((result) => result.fetchVerdict === "NETWORK_ERROR_NOT_SOURCE_STATUS_PROOF").length,
  sources: results,
  automaticAdmissionPerformed: false,
  verdict: "DISCOVERY_SNAPSHOTS_CAPTURED_MANUAL_STATUS_AND_APPLICABILITY_REVIEW_REQUIRED",
};
writeImmutable("discovery/OFFICIAL_SOURCE_DISCOVERY_FETCH.json", `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  verdict: manifest.verdict,
  sourceCount: manifest.sourceCount,
  fetchedCount: manifest.fetchedCount,
  httpErrorCount: manifest.httpErrorCount,
  networkErrorCount: manifest.networkErrorCount,
  sources: results.map((result) => ({
    sourceId: result.sourceId,
    status: result.status ?? null,
    bytes: result.bytes ?? null,
    sha256: result.sha256 ?? null,
    pageTitle: result.pageTitle ?? null,
    fetchVerdict: result.fetchVerdict,
    errorMessage: result.errorMessage ?? null,
  })),
}, null, 2)}\n`);
