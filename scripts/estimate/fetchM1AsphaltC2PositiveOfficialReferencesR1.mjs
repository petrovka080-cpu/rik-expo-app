import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const SCHEMA = "m1-asphalt-c2-positive-official-references-r1:v1";
const argv = Object.fromEntries(process.argv.slice(2).map((argument) => {
  const [key, ...rest] = argument.replace(/^--/u, "").split("=");
  return [key, rest.join("=") || true];
}));
const outputRoot = path.resolve(String(argv["output-root"] ?? path.join(
  ".release-runtime", "master-11610-group-batches-r1", "03-m1-asphalt-five-p0-remediation-r1", "delta-c2",
)));
const retrievedAtUtc = String(argv["retrieved-at-utc"] ?? "");

const SOURCES = Object.freeze([
  {
    sourceId: "KG_NISM_BUILDING_SAFETY_NORMATIVE_LIST_ALTERNATE_HOST",
    sourceClass: "OFFICIAL_KG_STANDARDS_NORMATIVE_LIST",
    url: "https://nism.gov.kg/media/FreePagesImages/2023-09-14/%D0%97%D0%B0%D0%BA%D0%BE%D0%BD_%D0%9A%D0%A0__%D0%A2%D0%B5%D1%85%D0%BD%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%B8%D0%B9_%D1%80%D0%B5%D0%B3%D0%BB%D0%B0%D0%BC%D0%B5%D0%BD%D1%82__%D0%91%D0%B5%D0%B7%D0%BE%D0%BF%D0%B0%D1%81%D0%BD%D0%BE%D1%81%D1%82%D1%8C_%D0%B7%D0%B4%D0%B0%D0%BD%D0%B8%D0%B9_%D0%B8_%D1%81%D0%BE%D0%BE%D1%80%D1%83%D0%B6_UvyjDMA.pdf",
  },
  {
    sourceId: "KG_KCA_ROAD_LAB_SCOPE_OFFICIAL_PDF",
    sourceClass: "OFFICIAL_KG_CONSTRUCTION_CERTIFICATION_REGISTRY",
    url: "https://reestr.kca.gov.kg/attachments/file/download?id=580",
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
  invariant(!existsSync(file), `IMMUTABLE_C2_POSITIVE_REFERENCE_OUTPUT_ALREADY_EXISTS:${relative}`);
  writeFileSync(file, value);
}

async function fetchSource(source) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    try {
      const response = await fetch(source.url, {
        redirect: "follow",
        signal: controller.signal,
        headers: {
          accept: "application/pdf,*/*;q=0.8",
          "accept-language": "ru-RU,ru;q=0.9,ky;q=0.8,en;q=0.5",
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
  return { error: lastError, attempt: 3 };
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
  const pdfMagic = buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  const extension = pdfMagic ? "pdf" : "bin";
  const snapshotFile = `positive-official-reference-snapshots/${source.sourceId}.${hash.slice(0, 16)}.${extension}`;
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
    pdfMagic,
    fetchVerdict: response.ok && pdfMagic
      ? "PDF_SNAPSHOT_FETCHED_REVIEW_REQUIRED"
      : response.ok
        ? "NON_PDF_RESPONSE_REVIEW_REQUIRED"
        : "HTTP_ERROR_NOT_SOURCE_STATUS_PROOF",
  };
}

invariant(retrievedAtUtc, "RETRIEVED_AT_UTC_REQUIRED");
invariant(!Number.isNaN(Date.parse(retrievedAtUtc)), "RETRIEVED_AT_UTC_INVALID");
const results = [];
for (const source of SOURCES) results.push(saveResult(source, await fetchSource(source)));
const manifest = {
  schemaVersion: SCHEMA,
  retrievedAtUtc,
  sourceCount: results.length,
  pdfFetchedCount: results.filter((source) => source.ok && source.pdfMagic).length,
  sources: results,
  automaticAdmissionPerformed: false,
  verdict: "C2_POSITIVE_OFFICIAL_REFERENCES_CAPTURED_REVIEW_REQUIRED",
};
writeImmutable("C2_POSITIVE_OFFICIAL_REFERENCE_FETCH_MANIFEST.json", `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
