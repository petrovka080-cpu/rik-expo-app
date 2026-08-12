import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const SCHEMA = "m1-asphalt-c2-official-contradiction-scan-r1:v1";
const argv = Object.fromEntries(process.argv.slice(2).map((argument) => {
  const [key, ...rest] = argument.replace(/^--/u, "").split("=");
  return [key, rest.join("=") || true];
}));
const repoRoot = process.cwd();
const outputRoot = path.resolve(String(argv["output-root"] ?? path.join(
  ".release-runtime", "master-11610-group-batches-r1", "03-m1-asphalt-five-p0-remediation-r1", "delta-c2",
)));
const retrievedAtUtc = String(argv["retrieved-at-utc"] ?? "");
const supplementalManifestPath = path.join(outputRoot, "C2_SUPPLEMENTAL_OFFICIAL_SOURCE_FETCH_MANIFEST.json");
const sourceManifestPath = path.join(outputRoot, "C2_AUTONOMOUS_SOURCE_FETCH_MANIFEST.json");

const CBD_QUERIES = Object.freeze([
  { queryId: "CBD_RU_NUMBER_SNIP", language: "Russian", params: { Number: "3.06.03-85" } },
  { queryId: "CBD_RU_NAME_SNIP", language: "Russian", params: { Name: "СНиП 3.06.03-85" } },
  { queryId: "CBD_RU_TEXT_SNIP_2018_CURRENT", language: "Russian", params: { EditionText: "СНиП 3.06.03-85", "DateAdopted.From": "2018-01-01", "DateAdopted.To": "2026-08-12" } },
  { queryId: "CBD_RU_TEXT_SHORT_SNIP_2018_CURRENT", language: "Russian", params: { EditionText: "3.06.03-85", "DateAdopted.From": "2018-01-01", "DateAdopted.To": "2026-08-12" } },
  { queryId: "CBD_RU_NUMBER_SP_KR", language: "Russian", params: { Number: "32-107:2024" } },
  { queryId: "CBD_RU_NAME_SP_KR", language: "Russian", params: { Name: "СП КР 32-107:2024" } },
  { queryId: "CBD_RU_TEXT_SP_KR", language: "Russian", params: { EditionText: "СП КР 32-107:2024" } },
  { queryId: "CBD_RU_NAME_AUTOMOBILE_ROADS_2018_CURRENT", language: "Russian", params: { Name: "Автомобильные дороги", "DateAdopted.From": "2018-01-01", "DateAdopted.To": "2026-08-12" } },
  { queryId: "CBD_RU_TEXT_CANCEL_SNIP", language: "Russian", params: { EditionText: "отменить действие СНиП 3.06.03-85" } },
  { queryId: "CBD_RU_TEXT_LOST_FORCE_SNIP", language: "Russian", params: { EditionText: "СНиП 3.06.03-85 утратил силу" } },
  { queryId: "CBD_RU_TEXT_REPLACEMENT_SNIP", language: "Russian", params: { EditionText: "взамен СНиП 3.06.03-85" } },
  { queryId: "CBD_KY_NUMBER_SNIP", language: "Kyrgyz", params: { Number: "3.06.03-85" } },
  { queryId: "CBD_KY_TEXT_SNIP", language: "Kyrgyz", params: { EditionText: "КЧжЭ 3.06.03-85" } },
  { queryId: "CBD_KY_NAME_AUTOMOBILE_ROADS", language: "Kyrgyz", params: { Name: "Автомобиль жолдору" } },
  { queryId: "CBD_KY_TEXT_SP_KR", language: "Kyrgyz", params: { EditionText: "КР КЭ 32-107:2024" } },
  { queryId: "CBD_KY_TEXT_LOST_FORCE", language: "Kyrgyz", params: { EditionText: "күчүн жоготту 3.06.03-85" } },
]);

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function writeImmutable(relative, value) {
  const file = path.join(outputRoot, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  invariant(!existsSync(file), `IMMUTABLE_C2_SEARCH_OUTPUT_ALREADY_EXISTS:${relative}`);
  writeFileSync(file, value);
}

function decodeHtml(buffer, contentType) {
  if (/windows-1251|cp1251/iu.test(contentType)) return new TextDecoder("windows-1251").decode(buffer);
  return buffer.toString("utf8");
}

function stripHtml(value) {
  return value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, " ")
    .replace(/<[^>]+>/gu, " ")
    .replace(/&nbsp;|&#160;/giu, " ")
    .replace(/&quot;/giu, '"')
    .replace(/&amp;/giu, "&")
    .replace(/\s+/gu, " ")
    .trim();
}

function extractCandidateDocuments(value) {
  const candidates = [];
  const visited = new Set();
  function walk(node) {
    if (!node || typeof node !== "object" || visited.has(node)) return;
    visited.add(node);
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    const keys = Object.keys(node);
    const hasIdentity = keys.some((key) => /^(?:Code|Name|Number|DocumentCode|Title)$/iu.test(key));
    if (hasIdentity) {
      const compact = {};
      for (const key of keys.filter((key) => /^(?:Code|Name|Number|DocumentCode|Title|Status|DateAdopted|DatePublication|Edition|Url)$/iu.test(key))) {
        compact[key] = node[key];
      }
      if (Object.keys(compact).length > 0) candidates.push(compact);
    }
    for (const child of Object.values(node)) walk(child);
  }
  walk(value);
  const unique = new Map(candidates.map((candidate) => [JSON.stringify(candidate), candidate]));
  return [...unique.values()];
}

async function fetchQuery(query) {
  const url = new URL("https://cbd.minjust.gov.kg/api/v1/OpenData/GetDocumentListByQuery.json");
  for (const [key, value] of Object.entries({
    ...query.params,
    PageSize: "100",
    PageNumber: "1",
    Lang: query.language,
    IgnoreProperty: "Editions",
  })) url.searchParams.append(key, value);
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    try {
      const response = await fetch(url, {
        redirect: "follow",
        signal: controller.signal,
        headers: {
          accept: "application/json, text/plain, */*",
          "accept-language": "ru-RU,ru;q=0.9,ky;q=0.8",
          referer: "https://cbd.minjust.gov.kg/",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/127.0 Safari/537.36 Codex-M1-Asphalt-C2-R1/1.0",
        },
      });
      const buffer = Buffer.from(await response.arrayBuffer());
      return { url: url.href, response, buffer, attempt };
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }
  }
  return { url: url.href, error: lastError, attempt: 2 };
}

