import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { Client } from "pg";

type Json = Record<string, any>;

const DATABASE_URL = process.env.R4A13_DATABASE_URL
  ?? "postgresql://postgres@127.0.0.1:55432/rik_r4_runtime_b5_v2";
const MANIFEST_PATH = resolve(process.env.R4A13_PRIMARY_SOURCE_MANIFEST_PATH
  ?? ".release-runtime/r4a13-6/s19-first-estimate/primary-source-review/primary-source-artifact-manifest.json");
const CONTRACT = "rik-expo-app.r4-a13-6.primary-source-artifact-review.v1";

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(`PRIMARY_SOURCE_ARTIFACT_MANIFEST:${code}`);
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function main(): Promise<void> {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as Json;
  invariant(manifest.schemaVersion === CONTRACT, "CONTRACT_MISMATCH");
  invariant(manifest.candidateReadOnly === true, "CANDIDATE_MUST_BE_READ_ONLY");
  invariant(manifest.databaseMutationPerformed === false, "DATABASE_MUTATION_FLAG_RED");
  invariant(manifest.activationPerformed === false, "ACTIVATION_FLAG_RED");
  invariant(manifest.deployPerformed === false, "DEPLOY_FLAG_RED");
  invariant(manifest.otaPerformed === false, "OTA_FLAG_RED");
  invariant(Array.isArray(manifest.artifacts) && manifest.artifacts.length > 0, "ARTIFACTS_EMPTY");

  const sourceIds = manifest.artifacts.map((artifact: Json) => String(artifact.sourceId));
  invariant(new Set(sourceIds).size === sourceIds.length, "DUPLICATE_SOURCE_ID");
  const localArtifacts = manifest.artifacts.map((artifact: Json) => {
    const sourceId = String(artifact.sourceId ?? "");
    const expectedSha256 = String(artifact.sha256 ?? "").toLowerCase();
    const expectedBytes = Number(artifact.bytes);
    invariant(sourceId.length > 0, "SOURCE_ID_EMPTY");
    invariant(/^https:\/\//u.test(String(artifact.officialUrl ?? "")), `OFFICIAL_URL_INVALID:${sourceId}`);
    invariant(/^[0-9a-f]{64}$/u.test(expectedSha256), `SHA256_INVALID:${sourceId}`);
    invariant(Number.isSafeInteger(expectedBytes) && expectedBytes > 0, `BYTE_COUNT_INVALID:${sourceId}`);
    const path = resolve(dirname(MANIFEST_PATH), String(artifact.file ?? ""));
    const bytes = readFileSync(path);
    invariant(bytes.length === expectedBytes, `BYTE_COUNT_MISMATCH:${sourceId}`);
    const actualSha256 = sha256(bytes);
    invariant(actualSha256 === expectedSha256, `SHA256_MISMATCH:${sourceId}`);
    return { sourceId, path: path.replaceAll("\\", "/"), bytes: bytes.length, sha256: actualSha256 };
  });

  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    const release = (await client.query(
      `select status,activated_at from public.estimate_definition_release where id=$1`,
      [String(manifest.candidateReleaseId)],
    )).rows[0] as Json | undefined;
    invariant(release?.status === "prepared" && release?.activated_at == null, "CANDIDATE_NOT_PREPARED_INACTIVE");
    const sourceRows = (await client.query(
      `select source_key,artifact_sha256 from public.estimate_normative_source where source_key=any($1::text[])`,
      [sourceIds],
    )).rows as Json[];
    const sourceById = new Map(sourceRows.map((row) => [String(row.source_key), row]));
    const sourceStates = localArtifacts.map((artifact) => {
      const databaseSource = sourceById.get(artifact.sourceId);
      const databaseSha256 = databaseSource?.artifact_sha256 == null
        ? null
        : String(databaseSource.artifact_sha256).toLowerCase();
      return {
        ...artifact,
        databaseRegistered: databaseSource != null,
        databaseSha256,
        databaseHashMatches: databaseSha256 == null ? null : databaseSha256 === artifact.sha256,
      };
    });
    process.stdout.write(`${JSON.stringify({
      status: "PRIMARY_SOURCE_ARTIFACT_MANIFEST_VERIFIED",
      schemaVersion: CONTRACT,
      candidate: {
        definitionReleaseId: String(manifest.candidateReleaseId),
        status: "prepared",
        activatedAt: null,
      },
      artifactCount: sourceStates.length,
      sourceStates,
      databaseMutationPerformed: false,
      activationPerformed: false,
      deployPerformed: false,
      otaPerformed: false,
    }, null, 2)}\n`);
  } finally {
    await client.end();
  }
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
