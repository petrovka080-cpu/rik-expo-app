import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  B8_EVIDENCE,
  B8_WORKTREE,
  B9_EVIDENCE,
  B9_RELEASE_A,
  B9_ROOT,
  B9_WORKTREE,
  EVIDENCE,
  EXPECTED_B8_HEAD,
  EXPECTED_B8_TREE,
  EXPECTED_B9_HEAD,
  EXPECTED_B9_TREE,
  EXPECTED_SPEC_BYTES,
  EXPECTED_SPEC_LINES,
  EXPECTED_SPEC_SHA256,
  SCHEMA_VERSION,
  SPEC_PATH,
  ensureDir,
  git,
  invariant,
  journal,
  producer,
  readJson,
  sha256File,
  sourceIdentity,
  writeJson,
  writeJsonl,
} from "./support";

const COMMAND = "npx tsx scripts/estimate/p0TruthRemediationR2/buildR2Preflight.ts";

function lines(file: string): number {
  return readFileSync(file, "utf8").split(/\r?\n/u).length - (readFileSync(file, "utf8").endsWith("\n") ? 1 : 0);
}

function exactGit(worktree: string) {
  return {
    head: git(["rev-parse", "HEAD"], worktree),
    tree: git(["show", "-s", "--format=%T", "HEAD"], worktree),
    status: git(["status", "--short"], worktree),
  };
}

