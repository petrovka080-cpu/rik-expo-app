import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const SCHEMA = "m1-asphalt-five-p0-remediation-r1:official-linked-documents:v1";
const argv = Object.fromEntries(process.argv.slice(2).map((argument) => {
  const [key, ...rest] = argument.replace(/^--/u, "").split("=");
  return [key, rest.join("=") || true];
}));
const outputRoot = path.resolve(String(argv["output-root"] ?? path.join(
  ".release-runtime", "master-11610-group-batches-r1", "03-m1-asphalt-five-p0-remediation-r1", "normative-sources",
)));
const retrievedAtUtc = String(argv["retrieved-at-utc"] ?? "");

const ROOT_SOURCES = Object.freeze([
  { sourceId: "KG_SP_KR_32_107_2024_PUBLIC_DISCUSSION_PAGE", jurisdiction: "KG", url: "https://minstroy.gov.kg/ru/document/102/show", discoverOfficialPdfLinks: true },
  { sourceId: "KG_MINSTROY_AUTOMOBILE_ROADS_NORM_PAGE", jurisdiction: "KG", url: "https://minstroy.gov.kg/ru/kyzmat/211/show", discoverOfficialPdfLinks: true },
  { sourceId: "KG_KRER_27_OFFICIAL_PDF", jurisdiction: "KG", url: "https://minstroy.gov.kg/ru/state_program/download-pdf/no27avtomobilnyedorogi_compressed-43769083f584ff787.06841542.pdf", discoverOfficialPdfLinks: false },
  { sourceId: "EAEU_TR_TS_014_2011_OFFICIAL_PDF", jurisdiction: "EAEU", url: "https://eec.eaeunion.org/upload/medialibrary/8d3/P_827_1.pdf", discoverOfficialPdfLinks: false },
]);

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stripTags(value) {
  return value.replace(/<[^>]+>/gu, " ").replace(/&nbsp;|&#160;/giu, " ").replace(/&amp;/giu, "&").replace(/\s+/gu, " ").trim();
}

function extractPdfLinks(html, baseUrl) {
  const links = [];
  const pattern = /<a\b[^>]*href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/giu;
  for (const match of html.matchAll(pattern)) {
    const rawHref = match[1] ?? match[2] ?? match[3] ?? "";
    try {
      const href = new URL(rawHref, baseUrl);
      if (href.hostname === "minstroy.gov.kg" && /\.pdf(?:$|\?)/iu.test(href.href)) {
        links.push({ href: href.href, text: stripTags(match[4] ?? "") });
      }
    } catch {
      // Invalid links are excluded from official document discovery.
    }
  }
  return [...new Map(links.map((link) => [link.href, link])).values()].sort((left, right) => left.href.localeCompare(right.href));
}

async function fetchWithRetry(url) {
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45_000);
    try {
      const response = await fetch(url, {
        redirect: "follow",
        signal: controller.signal,
        headers: { "user-agent": "Codex-M1-Asphalt-Remediation-R1/1.0", accept: "application/pdf,text/html,*/*;q=0.8" },
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

function extensionFor(contentType) {
  return contentType.includes("pdf") ? "pdf" : "html";
}

function writeImmutable(relative, buffer) {
  const file = path.join(outputRoot, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  invariant(!existsSync(file), `IMMUTABLE_LINKED_SNAPSHOT_ALREADY_EXISTS:${relative}`);
  writeFileSync(file, buffer);
}

async function capture(source) {
  try {
    const { response, attempt } = await fetchWithRetry(source.url);
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") ?? "application/octet-stream";
    const hash = sha256(buffer);
    const snapshotFile = `snapshots/${source.sourceId}.${hash.slice(0, 16)}.${extensionFor(contentType)}`;
    writeImmutable(snapshotFile, buffer);
    const html = contentType.includes("html") ? buffer.toString("utf8") : "";
    return {
      ...source,
      retrievedAtUtc,
      attempt,
      status: response.status,
      ok: response.ok,
      finalUrl: response.url,
      contentType,
      bytes: buffer.length,
      sha256: hash,
      snapshotFile,
      discoveredOfficialPdfLinks: source.discoverOfficialPdfLinks ? extractPdfLinks(html, response.url) : [],
      fetchVerdict: response.ok ? "SNAPSHOT_FETCHED_STATUS_REVIEW_REQUIRED" : "HTTP_ERROR_STATUS_REVIEW_REQUIRED",
    };
  } catch (error) {
    return {
      ...source,
      retrievedAtUtc,
      ok: false,
      errorName: error?.name ?? "Error",
      errorMessage: error?.message ?? String(error),
      errorCause: error?.cause?.message ?? null,
      fetchVerdict: "NETWORK_ERROR_NOT_SOURCE_STATUS_PROOF",
      discoveredOfficialPdfLinks: [],
    };
  }
}

invariant(retrievedAtUtc, "RETRIEVED_AT_UTC_REQUIRED");
const rootResults = [];
for (const source of ROOT_SOURCES) rootResults.push(await capture(source));

const childResults = [];
for (const parent of rootResults) {
  for (const [index, link] of parent.discoveredOfficialPdfLinks.entries()) {
    childResults.push(await capture({
      sourceId: `${parent.sourceId}_LINKED_PDF_${String(index + 1).padStart(2, "0")}`,
      jurisdiction: parent.jurisdiction,
      url: link.href,
      linkText: link.text,
      parentSourceId: parent.sourceId,
      discoverOfficialPdfLinks: false,
    }));
  }
}

const results = [...rootResults, ...childResults];
const manifest = {
  schemaVersion: SCHEMA,
  retrievedAtUtc,
  rootSourceCount: ROOT_SOURCES.length,
  linkedPdfCount: childResults.length,
  fetchedCount: results.filter((result) => result.fetchVerdict === "SNAPSHOT_FETCHED_STATUS_REVIEW_REQUIRED").length,
  failedCount: results.filter((result) => result.fetchVerdict !== "SNAPSHOT_FETCHED_STATUS_REVIEW_REQUIRED").length,
  sources: results,
  automaticAdmissionPerformed: false,
  verdict: "OFFICIAL_LINKED_DOCUMENTS_CAPTURED_MANUAL_CLAUSE_STATUS_REVIEW_REQUIRED",
};
writeImmutable("discovery/OFFICIAL_LINKED_DOCUMENT_FETCH.json", Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8"));
process.stdout.write(`${JSON.stringify({
  verdict: manifest.verdict,
  rootSourceCount: manifest.rootSourceCount,
  linkedPdfCount: manifest.linkedPdfCount,
  fetchedCount: manifest.fetchedCount,
  failedCount: manifest.failedCount,
  sources: results.map((result) => ({ sourceId: result.sourceId, status: result.status ?? null, contentType: result.contentType ?? null, bytes: result.bytes ?? null, sha256: result.sha256 ?? null, linkText: result.linkText ?? null, fetchVerdict: result.fetchVerdict, errorMessage: result.errorMessage ?? null })),
}, null, 2)}\n`);
