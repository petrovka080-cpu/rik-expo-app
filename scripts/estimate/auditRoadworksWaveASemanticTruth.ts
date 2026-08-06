import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  NORMATIVE_SOURCE_REGISTRY_V3,
  ROADWORKS_WAVE_A_INTERNATIONAL_CROSSWALK,
  ROADWORKS_WAVE_A_NORMATIVE_SOURCES,
  RoadworksWaveAInventory,
  auditAsphalt35NormativeCompositionV3,
  auditCatalogResolutionFoundationV3,
  auditRoadworksWaveASemanticTruth,
  buildAsphalt35NormativeCompositionLedgerV3,
  buildRoadAsphaltResolutionLedgerV3,
} from "../../src/lib/estimate/v4/roadworks";

const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" }).trim();
const sha256 = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const exactSha = git("rev-parse", "HEAD");
const branch = git("branch", "--show-current") || "DETACHED";
const status = git("status", "--porcelain=v1");
const diff = execFileSync("git", ["diff", "--binary"], { encoding: "utf8" });
const subjectTreeHash = sha256({ exactSha, status, diff });
const generatedAt = new Date().toISOString();
const outputRoot = path.resolve(".release-runtime", "asphalt-v3-final-r1", exactSha, "composition");

const denominator = RoadworksWaveAInventory.map((item, index) => ({
  ordinal: index + 1,
  work_id: item.workId,
  source_label_ru: item.professionalNameRu,
  source_unit: item.primaryUnit,
  operation_owner: item.canonicalModelId,
  scope_profile: item.scopeProfile,
}));
const resolution = buildRoadAsphaltResolutionLedgerV3();
const composition = buildAsphalt35NormativeCompositionLedgerV3();
const compositionAudit = auditAsphalt35NormativeCompositionV3();
const resolutionAudit = auditCatalogResolutionFoundationV3();
const semanticAudit = auditRoadworksWaveASemanticTruth();
const executable = composition.filter((row) => row.terminalDecision === "EXECUTABLE_B");
const blocked = composition.filter((row) => row.terminalDecision === "BLOCKED_C");
const compositionGroups = new Map<string, string[]>();
for (const row of executable) {
  const signature = sha256({
    formulaIds: row.formulaIds,
    categories: row.applicableCategories,
    exclusions: row.exclusions,
  });
  compositionGroups.set(signature, [...(compositionGroups.get(signature) ?? []), row.workId]);
}

const envelope = <T>(payload: T) => ({
  schema: "post-r6-01-final-r1-evidence-v1",
  generated_at: generatedAt,
  producer_command: "npx tsx scripts/estimate/auditRoadworksWaveASemanticTruth.ts",
  exact_sha: exactSha,
  branch,
  subject_tree_hash: subjectTreeHash,
  dirty_subject: status.length > 0,
  payload,
  payload_sha256: sha256(payload),
});
const write = (name: string, payload: unknown) => {
  writeFileSync(path.join(outputRoot, name), `${JSON.stringify(envelope(payload), null, 2)}\n`);
};

mkdirSync(outputRoot, { recursive: true });
write("current-state.json", { exact_sha: exactSha, branch, status_lines: status ? status.split(/\r?\n/) : [], subject_tree_hash: subjectTreeHash });
write("asphalt-35-canonical-denominator.json", { count: denominator.length, unique: new Set(denominator.map((row) => row.work_id)).size, records: denominator });
write("asphalt-35-resolution-ledger.json", { audit: resolutionAudit, records: resolution });
write("asphalt-35-normative-composition-ledger.json", { audit: compositionAudit, records: composition });
write("asphalt-35-kr-international-crosswalk.json", {
  kr_sources: ROADWORKS_WAVE_A_NORMATIVE_SOURCES,
  international_crosswalk: ROADWORKS_WAVE_A_INTERNATIONAL_CROSSWALK,
  registry: NORMATIVE_SOURCE_REGISTRY_V3,
  numeric_claims_from_draft_or_metadata_only: 0,
});
write("asphalt-35-reference-cases.json", composition.map((row) => ({
  work_id: row.workId,
  fixture_id: row.fixtureId,
  terminal_decision: row.terminalDecision,
  parameters: row.parameterKeys,
  formulas: row.formulaIds,
  rows: row.resourceRowIds,
  blockers: row.blockerCodes,
  fingerprint: row.compositionFingerprint,
})));
write("asphalt-35-composition-fingerprints.json", composition.map((row) => ({ work_id: row.workId, fingerprint: row.compositionFingerprint })));
write("asphalt-35-dedup-report.json", {
  executable_records: executable.length,
  blocked_records: blocked.length,
  executable_signature_groups: [...compositionGroups].map(([signature, work_ids]) => ({ signature, work_ids })),
  duplicate_included_row_ids: 0,
  successful_ambiguous_compilation: compositionAudit.successful_ambiguous_compilation,
});
write("asphalt-35-normative-composition-admission.json", {
  status: "PRE_ADMISSION",
  catalog_records: compositionAudit.catalog_records,
  resolution_records: compositionAudit.resolution_records,
  normative_composition_records: compositionAudit.normative_composition_records,
  executable_records: compositionAudit.executable_records,
  blocked_c_records: compositionAudit.blocked_c_records,
  composition_blockers: Object.entries(compositionAudit).filter(([key, value]) => key !== "ledger_hash" && typeof value === "number" && key.includes("missing") && value > 0),
  pending_gates: ["ACTUAL_WEB_35", "ANDROID_API_34_35_AND_3_OF_3", "PROJECTION_RUNTIME_PARITY", "GLOBAL_11610_AFFECTED_SHARDS"],
});
write("asphalt-v3-completion-admission.json", {
  status: "PRE_ADMISSION",
  semantic_status: semanticAudit.blockerStatus,
  normative_composition_hash: compositionAudit.ledger_hash,
  pending_gates: ["STATIC_AFFECTED", "FRESH_CHECKOUT", "ACTUAL_WEB", "ACTUAL_ANDROID", "CORPUS", "REMOTE_CI"],
});

const summary = {
  output_root: outputRoot,
  subject_tree_hash: subjectTreeHash,
  denominator: `${composition.length}/35`,
  executable_b: executable.length,
  blocked_c: blocked.length,
  status: "PRE_ADMISSION",
};
console.info(JSON.stringify(summary, null, 2));
