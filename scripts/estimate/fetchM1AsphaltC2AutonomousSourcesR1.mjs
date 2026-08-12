import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const SCHEMA = "m1-asphalt-c2-autonomous-source-fetch-r1:v1";
const argv = Object.fromEntries(process.argv.slice(2).map((argument) => {
  const [key, ...rest] = argument.replace(/^--/u, "").split("=");
  return [key, rest.join("=") || true];
}));
const outputRoot = path.resolve(String(argv["output-root"] ?? path.join(
  ".release-runtime",
  "master-11610-group-batches-r1",
  "03-m1-asphalt-five-p0-remediation-r1",
  "delta-c2",
)));
const retrievedAtUtc = String(argv["retrieved-at-utc"] ?? "");

const SOURCES = Object.freeze([
  {
    sourceId: "KG_CBD_CONSTRUCTION_NORMATIVE_SYSTEM_CURRENT",
    sourceClass: "OFFICIAL_KG_NPA_API",
    url: "https://cbd.minjust.gov.kg/api/v1/OpenData/GetDocument.json?Code=52-718&lang=Russian",
    expectedMedia: "json",
    candidateRoles: ["KG_STATUS_OWNER", "KG_APPLICABILITY_OWNER"],
  },
  {
    sourceId: "KG_CBD_CONSTRUCTION_NORMATIVE_SYSTEM_2020_AMENDMENT",
    sourceClass: "OFFICIAL_KG_NPA_API",
    url: "https://cbd.minjust.gov.kg/api/v1/OpenData/GetDocument.json?Code=7-22534&lang=Russian",
    expectedMedia: "json",
    candidateRoles: ["KG_STATUS_OWNER", "KG_APPLICABILITY_OWNER"],
  },
  {
    sourceId: "KG_CBD_CONSTRUCTION_NORMATIVE_DOCUMENT_SYSTEM_CURRENT",
    sourceClass: "OFFICIAL_KG_NPA_API",
    url: "https://cbd.minjust.gov.kg/api/v1/OpenData/GetDocument.json?Code=39-31&lang=Russian",
    expectedMedia: "json",
    candidateRoles: ["KG_STATUS_OWNER", "KG_APPLICABILITY_OWNER"],
  },
  {
    sourceId: "KG_MINTRANSPORT_ROAD_QUALITY_CONTROL_RULES",
    sourceClass: "OFFICIAL_KG_MINISTRY_PUBLICATION",
    url: "https://mtd.gov.kg/polozhenie-ob-obespechenii-sistemnosti-kontrolya-kachestva-rabot-pri-stroitelstve-rekonstruktsii-i-remonte-avtomobilnyh-dorog-obshhego-polzovaniya/",
    expectedMedia: "html",
    candidateRoles: ["KG_APPLICABILITY_OWNER", "TEXT_IDENTITY_OWNER"],
  },
  {
    sourceId: "KG_MINSTROY_SP_KR_32_107_2024_DRAFT_PAGE_CURRENT",
    sourceClass: "OFFICIAL_KG_DRAFT_PUBLICATION",
    url: "https://minstroy.gov.kg/ru/news/144/show",
    expectedMedia: "html",
    candidateRoles: ["DRAFT_COMPARATIVE_ONLY", "SUPERSESSION_INTENT_EVIDENCE"],
  },
  {
    sourceId: "KG_MINSTROY_SP_KR_32_107_2024_DRAFT_PDF_CURRENT",
    sourceClass: "OFFICIAL_KG_DRAFT_PUBLICATION",
    url: "https://minstroy.gov.kg/kg/state_program/download-pdf/321072024-525685904adde6be5.86272544.pdf",
    expectedMedia: "pdf",
    candidateRoles: ["DRAFT_COMPARATIVE_ONLY", "SUPERSESSION_INTENT_EVIDENCE"],
  },
  {
    sourceId: "KG_MINSTROY_2025_NORMATIVE_REFERENCE_PDF",
    sourceClass: "OFFICIAL_KG_MINISTRY_PUBLICATION",
    url: "https://minstroy.gov.kg/kg/state_program/download-pdf/obedinennyeizolacionnye-61267ac76cb3f36a0.49346677.pdf",
    expectedMedia: "pdf",
    candidateRoles: ["CURRENT_OFFICIAL_REFERENCE_EVIDENCE"],
  },
  {
    sourceId: "KG_NISM_REPEALED_BUILDING_SAFETY_REGULATION_HISTORICAL_LIST",
    sourceClass: "OFFICIAL_KG_STANDARDS_HISTORICAL_PUBLICATION",
    url: "https://www.nism.gov.kg/media/FreePagesImages/2023-09-14/%D0%97%D0%B0%D0%BA%D0%BE%D0%BD_%D0%9A%D0%A0__%D0%A2%D0%B5%D1%85%D0%BD%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%B8%D0%B9_%D1%80%D0%B5%D0%B3%D0%BB%D0%B0%D0%BC%D0%B5%D0%BD%D1%82__%D0%91%D0%B5%D0%B7%D0%BE%D0%BF%D0%B0%D1%81%D0%BD%D0%BE%D1%81%D1%82%D1%8C_%D0%B7%D0%B4%D0%B0%D0%BD%D0%B8%D0%B9_%D0%B8_%D1%81%D0%BE%D0%BE%D1%80%D1%83%D0%B6_UvyjDMA.pdf",
    expectedMedia: "pdf",
    candidateRoles: ["HISTORICAL_ADOPTION_CHAIN_ONLY"],
  },
  {
    sourceId: "RU_OHRANATRUDA_SNIP_3_06_03_85_CATALOG",
    sourceClass: "NORMATIVE_INFORMATION_SYSTEM",
    url: "https://ohranatruda.ru/ot_biblio/norma/249570/",
    expectedMedia: "html",
    candidateRoles: ["TEXT_IDENTITY_OWNER", "CROSS_CARRIER_REFERENCE"],
  },
  {
    sourceId: "RU_OHRANATRUDA_SNIP_3_06_03_85_PDF",
    sourceClass: "SECONDARY_TEXT_CARRIER",
    url: "https://ohranatruda.ru/upload/iblock/101/4294854745.pdf",
    expectedMedia: "pdf",
    candidateRoles: ["AUTHENTICATED_TEXT_CARRIER_CANDIDATE"],
  },
  {
    sourceId: "RU_HELPENG_SNIP_3_06_03_85_PDF",
    sourceClass: "SECONDARY_TEXT_CARRIER",
    url: "https://helpeng.ru/public/normdoc/snip/snip_3.06.03-85.pdf",
    expectedMedia: "pdf",
    candidateRoles: ["AUTHENTICATED_TEXT_CARRIER_CANDIDATE"],
  },
  {
    sourceId: "RU_MEGANORM_SNIP_3_06_03_85_FULL_TEXT",
    sourceClass: "NORMATIVE_INFORMATION_SYSTEM",
    url: "https://meganorm.ru/Data1/1/1954/index.htm",
    expectedMedia: "html",
    candidateRoles: ["TEXT_IDENTITY_OWNER", "CROSS_CARRIER_REFERENCE"],
  },
  {
    sourceId: "RU_STROYINF_SNIP_3_06_03_85_FULL_TEXT",
    sourceClass: "NORMATIVE_INFORMATION_SYSTEM_MIRROR",
    url: "https://files.stroyinf.ru/Data1/1/1954/index.htm",
    expectedMedia: "html",
    candidateRoles: ["CROSS_CARRIER_REFERENCE"],
  },
  {
    sourceId: "RU_DOCS_CNTD_SNIP_3_06_03_85_FULL_TEXT",
    sourceClass: "AUTHENTICATED_NORMATIVE_INFORMATION_SYSTEM",
    url: "https://docs.cntd.ru/document/5200259",
    expectedMedia: "html",
    candidateRoles: ["TEXT_IDENTITY_OWNER", "CROSS_CARRIER_REFERENCE"],
  },
  {
    sourceId: "RU_GARANT_SNIP_3_06_03_85_FULL_TEXT",
    sourceClass: "AUTHENTICATED_NORMATIVE_INFORMATION_SYSTEM",
    url: "https://base.garant.ru/2306218/",
    expectedMedia: "html",
    candidateRoles: ["TEXT_IDENTITY_OWNER", "CROSS_CARRIER_REFERENCE"],
  },
]);

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function extensionFor(contentType, expectedMedia) {
  if (contentType.includes("pdf") || expectedMedia === "pdf") return "pdf";
  if (contentType.includes("json") || expectedMedia === "json") return "json";
  return "html";
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

function extractTitle(text, contentType) {
  if (contentType.includes("html")) {
    return stripTags(text.match(/<title\b[^>]*>([\s\S]*?)<\/title>/iu)?.[1] ?? "");
  }
  return null;
}

function sourceTermEvidence(text) {
  const normalized = stripTags(text);
  const terms = [
    "СНиП 3.06.03-85",
    "СП КР 32-107:2024",
    "отменить действие",
    "утратил силу",
    "Действует",
    "До принятия соответствующих строительных норм",
  ];
  return terms.map((term) => {
    const index = normalized.toLocaleLowerCase("ru").indexOf(term.toLocaleLowerCase("ru"));
    return {
      term,
      found: index >= 0,
      excerpt: index >= 0 ? normalized.slice(Math.max(0, index - 240), Math.min(normalized.length, index + term.length + 360)) : null,
    };
  });
}

function writeImmutable(relative, value) {
  const file = path.join(outputRoot, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  invariant(!existsSync(file), `IMMUTABLE_C2_SOURCE_OUTPUT_ALREADY_EXISTS:${relative}`);
  writeFileSync(file, value);
}

async function fetchOnce(source) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    return await fetch(source.url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        accept: source.expectedMedia === "json"
          ? "application/json, text/plain, */*"
          : "text/html,application/xhtml+xml,application/pdf;q=0.9,*/*;q=0.8",
        "accept-language": "ru-RU,ru;q=0.9,en;q=0.5",
        referer: source.url.includes("cbd.minjust.gov.kg") ? "https://cbd.minjust.gov.kg/" : source.url,
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/127.0 Safari/537.36 Codex-M1-Asphalt-C2-R1/1.0",
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

invariant(retrievedAtUtc, "RETRIEVED_AT_UTC_REQUIRED");
invariant(!Number.isNaN(Date.parse(retrievedAtUtc)), "RETRIEVED_AT_UTC_INVALID");

const results = [];
for (const source of SOURCES) {
  let response;
  let error;
  let attempt = 0;
  for (attempt = 1; attempt <= 2; attempt += 1) {
    try {
      response = await fetchOnce(source);
      break;
    } catch (candidateError) {
      error = candidateError;
    }
  }
  if (!response) {
    results.push({
      ...source,
      retrievedAtUtc,
      attemptCount: 2,
      fetchVerdict: "NETWORK_ERROR_NOT_SOURCE_STATUS_PROOF",
      errorName: error?.name ?? "Error",
      errorMessage: error?.message ?? String(error),
      errorCause: error?.cause?.message ?? null,
      automaticAdmissionPerformed: false,
    });
    continue;
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") ?? "application/octet-stream";
  const hash = sha256(buffer);
  const extension = extensionFor(contentType, source.expectedMedia);
  const snapshotFile = `source-snapshots/${source.sourceId}.${hash.slice(0, 16)}.${extension}`;
  writeImmutable(snapshotFile, buffer);
  const textual = /(?:html|text|json|xml)/iu.test(contentType);
  const text = textual ? buffer.toString("utf8") : "";
  results.push({
    ...source,
    retrievedAtUtc,
    attemptCount: attempt,
    status: response.status,
    ok: response.ok,
    finalUrl: response.url,
    contentType,
    etag: response.headers.get("etag"),
    lastModified: response.headers.get("last-modified"),
    bytes: buffer.length,
    sha256: hash,
    snapshotFile,
    pageTitle: textual ? extractTitle(text, contentType) : null,
    termEvidence: textual ? sourceTermEvidence(text) : [],
    fetchVerdict: response.ok ? "SNAPSHOT_FETCHED_REVIEW_REQUIRED" : "HTTP_ERROR_NOT_SOURCE_STATUS_PROOF",
    automaticAdmissionPerformed: false,
  });
}

const manifest = {
  schemaVersion: SCHEMA,
  retrievedAtUtc,
  sourceCount: SOURCES.length,
  fetchedCount: results.filter((result) => result.fetchVerdict === "SNAPSHOT_FETCHED_REVIEW_REQUIRED").length,
  httpErrorCount: results.filter((result) => result.fetchVerdict === "HTTP_ERROR_NOT_SOURCE_STATUS_PROOF").length,
  networkErrorCount: results.filter((result) => result.fetchVerdict === "NETWORK_ERROR_NOT_SOURCE_STATUS_PROOF").length,
  sources: results,
  roleSeparationRequired: true,
  automaticAdmissionPerformed: false,
  verdict: "C2_SOURCE_BYTES_CAPTURED_REVIEW_REQUIRED",
};
writeImmutable("C2_AUTONOMOUS_SOURCE_FETCH_MANIFEST.json", `${JSON.stringify(manifest, null, 2)}\n`);
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
    fetchVerdict: result.fetchVerdict,
    errorMessage: result.errorMessage ?? null,
  })),
}, null, 2)}\n`);
