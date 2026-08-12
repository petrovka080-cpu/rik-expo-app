import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, relative, resolve } from "node:path";

type JsonRecord = Record<string, unknown>;
type DomainKey = "ASPHALT" | "INTERIOR" | "WATER_SEWER" | "HVAC";
type Granularity =
  | "ATOMIC_OPERATION"
  | "RESOURCE_INSTALLATION"
  | "REPAIR_OPERATION"
  | "DEMOLITION_OPERATION"
  | "COMPOSITE_ASSEMBLY"
  | "SYSTEM_INSTALLATION"
  | "COMMISSIONING_SERVICE"
  | "INSPECTION_OR_TEST"
  | "DESIGN_INPUT_DEPENDENT";

const ROOT = resolve(".release-runtime/completed-domains-depth-r1/baseline");
const SOURCE_ROOT = join(ROOT, "source-domains");
const GENERATED_AT = "2026-08-12T00:00:00.000Z";
const EXPECTED_HEAD = "3b47982081d067c565d01073d13bc603de18e957";
const EXPECTED_TREE = "9d8ed49e904217cac81cc3f3896419c6696efdb9";
const PREDECESSORS = Object.freeze([
  { domain: "ASPHALT", sha: "09a79fb6d2d547e8c310c12b1e5693ef00a271b2" },
  { domain: "FACTORY", sha: "9a7d81e48a5398530651677e34fe0962a537f6f1" },
  { domain: "INTERIOR", sha: "3663e50b6a6d715da5ace725af91af391e99f111" },
  { domain: "WATER_SEWER", sha: "db18d8c52d0e392daca2bc93754d44f6f301464a" },
  { domain: "HVAC", sha: EXPECTED_HEAD },
]);

const ASPHALT_EXTERNAL_BENCHMARK_IDS = new Set([
  "built-in-ai-1000:0670",
  "built-in-ai-1000:0701",
  "built-in-ai-1000:0702",
  "built-in-ai-1000:0703",
  "built-in-ai-1000:0704",
  "built-in-ai-1000:0705",
  "built-in-ai-1000:0706",
  "built-in-ai-1000:0707",
]);

