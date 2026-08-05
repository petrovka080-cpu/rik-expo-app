import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { loadRequiredArtifactManifest } from "./requiredArtifactPreflight";

const root = process.cwd();
const manifestPath = path.join(root, "verification/v1/required-artifacts.manifest.json");
const manifest = loadRequiredArtifactManifest(manifestPath);
const sha256 = (value: Buffer | string) => crypto.createHash("sha256").update(value).digest("hex");
const fileHash = (file: string) => sha256(fs.readFileSync(path.join(root, file)));
const producerVersions: Record<string, string> = {
  "rpc-contract-evidence-v1": "2",
  "realtime-fanout-evidence-v1": "2",
};
for (const entry of manifest.entries) {
  const generatedRpc = /^artifacts\/S_RPC_[67]_/.test(entry.path);
  const generatedRealtime = /^artifacts\/S_RT_6_/.test(entry.path);
  if (!generatedRpc && !generatedRealtime) {
    if (/^artifacts\/S_RPC_[1-5]_/.test(entry.path) || /^artifacts\/S_RT_5_/.test(entry.path)) {
      entry.producer = {
        producer_id: "immutable-attested-evidence-cache-v1",
        owner: "verification/v1/required-artifacts.manifest.json",
        command: null,
        version: "1",
        deterministic: false,
      };
      entry.schema_version = entry.path.endsWith(".json") ? "legacy-json-contract:v1" : "legacy-markdown-proof:v1";
      entry.input_fingerprint = String(manifest.source_attestation.remediation_source_fingerprint ?? "unknown");
    }
    continue;
  }
  const artifactPath = path.join(root, entry.path);
  if (!fs.existsSync(artifactPath)) throw new Error(`producer_output_missing:${entry.path}`);
  entry.content_sha256 = fileHash(entry.path);
  entry.bytes = fs.statSync(artifactPath).size;
  entry.producer.version = producerVersions[entry.producer.producer_id];
  entry.schema_version = entry.path.endsWith(".json") ? "verification-generated-json:v2" : "verification-generated-markdown:v2";
  entry.input_fingerprint = entry.path.startsWith("artifacts/S_RT_6_")
    ? sha256(["src/lib/realtime/realtime.channels.ts", "src/lib/realtime/realtime.client.ts"].map((file) => `${file}:${fileHash(file)}`).join("\n"))
    : sha256(["src/lib/api/queryBoundary.ts", "tests/api/sRpc6HighRiskRpcValidation.contract.test.ts", "tests/api/sRpc7MutationResultEnvelopes.contract.test.ts"].map((file) => `${file}:${fileHash(file)}`).join("\n"));
}
const producerOwners = [...new Set(manifest.entries.map((entry) => entry.producer.owner))].sort();
const producerOwnerHashes = producerOwners.map((owner) => ({ owner, sha256: fs.existsSync(path.join(root, owner)) ? fileHash(owner) : null }));
const cacheContract = {
  schema: "verification-content-cache-key/v1",
  source_hashes: producerOwnerHashes,
  schema_config_hashes: ["package.json", "package-lock.json", "tsconfig.json", "verification/v1/impact-domain-ownership.map.json"].filter((file) => fs.existsSync(path.join(root, file))).map((file) => ({ path: file, sha256: fileHash(file) })),
  producer_versions: [...new Set(manifest.entries.map((entry) => `${entry.producer.producer_id}@${entry.producer.version}`))].sort(),
  platform_runtime_contract: `${process.platform}-${process.arch}-node${process.versions.node.split(".")[0]}`,
  input_manifest_sha256: String(manifest.source_attestation.evidence_manifest_sha256 ?? "unknown"),
};
manifest.source_attestation.cache_contract = cacheContract;
manifest.source_attestation.cache_key_sha256 = sha256(JSON.stringify(cacheContract));
const { generated_at: _generatedAt, content_sha256: _oldHash, ...body } = manifest;
const refreshed = { ...body, generated_at: new Date().toISOString(), content_sha256: sha256(JSON.stringify(body)) };
fs.writeFileSync(manifestPath, `${JSON.stringify(refreshed, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({ final_status: "GREEN_REQUIRED_ARTIFACT_MANIFEST_REFRESHED", entries: refreshed.entries.length, cache_key_sha256: refreshed.source_attestation.cache_key_sha256, content_sha256: refreshed.content_sha256 }, null, 2)}\n`);
