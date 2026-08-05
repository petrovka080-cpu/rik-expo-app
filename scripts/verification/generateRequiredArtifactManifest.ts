import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { CURRENT_CORE_REMEDIATION_EVIDENCE_PATHS } from "../release/currentCoreRemediationEvidencePrerequisites";

type LegacyEntry = {
  path: string;
  sha256: string;
  bytes: number;
};

type LegacyManifest = {
  sourceRoot?: string;
  files: LegacyEntry[];
};

type Producer = {
  producer_id: string;
  owner: string;
  command: string | null;
  version: string;
  deterministic: boolean;
};

const PRODUCERS = {
  rpc: {
    producer_id: "rpc-contract-evidence-v1",
    owner: "scripts/verification/producers/generateRpcContractEvidence.ts",
    command: "node node_modules/tsx/dist/cli.mjs scripts/verification/producers/generateRpcContractEvidence.ts",
    version: "2",
    deterministic: true,
  },
  realtime: {
    producer_id: "realtime-fanout-evidence-v1",
    owner: "scripts/verification/producers/generateRealtimeFanoutEvidence.ts",
    command: "node node_modules/tsx/dist/cli.mjs scripts/verification/producers/generateRealtimeFanoutEvidence.ts",
    version: "2",
    deterministic: true,
  },
  ontology: {
    producer_id: "construction-work-ontology-closeout-v1",
    owner: "scripts/audit/runConstructionWorkOntologyMigrationCloseout.ts",
    command: "node node_modules/tsx/dist/cli.mjs scripts/audit/runConstructionWorkOntologyMigrationCloseout.ts",
    version: "1",
    deterministic: true,
  },
  selectedWork: {
    producer_id: "selected-work-enterprise-1000-v1",
    owner: "scripts/e2e/runSelectedWorkEnterpriseVisible1000RealInputAcceptance.ts",
    command: "node node_modules/tsx/dist/cli.mjs scripts/e2e/runSelectedWorkEnterpriseVisible1000RealInputAcceptance.ts --release-gate-self-check",
    version: "1",
    deterministic: true,
  },
  canary: {
    producer_id: "ai-estimate-canary-evaluation-v1",
    owner: "scripts/e2e/runAiEstimateCanaryEvaluationProof.ts",
    command: "node node_modules/tsx/dist/cli.mjs scripts/e2e/runAiEstimateCanaryEvaluationProof.ts",
    version: "1",
    deterministic: false,
  },
  observability: {
    producer_id: "ai-observability-safety-v1",
    owner: "scripts/ai/verifyAiObservabilitySafety.ts",
    command: "node node_modules/tsx/dist/cli.mjs scripts/ai/verifyAiObservabilitySafety.ts --write-canonical",
    version: "1",
    deterministic: true,
  },
  real10000: {
    producer_id: "real10000-corpus-evidence-v1",
    owner: "scripts/e2e/runReal10000DiverseConstructionWorksExpandedEstimateProof.ts",
    command: null,
    version: "1",
    deterministic: false,
  },
  releasePipeline: {
    producer_id: "release-pipeline-mobile-runtime-v1",
    owner: "scripts/release/runReleasePipelineNoTimeoutMobileRuntimeProof.ts",
    command: "node node_modules/tsx/dist/cli.mjs scripts/release/runReleasePipelineNoTimeoutMobileRuntimeProof.ts --write-canonical",
    version: "1",
    deterministic: false,
  },
  boq: {
    producer_id: "professional-boq-closeout-v1",
    owner: "scripts/audit/runMultiDomainProfessionalBoqCloseout.ts",
    command: "node node_modules/tsx/dist/cli.mjs scripts/audit/runMultiDomainProfessionalBoqCloseout.ts",
    version: "1",
    deterministic: true,
  },
  attestedLegacy: {
    producer_id: "immutable-attested-evidence-cache-v1",
    owner: "verification/v1/required-artifacts.manifest.json",
    command: null,
    version: "1",
    deterministic: false,
  },
} satisfies Record<string, Producer>;

function argument(name: string): string {
  const prefix = `--${name}=`;
  const value = process.argv.find((item) => item.startsWith(prefix))?.slice(prefix.length);
  if (!value) throw new Error(`missing_argument:${name}`);
  return path.resolve(value);
}