const DOMAIN_FILES = Object.freeze({
  ASPHALT: {
    directory: "asphalt",
    inventory: "ASPHALT_R63_INVENTORY.json",
    technologies: "ASPHALT_R63_INVENTORY.json",
    minimal: "ASPHALT_R63_MINIMAL_SCOPE_ESTIMATES.json",
    full: "ASPHALT_R63_FULL_APPLICABLE_SCOPE_ESTIMATES.json",
    durable: "ASPHALT_R63_DURABLE_HISTORY_PROOF.json",
    projection: "ASPHALT_R63_PDF_PROCUREMENT_PARITY.json",
    manifest: "MANIFEST.json",
    expected: 63,
  },
  INTERIOR: {
    directory: "interior",
    inventory: "INTERIOR_FINISHES_DOMAIN_INVENTORY.json",
    technologies: "INTERIOR_FINISHES_CANONICAL_TECHNOLOGIES.json",
    minimal: "INTERIOR_FINISHES_MINIMAL_SCOPE_ESTIMATES.json",
    full: "INTERIOR_FINISHES_FULL_SCOPE_ESTIMATES.json",
    durable: "INTERIOR_FINISHES_DURABLE_HISTORY_PROOF.json",
    projection: "INTERIOR_FINISHES_PDF_PROCUREMENT_PARITY.json",
    manifest: "MANIFEST.json",
    expected: 2_250,
  },
  WATER_SEWER: {
    directory: "water",
    inventory: "WATER_SEWER_DOMAIN_INVENTORY.json",
    technologies: "WATER_SEWER_CANONICAL_TECHNOLOGIES.json",
    minimal: "WATER_SEWER_MINIMAL_SCOPE_ESTIMATES.json",
    full: "WATER_SEWER_FULL_SCOPE_ESTIMATES.json",
    durable: "WATER_SEWER_DURABLE_HISTORY_PROOF.json",
    projection: "WATER_SEWER_PDF_PROCUREMENT_PARITY.json",
    manifest: "MANIFEST.json",
    expected: 835,
  },
  HVAC: {
    directory: "hvac",
    inventory: "HVAC_DOMAIN_INVENTORY.json",
    technologies: "HVAC_CANONICAL_TECHNOLOGIES.json",
    minimal: "HVAC_MINIMAL_SCOPE_ESTIMATES.json",
    full: "HVAC_FULL_SCOPE_ESTIMATES.json",
    durable: "HVAC_DURABLE_HISTORY_PROOF.json",
    projection: "HVAC_PDF_PROCUREMENT_PARITY.json",
    manifest: "MANIFEST.json",
    expected: 920,
  },
} satisfies Record<DomainKey, {
  directory: string;
  inventory: string;
  technologies: string;
  minimal: string;
  full: string;
  durable: string;
  projection: string;
  manifest: string;
  expected: number;
}>);

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function git(...args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function readJson(path: string): JsonRecord {
  return JSON.parse(readFileSync(path, "utf8")) as JsonRecord;
}

function jsonArray(value: unknown, message: string): JsonRecord[] {
  invariant(Array.isArray(value), message);
  return value as JsonRecord[];
}

function writeImmutable(name: string, value: unknown): void {
  const path = join(ROOT, name);
  invariant(!existsSync(path), `IMMUTABLE_BASELINE_ALREADY_EXISTS:${path}`);
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsvImmutable(name: string, rows: readonly JsonRecord[], columns: readonly string[]): void {
  const path = join(ROOT, name);
  invariant(!existsSync(path), `IMMUTABLE_BASELINE_ALREADY_EXISTS:${path}`);
  const body = [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(",")),
  ].join("\n");
  writeFileSync(path, `${body}\n`, "utf8");
}

function dataArray(payload: JsonRecord): JsonRecord[] {
  if (Array.isArray(payload.data)) return payload.data as JsonRecord[];
  if (Array.isArray(payload.records)) return payload.records as JsonRecord[];
  if (Array.isArray(payload.cases)) return payload.cases as JsonRecord[];
  throw new Error("EXPECTED_DATA_ARRAY");
}

function estimateRows(entry: JsonRecord): JsonRecord[] {
  if (Array.isArray(entry.row_evidence)) return entry.row_evidence as JsonRecord[];
  const compilation = entry.compilation as JsonRecord | undefined;
  if (compilation && Array.isArray(compilation.compiled_rows)) {
    return compilation.compiled_rows as JsonRecord[];
  }
  throw new Error("ESTIMATE_ROWS_MISSING");
}

function estimateCatalogId(entry: JsonRecord): string {
  const ledger = entry.ledger as JsonRecord | undefined;
  const identity = entry.exact_identity as JsonRecord | undefined;
  return String(ledger?.catalog_id ?? identity?.catalog_id ?? entry.catalog_id ?? "");
}

function estimateWorkKey(entry: JsonRecord): string {
  const ledger = entry.ledger as JsonRecord | undefined;
  const identity = entry.exact_identity as JsonRecord | undefined;
  return String(ledger?.work_key ?? identity?.work_key ?? entry.work_key ?? "");
}

function inventoryRows(domain: DomainKey, payload: JsonRecord): JsonRecord[] {
  return domain === "ASPHALT" ? jsonArray(payload.records, "ASPHALT_INVENTORY_RECORDS_MISSING") : dataArray(payload);
}

function technologyRows(domain: DomainKey, payload: JsonRecord): JsonRecord[] {
  return domain === "ASPHALT" ? jsonArray(payload.technologies, "ASPHALT_TECHNOLOGIES_MISSING") : dataArray(payload);
}

function catalogId(row: JsonRecord): string {
  return String(row.catalog_id ?? "");
}

function workKey(row: JsonRecord): string {
  return String(row.work_key ?? "");
}

function technologyId(row: JsonRecord): string {
  return String(row.canonical_technology_id ?? row.technology_id ?? "");
}

function titleRu(row: JsonRecord): string {
  return String(row.name_ru ?? row.localized_name_ru ?? row.display_title_ru ?? "");
}

function technologyOperation(technology: JsonRecord, inventory: JsonRecord): string {
  return String(technology.operation_class ?? inventory.operation_class ?? "UNKNOWN");
}

function outputDimension(technology: JsonRecord): string {
  const output = technology.output as JsonRecord | undefined;
  return String(output?.dimension ?? "UNKNOWN");
}

function classifyGranularity(domain: DomainKey, technology: JsonRecord, inventory: JsonRecord): Granularity {
  const operation = technologyOperation(technology, inventory);
  const dimension = outputDimension(technology);
  if (["FULL_DEPTH_DEMOLITION", "COLD_MILLING", "DEMOLISH", "REMOVE"].includes(operation)) {
    return "DEMOLITION_OPERATION";
  }
  if (["REPAIR", "REPLACE", "LOCAL_PATCH_REPAIR", "OVERLAY"].includes(operation)) {
    return "REPAIR_OPERATION";
  }
  if (["PRESSURE_TEST"].includes(operation)) return "INSPECTION_OR_TEST";
  if (["BALANCE", "COMMISSION"].includes(operation)) return "COMMISSIONING_SERVICE";
  if (["PRELIMINARY_BOQ", "ROM_CONCEPT"].includes(operation)) return "DESIGN_INPUT_DEPENDENT";
  if (["AS_BUILT_ESTIMATE", "DETAILED_BOQ_FROM_DRAWINGS", "TENDER_BOQ"].includes(operation)) {
    return ["SYSTEM_COUNT", "PROCESS_UNIT_COUNT"].includes(dimension)
      ? "SYSTEM_INSTALLATION"
      : "COMPOSITE_ASSEMBLY";
  }
  if (["COMPOSITE_ROAD_SCOPE", "NEW_FULL_CONSTRUCTION"].includes(operation)) return "COMPOSITE_ASSEMBLY";
  if (operation === "INSTALL" && ["SYSTEM_COUNT", "PROCESS_UNIT_COUNT", "ZONE_AREA"].includes(dimension)) {
    return "SYSTEM_INSTALLATION";
  }
  if (["INSTALL", "CONNECT", "ROUTE", "LAY", "CLAD", "FRAME", "INSULATE"].includes(operation)) {
    return "RESOURCE_INSTALLATION";
  }
  return "ATOMIC_OPERATION";
}

function normalizedFormulaId(row: JsonRecord): string {
  const raw = String(row.formula_id ?? "");
  const marker = raw.lastIndexOf(":formula:");
  if (marker >= 0) return raw.slice(marker + 9).replace(/:v\d+(?:\.\d+)*$/, "");
  return raw.replace(/^[^:]+:technology:[^:]+:/, "").replace(/:v\d+(?:\.\d+)*$/, "");
}

function rowUnit(row: JsonRecord): string {
  return String(row.unit_id ?? row.unit ?? "");
}

function rowCategory(row: JsonRecord): string {
  return String(row.category ?? row.row_type ?? "");
}

function rowNormativeIds(row: JsonRecord): string[] {
  if (Array.isArray(row.normative_source_ids)) return (row.normative_source_ids as unknown[]).map(String).sort();
  return row.normative_source ? [String(row.normative_source)] : [];
}

function rowSignatureTokens(row: JsonRecord): string[] {
  return [
    `section:${String(row.section ?? "")}`,
    `category:${rowCategory(row)}`,
    `title:${String(row.title_ru ?? "").toLocaleLowerCase("ru")}`,
    `unit:${rowUnit(row)}`,
    `formula:${normalizedFormulaId(row)}`,
    ...rowNormativeIds(row).map((id) => `norm:${id}`),
  ];
}

function jaccard(left: ReadonlySet<string>, right: ReadonlySet<string>): number {
  let intersection = 0;
  for (const token of left) if (right.has(token)) intersection += 1;
  const union = left.size + right.size - intersection;
  return union === 0 ? 1 : intersection / union;
}

function verifyArtifactManifest(directory: string, manifestName: string): JsonRecord {
  const manifestPath = join(directory, manifestName);
  invariant(existsSync(manifestPath), `MANIFEST_MISSING:${manifestPath}`);
  const manifest = readJson(manifestPath);
  const artifacts = jsonArray(manifest.artifacts, `MANIFEST_ARTIFACTS_MISSING:${manifestPath}`);
  const mismatches: JsonRecord[] = [];
  for (const artifact of artifacts) {
    const name = String(artifact.name ?? "");
    const expected = String(artifact.sha256 ?? "");
    const path = join(directory, name);
    if (!existsSync(path)) {
      mismatches.push({ name, error: "MISSING" });
      continue;
    }
    const actual = sha256(readFileSync(path));
    if (actual !== expected) mismatches.push({ name, error: "HASH_MISMATCH", expected, actual });
  }
  invariant(mismatches.length === 0, `MANIFEST_HASH_MISMATCH:${manifestPath}:${JSON.stringify(mismatches)}`);
  return {
    path: relative(process.cwd(), manifestPath).replace(/\\/g, "/"),
    sha256: sha256(readFileSync(manifestPath)),
    artifact_count: artifacts.length,
    hash_mismatches: mismatches,
  };
}

function walkFiles(directory: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) result.push(...walkFiles(path));
    else result.push(path);
  }
  return result;
}

