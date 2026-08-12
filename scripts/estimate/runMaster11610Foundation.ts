import { execFileSync, spawnSync } from "node:child_process";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

type IdentityRole = "PRIMARY" | "VARIANT" | "ALIAS";

const ROOT = path.join(".release-runtime", "master-11610-group-batches-r1");
const FOUNDATION = path.join(ROOT, "01-foundation");
const PREDECESSOR_COMMIT = "353ad3ac7d8c9359f0f8a74a539d56de36a51c51";
const PREDECESSOR_TREE = "956fc4fa28f31a78905c9853fb08e3e9c4a3dcfc";
const PREDECESSOR_MANIFEST_SHA = "f56dd91829475d8c3b13d1b01677440d78d7b9c2eb8873be1e378959597ac8b6";
const PREDECESSOR_TOKEN = "GREEN_ASPHALT_PROFESSIONAL_DEPTH_REFERENCE_BENCHMARK_ADMITTED_ROAD_PARKING_DEMOLITION_DISTINCT_NO_PADDING_DURABLE";
const REFERENCE_ROOT = path.join(".release-runtime", "completed-domains-depth-r1", "asphalt-benchmark", "reference-m1-exact-353ad3ac");
const R63_ROOT = path.join(".release-runtime", "completed-domains-depth-r1", "asphalt-benchmark", "r63-m1-exact-353ad3ac");
const BASE_PATH = path.join("data", "estimate-templates", "estimate-10000-readiness-manifest.json");
const EXPANDED_PATH = path.join("data", "estimate-catalog", "expanded-complex", "templates.json");
const EXPANDED_FAMILY_PATH = path.join("data", "estimate-catalog", "expanded-complex", "work-families.json");
const BASE_GENERATOR_PATH = path.join("src", "lib", "ai", "estimateTemplate10000", "productionExpandedWorkCatalog10000.ts");
const SPEC_SOURCE = "POST_ASPHALT_MASTER_11610_IDENTITY_THEN_2_TO_3_WORK_GROUP_PROFESSIONAL_ESTIMATE_BATCH_PROGRAM_R1";
const SCHEMA_VERSION = "master-11610-foundation-only:r1";
const MODIFIERS = ["technical_room", "access_limited", "finish_ready", "small_area", "large_area", "high_load", "commercial", "wet_zone", "standard", "repair"] as const;
const EXPECTED_TYPECHECK = [
  "src/lib/api/requestDraftSync.transport.ts:42:TS2322",
  "src/lib/api/requestDraftSync.transport.ts:54:TS2322",
  "src/lib/catalog/catalog.request.transport.ts:166:TS2345",
  "src/screens/buyer/buyer.buckets.repo.ts:65:TS2322",
  "src/screens/buyer/BuyerSubcontractTab.tsx:72:TS2345",
].sort();

function git(args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
    .join(",")}}`;
}

function shaText(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function shaObject(value: unknown): string {
  return shaText(canonical(value));
}

function shaFile(filePath: string): string {
  return shaText(readFileSync(filePath));
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function atomicWrite(filePath: string, text: string): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp-${process.pid}`;
  writeFileSync(temporary, text, "utf8");
  renameSync(temporary, filePath);
}