function sha256(value: Buffer | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function producerFor(artifactPath: string): Producer {
  if (/^artifacts\/S_RPC_[67]_/.test(artifactPath)) return PRODUCERS.rpc;
  if (/^artifacts\/S_RT_6_/.test(artifactPath)) return PRODUCERS.realtime;
  if (artifactPath.startsWith("artifacts/S_CATALOG_WORK_PLATFORM_ADDITIVE_ONTOLOGY_MIGRATION/")) {
    return PRODUCERS.ontology;
  }
  if (artifactPath.startsWith("artifacts/S_SELECTED_WORK_ENTERPRISE_VISIBLE_1000_REAL_INPUT_ESTIMATE_ACCEPTANCE/")) {
    return PRODUCERS.selectedWork;
  }
  if (artifactPath.startsWith("artifacts/S_AI_ESTIMATE_CANARY_EVALUATION/")) return PRODUCERS.canary;
  if (artifactPath.startsWith("artifacts/S_AI_OBSERVABILITY_") || artifactPath.startsWith("artifacts/S_AI_OBS_")) {
    return PRODUCERS.observability;
  }
  if (artifactPath.startsWith("artifacts/S_REAL_10000_")) return PRODUCERS.real10000;
  if (artifactPath === "artifacts/S_RELEASE_PIPELINE_matrix.json") return PRODUCERS.releasePipeline;
  if (artifactPath.startsWith("artifacts/S_MULTI_DOMAIN_PROFESSIONAL_BOQ_RECIPE_COMPILER_EXACT_MATERIALS/")) {
    return PRODUCERS.boq;
  }
  return PRODUCERS.attestedLegacy;
}

function contentType(artifactPath: string): "application/json" | "text/markdown" {
  return artifactPath.endsWith(".json") ? "application/json" : "text/markdown";
}

const inputPath = argument("input");
const summaryPath = argument("summary");
const outputPath = argument("output");
const input = JSON.parse(fs.readFileSync(inputPath, "utf8")) as LegacyManifest;
const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8")) as {
  currentHead?: string;
  sourceFingerprint?: string;
  finalStatus?: string;
  filesExpected?: number;
  filesRun?: number;
  suitesFailed?: number;
  testsFailed?: number;
};

if (summary.finalStatus !== "GREEN_CURRENT_CORE_REMEDIATION_153") {
  throw new Error(`legacy_attestation_not_green:${String(summary.finalStatus)}`);
}
if (summary.suitesFailed !== 0 || summary.testsFailed !== 0) {
  throw new Error("legacy_attestation_has_failures");
}
const expectedPaths = [...CURRENT_CORE_REMEDIATION_EVIDENCE_PATHS];
const actualPaths = input.files.map((entry) => entry.path);
if (new Set(actualPaths).size !== actualPaths.length) throw new Error("legacy_manifest_duplicate_paths");
const missing = expectedPaths.filter((entry) => !actualPaths.includes(entry));
const unexpected = actualPaths.filter((entry) => !expectedPaths.includes(entry as (typeof expectedPaths)[number]));
if (missing.length || unexpected.length) {
  throw new Error(`legacy_manifest_path_drift:${JSON.stringify({ missing, unexpected })}`);
}

const entries = input.files
  .map((entry) => {
    if (!/^artifacts\//.test(entry.path) || entry.path.includes("..") || path.isAbsolute(entry.path)) {
      throw new Error(`unsafe_artifact_path:${entry.path}`);
    }
    if (!/^[a-f0-9]{64}$/.test(entry.sha256) || !Number.isInteger(entry.bytes) || entry.bytes <= 0) {
      throw new Error(`invalid_artifact_attestation:${entry.path}`);
    }
    const producer = producerFor(entry.path);
    const canonicalPath = path.join(process.cwd(), entry.path);
    const canonicalGenerated = producer.deterministic && fs.existsSync(producer.owner) && fs.existsSync(canonicalPath);
    const bytes = canonicalGenerated ? fs.statSync(canonicalPath).size : entry.bytes;
    const contentSha256 = canonicalGenerated ? sha256(fs.readFileSync(canonicalPath)) : entry.sha256;
    return {
      path: entry.path,
      content_type: contentType(entry.path),
      schema_version: entry.path.endsWith(".json") ? "legacy-json-contract:v1" : "legacy-markdown-proof:v1",
      content_sha256: contentSha256,
      bytes,
      input_fingerprint: summary.sourceFingerprint ?? null,
      producer,
      retention_policy: entry.bytes > 1_000_000 ? "external-evidence-store-90d" : "external-evidence-store-until-superseded",
      required_by_gates: ["full-jest"],
    };
  })
  .sort((left, right) => left.path.localeCompare(right.path));

const body = {
  schema: "verification-required-artifacts:v1",
  manifest_version: 1,
  source_attestation: {
    remediation_head_sha: summary.currentHead ?? null,
    remediation_source_fingerprint: summary.sourceFingerprint ?? null,
    remediation_final_status: summary.finalStatus,
    evidence_manifest_sha256: sha256(fs.readFileSync(inputPath)),
    remediation_summary_sha256: sha256(fs.readFileSync(summaryPath)),
    artifact_count: entries.length,
  },
  generated_at_excluded_from_content_hash: true,
  entries,
};
const manifest = {
  ...body,
  generated_at: new Date().toISOString(),
  content_sha256: sha256(JSON.stringify(body)),
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
process.stdout.write(
  `${JSON.stringify({
    final_status: "GREEN_REQUIRED_ARTIFACT_MANIFEST_GENERATED",
    output_path: outputPath,
    entries: entries.length,
    deterministic_entries: entries.filter((entry) => entry.producer.deterministic).length,
    externally_attested_entries: entries.filter((entry) => !entry.producer.deterministic).length,
    content_sha256: manifest.content_sha256,
    file_sha256: sha256(fs.readFileSync(outputPath)),
  }, null, 2)}\n`,
);
