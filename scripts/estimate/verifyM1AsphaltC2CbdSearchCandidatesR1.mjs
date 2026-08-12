import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const SCHEMA = "m1-asphalt-c2-cbd-search-candidate-verification-r1:v1";
const argv = Object.fromEntries(process.argv.slice(2).map((argument) => {
  const [key, ...rest] = argument.replace(/^--/u, "").split("=");
  return [key, rest.join("=") || true];
}));
const outputRoot = path.resolve(String(argv["output-root"] ?? path.join(
  ".release-runtime", "master-11610-group-batches-r1", "03-m1-asphalt-five-p0-remediation-r1", "delta-c2",
)));
const retrievedAtUtc = String(argv["retrieved-at-utc"] ?? "");
const scanPath = path.join(outputRoot, "C2_OFFICIAL_CONTRADICTION_SCAN.json");

const QUERY_IDS = Object.freeze(["CBD_RU_TEXT_SP_KR", "CBD_KY_TEXT_SP_KR"]);
const EXACT_TERMS = Object.freeze([
  "СП КР 32-107:2024",
  "32-107:2024",
  "СНиП 3.06.03-85",
  "3.06.03-85",
  "КР КЭ 32-107:2024",
  "КЧжЭ 3.06.03-85",
  "Автомобильные дороги",
  "Автомобиль жолдору",
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
  invariant(!existsSync(file), `IMMUTABLE_CBD_CANDIDATE_OUTPUT_ALREADY_EXISTS:${relative}`);
  writeFileSync(file, value);
}

function exactTermResults(text) {
  const lower = text.toLocaleLowerCase("ru");
  return EXACT_TERMS.map((term) => {
    const lowerTerm = term.toLocaleLowerCase("ru");
    const positions = [];
    let offset = 0;
    while ((offset = lower.indexOf(lowerTerm, offset)) >= 0) {
      positions.push(offset);
      offset += lowerTerm.length;
    }
    return {
      term,
      matchCount: positions.length,
      excerpts: positions.slice(0, 5).map((position) => text.slice(Math.max(0, position - 220), Math.min(text.length, position + term.length + 360))),
    };
  });
}

async function fetchDocument(code, language) {
  const url = new URL("https://cbd.minjust.gov.kg/api/v1/OpenData/GetDocument.json");
  url.searchParams.set("Code", String(code));
  url.searchParams.set("lang", language);
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

invariant(retrievedAtUtc, "RETRIEVED_AT_UTC_REQUIRED");
invariant(!Number.isNaN(Date.parse(retrievedAtUtc)), "RETRIEVED_AT_UTC_INVALID");
invariant(existsSync(scanPath), `OFFICIAL_SCAN_MISSING:${scanPath}`);
const scan = JSON.parse(readFileSync(scanPath, "utf8"));
const candidates = [];
for (const queryId of QUERY_IDS) {
  const query = scan.queryResults.find((item) => item.queryId === queryId);
  invariant(query?.responseFile, `QUERY_RESPONSE_MISSING:${queryId}`);
  const raw = JSON.parse(readFileSync(path.join(outputRoot, query.responseFile), "utf8"));
  for (const document of raw.Documents ?? []) {
    candidates.push({ queryId, language: query.language, code: document.Code, metadata: document });
  }
}

const uniqueCandidates = new Map();
for (const candidate of candidates) uniqueCandidates.set(`${candidate.language}:${candidate.code}`, candidate);
const results = [];
for (const candidate of uniqueCandidates.values()) {
  const fetched = await fetchDocument(candidate.code, candidate.language);
  if (fetched.error) {
    results.push({
      ...candidate,
      requestUrl: fetched.url,
      attemptCount: fetched.attempt,
      fetchVerdict: "NETWORK_ERROR_NOT_CANDIDATE_RESULT",
      errorName: fetched.error?.name ?? "Error",
      errorMessage: fetched.error?.message ?? String(fetched.error),
    });
    continue;
  }
  const hash = sha256(fetched.buffer);
  const responseFile = `cbd-search-candidates/${candidate.language}-${candidate.code}.${hash.slice(0, 16)}.json`;
  writeImmutable(responseFile, fetched.buffer);
  let parsed = null;
  let parseError = null;
  try {
    parsed = JSON.parse(fetched.buffer.toString("utf8"));
  } catch (error) {
    parseError = error.message;
  }
  const text = parsed ? JSON.stringify(parsed) : fetched.buffer.toString("utf8");
  const termResults = exactTermResults(text);
  results.push({
    ...candidate,
    requestUrl: fetched.url,
    attemptCount: fetched.attempt,
    status: fetched.response.status,
    ok: fetched.response.ok,
    contentType: fetched.response.headers.get("content-type") ?? "application/octet-stream",
    bytes: fetched.buffer.length,
    sha256: hash,
    responseFile,
    parseError,
    exactTermMatchCount: termResults.reduce((sum, term) => sum + term.matchCount, 0),
    termResults,
    fetchVerdict: fetched.response.ok && !parseError ? "OFFICIAL_CANDIDATE_CAPTURED_PARSED" : "OFFICIAL_CANDIDATE_REVIEW_REQUIRED",
  });
}

const result = {
  schemaVersion: SCHEMA,
  retrievedAtUtc,
  queryIds: QUERY_IDS,
  inputCandidateCount: candidates.length,
  uniqueCandidateCount: uniqueCandidates.size,
  capturedCandidateCount: results.filter((item) => item.fetchVerdict === "OFFICIAL_CANDIDATE_CAPTURED_PARSED").length,
  networkErrorCount: results.filter((item) => item.fetchVerdict === "NETWORK_ERROR_NOT_CANDIDATE_RESULT").length,
  candidatesWithExactTerm: results.filter((item) => item.exactTermMatchCount > 0).length,
  results,
  automaticStatusConclusionPerformed: false,
  verdict: "CBD_SEARCH_CANDIDATES_EXACT_TEXT_VERIFIED_REVIEW_REQUIRED",
};
writeImmutable("C2_CBD_SEARCH_CANDIDATE_EXACT_TEXT_VERIFICATION.json", `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({
  verdict: result.verdict,
  inputCandidateCount: result.inputCandidateCount,
  uniqueCandidateCount: result.uniqueCandidateCount,
  capturedCandidateCount: result.capturedCandidateCount,
  networkErrorCount: result.networkErrorCount,
  candidatesWithExactTerm: result.candidatesWithExactTerm,
  exactMatches: results.filter((item) => item.exactTermMatchCount > 0).map((item) => ({
    queryId: item.queryId,
    language: item.language,
    code: item.code,
    exactTermMatchCount: item.exactTermMatchCount,
    matchedTerms: item.termResults.filter((term) => term.matchCount > 0).map((term) => term.term),
  })),
}, null, 2)}\n`);