function searchEvidence(patterns: string[], roots: string[]): string[] {
  const found = new Set<string>();
  for (const pattern of patterns.filter(Boolean)) {
    try {
      const output = execFileSync("rg", [
        "-l", "-F", "--hidden",
        "--glob", "*.json", "--glob", "*.jsonl", "--glob", "*.md",
        "--glob", "*.txt", "--glob", "*.log", "--glob", "*.html",
        "--", pattern, ...roots,
      ], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
      output.split(/\r?\n/u).filter(Boolean).forEach((file) => found.add(path.resolve(file)));
    } catch (error) {
      const status = Number((error as { status?: number }).status ?? 1);
      if (status !== 1) throw error;
    }
  }
  return [...found]
    .filter((file) => !path.basename(file).startsWith("P0_ALL_NON_ASPHALT_ESTIMATE_TRUTH_REMEDIATION_"))
    .sort((left, right) => left.localeCompare(right));
}

ensureDir(EVIDENCE);
const spec = {
  path: SPEC_PATH.replace(/\\/gu, "/"),
  bytes: statSync(SPEC_PATH).size,
  lines: lines(SPEC_PATH),
  sha256: sha256File(SPEC_PATH),
};
invariant(spec.bytes === EXPECTED_SPEC_BYTES, `SPEC_BYTES_MISMATCH:${spec.bytes}`);
invariant(spec.lines === EXPECTED_SPEC_LINES, `SPEC_LINES_MISMATCH:${spec.lines}`);
invariant(spec.sha256 === EXPECTED_SPEC_SHA256, `SPEC_SHA_MISMATCH:${spec.sha256}`);

const b8 = exactGit(B8_WORKTREE);
const b9 = exactGit(B9_WORKTREE);
invariant(b8.head === EXPECTED_B8_HEAD && b8.tree === EXPECTED_B8_TREE, "B8_EXACT_IDENTITY_MISMATCH");
invariant(b8.status === "", "B8_WORKTREE_NOT_CLEAN");
invariant(b9.head === EXPECTED_B9_HEAD && b9.tree === EXPECTED_B9_TREE, "B9_EXACT_IDENTITY_MISMATCH");
invariant(b9.status === "", "B9_WORKTREE_NOT_CLEAN");
git(["merge-base", "--is-ancestor", EXPECTED_B8_HEAD, EXPECTED_B9_HEAD]);

const b8TokenPath = path.join(B8_EVIDENCE, "FINAL_TOKEN.txt");
const b9ManifestPath = path.join(B9_RELEASE_A, "manifest.json");
invariant(existsSync(b8TokenPath), "B8_FINAL_TOKEN_MISSING");
invariant(existsSync(b9ManifestPath), "B9_PACKAGE_A_MANIFEST_MISSING");
const b9Manifest = readJson<Record<string, unknown>>(b9ManifestPath);
const b9ActivationFiles = [
  path.join(B9_EVIDENCE, "FINAL_TOKEN.txt"),
  path.join(B9_EVIDENCE, "FINAL_GREEN_REPORT_RU.md"),
  path.join(B9_ROOT, "15-activation", "ACTIVATION.json"),
].filter(existsSync);
invariant(b9ActivationFiles.length === 0, `B9_ACTIVATION_BOUNDARY_VIOLATED:${b9ActivationFiles.join(",")}`);

const beforeRoots = [
  "C:/Users/User/Downloads",
  "C:/Users/User/Desktop",
  "C:/Users/User/Documents",
  "C:/dev/rik-expo-app/artifacts",
].map((root) => path.resolve(root)).filter(existsSync);
const badCases = [
  {
    repro_id: "REPRO-001-CONCRETE-MONOLITHIC-WALL",
    request_text: "монолитная стена 200 кв метров ширина 0.3 метров и длина 10 метров высота 10 метров",
    observed_revision_id: "estimate_revision:professional_expanded_572556074:v1",
    defect: "GEOMETRY_CONFLICT_AND_FALSE_VOLUME",
  },
  {
    repro_id: "REPRO-002-PLASTER-UNMIGRATED-FALLBACK",
    request_text: "Грубая штукатурка стен",
    observed_revision_id: "estimate_revision:universal_estimator_319851525:v1",
    defect: "UNMIGRATED_GENERIC_PROFESSIONAL_FALLBACK",
  },
  {
    repro_id: "REPRO-003-HVAC-PLANT-ROOM",
    request_text: "HVAC_plant_room",
    observed_revision_id: "estimate_revision:consumer_draft_mswm14bp_5jbv3n:v1",
    defect: "GENERIC_REPEATED_QUANTITY_AND_OPERATION_IDENTITY",
  },
  {
    repro_id: "REPRO-004-HVAC-HEAT-PUMP",
    request_text: "Монтаж теплового насоса",
    observed_revision_id: "estimate_revision:professional_expanded_1605663941:v1",
    defect: "GENERIC_ONE_SET_EQUIPMENT_PIPING_AUTOMATION",
  },
  {
    repro_id: "REPRO-005-HISTORY-SNAPSHOT-MISSING",
    request_text: "Открыть и редактировать историю без локального snapshot",
    observed_revision_id: null,
    defect: "CONSUMER_REPAIR_HISTORY_SNAPSHOT_MISSING",
  },
  {
    repro_id: "REPRO-006-ASPHALT-KNOWN-GOOD-CONTROL",
    request_text: "Устройство асфальтобетонного дорожного покрытия",
    observed_revision_id: null,
    defect: null,
  },
].map((entry) => {
  const foundFiles = searchEvidence([
    entry.observed_revision_id ?? "",
    entry.defect ?? "",
  ], beforeRoots);
  return {
    schema_version: SCHEMA_VERSION,
    ...entry,
    immutable_before_source_status: foundFiles.length
      ? "LOCAL_MATCHES_FOUND_REQUIRES_CONTENT_CLASSIFICATION"
      : "USER_REFERENCED_OBSERVATION_ONLY_RAW_OUTPUT_NOT_FOUND_LOCALLY",
    searched_roots: beforeRoots.map((root) => root.replace(/\\/gu, "/")),
    preserved_files: foundFiles.map((file) => ({
      file: file.replace(/\\/gu, "/"),
      bytes: statSync(file).size,
      sha256: sha256File(file),
    })),
    source_head: EXPECTED_B8_HEAD,
    source_tree: EXPECTED_B8_TREE,
  };
});

const quarantine = {
  schema_version: SCHEMA_VERSION,
  status: "QUARANTINED_PENDING_TRUTH_REMEDIATION",
  activation_allowed: false,
  release_id: String(b9Manifest.releaseId ?? "2c1cb615-187c-50f6-980d-66b62bd3d5d1"),
  release_key: String(b9Manifest.releaseKey ?? "batch009-fire-r5-2c1cb615187c40f6"),
  package_sha256: String(b9Manifest.sourcePackageSha256 ?? "c94d02110953517a3202682a2b80899f070f501a0f8bfdc5d501ad8be9c46efb"),
  source_commit: EXPECTED_B9_HEAD,
  source_tree: EXPECTED_B9_TREE,
  affected_set: ["package-a", "package-b", "partial-db-b-import"],
  activation_artifacts_found: b9ActivationFiles,
  reason_ru: "BATCH009 создан до обязательной пользовательской truth-переаттестации R2; activation не выполнялась.",
};

const reproductionPath = path.join(EVIDENCE, "P0_INCIDENT_REPRODUCTION_INDEX.json");
const beforePath = path.join(EVIDENCE, "BAD_ESTIMATE_BEFORE_CASES.jsonl");
const quarantinePath = path.join(EVIDENCE, "BATCH009_QUARANTINE.json");
writeJsonl(beforePath, badCases);
writeJson(quarantinePath, quarantine);
writeJson(reproductionPath, {
  ...producer(COMMAND, "Фиксация P0 incident, exact predecessor и безопасной границы BATCH009", [SPEC_PATH, b8TokenPath, b9ManifestPath]),
  spec,
  exact_predecessor: b8,
  quarantined_candidate: b9,
  quarantine,
  cases_total: badCases.length,
  bad_reproductions: 5,
  asphalt_controls: 1,
  raw_before_evidence_complete: badCases.slice(0, 5).every((entry) => entry.preserved_files.length > 0),
  missing_raw_before_evidence_affected_repros: badCases.slice(0, 5).filter((entry) => entry.preserved_files.length === 0).map((entry) => entry.repro_id),
  current_successor: sourceIdentity(),
  status: "RED_MISSING_IMMUTABLE_RAW_USER_OUTPUTS_SCREENSHOTS_PDF_JSON_TRACES",
});

journal({
  gate: "A0",
  check: "Exact R2/B8 identity, B9 safe boundary и incident freeze",
  why: "Нельзя активировать кандидат или переписать исторические доказательства до фиксации инцидента.",
  command: COMMAND,
  result: "R2/B8/B9 identity GREEN; B9 activation отсутствует; raw user outputs для 5 bad repro локально не найдены.",
  status: "RED",
  affected: { exact_b8: 1, quarantined_b9: 1, frozen_case_metadata: 6, raw_before_missing: 5 },
  rootCause: "Исходные пользовательские JSON/PDF/screenshots/console traces не переданы вместе со спецификацией и не обнаружены в стандартных пользовательских каталогах.",
  repair: "Метаданные и точные revision IDs заморожены; after-evidence будет сохранено отдельно. GREEN до восстановления raw-before запрещён.",
  completed: "Exact predecessor доказан; B9 безопасно помещён в логический quarantine до activation.",
  next: "Построить backend search snapshot 12270 и route matrix 11610.",
});

console.info(JSON.stringify({
  status: "RED_A0_RAW_BEFORE_EVIDENCE_MISSING",
  spec,
  b8,
  b9,
  quarantine,
  evidence: [reproductionPath, beforePath, quarantinePath],
}, null, 2));
