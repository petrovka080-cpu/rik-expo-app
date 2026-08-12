import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const SCHEMA = "m1-asphalt-c2-minimum-official-lanes-r1:v1";
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
    sourceId: "KG_CABINET_NPA_REGISTRY_CURRENT",
    sourceClass: "OFFICIAL_KG_CABINET_NPA_REGISTRY",
    url: "https://www.gov.kg/ru/npa/",
  },
  {
    sourceId: "KG_EGOV_MINSTROY_PROFILE_CURRENT",
    sourceClass: "OFFICIAL_KG_EGOV_MINISTRY_PROFILE",
    url: "https://egov.kg/ru/ministry/construction",
  },
  {
    sourceId: "KG_NISM_STANDARDS_CATALOG_ROOT_CURRENT",
    sourceClass: "OFFICIAL_KG_STANDARDS_CATALOG",
    url: "https://standarts.nism.gov.kg/",
  },
  {
    sourceId: "KG_NISM_GOST_9128_2013_CATALOG_RECORD_CURRENT",
    sourceClass: "OFFICIAL_KG_STANDARD_IDENTITY_CATALOG",
    url: "https://standarts.nism.gov.kg/ru/catalog/4500-smesi-asfalytobetonnie-polimerasfalytobetonnie-asfalytobeton-polimerasfalytobeton-dlya-avtomobilynih-dorog-i-aerodromov-tehnicheskie-usloviya/show",
  },
  {
    sourceId: "EAEU_TR_TS_014_2011_OFFICIAL_RECORD_CURRENT",
    sourceClass: "OFFICIAL_EAEU_TECHNICAL_REGULATION_RECORD",
    url: "https://eec.eaeunion.org/comission/department/deptexreg/tr/bezopAutodorog.php",
  },
  {
    sourceId: "KG_MINSTROY_NORMATIVE_SERVICES_ROOT_CURRENT",
    sourceClass: "OFFICIAL_KG_NORMATIVE_SERVICES_REGISTRY",
    url: "https://minstroy.gov.kg/ru/kyzmat/",
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
  invariant(!existsSync(file), `IMMUTABLE_C2_MINIMUM_LANE_OUTPUT_ALREADY_EXISTS:${relative}`);
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
          accept: "text/html,application/json,application/pdf;q=0.9,*/*;q=0.8",
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
  const extension = /json/iu.test(contentType) ? "json" : /pdf/iu.test(contentType) ? "pdf" : "html";
  const snapshotFile = `minimum-official-lane-snapshots/${source.sourceId}.${hash.slice(0, 16)}.${extension}`;
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
for (const source of SOURCES) results.push(saveResult(source, await fetchSource(source)));
const manifest = {
  schemaVersion: SCHEMA,
  retrievedAtUtc,
  sourceCount: results.length,
  fetchedCount: results.filter((source) => source.ok).length,
  networkErrorCount: results.filter((source) => source.fetchVerdict === "NETWORK_ERROR_NOT_SOURCE_STATUS_PROOF").length,
  httpErrorCount: results.filter((source) => source.fetchVerdict === "HTTP_ERROR_NOT_SOURCE_STATUS_PROOF").length,
  sources: results,
  automaticAdmissionPerformed: false,
  verdict: "C2_MINIMUM_OFFICIAL_LANES_CAPTURED_REVIEW_REQUIRED",
};
writeImmutable("C2_MINIMUM_OFFICIAL_LANE_FETCH_MANIFEST.json", `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
