import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const SCHEMA = "m1-asphalt-c2-supplemental-official-source-fetch-r1:v1";
const argv = Object.fromEntries(process.argv.slice(2).map((argument) => {
  const [key, ...rest] = argument.replace(/^--/u, "").split("=");
  return [key, rest.join("=") || true];
}));
const outputRoot = path.resolve(String(argv["output-root"] ?? path.join(
  ".release-runtime", "master-11610-group-batches-r1", "03-m1-asphalt-five-p0-remediation-r1", "delta-c2",
)));
const retrievedAtUtc = String(argv["retrieved-at-utc"] ?? "");

const INITIAL_SOURCES = Object.freeze([
  {
    sourceId: "KG_MINSTROY_SP_KR_32_107_2024_DRAFT_PAGE_CORRECT",
    sourceClass: "OFFICIAL_KG_DRAFT_PUBLICATION",
    url: "https://minstroy.gov.kg/ru/document/102/show",
  },
  {
    sourceId: "KG_MINSTROY_DOCUMENT_REGISTRY_CURRENT",
    sourceClass: "OFFICIAL_KG_NORMATIVE_REGISTRY",
    url: "https://minstroy.gov.kg/ru/document/",
  },
  {
    sourceId: "KG_MINSTROY_CONSTRUCTION_NORMS_REGISTRY_CURRENT",
    sourceClass: "OFFICIAL_KG_NORMATIVE_SERVICES_REGISTRY",
    url: "https://minstroy.gov.kg/ru/kyzmat/11",
  },
  {
    sourceId: "KG_CBD_PUBLIC_APP_ROOT",
    sourceClass: "OFFICIAL_KG_NPA_REGISTRY_APPLICATION",
    url: "https://cbd.minjust.gov.kg/",
  },
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
  invariant(!existsSync(file), `IMMUTABLE_C2_SUPPLEMENTAL_OUTPUT_ALREADY_EXISTS:${relative}`);
  writeFileSync(file, value);
}

async function fetchSource(source) {
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    try {
      const response = await fetch(source.url, {
        redirect: "follow",
        signal: controller.signal,
        headers: {
          accept: "text/html,application/javascript,application/json;q=0.9,*/*;q=0.8",
          "accept-language": "ru-RU,ru;q=0.9,en;q=0.5",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/127.0 Safari/537.36 Codex-M1-Asphalt-C2-R1/1.0",
        },
      });
      const buffer = Buffer.from(await response.arrayBuffer());
      return { response, buffer, attempt };
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }
  }
  return { error: lastError, attempt: 2 };
}

function extensionFor(contentType) {
  if (/javascript/iu.test(contentType)) return "js";
  if (/json/iu.test(contentType)) return "json";
  return "html";
}

function scriptUrls(html, baseUrl) {
  return [...html.matchAll(/<script\b[^>]*src\s*=\s*(?:"([^"]+)"|'([^']+)')[^>]*>/giu)]
    .map((match) => new URL(match[1] ?? match[2], baseUrl).href)
    .filter((url) => new URL(url).hostname === new URL(baseUrl).hostname)
    .sort();
}

function apiPaths(javaScript) {
  return [...new Set([
    ...[...javaScript.matchAll(/["'`]([^"'`]{0,180}\/(?:api\/v\d+|OpenData|Document)[^"'`]{0,180})["'`]/giu)].map((match) => match[1]),
    ...[...javaScript.matchAll(/\/(?:api\/v\d+|OpenData)\/[A-Za-z0-9_?&=./{}:-]+/gu)].map((match) => match[0]),
  ])].sort();
}

function saveResult(source, result) {
  if (result.error) {
    return {
      ...source,
      retrievedAtUtc,
      attemptCount: result.attempt,
      fetchVerdict: "NETWORK_ERROR_NOT_SOURCE_STATUS_PROOF",
      errorName: result.error?.name ?? "Error",
      errorMessage: result.error?.message ?? String(result.error),
    };
  }
  const { response, buffer, attempt } = result;
  const contentType = response.headers.get("content-type") ?? "application/octet-stream";
  const hash = sha256(buffer);
  const snapshotFile = `supplemental-source-snapshots/${source.sourceId}.${hash.slice(0, 16)}.${extensionFor(contentType)}`;
  writeImmutable(snapshotFile, buffer);
  return {
    ...source,
    retrievedAtUtc,
    attemptCount: attempt,
    status: response.status,
    ok: response.ok,
    finalUrl: response.url,
    contentType,
    bytes: buffer.length,
    sha256: hash,
    snapshotFile,
    fetchVerdict: response.ok ? "SNAPSHOT_FETCHED_REVIEW_REQUIRED" : "HTTP_ERROR_NOT_SOURCE_STATUS_PROOF",
  };
}

invariant(retrievedAtUtc, "RETRIEVED_AT_UTC_REQUIRED");
invariant(!Number.isNaN(Date.parse(retrievedAtUtc)), "RETRIEVED_AT_UTC_INVALID");

const results = [];
for (const source of INITIAL_SOURCES) {
  results.push(saveResult(source, await fetchSource(source)));
}

const appRoot = results.find((source) => source.sourceId === "KG_CBD_PUBLIC_APP_ROOT" && source.ok);
const discoveredScripts = [];
if (appRoot) {
  const html = readFileSync(path.join(outputRoot, appRoot.snapshotFile), "utf8");
  for (const [index, url] of scriptUrls(html, appRoot.finalUrl).entries()) {
    const source = {
      sourceId: `KG_CBD_PUBLIC_APP_SCRIPT_${String(index + 1).padStart(2, "0")}`,
      sourceClass: "OFFICIAL_KG_NPA_REGISTRY_APPLICATION_CODE",
      url,
    };
    const saved = saveResult(source, await fetchSource(source));
    if (saved.ok) {
      const text = readFileSync(path.join(outputRoot, saved.snapshotFile), "utf8");
      saved.discoveredApiPaths = apiPaths(text);
    }
    results.push(saved);
    discoveredScripts.push(saved.sourceId);
  }
}

const manifest = {
  schemaVersion: SCHEMA,
  retrievedAtUtc,
  sourceCount: results.length,
  fetchedCount: results.filter((source) => source.ok).length,
  discoveredScripts,
  sources: results,
  automaticAdmissionPerformed: false,
  verdict: "C2_SUPPLEMENTAL_OFFICIAL_BYTES_CAPTURED_REVIEW_REQUIRED",
};
writeImmutable("C2_SUPPLEMENTAL_OFFICIAL_SOURCE_FETCH_MANIFEST.json", `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  verdict: manifest.verdict,
  sourceCount: manifest.sourceCount,
  fetchedCount: manifest.fetchedCount,
  sources: results.map((source) => ({
    sourceId: source.sourceId,
    status: source.status ?? null,
    bytes: source.bytes ?? null,
    sha256: source.sha256 ?? null,
    finalUrl: source.finalUrl ?? null,
    discoveredApiPathCount: source.discoveredApiPaths?.length ?? 0,
    fetchVerdict: source.fetchVerdict,
    errorMessage: source.errorMessage ?? null,
  })),
}, null, 2)}\n`);