function staticScan(source, buffer) {
  const text = stripHtml(decodeHtml(buffer, source.contentType ?? ""));
  const terms = [
    "СНиП 3.06.03-85", "3.06.03-85", "СП КР 32-107:2024", "32-107:2024",
    "отменить действие", "утратил силу", "взамен", "Автомобильные дороги", "Автомобиль жолдору",
  ];
  return terms.map((term) => {
    const lowerText = text.toLocaleLowerCase("ru");
    const lowerTerm = term.toLocaleLowerCase("ru");
    const positions = [];
    let offset = 0;
    while ((offset = lowerText.indexOf(lowerTerm, offset)) >= 0) {
      positions.push(offset);
      offset += lowerTerm.length;
    }
    return {
      term,
      matchCount: positions.length,
      excerpts: positions.slice(0, 8).map((position) => text.slice(Math.max(0, position - 260), Math.min(text.length, position + term.length + 420))),
    };
  });
}

invariant(retrievedAtUtc, "RETRIEVED_AT_UTC_REQUIRED");
invariant(!Number.isNaN(Date.parse(retrievedAtUtc)), "RETRIEVED_AT_UTC_INVALID");
for (const required of [supplementalManifestPath, sourceManifestPath]) invariant(existsSync(required), `REQUIRED_MANIFEST_MISSING:${required}`);
const supplementalManifest = JSON.parse(readFileSync(supplementalManifestPath, "utf8"));
const sourceManifest = JSON.parse(readFileSync(sourceManifestPath, "utf8"));