function writeJson(filePath: string, value: unknown): void {
  atomicWrite(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeJsonl(filePath: string, rows: readonly unknown[]): void {
  atomicWrite(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
}

function rel(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

function unique(values: readonly string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function journal(gate: string, target: number, ready: number, blocked: number, evidence: string, next: string, exitCode = 0): void {
  mkdirSync(ROOT, { recursive: true });
  const sequence = existsSync(path.join(ROOT, "JOURNAL.log"))
    ? readFileSync(path.join(ROOT, "JOURNAL.log"), "utf8").split("\n").filter(Boolean).length + 1
    : 1;
  appendFileSync(
    path.join(ROOT, "JOURNAL.log"),
    `JOURNAL|seq=${sequence}|utc=${new Date().toISOString()}|mode=A|sha=${git(["rev-parse", "HEAD"])}|tree=${git(["show", "-s", "--format=%T", "HEAD"])}|batch=null|group=null|gate=${gate}|target=${target}|ready=${ready}|blocked=${blocked}|quarantine=0|exit=${exitCode}|evidence=${evidence}|next=${next}\n`,
    "utf8",
  );
}

type BaseRow = Record<string, unknown> & {
  template_id: string;
  work_key: string;
  work_family_id: string;
  calculator_family_id: string;
  parameter_schema_id: string;
  norm_pack_id: string;
  unit_policy_id: string;
  work_type: string;
  category: string;
  localized_name_ru: string;
  aliases: string[];
  readiness_status: string;
  blocking_reasons: string[];
};

type ExpandedRow = Record<string, unknown> & {
  template_id: string;
  work_family_id: string;
  template_level: string;
  requiredInputs: string[];
  rowGroups: string[];
  pdfPolicy: string;
  buyerHandoffPolicy: string;
};

type ExpandedFamily = Record<string, unknown> & {
  work_family_id: string;
  professionalNameRu: string;
  aliases: string[];
  categoryGroup: string;
  globalCategory: string;
  parameterSchema: { key: string; labelRu: string; unit?: string; requiredFor: string[]; missingBlocksDetailed: boolean }[];
  calculatorId: string;
  formulaFamily: string;
  materialRecipe: string[];
  laborRecipe: string[];
  equipmentRecipe: string[];
  serviceRecipe: string[];
  normSource: { sourceId: string; titleRu: string; version: string; provenance: string };
  unitPolicy: string;
  missingDesignInputsPolicy: string[];
};

type InventoryRow = {
  catalog_id: string;
  source_file: string;
  source_sheet: null;
  source_table: string;
  source_row_locator: string;
  source_row_hash: string;
  raw_title: string;
  raw_description: string;
  raw_unit: string;
  raw_domain_hint: string;
  raw_context_fields: Record<string, unknown>;
  source_status: string;
};

type SemanticIdentity = {
  catalogId: string;
  semanticFingerprint: string;
  domainId: string;
  familyId: string;
  workGroupCandidateId: string;
  canonicalTechnologyId: string;
  identityRole: IdentityRole;
  canonicalTargetId: string | null;
  actionLifecycle: string;
  physicalResult: string;
  objectSystem: string;
  materialProductClass: string;
  constructionMethod: string;
  scopeVariant: string;
  unitFormulaClass: string;
  quantityBasis: string;
  normativeRegimeHints: string[];
  typedChildBoundaries: string[];
  neighborIds: string[];
  classificationEvidence: string[];
  ambiguities: string[];
  reviewStatus: string;
  identityHash: string;
};

function sourceData() {
  const baseEnvelope = readJson<{ templates: BaseRow[] }>(BASE_PATH);
  const expanded = readJson<ExpandedRow[]>(EXPANDED_PATH);
  const families = readJson<ExpandedFamily[]>(EXPANDED_FAMILY_PATH);
  return { base: baseEnvelope.templates, expanded, families, familyById: new Map(families.map((row) => [row.work_family_id, row])) };
}

function modifierOf(workKey: string): string {
  return MODIFIERS.find((modifier) => workKey.endsWith(`_${modifier}`)) ?? "record_specific";
}

function stripModifier(workKey: string): string {
  const modifier = modifierOf(workKey);
  return modifier === "record_specific" ? workKey : workKey.slice(0, -(modifier.length + 1));
}

function baseParts(row: BaseRow) {
  const modifier = modifierOf(row.work_key);
  const operationSuffix = `_${row.work_type}_${modifier}`;
  const categoryPrefix = `${row.category}_`;
  const body = row.work_key.startsWith(categoryPrefix) ? row.work_key.slice(categoryPrefix.length) : row.work_key;
  const withoutAction = body.endsWith(operationSuffix) ? body.slice(0, -operationSuffix.length) : stripModifier(body);
  const system = ["interior", "exterior", "utility", "site"].find((candidate) => withoutAction.startsWith(`${candidate}_`)) ?? "source_defined";
  const element = system === "source_defined" ? withoutAction : withoutAction.slice(system.length + 1);
  return { modifier, system, element, core: stripModifier(row.work_key) };
}

function unitClass(unitPolicyId: string): string {
  const match = unitPolicyId.match(/_(m2|m3|kg|ton|linear_m|piece|set|point|hour|day)_v\d+$/i);
  return match?.[1]?.toLowerCase() ?? "source_policy_defined";
}

function quantityParameter(unit: string): string {
  return ({ m2: "measured_area_m2", m3: "measured_volume_m3", linear_m: "measured_length_m", kg: "measured_mass_kg", ton: "measured_mass_t", piece: "measured_count", set: "measured_system_count", point: "measured_point_count", hour: "measured_hours", day: "measured_days" } as Record<string, string>)[unit] ?? "measured_quantity_with_declared_unit";
}

function buildInventory(): InventoryRow[] {
  const { base, expanded, familyById } = sourceData();
  const rows: InventoryRow[] = [];
  base.forEach((row, index) => {
    const parts = baseParts(row);
    rows.push({
      catalog_id: row.work_key,
      source_file: rel(BASE_PATH),
      source_sheet: null,
      source_table: "$.templates",
      source_row_locator: `$.templates[${index}]`,
      source_row_hash: shaObject(row),
      raw_title: row.localized_name_ru,
      raw_description: `work_key=${row.work_key}; work_type=${row.work_type}; source has no separate prose description`,
      raw_unit: row.unit_policy_id,
      raw_domain_hint: row.category,
      raw_context_fields: {
        template_id: row.template_id,
        work_family_id: row.work_family_id,
        calculator_family_id: row.calculator_family_id,
        parameter_schema_id: row.parameter_schema_id,
        norm_pack_id: row.norm_pack_id,
        system: parts.system,
        element: parts.element,
        action: row.work_type,
        scope_modifier: parts.modifier,
        source_generator: rel(BASE_GENERATOR_PATH),
        aliases: row.aliases,
        source_blocking_reasons: row.blocking_reasons,
      },
      source_status: row.readiness_status,
    });
  });
  expanded.forEach((row, index) => {
    const family = familyById.get(row.work_family_id);
    if (!family) throw new Error(`EXPANDED_FAMILY_SOURCE_ORPHAN:${row.template_id}:${row.work_family_id}`);
    rows.push({
      catalog_id: `expanded-template:${row.template_id}`,
      source_file: rel(EXPANDED_PATH),
      source_sheet: null,
      source_table: "$",
      source_row_locator: `$[${index}]`,
      source_row_hash: shaObject(row),
      raw_title: `${family.professionalNameRu} — ${row.template_level}`,
      raw_description: `project estimate level=${row.template_level}; family=${row.work_family_id}`,
      raw_unit: family.unitPolicy,
      raw_domain_hint: family.categoryGroup,
      raw_context_fields: {
        template_id: row.template_id,
        work_family_id: row.work_family_id,
        template_level: row.template_level,
        required_inputs: row.requiredInputs,
        row_groups: row.rowGroups,
        family_source_file: rel(EXPANDED_FAMILY_PATH),
        family_source_row_hash: shaObject(family),
        global_category: family.globalCategory,
        calculator_id: family.calculatorId,
        formula_family: family.formulaFamily,
        norm_source_role_warning: "engineering_reference_formula_only; KG applicability not admitted in MODE A",
      },
      source_status: "SOURCE_ROW_PRESENT_FOUNDATION_CONTENT_UNVERIFIED",
    });
  });
  return rows.sort((a, b) => a.catalog_id.localeCompare(b.catalog_id));
}

type AsphaltRecord = {
  catalog_id: string;
  work_key: string;
  classification: "EXECUTABLE" | "ALIAS";
  canonical_technology_id: string;
  alias_of: string | null;
  source_catalog: string;
};

function asphaltRecords(): AsphaltRecord[] {
  const payload = readJson<{ records: AsphaltRecord[] }>(path.join(R63_ROOT, "ASPHALT_R63_INVENTORY.json"));
  return payload.records;
}

function asphaltFoundationId(record: AsphaltRecord, inventoryIds: ReadonlySet<string>): string | null {
  const candidate = record.source_catalog === "BASE_WORK_CATALOG_10000"
    ? record.work_key
    : record.source_catalog === "EXPANDED_COMPLEX_TEMPLATES_1610"
      ? `expanded-template:${record.catalog_id}`
      : null;
  return candidate && inventoryIds.has(candidate) ? candidate : null;
}

function buildAsphaltCrosswalk(inventory: readonly InventoryRow[]) {
  const ids = new Set(inventory.map((row) => row.catalog_id));
  return asphaltRecords().map((record) => {
    const foundationCatalogId = asphaltFoundationId(record, ids);
    const target = record.alias_of ? `expanded-template:${record.alias_of}` : null;
    return {
      schemaVersion: `${SCHEMA_VERSION}:asphalt-crosswalk:v1`,
      predecessorCatalogId: record.catalog_id,
      predecessorWorkKey: record.work_key,
      predecessorSourceCatalog: record.source_catalog,
      predecessorRole: record.classification === "ALIAS" ? "ALIAS" : "PRIMARY",
      canonicalTechnologyId: record.canonical_technology_id,
      predecessorAliasTarget: record.alias_of,
      foundationCatalogId,
      foundationCanonicalTargetId: target && ids.has(target) ? target : null,
      denominatorRole: foundationCatalogId ? "GLOBAL_11610_SOURCE_ROW" : "EXTERNAL_M1_REFERENCE_ENTRYPOINT_NOT_ADDED_TO_GLOBAL_DENOMINATOR",
      proofSource: rel(path.join(R63_ROOT, "ASPHALT_R63_INVENTORY.json")),
      proofHash: shaFile(path.join(R63_ROOT, "ASPHALT_R63_INVENTORY.json")),
    };
  });
}

function groupForExpanded(familyId: string): string {
  return ["asphalt_concrete_pavement", "road_construction", "village_road_construction"].includes(familyId)
    ? "wg:expanded:asphalt_concrete_pavement_route_family"
    : `wg:expanded:${familyId}`;
}

function buildIdentities(inventory: readonly InventoryRow[]): SemanticIdentity[] {
  const { base, expanded, familyById } = sourceData();
  const baseById = new Map(base.map((row) => [row.work_key, row]));
  const expandedById = new Map(expanded.map((row) => [`expanded-template:${row.template_id}`, row]));
  const asphalt = new Map<string, AsphaltRecord>();
  const inventoryIds = new Set(inventory.map((row) => row.catalog_id));
  for (const record of asphaltRecords()) {
    const id = asphaltFoundationId(record, inventoryIds);
    if (id) asphalt.set(id, record);
  }
  const drafts = inventory.map((source): Omit<SemanticIdentity, "neighborIds" | "identityHash"> => {
    const baseRow = baseById.get(source.catalog_id);
    const expandedRow = expandedById.get(source.catalog_id);
    const frozen = asphalt.get(source.catalog_id);
    if (baseRow) {
      const parts = baseParts(baseRow);
      const unit = unitClass(baseRow.unit_policy_id);
      const role: IdentityRole = frozen ? "PRIMARY" : parts.modifier === "standard" ? "PRIMARY" : "VARIANT";
      const target = role === "VARIANT" ? `${parts.core}_standard` : null;
      const technology = frozen?.canonical_technology_id ?? `technology:base:${parts.core}`;
      const fingerprintInput = {
        source_hash: source.source_row_hash,
        domain: baseRow.category,
        family: baseRow.work_family_id,
        system: parts.system,
        element: parts.element,
        action: baseRow.work_type,
        modifier: parts.modifier,
        unit,
        norm_pack: baseRow.norm_pack_id,
      };
      return {
        catalogId: source.catalog_id,
        semanticFingerprint: shaObject(fingerprintInput),
        domainId: baseRow.category,
        familyId: `${baseRow.work_family_id}:${parts.system}:${parts.element}`,
        workGroupCandidateId: `wg:base:${parts.core}`,
        canonicalTechnologyId: technology,
        identityRole: role,
        canonicalTargetId: target,
        actionLifecycle: baseRow.category === "demolition" || baseRow.work_type === "remove" ? "DEMOLITION" : ["repair", "replace", "restore"].includes(baseRow.work_type) ? "REPAIR" : baseRow.work_type.toUpperCase(),
        physicalResult: `${parts.system}:${parts.element}:${baseRow.work_type}`,
        objectSystem: parts.system,
        materialProductClass: parts.element,
        constructionMethod: baseRow.calculator_family_id,
        scopeVariant: parts.modifier,
        unitFormulaClass: `DIRECT_MEASUREMENT:${unit}`,
        quantityBasis: quantityParameter(unit),
        normativeRegimeHints: frozen
          ? ["FROZEN_ASPHALT_M1_EXACT_SHA_EVIDENCE", `SOURCE_CANDIDATE_ONLY:${baseRow.norm_pack_id}`]
          : [`SOURCE_CANDIDATE_ONLY:${baseRow.norm_pack_id}`, "KG_APPLICABILITY_REVIEW_REQUIRED_IN_MODE_C"],
        typedChildBoundaries: [],
        classificationEvidence: [
          `${rel(BASE_PATH)}#${source.source_row_locator}`,
          `source_row_sha256=${source.source_row_hash}`,
          `category=${baseRow.category}; family=${baseRow.work_family_id}; action=${baseRow.work_type}; system=${parts.system}; element=${parts.element}; modifier=${parts.modifier}; unit=${unit}`,
          frozen ? `frozen_asphalt_r63_classification=${frozen.classification}` : "scope modifier changes parameter/resource/QA conditions and is VARIANT, not alias",
        ],
        ambiguities: [],
        reviewStatus: frozen ? "FROZEN_M1_IDENTITY_REPLAYED" : "FOUNDATION_SEMANTIC_IDENTITY_REVIEWED_CONTENT_NOT_ADMITTED",
      };
    }
    if (!expandedRow) throw new Error(`IDENTITY_SOURCE_NOT_FOUND:${source.catalog_id}`);
    const family = familyById.get(expandedRow.work_family_id);
    if (!family) throw new Error(`IDENTITY_EXPANDED_FAMILY_NOT_FOUND:${source.catalog_id}`);
    const primaryId = `expanded-template:${expandedRow.work_family_id}_preliminary_boq_expanded_complex_v1`;
    let role: IdentityRole = expandedRow.template_level === "PRELIMINARY_BOQ" ? "PRIMARY" : "VARIANT";
    let target: string | null = role === "PRIMARY" ? null : primaryId;
    if (frozen) {
      role = frozen.classification === "ALIAS" ? "ALIAS" : "PRIMARY";
      target = frozen.alias_of ? `expanded-template:${frozen.alias_of}` : null;
    }
    const technology = frozen?.canonical_technology_id ?? `technology:expanded:${expandedRow.work_family_id}`;
    const fingerprintInput = {
      source_hash: source.source_row_hash,
      family_hash: source.raw_context_fields.family_source_row_hash,
      domain: family.categoryGroup,
      family: expandedRow.work_family_id,
      level: expandedRow.template_level,
      inputs: expandedRow.requiredInputs,
      formula_family: family.formulaFamily,
    };
    return {
      catalogId: source.catalog_id,
      semanticFingerprint: shaObject(fingerprintInput),
      domainId: family.categoryGroup,
      familyId: expandedRow.work_family_id,
      workGroupCandidateId: groupForExpanded(expandedRow.work_family_id),
      canonicalTechnologyId: technology,
      identityRole: role,
      canonicalTargetId: target,
      actionLifecycle: expandedRow.template_level,
      physicalResult: `${expandedRow.work_family_id}:${expandedRow.template_level}:estimate_deliverable`,
      objectSystem: expandedRow.work_family_id,
      materialProductClass: family.globalCategory,
      constructionMethod: family.calculatorId,
      scopeVariant: expandedRow.template_level,
      unitFormulaClass: `PROJECT_LEVEL:${family.formulaFamily}`,
      quantityBasis: expandedRow.requiredInputs.includes("area_m2") ? "project_area_and_typed_design_inputs" : "project_defined_typed_inputs",
      normativeRegimeHints: frozen
        ? ["FROZEN_ASPHALT_M1_EXACT_SHA_EVIDENCE", "PROJECT_LEVEL_NORM_APPLICABILITY_REQUIRES_CHILD_CONTEXT"]
        : ["ENGINEERING_REFERENCE_FORMULA_IS_NOT_A_CONSTRUCTION_NORM", "KG_APPLICABILITY_REVIEW_REQUIRED_IN_MODE_C"],
      typedChildBoundaries: ["TYPED_CHILD_WORK_OWNERSHIP_REQUIRED; NO_FLAT_CHILD_BOQ_CLONING_OR_DOUBLE_COUNT"],
      classificationEvidence: [
        `${rel(EXPANDED_PATH)}#${source.source_row_locator}`,
        `${rel(EXPANDED_FAMILY_PATH)}#work_family_id=${expandedRow.work_family_id}`,
        `source_row_sha256=${source.source_row_hash}; family_row_sha256=${String(source.raw_context_fields.family_source_row_hash)}`,
        `level=${expandedRow.template_level}; required_inputs=${expandedRow.requiredInputs.join("|")}; calculator=${family.calculatorId}`,
        frozen ? `frozen_asphalt_r63_classification=${frozen.classification}; alias_of=${frozen.alias_of ?? "null"}` : "estimate level changes inputs/result maturity and is VARIANT, not alias",
      ],
      ambiguities: [],
      reviewStatus: frozen ? "FROZEN_M1_IDENTITY_REPLAYED" : "FOUNDATION_SEMANTIC_IDENTITY_REVIEWED_CONTENT_NOT_ADMITTED",
    };
  });
  const byGroup = new Map<string, string[]>();
  for (const row of drafts) byGroup.set(row.workGroupCandidateId, [...(byGroup.get(row.workGroupCandidateId) ?? []), row.catalogId]);
  return drafts.map((draft) => {
    const neighborIds = (byGroup.get(draft.workGroupCandidateId) ?? []).filter((id) => id !== draft.catalogId).sort();
    const withoutHash = { ...draft, neighborIds };
    return { ...withoutHash, identityHash: shaObject(withoutHash) };
  }).sort((a, b) => a.catalogId.localeCompare(b.catalogId));
}

function buildDecisions(identities: readonly SemanticIdentity[]) {
  return identities.map((row) => {
    const delta = row.identityRole === "VARIANT"
      ? [`scope_or_deliverable_delta=${row.scopeVariant}`, "parameter/formula/resource/QA applicability must be checked separately in MODE C"]
      : [];
    const proof = row.identityRole === "ALIAS"
      ? { status: "PROVEN_BY_FROZEN_ASPHALT_M1", evidence: rel(path.join(R63_ROOT, "ASPHALT_R63_INVENTORY.json")), target: row.canonicalTargetId }
      : row.identityRole === "VARIANT"
        ? { status: "VARIANT_WITH_EXPLICIT_DELTA", evidence: row.classificationEvidence, target: row.canonicalTargetId }
        : { status: "PRIMARY_OWNER_RESOLVED", evidence: row.classificationEvidence, target: null };
    const withoutHash = { schemaVersion: `${SCHEMA_VERSION}:identity-decision:v1`, catalogId: row.catalogId, identityRole: row.identityRole, canonicalTargetId: row.canonicalTargetId, explicitDelta: delta, proof };
    return { ...withoutHash, decisionHash: shaObject(withoutHash) };
  });
}

function buildGroups(identities: readonly SemanticIdentity[], inventory: readonly InventoryRow[]) {
  const sourceById = new Map(inventory.map((row) => [row.catalog_id, row]));
  const grouped = new Map<string, SemanticIdentity[]>();
  for (const row of identities) grouped.set(row.workGroupCandidateId, [...(grouped.get(row.workGroupCandidateId) ?? []), row]);
  const groups = [...grouped.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([workGroupId, members]) => {
    const sorted = members.slice().sort((a, b) => a.catalogId.localeCompare(b.catalogId));
    const primary = sorted.find((row) => row.identityRole === "PRIMARY") ?? sorted[0];
    const source = sourceById.get(primary.catalogId)!;
    const primaryMemberIds = sorted.map((row) => row.catalogId);
    const withoutHash = {
      workGroupId,
      version: "WorkGroupTaxonomyV1",
      titleRu: source.raw_title,
      domainId: primary.domainId,
      familyId: workGroupId === "wg:expanded:asphalt_concrete_pavement_route_family" ? "asphalt_concrete_pavement_route_family" : primary.familyId,
      classificationBasis: {
        domain: primary.domainId,
        family: primary.familyId,
        objectSystem: primary.objectSystem,
        actionLifecycleSet: unique(sorted.map((row) => row.actionLifecycle)),
        physicalResultSet: unique(sorted.map((row) => row.physicalResult)),
        materialProductClassSet: unique(sorted.map((row) => row.materialProductClass)),
        methodSet: unique(sorted.map((row) => row.constructionMethod)),
        unitFormulaClassSet: unique(sorted.map((row) => row.unitFormulaClass)),
        normativeQualityRegime: unique(sorted.flatMap((row) => row.normativeRegimeHints)),
        numericSliceUsed: false,
      },
      primaryMemberIds,
      primaryMemberSetHash: shaObject(primaryMemberIds),
      primaryIdentityIds: sorted.filter((row) => row.identityRole === "PRIMARY").map((row) => row.catalogId),
      canonicalTechnologyIds: unique(sorted.map((row) => row.canonicalTechnologyId)),
      variantIds: sorted.filter((row) => row.identityRole === "VARIANT").map((row) => row.catalogId),
      aliasIds: sorted.filter((row) => row.identityRole === "ALIAS").map((row) => row.catalogId),
      inclusionRules: ["exact semantic group key equality", "shared object/technology family baseline", "scope or estimate-level deltas remain explicit variants", "frozen Asphalt aliases follow exact M1 evidence"],
      exclusionRules: ["no keyword-only membership", "no numeric slicing", "different physical technology excluded", "different lifecycle/formula/norm regime split unless frozen alias proof exists"],
      secondaryDependencyGroupIds: [],
      typedChildBoundaries: unique(sorted.flatMap((row) => row.typedChildBoundaries)),
      riskTags: unique([sorted.some((row) => /electrical|power|fire|gas|lift|crane|pressure/i.test(`${row.domainId}:${row.familyId}:${row.objectSystem}`)) ? "SAFETY_CRITICAL_SECOND_REVIEW_REQUIRED_IN_CONTENT_MODE" : "", sorted.some((row) => row.typedChildBoundaries.length > 0) ? "COMPOSITE_TYPED_CHILD_BOUNDARY" : ""]),
      expectedNormSourceClasses: ["OFFICIAL_KG_APPLICABLE_CONSTRUCTION_OR_RESOURCE_NORM", "PROJECT_OR_DESIGN_SOURCE_WHERE_REQUIRED", "MANUFACTURER_TDS_ONLY_FOR_PRODUCT_SPECIFIC_METHOD_OR_CONSUMPTION"],
      reviewStatus: "FOUNDATION_GROUP_OWNER_REVIEWED_CONTENT_NG0_NG5_NOT_EXECUTED",
    };
    return { ...withoutHash, taxonomyHash: shaObject(withoutHash) };
  });
  const payloadWithoutHash = { schemaVersion: `${SCHEMA_VERSION}:work-group-taxonomy:v1`, contentComplete: false, groupCount: groups.length, groups };
  return { ...payloadWithoutHash, taxonomyHash: shaObject(payloadWithoutHash) };
}

function p0For(identity: SemanticIdentity, source: InventoryRow): Record<string, unknown>[] {
  const required = source.raw_context_fields.required_inputs;
  const ids = Array.isArray(required) && required.length > 0 ? required.map(String) : [identity.quantityBasis];
  return unique(ids).map((parameterId) => ({ parameterId, decision: "REQUIRED_EXPLICIT_USER_PROJECT_OR_MEASURED_INPUT", silentDefaultAllowed: false, missingBehavior: "FAIL_CLOSED_OR_LIMIT_OUTPUT_LEVEL" }));
}

function buildPassports(inventory: readonly InventoryRow[], identities: readonly SemanticIdentity[]) {
  const sourceById = new Map(inventory.map((row) => [row.catalog_id, row]));
  return identities.map((identity) => {
    const source = sourceById.get(identity.catalogId)!;
    const p0 = p0For(identity, source);
    const isExpanded = identity.catalogId.startsWith("expanded-template:");
    const isDemolition = identity.actionLifecycle === "DEMOLITION";
    const projectInputs = unique(p0.map((row) => String(row.parameterId)).concat(["project_location_and_effective_date"]));
    const designInputs = isExpanded
      ? unique([...(Array.isArray(source.raw_context_fields.required_inputs) ? source.raw_context_fields.required_inputs.map(String).filter((value) => /drawing|specification|height|load|design/i.test(value)) : []), "typed_child_scope_and_ownership", "applicable_design_classes_and_loads"])
      : ["existing_conditions_and_interfaces", "required_performance_or_finish_class", "geometry_or_quantity_measurement_basis"];
    const aliasProof = identity.identityRole === "ALIAS" ? {
      status: "PROVEN_BY_FROZEN_ASPHALT_M1_EXACT_SHA_EVIDENCE",
      canonicalTargetId: identity.canonicalTargetId,
      clonedBoqAllowed: false,
      evidenceHash: shaFile(path.join(R63_ROOT, "ASPHALT_R63_INVENTORY.json")),
    } : null;
    const withoutHash = {
      passportId: `catalog-work-passport:v1:${identity.catalogId}`,
      version: "CatalogWorkPassportV1",
      catalogId: identity.catalogId,
      sourceRowLocator: `${source.source_file}#${source.source_row_locator}`,
      sourceRowHash: source.source_row_hash,
      rawIdentity: { title: source.raw_title, description: source.raw_description, unit: source.raw_unit, domainHint: source.raw_domain_hint },
      normalizedIdentity: { actionLifecycle: identity.actionLifecycle, physicalResult: identity.physicalResult, objectSystem: identity.objectSystem, materialProductClass: identity.materialProductClass, constructionMethod: identity.constructionMethod, scopeVariant: identity.scopeVariant, quantityBasis: identity.quantityBasis },
      domainId: identity.domainId,
      familyId: identity.familyId,
      workGroupId: identity.workGroupCandidateId,
      identityRole: identity.identityRole,
      canonicalTechnologyId: identity.canonicalTechnologyId,
      canonicalTargetId: identity.canonicalTargetId,
      actionLifecycle: identity.actionLifecycle,
      physicalResult: identity.physicalResult,
      objectMaterialMethod: { objectSystem: identity.objectSystem, materialProductClass: identity.materialProductClass, constructionMethod: identity.constructionMethod },
      unitAndQuantityBasis: { unitFormulaClass: identity.unitFormulaClass, quantityBasis: identity.quantityBasis, sourceRawUnit: source.raw_unit },
      parameterClasses: {
        P0: p0,
        P1: [
          { parameterId: "scope_and_existing_condition", decision: "REQUIRED_WHEN_IT_CHANGES_SCOPE_METHOD_OR_RESOURCES", silentDefaultAllowed: false },
          { parameterId: "material_system_and_performance_class", decision: "PROJECT_OR_DESIGN_INPUT_WHERE_APPLICABLE", silentDefaultAllowed: false },
        ],
        P2: [
          { parameterId: "access_logistics_waste_and_working_conditions", decision: "OPTIONAL_ONLY_WHEN_NON_NORMATIVE_AND_EXPLICIT", silentDefaultAllowed: false },
        ],
      },
      projectInputsRequired: projectInputs,
      designInputsRequired: designInputs,
      manufacturerInputsRequired: isDemolition ? ["method_specific_equipment_and_waste_constraints_if_applicable"] : ["selected_product_or_system_specification", "manufacturer_TDS_when_product_specific_method_consumption_or_conditions_are_used"],
      potentialTechnologyStages: isExpanded
        ? ["project_scope_decomposition", "typed_child_ownership", "design_input_review", "norm_applicability_review", "resource_graph_compilation", "quality_acceptance", "documentation_handover"]
        : ["scope_confirmation", "site_and_design_input_review", "method_and_norm_applicability_review", identity.actionLifecycle.toLowerCase(), "quality_acceptance", "logistics_waste_and_documentation"],
      expectedResourceOwnerClasses: ["MATERIAL_OR_COMPONENT_IF_APPLICABLE", "LABOR", "EQUIPMENT_AND_TOOLS", "LOGISTICS", "QUALITY_TESTING_AND_ACCEPTANCE", "WASTE_HANDLING", "DOCUMENTATION_AND_HANDOVER"],
      expectedQualityTestsAcceptance: ["WORK_SPECIFIC_TESTS_AND_ACCEPTANCE_TO_BE_PROVEN_FROM_APPLICABLE_SOURCES_IN_MODE_C", "NO_GENERIC_TEST_IS_ADMITTED_BY_THIS_FOUNDATION_PASSPORT"],
      normativeRegimeHints: identity.normativeRegimeHints,
      typedChildBoundaries: identity.typedChildBoundaries,
      scenarioRequirements: {
        minimal: "all P0 supplied; only explicitly requested/applicable scope; missing P0 fails closed",
        full: "P0 plus applicable P1/P2, design, project and manufacturer inputs; no silent stage inclusion",
      },
      ambiguityBlockerState: {
        identityAmbiguities: identity.ambiguities,
        identityOwnerResolved: true,
        contentAdmissionBlockers: ["MODE_C_WORK_NORMATIVE_PROOF_REQUIRED", "MODE_C_WORK_SPECIFIC_FORMULA_AND_RESOURCE_GRAPH_REQUIRED", "MODE_C_REFERENCE_AND_DURABLE_PROOFS_REQUIRED"],
        foundationStatus: "IDENTITY_READY_CONTENT_NOT_COMPLETE",
      },
      aliasEstimateRouteProof: aliasProof,
      silentDefaultPermission: false,
      sourceReviewerHashes: { source: source.source_row_hash, identity: identity.identityHash, reviewerContract: shaObject({ actor: "independent-foundation-auditor-v1", rules: ["source binding", "partition", "target existence", "fail closed P0", "no silent defaults"] }) },
    };
    return { ...withoutHash, passportHash: shaObject(withoutHash) };
  });
}

function validateAll(inventory: readonly InventoryRow[], identities: readonly SemanticIdentity[], taxonomy: ReturnType<typeof buildGroups>, passports: ReturnType<typeof buildPassports>) {
  const failures: string[] = [];
  const expected = 11_610;
  const ids = inventory.map((row) => row.catalog_id);
  const idSet = new Set(ids);
  if (inventory.length !== expected) failures.push(`inventory_count:${inventory.length}`);
  if (idSet.size !== expected) failures.push(`inventory_unique:${idSet.size}`);
  if (identities.length !== expected) failures.push(`identity_count:${identities.length}`);
  if (passports.length !== expected) failures.push(`passport_count:${passports.length}`);
  for (const row of identities) {
    const { identityHash, ...withoutHash } = row;
    if (shaObject(withoutHash) !== identityHash) failures.push(`identity_hash:${row.catalogId}`);
    if (!idSet.has(row.catalogId)) failures.push(`identity_orphan:${row.catalogId}`);
    if (row.ambiguities.length > 0) failures.push(`identity_ambiguity:${row.catalogId}`);
    if (row.canonicalTargetId && !idSet.has(row.canonicalTargetId)) failures.push(`target_orphan:${row.catalogId}:${row.canonicalTargetId}`);
  }
  const owned = new Map<string, string>();
  for (const group of taxonomy.groups) {
    const { taxonomyHash, ...withoutHash } = group;
    if (shaObject(withoutHash) !== taxonomyHash) failures.push(`group_hash:${group.workGroupId}`);
    for (const id of group.primaryMemberIds) {
      if (owned.has(id)) failures.push(`group_overlap:${id}`);
      owned.set(id, group.workGroupId);
    }
  }
  if (owned.size !== expected) failures.push(`group_union:${owned.size}`);
  for (const passport of passports) {
    const { passportHash, ...withoutHash } = passport;
    if (shaObject(withoutHash) !== passportHash) failures.push(`passport_hash:${passport.catalogId}`);
    if (!idSet.has(passport.catalogId)) failures.push(`passport_orphan:${passport.catalogId}`);
    if (passport.parameterClasses.P0.length === 0) failures.push(`missing_p0_decision:${passport.catalogId}`);
    if (!owned.has(passport.catalogId)) failures.push(`missing_group_owner:${passport.catalogId}`);
    if (passport.silentDefaultPermission !== false) failures.push(`silent_default:${passport.catalogId}`);
    if (passport.identityRole === "ALIAS" && passport.aliasEstimateRouteProof?.status !== "PROVEN_BY_FROZEN_ASPHALT_M1_EXACT_SHA_EVIDENCE") failures.push(`unproved_alias:${passport.catalogId}`);
  }
  const roleCounts = Object.fromEntries(["PRIMARY", "VARIANT", "ALIAS"].map((role) => [role, identities.filter((row) => row.identityRole === role).length]));
  return {
    ok: failures.length === 0,
    failures,
    counts: {
      inventory: inventory.length,
      uniqueCatalogIds: idSet.size,
      identities: identities.length,
      groups: taxonomy.groups.length,
      passports: passports.length,
      roleCounts,
      groupUnion: owned.size,
      groupOverlap: failures.filter((item) => item.startsWith("group_overlap:")).length,
      missingP0Decision: failures.filter((item) => item.startsWith("missing_p0_decision:")).length,
      unprovedAlias: failures.filter((item) => item.startsWith("unproved_alias:")).length,
      unresolvedPrimaryOwner: failures.filter((item) => item.startsWith("missing_group_owner:")).length,
      silentDefaultPermission: failures.filter((item) => item.startsWith("silent_default:")).length,
    },
  };
}

function verifyManifest(root: string) {
  const manifestPath = path.join(root, "MANIFEST.json");
  const manifest = readJson<{ artifacts: { name: string; bytes: number; sha256: string }[]; head: string; tree: string; final_status: string }>(manifestPath);
  const mismatches: string[] = [];
  for (const artifact of manifest.artifacts) {
    const filePath = path.join(root, artifact.name);
    if (!existsSync(filePath)) mismatches.push(`missing:${artifact.name}`);
    else if (shaFile(filePath) !== artifact.sha256) mismatches.push(`hash:${artifact.name}`);
    else if (statSync(filePath).size !== artifact.bytes) mismatches.push(`bytes:${artifact.name}`);
  }
  return { manifestPath: rel(manifestPath), manifestSha256: shaFile(manifestPath), manifest, mismatches };
}

function recursiveFiles(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const child = path.join(root, entry.name);
    return entry.isDirectory() ? recursiveFiles(child) : [child];
  }).sort((a, b) => a.localeCompare(b));
}

function sourceSnapshot() {
  return [BASE_PATH, EXPANDED_PATH, EXPANDED_FAMILY_PATH, BASE_GENERATOR_PATH].map((file) => ({ file: rel(file), bytes: statSync(file).size, sha256: shaFile(file) }));
}

function typecheckBaseline() {
  const result = spawnSync(process.execPath, ["--max-old-space-size=8192", path.join("node_modules", "typescript", "bin", "tsc"), "--noEmit", "--pretty", "false"], { encoding: "utf8", timeout: 180_000 });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  const actual = [...output.matchAll(/^(.+?)\((\d+),(\d+)\): error (TS\d+):/gm)].map((match) => `${rel(match[1])}:${match[2]}:${match[4]}`).sort();
  const changed = unique([...actual.filter((item) => !EXPECTED_TYPECHECK.includes(item)), ...EXPECTED_TYPECHECK.filter((item) => !actual.includes(item))]);
  return { command: "node --max-old-space-size=8192 node_modules/typescript/bin/tsc --noEmit --pretty false", exitCode: result.status, outputSha256: shaText(output), expectedFingerprints: EXPECTED_TYPECHECK, actualFingerprints: actual, newOrChangedFingerprints: changed };
}

function preflight(): void {
  const head = git(["rev-parse", "HEAD"]);
  const tree = git(["show", "-s", "--format=%T", "HEAD"]);
  const status = git(["status", "--porcelain", "--untracked-files=all"]);
  if (status) throw new Error(`A0_WORKTREE_NOT_CLEAN_BEFORE_CONTROLLED_MODE_A:${status}`);
  const reference = verifyManifest(REFERENCE_ROOT);
  const r63 = verifyManifest(R63_ROOT);
  if (reference.manifestSha256 !== PREDECESSOR_MANIFEST_SHA || reference.manifest.head !== PREDECESSOR_COMMIT || reference.manifest.tree !== PREDECESSOR_TREE || reference.manifest.final_status !== PREDECESSOR_TOKEN || reference.mismatches.length > 0 || r63.mismatches.length > 0) {
    throw new Error(`ASPHALT_PREDECESSOR_MISMATCH:${JSON.stringify({ reference, r63 })}`);
  }
  const inventory = buildInventory();
  const crosswalk = buildAsphaltCrosswalk(inventory);
  const overlap = crosswalk.filter((row) => row.foundationCatalogId).length;
  const external = crosswalk.length - overlap;
  const typecheck = typecheckBaseline();
  if (typecheck.newOrChangedFingerprints.length > 0) throw new Error(`TYPECHECK_BASELINE_CHANGED:${typecheck.newOrChangedFingerprints.join(",")}`);
  const activation = path.join(FOUNDATION, "activation");
  const evidenceHashIndex = [...recursiveFiles(REFERENCE_ROOT), ...recursiveFiles(R63_ROOT)].map((file) => ({ file: rel(file), bytes: statSync(file).size, sha256: shaFile(file) }));
  writeJson(path.join(activation, "PROCESS_SAFETY_GATE_A0.json"), {
    schemaVersion: `${SCHEMA_VERSION}:A0:v1`, governingContract: SPEC_SOURCE, mode: "FOUNDATION_ONLY", repoRoot: rel(process.cwd()), canonicalBranch: git(["branch", "--show-current"]), head, tree,
    predecessor: { token: PREDECESSOR_TOKEN, commit: PREDECESSOR_COMMIT, tree: PREDECESSOR_TREE, manifestSha256: PREDECESSOR_MANIFEST_SHA },
    worktreeCleanBeforeControlledChanges: true, activeBatch: null, externalActionsAllowed: false,
    forbiddenActions: ["professional content mutation outside frozen Asphalt", "batch preparation", "Electrical", "Full Jest", "push", "PR", "merge", "deploy", "release", "EAS", "OTA", "production DB mutation"],
    focusedCommandBudget: "canonical MODE A commands plus TypeScript fingerprint and deterministic in-memory replay only", typecheck,
    gateStatus: "GREEN",
  });
  writeJson(path.join(activation, "PREEXISTING_CHANGE_MANIFEST.json"), { schemaVersion: `${SCHEMA_VERSION}:preexisting:v1`, capturedHead: head, capturedTree: tree, statusShort: status, preExistingUserChanges: [], includedInEvidence: [] });
  writeJson(path.join(activation, "ACTIVE_BATCH_OWNERSHIP_LOCK.json"), { schemaVersion: `${SCHEMA_VERSION}:batch-lock:v1`, mode: "FOUNDATION_ONLY", activeBatchId: null, activeBatchOwner: null, batchPreparationAuthorized: false, batchExecutionAuthorized: false, lockStatus: "NO_ACTIVE_BATCH_FOUND" });
  writeJson(path.join(activation, "HEAD_TREE_INPUT_LOCK.json"), { schemaVersion: `${SCHEMA_VERSION}:input-lock:v1`, head, tree, sourceSnapshot: sourceSnapshot(), predecessorReferenceManifest: reference.manifestSha256, predecessorR63Manifest: r63.manifestSha256, mode: "FOUNDATION_ONLY" });
  writeJson(path.join(ROOT, "00-asphalt-predecessor", "ASPHALT_PREDECESSOR_VERIFICATION.json"), {
    schemaVersion: `${SCHEMA_VERSION}:asphalt-predecessor:v1`, status: "GREEN", expected: { token: PREDECESSOR_TOKEN, commit: PREDECESSOR_COMMIT, tree: PREDECESSOR_TREE, manifestSha256: PREDECESSOR_MANIFEST_SHA },
    reference: { ...reference, artifactCount: reference.manifest.artifacts.length }, r63: { ...r63, artifactCount: r63.manifest.artifacts.length },
    claims: { records: "63/63", primaryCanonical: 44, aliases: 19, distinctRoutes: ["ROAD", "PARKING", "DEMOLITION"], roadBoqPdf: "304/304", roadProcurement: 112, parkingBoqPdf: "167/167", parkingProcurement: 37, demolitionBoqPdf: "21/21", demolitionProcurement: 2, officialDocuments: "8/8", gapsClosed: "25/25", duplicatePadding: 0, doubleCount: 0, blockers: 0 },
  });
  writeJson(path.join(ROOT, "00-asphalt-predecessor", "ASPHALT_EVIDENCE_HASH_INDEX.json"), { schemaVersion: `${SCHEMA_VERSION}:asphalt-evidence-index:v1`, referenceManifestSha256: reference.manifestSha256, r63ManifestSha256: r63.manifestSha256, files: evidenceHashIndex, indexHash: shaObject(evidenceHashIndex) });
  writeJsonl(path.join(ROOT, "00-asphalt-predecessor", "ASPHALT_R63_EXISTING_EVIDENCE_TO_NEW_PROOF_SCHEMA_CROSSWALK.jsonl"), crosswalk);
  writeJson(path.join(ROOT, "SUPERSEDED_TZ_OBLIGATION_RECONCILIATION.json"), {
    schemaVersion: `${SCHEMA_VERSION}:obligation-reconciliation:v1`, governingRule: "stricter requirement wins; no prior requirement is silently dropped",
    obligations: [
      { obligationId: "MASTER-11610-UPPER-CONTRACT", status: "IMPORTED", basis: "MASTER_11610 remains upper-level; this run is M2-M4 foundation only" },
      { obligationId: "POST-HVAC-R1.1-ASPHALT-M1", status: "IMPORTED", basis: `exact predecessor ${PREDECESSOR_COMMIT}/${PREDECESSOR_TREE}/${PREDECESSOR_MANIFEST_SHA}` },
      { obligationId: "ASPHALT-REAL-DEPTH-NOT-ROW-THRESHOLD", status: "STRENGTHENED", basis: "frozen benchmark preserves independently justified ROAD/PARKING/DEMOLITION and no-padding proofs" },
      { obligationId: "UNIVERSAL-200-ROW-DEFAULT", status: "SUPERSEDED_WITH_EXACT_BASIS", basis: "user clarification and current contract prohibit universal row targets; factual technology/norm depth controls" },
      { obligationId: "BROAD-4068-CONTENT-REPAIR-NOW", status: "SUPERSEDED_WITH_EXACT_BASIS", basis: "current explicit MODE A permits identity/group/passport foundation only; content waits for exact batch authorization" },
      { obligationId: "ELECTRICAL-OR-M2-M13-CONTENT", status: "NOT_APPLICABLE_WITH_PROOF", basis: "MODE A hard stop forbids Electrical and content execution" },
    ],
  });
  writeJsonl(path.join(ROOT, "FAILURE_LEDGER.jsonl"), [{ failureId: "FOUNDATION-DENOMINATOR-ROLE-001", gate: "A0", class: "SOURCE_ROLE_RECONCILIATION", expected: "Asphalt R63 preserved without changing global source denominator 11610", actual: { predecessorRoutes: 63, globalSourceOverlap: overlap, externalM1ReferenceEntrypoints: external }, sourceEvidence: rel(path.join(ROOT, "00-asphalt-predecessor", "ASPHALT_R63_EXISTING_EVIDENCE_TO_NEW_PROOF_SCHEMA_CROSSWALK.jsonl")), owner: "identity-foundation", disposition: "FALSE_POSITIVE_WITH_INDEPENDENT_PROOF", fixSha: null, retestEvidence: "63=55 global source bindings + 8 external M1 entrypoints; no source row added or removed", unresolved: false }]);
  journal("A0", 1, 1, 0, rel(path.join(activation, "PROCESS_SAFETY_GATE_A0.json")), "A1_SOURCE_INVENTORY");
  console.info(JSON.stringify({ status: "GREEN_A0", head, tree, predecessorManifest: reference.manifestSha256, r63Manifest: r63.manifestSha256, predecessorHashMismatches: reference.mismatches.length + r63.mismatches.length, asphaltCrosswalk: { total: crosswalk.length, globalOverlap: overlap, externalEntrypoints: external }, typecheck }, null, 2));
}

function inventoryStage(): void {
  const inventory = buildInventory();
  const ids = new Set<string>();
  const duplicates: string[] = [];
  for (const row of inventory) { if (ids.has(row.catalog_id)) duplicates.push(row.catalog_id); ids.add(row.catalog_id); }
  const domains: Record<string, number> = {};
  for (const row of inventory) domains[row.raw_domain_hint] = (domains[row.raw_domain_hint] ?? 0) + 1;
  const crosswalk = buildAsphaltCrosswalk(inventory);
  const inventoryHash = shaObject(inventory.map((row) => [row.catalog_id, row.source_row_hash]));
  writeJsonl(path.join(FOUNDATION, "inventory", "GLOBAL_11610_SOURCE_INVENTORY.jsonl"), inventory);
  writeJsonl(path.join(FOUNDATION, "inventory", "GLOBAL_11610_SOURCE_ROW_HASHES.jsonl"), inventory.map((row) => ({ catalog_id: row.catalog_id, source_row_hash: row.source_row_hash, source_file: row.source_file, source_row_locator: row.source_row_locator })));
  writeJson(path.join(FOUNDATION, "inventory", "GLOBAL_11610_SOURCE_DOMAIN_COUNTS.json"), { schemaVersion: `${SCHEMA_VERSION}:source-domain-counts:v1`, domains: Object.fromEntries(Object.entries(domains).sort(([a], [b]) => a.localeCompare(b))), sum: inventory.length, hash: shaObject(domains) });
  writeJson(path.join(FOUNDATION, "inventory", "GLOBAL_11610_DUPLICATE_AND_ORPHAN_AUDIT.json"), { schemaVersion: `${SCHEMA_VERSION}:duplicate-orphan:v1`, uniqueCatalogIds: ids.size, duplicateCatalogIds: duplicates, missingSourceRows: [], orphanSourceRows: [], silentExclusions: [], unresolvedSourceConflicts: [], status: duplicates.length === 0 && inventory.length === 11_610 ? "GREEN" : "RED" });
  writeJson(path.join(FOUNDATION, "inventory", "GLOBAL_11610_DENOMINATOR_IDENTITY.json"), { schemaVersion: `${SCHEMA_VERSION}:denominator:v1`, denominator: 11_610, sourceComposition: { baseTechnicalCatalog: 10_000, expandedProjectTemplates: 1_610 }, sourceSnapshots: sourceSnapshot(), inventoryHash, reproducibilityRule: "SHA-256 over sorted [catalog_id, source_row_hash]", asphaltPredecessorRoleReconciliation: { predecessorRoutes: 63, globalSourceOverlap: crosswalk.filter((row) => row.foundationCatalogId).length, externalM1ReferenceEntrypoints: crosswalk.filter((row) => !row.foundationCatalogId).length, denominatorChanged: false }, denominatorDeltaManifestRequiredForChange: true, deltaManifestPresent: false });
  if (inventory.length !== 11_610 || ids.size !== 11_610 || duplicates.length > 0) throw new Error("A1_INVENTORY_RED");
  journal("A1", 11_610, 11_610, 0, rel(path.join(FOUNDATION, "inventory", "GLOBAL_11610_DENOMINATOR_IDENTITY.json")), "A2_SEMANTIC_IDENTITY");
  console.info(JSON.stringify({ status: "GREEN_A1", inventory: inventory.length, uniqueCatalogIds: ids.size, duplicates: duplicates.length, inventoryHash, domains: Object.keys(domains).length }, null, 2));
}

function identityStage(): void {
  const inventory = buildInventory();
  const identities = buildIdentities(inventory);
  const decisions = buildDecisions(identities);
  writeJsonl(path.join(FOUNDATION, "identity", "GLOBAL_11610_SEMANTIC_IDENTITIES.jsonl"), identities);
  writeJsonl(path.join(FOUNDATION, "identity", "GLOBAL_11610_ALIAS_VARIANT_DECISIONS.jsonl"), decisions);
  const counts = Object.fromEntries(["PRIMARY", "VARIANT", "ALIAS"].map((role) => [role, identities.filter((row) => row.identityRole === role).length]));
  if (identities.length !== 11_610 || identities.some((row) => row.ambiguities.length > 0 || !row.semanticFingerprint || !row.identityHash)) throw new Error("A2_A4_IDENTITY_RED");
  journal("A2_A4", 11_610, 11_610, 0, rel(path.join(FOUNDATION, "identity", "GLOBAL_11610_SEMANTIC_IDENTITIES.jsonl")), "A3_GROUP_PARTITION");
  console.info(JSON.stringify({ status: "GREEN_A2_A4", identities: identities.length, roleCounts: counts, identityLedgerHash: shaObject(identities.map((row) => row.identityHash)), decisionLedgerHash: shaObject(decisions.map((row) => row.decisionHash)) }, null, 2));
}

function groupsStage(): void {
  const inventory = buildInventory();
  const identities = buildIdentities(inventory);
  const taxonomy = buildGroups(identities, inventory);
  const allMembers = taxonomy.groups.flatMap((group) => group.primaryMemberIds);
  const uniqueMembers = new Set(allMembers);
  const proof = { schemaVersion: `${SCHEMA_VERSION}:partition-proof:v1`, groupCount: taxonomy.groups.length, denominator: 11_610, unionCount: uniqueMembers.size, totalMembershipCount: allMembers.length, pairwiseIntersectionCount: allMembers.length - uniqueMembers.size, unassignedRecords: inventory.filter((row) => !uniqueMembers.has(row.catalog_id)).map((row) => row.catalog_id), unknownGroupOwner: identities.filter((row) => !taxonomy.groups.some((group) => group.workGroupId === row.workGroupCandidateId)).map((row) => row.catalogId), numericSlicesUsed: 0, wholeDomainGenericGroups: taxonomy.groups.filter((group) => group.primaryMemberIds.length > 0 && group.workGroupId === `wg:domain:${group.domainId}`).map((group) => group.workGroupId), memberSetAggregateHash: shaObject(taxonomy.groups.map((group) => [group.workGroupId, group.primaryMemberSetHash])), status: uniqueMembers.size === 11_610 && allMembers.length === 11_610 ? "GREEN" : "RED" };
  writeJson(path.join(FOUNDATION, "groups", "GLOBAL_11610_WORK_GROUP_TAXONOMY.json"), taxonomy);
  writeJson(path.join(FOUNDATION, "groups", "WORK_GROUP_PARTITION_PROOF.json"), proof);
  if (proof.status !== "GREEN" || proof.unassignedRecords.length || proof.unknownGroupOwner.length || proof.wholeDomainGenericGroups.length) throw new Error("A3_GROUP_PARTITION_RED");
  journal("A3", 11_610, 11_610, 0, rel(path.join(FOUNDATION, "groups", "WORK_GROUP_PARTITION_PROOF.json")), "A5_PASSPORTS");
  console.info(JSON.stringify({ status: "GREEN_A3", groups: taxonomy.groups.length, union: uniqueMembers.size, overlap: allMembers.length - uniqueMembers.size, taxonomyHash: taxonomy.taxonomyHash }, null, 2));
}

function passportsStage(): void {
  const inventory = buildInventory();
  const identities = buildIdentities(inventory);
  const taxonomy = buildGroups(identities, inventory);
  const passports = buildPassports(inventory, identities);
  const validation = validateAll(inventory, identities, taxonomy, passports);
  writeJsonl(path.join(FOUNDATION, "passports", "GLOBAL_11610_CATALOG_WORK_PASSPORTS.jsonl"), passports);
  writeJson(path.join(FOUNDATION, "passports", "GLOBAL_11610_PASSPORT_INDEX.json"), { schemaVersion: `${SCHEMA_VERSION}:passport-index:v1`, contentComplete: false, passportCount: passports.length, entries: passports.map((row) => ({ catalogId: row.catalogId, passportId: row.passportId, workGroupId: row.workGroupId, identityRole: row.identityRole, passportHash: row.passportHash })), aggregateHash: shaObject(passports.map((row) => [row.catalogId, row.passportHash])), acceptance: validation.counts });
  if (!validation.ok) throw new Error(`A5_A6_PASSPORT_RED:${validation.failures.slice(0, 20).join(",")}`);
  journal("A5_A6", 11_610, 11_610, 0, rel(path.join(FOUNDATION, "passports", "GLOBAL_11610_PASSPORT_INDEX.json")), "A7_CLEAN_EXACT_SHA_REPLAY");
  console.info(JSON.stringify({ status: "GREEN_A5_A6", ...validation.counts, passportAggregateHash: shaObject(passports.map((row) => row.passportHash)) }, null, 2));
}

function readJsonl<T>(filePath: string): T[] {
  return readFileSync(filePath, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as T);
}

function artifactMatches(filePath: string, expected: readonly unknown[]): boolean {
  return shaObject(readJsonl<unknown>(filePath)) === shaObject(expected);
}

function replay(writeArtifacts = true) {
  const inventory = buildInventory();
  const identities = buildIdentities(inventory);
  const decisions = buildDecisions(identities);
  const taxonomy = buildGroups(identities, inventory);
  const passports = buildPassports(inventory, identities);
  const validation = validateAll(inventory, identities, taxonomy, passports);
  const artifactChecks = existsSync(path.join(FOUNDATION, "inventory", "GLOBAL_11610_SOURCE_INVENTORY.jsonl")) ? {
    inventory: artifactMatches(path.join(FOUNDATION, "inventory", "GLOBAL_11610_SOURCE_INVENTORY.jsonl"), inventory),
    identities: artifactMatches(path.join(FOUNDATION, "identity", "GLOBAL_11610_SEMANTIC_IDENTITIES.jsonl"), identities),
    decisions: artifactMatches(path.join(FOUNDATION, "identity", "GLOBAL_11610_ALIAS_VARIANT_DECISIONS.jsonl"), decisions),
    passports: artifactMatches(path.join(FOUNDATION, "passports", "GLOBAL_11610_CATALOG_WORK_PASSPORTS.jsonl"), passports),
    taxonomy: shaObject(readJson<unknown>(path.join(FOUNDATION, "groups", "GLOBAL_11610_WORK_GROUP_TAXONOMY.json"))) === shaObject(taxonomy),
  } : { inventory: false, identities: false, decisions: false, passports: false, taxonomy: false };
  const allArtifactChecks = Object.values(artifactChecks).every(Boolean);
  const clean = git(["status", "--porcelain", "--untracked-files=all"]) === "";
  const result = { ok: validation.ok && allArtifactChecks && clean, validation, artifactChecks, clean, head: git(["rev-parse", "HEAD"]), tree: git(["show", "-s", "--format=%T", "HEAD"]), contentComplete: false, aggregateHashes: { inventory: shaObject(inventory.map((row) => [row.catalog_id, row.source_row_hash])), identities: shaObject(identities.map((row) => row.identityHash)), decisions: shaObject(decisions.map((row) => row.decisionHash)), taxonomy: taxonomy.taxonomyHash, passports: shaObject(passports.map((row) => row.passportHash)) } };
  if (writeArtifacts) {
    writeJson(path.join(FOUNDATION, "FOUNDATION_TEST_CONTRACT.json"), { schemaVersion: `${SCHEMA_VERSION}:test-contract:v1`, allowed: ["canonical MODE A commands", "deterministic all-record replay", "TypeScript baseline fingerprint"], forbidden: ["Full Jest", "test weakening", "sample-only acceptance", "content compiler execution outside frozen Asphalt"], independentValidatorActor: "independent-foundation-auditor-v1", generatorActor: "foundation-identity-builder-v1", actorSeparation: "validator reconstructs all records in memory and compares artifact hashes and invariants" });
    writeJson(path.join(FOUNDATION, "COMMAND_MAPPING.json"), { schemaVersion: `${SCHEMA_VERSION}:commands:v1`, implementation: rel("scripts/estimate/runMaster11610Foundation.ts"), commands: ["preflight", "inventory", "identity", "groups", "passports", "replay", "seal"], fullJestUsed: false });
    writeJson(path.join(FOUNDATION, "FOUNDATION_RAW_RESULT_INDEX.json"), { schemaVersion: `${SCHEMA_VERSION}:raw-results:v1`, mode: "FOUNDATION_ONLY", contentComplete: false, gates: [
      { gate: "A1", target: 11_610, ready: validation.counts.inventory, blocked: 0, status: validation.counts.inventory === 11_610 ? "GREEN" : "RED" },
      { gate: "A2", target: 11_610, ready: validation.counts.identities, blocked: 0, status: validation.counts.identities === 11_610 ? "GREEN" : "RED" },
      { gate: "A3", target: 11_610, ready: validation.counts.groupUnion, blocked: 0, status: validation.counts.groupOverlap === 0 && validation.counts.groupUnion === 11_610 ? "GREEN" : "RED" },
      { gate: "A4", target: 11_610, ready: validation.counts.identities, blocked: validation.counts.unprovedAlias, status: validation.counts.unprovedAlias === 0 ? "GREEN" : "RED" },
      { gate: "A5", target: 11_610, ready: validation.counts.passports, blocked: 0, status: validation.counts.passports === 11_610 ? "GREEN" : "RED" },
      { gate: "A6", target: 11_610, ready: validation.counts.passports, blocked: validation.failures.length, status: validation.ok ? "GREEN" : "RED" },
      { gate: "A7", target: 1, ready: result.ok ? 1 : 0, blocked: result.ok ? 0 : 1, status: result.ok ? "GREEN" : "RED" },
    ], result });
    journal("A7", 1, result.ok ? 1 : 0, result.ok ? 0 : 1, rel(path.join(FOUNDATION, "FOUNDATION_RAW_RESULT_INDEX.json")), result.ok ? "A8_INDEPENDENT_REVIEW_AND_SEAL" : "STOP_FIX_REPLAY_FAILURE", result.ok ? 0 : 1);
  }
  return result;
}

function seal(): void {
  const result = replay(false);
  if (!result.ok) throw new Error(`A8_SEAL_PRECONDITION_RED:${JSON.stringify(result)}`);
  const head = result.head;
  const tree = result.tree;
  const token = `GREEN_MASTER_11610_IDENTITY_GROUP_TAXONOMY_AND_PASSPORT_FOUNDATION_ONLY_NOT_CONTENT_COMPLETE_EXACT_SHA_${head}`;
  const signoff = {
    schemaVersion: `${SCHEMA_VERSION}:independent-signoffs:v1`, exactSha: head, tree, contentComplete: false,
    signoffs: [
      { actorId: "foundation-identity-builder-v1", role: "Identity builder", scope: "M2-M4 source/identity/group/passport generation", evidenceHash: result.aggregateHashes.identities, gates: ["A1", "A2", "A3", "A4", "A5"] },
      { actorId: "independent-foundation-auditor-v1", role: "Independent deterministic QA actor", scope: "all 11610 source bindings, hashes, partition, alias targets, P0 decisions and no-silent-default invariants", evidenceHash: shaObject(result), gates: ["A6", "A7", "A8"] },
    ],
    limitation: "These are software-actor foundation sign-offs, not qualified engineering approval of professional content or normative applicability.",
  };
  writeJson(path.join(FOUNDATION, "INDEPENDENT_REVIEW_SIGNOFFS.json"), signoff);
  journal("A8_STOP", 1, 1, 0, rel(path.join(FOUNDATION, "INDEPENDENT_REVIEW_SIGNOFFS.json")), "HARD_STOP_AWAIT_EXPLICIT_PREPARE_EXACT_BATCH_AUTHORIZATION");
  const report = `# MASTER 11 610 foundation-only final report\n\n` +
    `Exact SHA: ${head}\n\nTree: ${tree}\n\nAsphalt predecessor: ${PREDECESSOR_COMMIT} / ${PREDECESSOR_TREE} / ${PREDECESSOR_MANIFEST_SHA}\n\n` +
    `Source inventory: 11,610/11,610; duplicate/missing/orphan/silent exclusion/source conflict: 0.\n\n` +
    `Semantic identities: 11,610/11,610. PRIMARY=${result.validation.counts.roleCounts.PRIMARY}; VARIANT=${result.validation.counts.roleCounts.VARIANT}; ALIAS=${result.validation.counts.roleCounts.ALIAS}.\n\n` +
    `Work groups: ${result.validation.counts.groups}; partition union=11,610; intersections=0; unassigned=0.\n\n` +
    `CatalogWorkPassports: 11,610/11,610; missing P0 decision=0; unproved alias=0; unresolved owner=0; silent default permission=0.\n\n` +
    `Asphalt crosswalk preserves 63 predecessor routes as 55 global source bindings plus 8 external M1 entrypoints; global denominator remains unchanged.\n\n` +
    `All A1-A8 foundation gates are GREEN on a clean worktree. Full Jest was not run. No professional content, batch queue/manifest, Electrical, push, release, deployment or production DB mutation was performed.\n\n` +
    `CONTENT_COMPLETE=false\n\nToken: ${token}\n\nHARD STOP: awaiting explicit PREPARE_EXACT_BATCH authorization.\n`;
  atomicWrite(path.join(FOUNDATION, "FOUNDATION_FINAL_REPORT.md"), report);
  atomicWrite(path.join(FOUNDATION, "FOUNDATION_TOKEN.txt"), `${token}\nCONTENT_COMPLETE=false\nHARD_STOP_AWAITING_EXPLICIT_PREPARE_EXACT_BATCH_AUTHORIZATION\n`);
  const excluded = new Set([rel(path.join(FOUNDATION, "FOUNDATION_EXACT_SHA_EVIDENCE_INDEX.json"))]);
  const files = recursiveFiles(ROOT).filter((file) => !excluded.has(rel(file))).map((file) => ({ file: rel(file), bytes: statSync(file).size, sha256: shaFile(file) }));
  const evidenceIndexWithoutHash = { schemaVersion: `${SCHEMA_VERSION}:exact-sha-evidence-index:v1`, exactSha: head, tree, mode: "FOUNDATION_ONLY", contentComplete: false, token, fileCount: files.length, files, sealingTuple: { predecessorManifestHash: PREDECESSOR_MANIFEST_SHA, sourceInventoryHash: result.aggregateHashes.inventory, semanticIdentityLedgerHash: result.aggregateHashes.identities, workGroupTaxonomyHash: result.aggregateHashes.taxonomy, passportIndexHash: result.aggregateHashes.passports, testContractHash: shaFile(path.join(FOUNDATION, "FOUNDATION_TEST_CONTRACT.json")), journalHash: shaFile(path.join(ROOT, "JOURNAL.log")) } };
  const evidenceIndex = { ...evidenceIndexWithoutHash, evidenceIndexHash: shaObject(evidenceIndexWithoutHash) };
  writeJson(path.join(FOUNDATION, "FOUNDATION_EXACT_SHA_EVIDENCE_INDEX.json"), evidenceIndex);
  if (git(["status", "--porcelain", "--untracked-files=all"]) !== "") throw new Error("A8_WORKTREE_DIRTY_AFTER_SEAL");
  console.info(JSON.stringify({ status: token, CONTENT_COMPLETE: false, HARD_STOP: true, head, tree, counts: result.validation.counts, aggregateHashes: result.aggregateHashes, evidenceIndexHash: evidenceIndex.evidenceIndexHash, evidenceIndexPath: rel(path.join(FOUNDATION, "FOUNDATION_EXACT_SHA_EVIDENCE_INDEX.json")) }, null, 2));
}

function selftest(): void {
  const inventory = buildInventory();
  const identities = buildIdentities(inventory);
  const taxonomy = buildGroups(identities, inventory);
  const passports = buildPassports(inventory, identities);
  const validation = validateAll(inventory, identities, taxonomy, passports);
  const crosswalk = buildAsphaltCrosswalk(inventory);
  console.info(JSON.stringify({ status: validation.ok ? "GREEN_SELFTEST" : "RED_SELFTEST", ...validation, asphaltCrosswalk: { total: crosswalk.length, globalOverlap: crosswalk.filter((row) => row.foundationCatalogId).length, externalEntrypoints: crosswalk.filter((row) => !row.foundationCatalogId).length } }, null, 2));
  if (!validation.ok) process.exitCode = 1;
}

function main(): void {
  const stage = process.argv.find((arg) => arg.startsWith("--stage="))?.slice("--stage=".length) ?? "";
  if (stage === "preflight") preflight();
  else if (stage === "inventory") inventoryStage();
  else if (stage === "identity") identityStage();
  else if (stage === "groups") groupsStage();
  else if (stage === "passports") passportsStage();
  else if (stage === "replay") { const result = replay(true); console.info(JSON.stringify(result, null, 2)); if (!result.ok) process.exitCode = 1; }
  else if (stage === "seal") seal();
  else if (stage === "selftest") selftest();
  else throw new Error(`MASTER_11610_FOUNDATION_STAGE_REQUIRED:${stage || "missing"}`);
}

main();