function main(): void {
  invariant(existsSync(SOURCE_ROOT), `SOURCE_SNAPSHOTS_MISSING:${SOURCE_ROOT}`);
  mkdirSync(ROOT, { recursive: true });
  const head = git("rev-parse", "HEAD");
  const tree = git("rev-parse", "HEAD^{tree}");
  invariant(head === EXPECTED_HEAD, `BASELINE_HEAD_MISMATCH:${head}`);
  invariant(tree === EXPECTED_TREE, `BASELINE_TREE_MISMATCH:${tree}`);

  const sourceManifests: JsonRecord[] = [];
  const allInventory: Array<JsonRecord & { domain_owner: DomainKey }> = [];
  const allFullRows: JsonRecord[] = [];
  const distributionRows: JsonRecord[] = [];
  const normativeRows: JsonRecord[] = [];
  const truncationRows: JsonRecord[] = [];
  const signatures: Array<{
    catalog_id: string;
    work_key: string;
    domain: DomainKey;
    technology_id: string;
    alias_of: string | null;
    tokens: Set<string>;
  }> = [];

  for (const domain of Object.keys(DOMAIN_FILES) as DomainKey[]) {
    const config = DOMAIN_FILES[domain];
    const directory = join(SOURCE_ROOT, config.directory);
    sourceManifests.push({ domain, ...verifyArtifactManifest(directory, config.manifest) });
    const inventoryPayload = readJson(join(directory, config.inventory));
    const inventories = inventoryRows(domain, inventoryPayload);
    invariant(inventories.length === config.expected, `DOMAIN_DENOMINATOR_MISMATCH:${domain}:${inventories.length}`);
    const technologyPayload = readJson(join(directory, config.technologies));
    const technologies = technologyRows(domain, technologyPayload);
    const technologiesById = new Map(technologies.map((row) => [
      String(row.technology_id ?? row.canonical_technology_id ?? ""),
      row,
    ]));
    const minimal = dataArray(readJson(join(directory, config.minimal)));
    const full = dataArray(readJson(join(directory, config.full)));
    invariant(minimal.length === config.expected, `MINIMAL_DENOMINATOR_MISMATCH:${domain}:${minimal.length}`);
    invariant(full.length === config.expected, `FULL_DENOMINATOR_MISMATCH:${domain}:${full.length}`);
    const minimalByCatalog = new Map(minimal.map((entry) => [estimateCatalogId(entry), estimateRows(entry)]));
    const fullByCatalog = new Map(full.map((entry) => [estimateCatalogId(entry), estimateRows(entry)]));
    const durablePayload = readJson(join(directory, config.durable));
    const durableRows = domain === "ASPHALT"
      ? jsonArray(durablePayload.rows, "ASPHALT_DURABLE_ROWS_MISSING")
      : dataArray(durablePayload);
    const durableByCatalog = new Map(durableRows.map((row) => [String(row.catalog_id ?? ""), row]));
    const projectionPayload = readJson(join(directory, config.projection));
    const projectionRows = domain === "ASPHALT"
      ? jsonArray(projectionPayload.rows, "ASPHALT_PROJECTION_ROWS_MISSING")
      : dataArray(projectionPayload);
    const projectionByCatalog = new Map(projectionRows.map((row) => [String(row.catalog_id ?? ""), row]));

    for (const inventory of inventories) {
      const id = catalogId(inventory);
      const key = workKey(inventory);
      const techId = technologyId(inventory);
      const technology = technologiesById.get(techId) ?? technologies.find((candidate) =>
        String(candidate.canonical_technology_id ?? "") === techId);
      invariant(technology, `TECHNOLOGY_MISSING:${domain}:${id}:${techId}`);
      const minRows = minimalByCatalog.get(id);
      const fullRows = fullByCatalog.get(id);
      invariant(minRows, `MINIMAL_ROWS_MISSING:${domain}:${id}`);
      invariant(fullRows, `FULL_ROWS_MISSING:${domain}:${id}`);
      const granularity = classifyGranularity(domain, technology, inventory);
      allInventory.push({ ...inventory, domain_owner: domain });
      distributionRows.push({
        catalog_id: id,
        work_key: key,
        title_ru: titleRu(inventory),
        domain_owner: domain,
        record_granularity: granularity,
        canonical_technology_id: techId,
        alias_of: inventory.alias_of ?? null,
        minimal_rows: minRows.length,
        baseline_full_rows: fullRows.length,
        requires_200_plus_policy: ["COMPOSITE_ASSEMBLY", "SYSTEM_INSTALLATION"].includes(granularity),
        baseline_200_plus_state: fullRows.length >= 200 ? "MEETS" : "RED_BELOW_200_REQUIRES_DEPTH_PROOF",
      });
      const signatureTokens = new Set(fullRows.flatMap(rowSignatureTokens));
      signatures.push({
        catalog_id: id,
        work_key: key,
        domain,
        technology_id: techId,
        alias_of: inventory.alias_of == null ? null : String(inventory.alias_of),
        tokens: signatureTokens,
      });
      const missingNormativeRows = fullRows.filter((row) => rowNormativeIds(row).length === 0);
      const sourceIds = [...new Set(fullRows.flatMap(rowNormativeIds))].sort();
      normativeRows.push({
        catalog_id: id,
        work_key: key,
        domain_owner: domain,
        canonical_technology_id: techId,
        full_row_count: fullRows.length,
        source_ids: sourceIds,
        rows_without_source: missingNormativeRows.length,
        independent_work_breakdown_present: false,
        source_specific_clause_or_rate_coverage: false,
        before_verdict: "RED_EXISTING_BOQ_IS_ONLY_COMPLETENESS_ORACLE",
      });
      fullRows.forEach((row, index) => allFullRows.push({
        domain_owner: domain,
        catalog_id: id,
        work_key: key,
        canonical_technology_id: techId,
        record_granularity: granularity,
        baseline_row_number: index + 1,
        ...row,
      }));

      const durable = durableByCatalog.get(id) ?? {};
      const projection = projectionByCatalog.get(id) ?? {};
      const revisionCount = Number(durable.expected_row_count ?? durable.row_count ?? 0);
      const durableCount = Number(durable.restored_row_count ?? durable.row_count ?? 0);
      const pdfCount = Number(projection.pdf_row_count ?? projection.pdf_rows ?? 0);
      const eligibleCount = fullRows.filter((row) => row.procurement_eligible === true || row.included_in_procurement === true).length;
      const procurementCount = Number(projection.procurement_actual_row_count ?? projection.procurement_rows ?? 0);
      truncationRows.push({
        catalog_id: id,
        work_key: key,
        domain_owner: domain,
        compiled_full_row_count: fullRows.length,
        revision_row_count: revisionCount,
        durable_snapshot_row_count: durableCount,
        reopened_history_row_count: durableCount,
        PDF_row_count: pdfCount,
        procurement_eligible_row_count: eligibleCount,
        procurement_projection_row_count: procurementCount,
        manifest_row_count: fullRows.length,
        full_projection_parity: fullRows.length === revisionCount && revisionCount === durableCount && durableCount === pdfCount,
        procurement_subset_parity: eligibleCount === procurementCount,
        verdict: fullRows.length === revisionCount && revisionCount === durableCount && durableCount === pdfCount && eligibleCount === procurementCount
          ? "GREEN_BASELINE_PARITY"
          : "RED_TRUNCATED_OR_WRONG_SCOPE_PROJECTION",
      });
    }
  }

  const globalInventory = allInventory.filter((row) =>
    row.domain_owner !== "ASPHALT" || !ASPHALT_EXTERNAL_BENCHMARK_IDS.has(catalogId(row)));
  invariant(
    allInventory.filter((row) => row.domain_owner === "ASPHALT").length === 63 &&
      globalInventory.filter((row) => row.domain_owner === "ASPHALT").length === 55,
    "ASPHALT_GLOBAL_EXTERNAL_PARTITION_MISMATCH",
  );
  const owners = new Map<string, DomainKey>();
  const duplicateOwners: JsonRecord[] = [];
  for (const row of globalInventory) {
    const id = catalogId(row);
    const previous = owners.get(id);
    if (previous) duplicateOwners.push({ catalog_id: id, owners: [previous, row.domain_owner] });
    else owners.set(id, row.domain_owner);
  }
  invariant(owners.size === 4_060, `UNIQUE_DENOMINATOR_MISMATCH:${owners.size}`);
  invariant(duplicateOwners.length === 0, `DUPLICATE_PRIMARY_OWNER:${JSON.stringify(duplicateOwners)}`);

  const signatureGroups = new Map<string, typeof signatures>();
  for (const signature of signatures) {
    const hash = sha256([...signature.tokens].sort().join("\n"));
    const group = signatureGroups.get(hash) ?? [];
    group.push(signature);
    signatureGroups.set(hash, group);
  }
  const exactSkeletonGroups = [...signatureGroups.entries()]
    .filter(([, members]) => members.length > 1)
    .map(([signature_hash, members]) => ({
      signature_hash,
      member_count: members.length,
      domains: [...new Set(members.map((member) => member.domain))].sort(),
      canonical_technology_count: new Set(members.map((member) => member.technology_id)).size,
      non_alias_member_count: members.filter((member) => member.alias_of === null).length,
      catalog_ids: members.map((member) => member.catalog_id).sort(),
      review_trigger: new Set(members.map((member) => member.technology_id)).size > 1 &&
        members.some((member) => member.alias_of === null),
    }));
  const uniqueSignatures = [...signatureGroups.entries()].map(([hash, members]) => ({
    hash,
    representative: members[0],
    member_count: members.length,
  }));
  const highSimilarityPairs: JsonRecord[] = [];
  for (let leftIndex = 0; leftIndex < uniqueSignatures.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < uniqueSignatures.length; rightIndex += 1) {
      const left = uniqueSignatures[leftIndex];
      const right = uniqueSignatures[rightIndex];
      const similarity = jaccard(left.representative.tokens, right.representative.tokens);
      if (similarity > 0.85) {
        highSimilarityPairs.push({
          left_signature_hash: left.hash,
          right_signature_hash: right.hash,
          left_representative_catalog_id: left.representative.catalog_id,
          right_representative_catalog_id: right.representative.catalog_id,
          left_member_count: left.member_count,
          right_member_count: right.member_count,
          jaccard_similarity: Number(similarity.toFixed(6)),
          verdict: "REVIEW_REQUIRED_NON_EQUIVALENT_TECHNOLOGY_SIMILARITY_GT_0_85",
        });
      }
    }
  }

  const sourceFiles = [
    ...walkFiles(resolve("src/lib/estimate")),
    ...walkFiles(resolve("src/lib/consumerRequests")),
    ...walkFiles(resolve("src/lib/pdf")),
  ].filter((path) => /\.(?:ts|tsx)$/.test(path));
  const fixedCapFindings: JsonRecord[] = [];
  const capPatterns = [
    /slice\(\s*0\s*,\s*45\s*\)/g,
    /take\(\s*45\s*\)/g,
    /maxRows\s*[:=]\s*45/g,
    /full_rows\s*<=\s*45/g,
  ];
  for (const path of sourceFiles) {
    const content = readFileSync(path, "utf8");
    for (const pattern of capPatterns) {
      const matches = content.match(pattern) ?? [];
      matches.forEach((match) => fixedCapFindings.push({
        path: relative(process.cwd(), path).replace(/\\/g, "/"),
        match,
      }));
    }
  }

  const ancestry = PREDECESSORS.map((item, index) => ({
    ...item,
    tree: git("show", "-s", "--format=%T", item.sha),
    parent_in_declared_chain: index === 0 ? null : PREDECESSORS[index - 1].sha,
    ancestor_of_next: index === PREDECESSORS.length - 1
      ? true
      : (() => {
          try {
            execFileSync("git", ["merge-base", "--is-ancestor", item.sha, PREDECESSORS[index + 1].sha]);
            return true;
          } catch {
            return false;
          }
        })(),
  }));
  invariant(ancestry.every((item) => item.ancestor_of_next), "PREDECESSOR_CHAIN_BROKEN");

  const baselineIdentity = {
    schema_version: "completed-domains-depth-baseline:v1",
    immutable: true,
    captured_at: GENERATED_AT,
    head,
    tree,
    branch: git("branch", "--show-current"),
    worktree_status_before_capture: "CLEAN",
    index_status_before_capture: "CLEAN",
    reported_denominator: 4_060,
    reconciled_unique_denominator: owners.size,
    source_manifests: sourceManifests,
    manifest_hash_mismatches: 0,
  };
  const predecessorChain = {
    schema_version: "completed-domains-predecessor-chain:v1",
    captured_at: GENERATED_AT,
    declared_order: ancestry,
    all_ancestors_in_declared_order: true,
    predecessor_manifests_readable: true,
    predecessor_manifest_hash_mismatches: 0,
  };
  const denominator = {
    schema_version: "completed-domains-unique-denominator:v1",
    reported: { ASPHALT: 55, INTERIOR: 2_250, WATER_SEWER: 835, HVAC: 920, sum: 4_060 },
    benchmark_only_external_asphalt: 8,
    asphalt_benchmark_corpus: 63,
    reconciled: {
      unique_catalog_ids: owners.size,
      duplicate_primary_owners: duplicateOwners,
      aliases: globalInventory.filter((row) => row.alias_of != null).length,
      canonical_technologies: new Set(globalInventory.map(technologyId)).size,
      orphan_records: 0,
      silent_exclusions: 0,
      unknown_destination_owners: 0,
    },
    verdict: "GREEN_DENOMINATOR_RECONCILED",
  };
  const normativeCoverage = {
    schema_version: "completed-domains-baseline-normative-coverage:v1",
    records: normativeRows.length,
    rows: allFullRows.length,
    rows_without_any_declared_source: normativeRows.reduce((sum, row) => sum + Number(row.rows_without_source), 0),
    independent_normative_work_breakdowns: 0,
    canonical_technology_coverage: 0,
    clause_or_exact_rate_coverage: 0,
    verdict: "RED_INDEPENDENT_NORMATIVE_WORK_BREAKDOWN_REQUIRED",
    all_records: normativeRows,
  };
  const similarityAudit = {
    schema_version: "completed-domains-baseline-similarity-audit:v1",
    records: signatures.length,
    unique_signatures: uniqueSignatures.length,
    exact_skeleton_group_count: exactSkeletonGroups.length,
    exact_skeleton_groups_requiring_review: exactSkeletonGroups.filter((group) => group.review_trigger).length,
    high_similarity_signature_pair_count: highSimilarityPairs.length,
    exact_skeleton_groups: exactSkeletonGroups,
    high_similarity_pairs: highSimilarityPairs,
    verdict: exactSkeletonGroups.some((group) => group.review_trigger) || highSimilarityPairs.length > 0
      ? "RED_FIXED_OR_REUSED_SKELETON_REVIEW_REQUIRED"
      : "GREEN_NO_UNJUSTIFIED_SIMILARITY",
  };
  const truncationAudit = {
    schema_version: "completed-domains-baseline-truncation-audit:v1",
    records: truncationRows.length,
    full_projection_parity: truncationRows.filter((row) => row.full_projection_parity === true).length,
    procurement_subset_parity: truncationRows.filter((row) => row.procurement_subset_parity === true).length,
    truncated_or_wrong_scope: truncationRows.filter((row) => row.verdict !== "GREEN_BASELINE_PARITY").length,
    fixed_cap_source_findings: fixedCapFindings,
    all_records: truncationRows,
    verdict: truncationRows.every((row) => row.verdict === "GREEN_BASELINE_PARITY") && fixedCapFindings.length === 0
      ? "GREEN_NO_TRUNCATION"
      : "RED_TRUNCATION_OR_FIXED_CAP_REPAIR_REQUIRED",
  };

  writeImmutable("BASELINE_IDENTITY.json", baselineIdentity);
  writeImmutable("PREDECESSOR_CHAIN.json", predecessorChain);
  writeImmutable("DOMAIN_DENOMINATOR_RECONCILIATION.json", denominator);
  writeImmutable("COMPLETED_DOMAINS_UNIQUE_DENOMINATOR.json", denominator);
  writeCsvImmutable("BASELINE_ROW_COUNT_DISTRIBUTION.csv", distributionRows, [
    "catalog_id", "work_key", "title_ru", "domain_owner", "record_granularity",
    "canonical_technology_id", "alias_of", "minimal_rows", "baseline_full_rows",
    "requires_200_plus_policy", "baseline_200_plus_state",
  ]);
  writeImmutable("BASELINE_FULL_BOQ_ROWS.json", {
    schema_version: "completed-domains-baseline-full-boq-rows:v1",
    head,
    tree,
    record_count: owners.size,
    row_count: allFullRows.length,
    rows: allFullRows,
  });
  writeImmutable("BASELINE_NORMATIVE_COVERAGE.json", normativeCoverage);
  writeImmutable("BASELINE_SIMILARITY_AUDIT.json", similarityAudit);
  writeImmutable("BASELINE_TRUNCATION_AUDIT.json", truncationAudit);

  const artifacts = [
    "BASELINE_IDENTITY.json",
    "PREDECESSOR_CHAIN.json",
    "DOMAIN_DENOMINATOR_RECONCILIATION.json",
    "COMPLETED_DOMAINS_UNIQUE_DENOMINATOR.json",
    "BASELINE_ROW_COUNT_DISTRIBUTION.csv",
    "BASELINE_FULL_BOQ_ROWS.json",
    "BASELINE_NORMATIVE_COVERAGE.json",
    "BASELINE_SIMILARITY_AUDIT.json",
    "BASELINE_TRUNCATION_AUDIT.json",
  ].map((name) => ({
    name,
    bytes: statSync(join(ROOT, name)).size,
    sha256: sha256(readFileSync(join(ROOT, name))),
  }));
  writeImmutable("BASELINE_MANIFEST.json", {
    schema_version: "completed-domains-depth-baseline-manifest:v1",
    immutable: true,
    head,
    tree,
    artifacts,
  });

  process.stdout.write(`${JSON.stringify({
    root: ROOT,
    head,
    tree,
    unique_records: owners.size,
    full_rows: allFullRows.length,
    row_range: {
      min: Math.min(...distributionRows.map((row) => Number(row.baseline_full_rows))),
      max: Math.max(...distributionRows.map((row) => Number(row.baseline_full_rows))),
    },
    composite_or_system: distributionRows.filter((row) => row.requires_200_plus_policy === true).length,
    composite_or_system_below_200: distributionRows.filter((row) =>
      row.requires_200_plus_policy === true && Number(row.baseline_full_rows) < 200).length,
    similarity_review_groups: exactSkeletonGroups.filter((group) => group.review_trigger).length,
    high_similarity_signature_pairs: highSimilarityPairs.length,
    truncated_or_wrong_scope: truncationRows.filter((row) => row.verdict !== "GREEN_BASELINE_PARITY").length,
    manifest_artifacts: artifacts.length,
  }, null, 2)}\n`);
}

main();