const queryResults = [];
for (const query of CBD_QUERIES) {
  const result = await fetchQuery(query);
  if (result.error) {
    queryResults.push({
      ...query,
      retrievedAtUtc,
      requestUrl: result.url,
      attemptCount: result.attempt,
      fetchVerdict: "NETWORK_ERROR_NOT_SEARCH_RESULT",
      errorName: result.error?.name ?? "Error",
      errorMessage: result.error?.message ?? String(result.error),
    });
    continue;
  }
  const contentType = result.response.headers.get("content-type") ?? "application/octet-stream";
  const hash = sha256(result.buffer);
  const responseFile = `official-search-responses/${query.queryId}.${hash.slice(0, 16)}.json`;
  writeImmutable(responseFile, result.buffer);
  let parsed = null;
  let parseError = null;
  try {
    parsed = JSON.parse(result.buffer.toString("utf8"));
  } catch (error) {
    parseError = error.message;
  }
  const candidates = parsed ? extractCandidateDocuments(parsed) : [];
  queryResults.push({
    ...query,
    retrievedAtUtc,
    requestUrl: result.url,
    attemptCount: result.attempt,
    status: result.response.status,
    ok: result.response.ok,
    contentType,
    bytes: result.buffer.length,
    sha256: hash,
    responseFile,
    topLevelType: Array.isArray(parsed) ? "array" : typeof parsed,
    topLevelKeys: parsed && !Array.isArray(parsed) && typeof parsed === "object" ? Object.keys(parsed) : [],
    parseError,
    candidateDocumentCount: candidates.length,
    candidateDocuments: candidates,
    fetchVerdict: result.response.ok && !parseError ? "OFFICIAL_QUERY_CAPTURED_PARSED" : "OFFICIAL_QUERY_CAPTURED_REVIEW_REQUIRED",
  });
}

const staticSources = [
  ...supplementalManifest.sources.filter((source) => source.ok && /MINSTROY/iu.test(source.sourceId)),
  ...sourceManifest.sources.filter((source) => source.ok && /MINTRANSPORT/iu.test(source.sourceId)),
];
const staticResults = staticSources.map((source) => {
  const manifestRoot = supplementalManifest.sources.includes(source) ? outputRoot : outputRoot;
  const buffer = readFileSync(path.join(manifestRoot, source.snapshotFile));
  return {
    sourceId: source.sourceId,
    sourceUrl: source.finalUrl ?? source.url,
    sourceContentHash: source.sha256,
    sourceFile: source.snapshotFile,
    termResults: staticScan(source, buffer),
  };
});

const result = {
  schemaVersion: SCHEMA,
  retrievedAtUtc,
  officialBundleSha256: supplementalManifest.sources.find((source) => source.sourceId === "KG_CBD_PUBLIC_APP_SCRIPT_01")?.sha256 ?? null,
  cbdQueryCount: CBD_QUERIES.length,
  cbdQueryCapturedCount: queryResults.filter((query) => query.fetchVerdict === "OFFICIAL_QUERY_CAPTURED_PARSED").length,
  cbdQueryNetworkErrorCount: queryResults.filter((query) => query.fetchVerdict === "NETWORK_ERROR_NOT_SEARCH_RESULT").length,
  queryResults,
  staticOfficialSourceCount: staticResults.length,
  staticResults,
  queryCoverage: {
    languages: ["Russian", "Kyrgyz"],
    exactDesignations: ["3.06.03-85", "32-107:2024"],
    statusTerms: ["отменить действие", "утратил силу", "взамен", "күчүн жоготту"],
    dateRange: { from: "2018-01-01", to: "2026-08-12" },
  },
  automaticStatusConclusionPerformed: false,
  verdict: "OFFICIAL_CONTRADICTION_SCAN_CAPTURED_REVIEW_REQUIRED",
};
writeImmutable("C2_OFFICIAL_CONTRADICTION_SCAN.json", `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  verdict: result.verdict,
  cbdQueryCount: result.cbdQueryCount,
  cbdQueryCapturedCount: result.cbdQueryCapturedCount,
  cbdQueryNetworkErrorCount: result.cbdQueryNetworkErrorCount,
  queryResults: queryResults.map((query) => ({
    queryId: query.queryId,
    status: query.status ?? null,
    bytes: query.bytes ?? null,
    sha256: query.sha256 ?? null,
    topLevelKeys: query.topLevelKeys ?? [],
    candidateDocumentCount: query.candidateDocumentCount ?? null,
    fetchVerdict: query.fetchVerdict,
    errorMessage: query.errorMessage ?? null,
  })),
  staticOfficialSourceCount: result.staticOfficialSourceCount,
}, null, 2)}\n`);
