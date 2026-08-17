import path from "node:path";
import { statSync } from "node:fs";
import {
  B9_RELEASE_A,
  EVIDENCE,
  GLOBAL_LEDGER,
  PACKAGE_A,
  PACKAGE_B,
  SCHEMA_VERSION,
  ensureDir,
  invariant,
  journal,
  producer,
  readJson,
  readJsonl,
  sha256File,
  sha256Object,
  sourceIdentity,
  stableJson,
  writeJson,
  writeJsonl,
} from "./support";

type GlobalLedgerRow = {
  catalog_id: string;
  canonical_id: string;
  title_ru: string;
  source_family: string;
  operation: string;
  object_type: string;
  installation_context: string[];
  state: string;
  current_owner: string;
  proposed_owner: string;
  decision: string;
  evidence: string[];
  classificationSha256: string;
};

type WorkRow = {
  catalogId: string;
  namespace: "global" | "external_reference";
  domain: string;
  workKey: string;
  titleRu: string;
  sourceIdentity: string;
  definitionVersion: number;
  applicability: Record<string, unknown>;
  passport: Record<string, unknown>;
  sourceMetadata: Record<string, unknown>;
};

type BaseTemplate = {
  work_key: string;
  localized_name_ru: string;
  aliases?: string[];
  unit_policy_id: string;
  norm_pack_id: string;
  work_family_id: string;
  calculator_family_id: string;
};

type ExpandedTemplate = {
  template_id: string;
  work_family_id: string;
  template_level: string;
  requiredInputs: string[];
};

type ExpandedFamily = {
  work_family_id: string;
  professionalNameRu: string;
  aliases?: string[];
  categoryGroup: string;
  globalCategory: string;
  unitPolicy: string;
  parameterSchema?: Array<{ key: string; labelRu: string }>;
  normSource?: { sourceId?: string; titleRu?: string; version?: string };
};

type SearchDocument = ReturnType<typeof buildGlobalDocument> | ReturnType<typeof buildExternalDocument>;

const COMMAND = "P0_R2_PACKAGE_TARGET=A|B npx tsx scripts/estimate/p0TruthRemediationR2/buildR2SearchIndex.ts";
const target = String(process.env.P0_R2_PACKAGE_TARGET ?? "A").toUpperCase();
invariant(target === "A" || target === "B", `INVALID_PACKAGE_TARGET:${target}`);
const packageRoot = target === "A" ? PACKAGE_A : PACKAGE_B;
const searchRoot = path.join(packageRoot, "search-index");
ensureDir(searchRoot);
ensureDir(EVIDENCE);

const basePath = path.resolve("data/estimate-templates/estimate-10000-readiness-manifest.json");
const expandedPath = path.resolve("data/estimate-catalog/expanded-complex/templates.json");
const familiesPath = path.resolve("data/estimate-catalog/expanded-complex/work-families.json");
const worksPath = path.join(B9_RELEASE_A, "works.jsonl");
const inputPaths = [GLOBAL_LEDGER, worksPath, basePath, expandedPath, familiesPath];
const inputSetSha256 = sha256Object(inputPaths.map((file) => ({ file, sha256: sha256File(file) })));
const source = sourceIdentity();

const globalRows = readJsonl<GlobalLedgerRow>(GLOBAL_LEDGER);
const works = readJsonl<WorkRow>(worksPath);
const base = readJson<{ templates: BaseTemplate[] }>(basePath).templates;
const expanded = readJson<ExpandedTemplate[]>(expandedPath);
const families = readJson<ExpandedFamily[]>(familiesPath);
invariant(globalRows.length === 11_610, `GLOBAL_LEDGER_COUNT:${globalRows.length}`);
invariant(new Set(globalRows.map((row) => row.catalog_id)).size === 11_610, "GLOBAL_LEDGER_DUPLICATES");

const admittedGlobal = new Map(works.filter((row) => row.namespace === "global").map((row) => [row.catalogId, row]));
const admittedGlobalBySourceIdentity = new Map(works.filter((row) => row.namespace === "global").map((row) => [row.sourceIdentity, row]));
const externalWorks = works.filter((row) => row.namespace === "external_reference");
invariant(admittedGlobal.size === 3_843, `ADMITTED_GLOBAL_COUNT:${admittedGlobal.size}`);
invariant(externalWorks.length === 660, `EXTERNAL_COUNT:${externalWorks.length}`);
invariant(new Set(externalWorks.map((row) => row.catalogId)).size === 660, "EXTERNAL_DUPLICATES");

const baseById = new Map(base.map((row) => [row.work_key, row]));
const expandedById = new Map(expanded.map((row) => [row.template_id, row]));
const familyById = new Map(families.map((row) => [row.work_family_id, row]));

function normalize(value: string): string {
  return value.toLocaleLowerCase("ru").replace(/ё/gu, "е").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

const transliteration: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y",
  к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f",
  х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  ң: "ng", ө: "o", ү: "u",
};

function transliterate(value: string): string {
  return normalize(value).split("").map((character) => transliteration[character] ?? character).join("").replace(/\s+/gu, " ").trim();
}

function unique(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

function operationKind(operation: string): string {
  const value = operation.toUpperCase();
  if (/REMOVE|DEMOL|DISMANT/u.test(value)) return "DEMOLITION";
  if (/REPAIR|RESTOR/u.test(value)) return "REPAIR";
  if (/REPLACE/u.test(value)) return "REPLACEMENT";
  if (/COMMISSION|STARTUP/u.test(value)) return "COMMISSIONING";
  if (/TEST|CHECK|CONTROL/u.test(value)) return "TESTING";
  if (/MAINTAIN|SERVICE/u.test(value)) return "MAINTENANCE";
  if (/DESIGN/u.test(value)) return "DESIGN";
  if (/SURVEY|INSPECT|ASSESS/u.test(value)) return "SURVEY";
  if (/INSTALL|BUILD|APPLY|POUR|ANCHOR|MOUNT|LAY|ASSEMBLE|CONSTRUCT|REINFORCE|FINISH/u.test(value)) return "NEW_INSTALLATION";
  return "OTHER";
}

function unitFromPolicy(value: string | undefined): string {
  const match = String(value ?? "").match(/_(m2|m3|kg|ton|linear_m|piece|set|point|hour|day)_v\d+$/iu);
  return match?.[1] ?? "project_defined_uom";
}

function globalSource(row: GlobalLedgerRow) {
  const baseRow = baseById.get(row.catalog_id);
  const expandedRow = expandedById.get(row.catalog_id);
  const family = expandedRow ? familyById.get(expandedRow.work_family_id) : undefined;
  return { baseRow, expandedRow, family };
}

function globalGroupId(row: GlobalLedgerRow): string {
  let key = row.catalog_id;
  for (const context of [...row.installation_context].sort((left, right) => right.length - left.length)) {
    const suffix = `_${context}`;
    if (key.endsWith(suffix)) {
      key = key.slice(0, -suffix.length);
      break;
    }
  }
  return `wg:global:${key}`;
}

function commonEnvelope(semanticRole: string) {
  return {
    schema_version: SCHEMA_VERSION,
    producer_command: COMMAND,
    producer_actor: `search-index-builder-${target}`,
    semantic_role: semanticRole,
    source_head: source.head,
    source_tree: source.tree,
    input_set_sha256: inputSetSha256,
  };
}

function buildGlobalDocument(row: GlobalLedgerRow) {
  const admitted = admittedGlobal.get(row.catalog_id) ?? admittedGlobalBySourceIdentity.get(row.catalog_id);
  const canonicalCatalogId = admitted?.catalogId ?? row.catalog_id;
  const sourceRow = globalSource(row);
  const aliases = unique([
    ...(sourceRow.baseRow?.aliases ?? []),
    ...(sourceRow.family?.aliases ?? []),
    transliterate(row.title_ru),
    row.catalog_id,
    canonicalCatalogId,
  ]).filter((alias) => normalize(alias) !== normalize(row.title_ru));
  const groupId = globalGroupId(row);
  const systemId = row.catalog_id.match(/_(interior|exterior|utility|site)_/u)?.[1] ?? "source_defined";
  const primaryUom = admitted
    ? String((admitted.passport as { primaryUom?: string }).primaryUom ?? unitFromPolicy(sourceRow.baseRow?.unit_policy_id ?? sourceRow.family?.unitPolicy))
    : unitFromPolicy(sourceRow.baseRow?.unit_policy_id ?? sourceRow.family?.unitPolicy);
  const normalizedTerms = unique([
    row.catalog_id,
    canonicalCatalogId,
    row.title_ru,
    ...aliases,
    row.source_family,
    row.operation,
    row.object_type,
    ...row.installation_context,
    groupId,
    sourceRow.baseRow?.norm_pack_id,
  ].flatMap((value) => [normalize(String(value ?? "")), ...normalize(String(value ?? "")).split(" ")]));
  const body = {
    ...commonEnvelope("Versioned baseline global taxonomy/search passport"),
    catalog_id: canonicalCatalogId,
    domain_id: admitted?.domain ?? row.source_family,
    system_id: systemId,
    subsystem_id: row.object_type.toLocaleLowerCase("en"),
    assembly_id: `${row.source_family}:${row.object_type.toLocaleLowerCase("en")}`,
    work_family_id: row.source_family,
    group_id: groupId,
    subgroup_id: null,
    element_type: row.object_type,
    operation_kind: operationKind(row.operation),
    technology_variant: row.installation_context.join("+") || "source_defined",
    construction_state: operationKind(row.operation),
    primary_uom: primaryUom,
    canonical_name_ru: row.title_ru,
    aliases,
    normative_classifiers: unique([sourceRow.baseRow?.norm_pack_id, sourceRow.family?.normSource?.sourceId]),
    applicability_tags: unique([row.source_family, row.object_type, row.operation, ...row.installation_context]),
    publication_state: admitted ? "ADMITTED_BACKEND" : "PRELIMINARY_NOT_CANONICAL",
    catalog_origin: "GLOBAL",
    definition_release_id: null,
    short_scope_ru: admitted
      ? `Backend definition: ${row.title_ru}`
      : `Неаттестованная работа global queue: ${row.title_ru}. Профессиональный итог запрещён.`,
    key_distinguishing_parameters: admitted
      ? ((admitted.passport as { keyParameters?: unknown[] }).keyParameters ?? [])
      : unique([row.operation, row.object_type, ...row.installation_context]),
    required_inputs_count: admitted ? Number((admitted.passport as { requiredInputsCount?: number }).requiredInputsCount ?? 0) : 0,
    clarification_fields: unique(["operation_kind", "element_type", "technology_variant"]),
    included_boundaries: [],
    excluded_boundaries: admitted ? [] : ["PROFESSIONAL_COMPILE_UNTIL_ADMISSION"],
    replacement_catalog_id: null,
    normalized_catalog_id: normalize(canonicalCatalogId),
    normalized_canonical_name: normalize(row.title_ru),
    normalized_aliases: aliases.map(normalize),
    normalized_search_terms: normalizedTerms,
    normalized_search_blob: normalizedTerms.join("\u001f"),
    source_provenance: {
      ledger_classification_sha256: row.classificationSha256,
      global_ledger_catalog_id: row.catalog_id,
      ledger_state: row.state,
      ledger_current_owner: row.current_owner,
      ledger_decision: row.decision,
      evidence: row.evidence,
      admitted_work_definition_version: admitted?.definitionVersion ?? null,
    },
  };
  return { ...body, document_sha256: sha256Object(body) };
}

function externalOrigin(row: WorkRow): "EXTERNAL_D" | "EXTERNAL_N" {
  const origin = String(row.sourceMetadata.origin ?? "");
  return /:n:|NORMATIVE_GAP/u.test(`${row.catalogId}:${origin}`) ? "EXTERNAL_N" : "EXTERNAL_D";
}

function externalOperation(row: WorkRow): string {
  const metadata = row.sourceMetadata as { inventoryRecord?: { operation_class?: string } };
  const tokens = `${metadata.inventoryRecord?.operation_class ?? ""}:${row.workKey}`;
  return operationKind(tokens);
}

function buildExternalDocument(row: WorkRow) {
  const metadata = row.sourceMetadata as { inventoryRecord?: Record<string, unknown> };
  const inventory = metadata.inventoryRecord ?? {};
  const groupKey = String(inventory.canonical_technology_id ?? row.workKey);
  const groupId = `wg:external:${row.domain}:${groupKey}`;
  const aliases = unique([
    String(inventory.alias_of ?? ""),
    transliterate(row.titleRu),
    row.workKey,
    row.catalogId,
  ]).filter((alias) => normalize(alias) !== normalize(row.titleRu));
  const operation = externalOperation(row);
  const normalizedTerms = unique([
    row.catalogId, row.titleRu, row.workKey, row.domain, groupKey, groupId,
    String(inventory.operation_class ?? ""), String(inventory.ui_group ?? ""), ...aliases,
  ].flatMap((value) => [normalize(value), ...normalize(value).split(" ")]));
  const body = {
    ...commonEnvelope("Versioned baseline external taxonomy/search passport"),
    catalog_id: row.catalogId,
    domain_id: row.domain,
    system_id: String(inventory.ui_group ?? row.domain).toLocaleLowerCase("en"),
    subsystem_id: groupKey,
    assembly_id: `${row.domain}:${groupKey}`,
    work_family_id: groupKey,
    group_id: groupId,
    subgroup_id: null,
    element_type: String(inventory.canonical_technology_id ?? row.workKey),
    operation_kind: operation,
    technology_variant: String(inventory.operation_class ?? row.applicability.operationClass ?? "source_defined"),
    construction_state: operation,
    primary_uom: String((row.passport as { primaryUom?: string }).primaryUom ?? "project_defined_uom"),
    canonical_name_ru: row.titleRu,
    aliases,
    normative_classifiers: [],
    applicability_tags: unique([row.domain, groupKey, String(row.applicability.operationClass ?? "")]),
    publication_state: "ADMITTED_BACKEND",
    catalog_origin: externalOrigin(row),
    definition_release_id: null,
    short_scope_ru: `External backend definition: ${row.titleRu}`,
    key_distinguishing_parameters: [],
    required_inputs_count: 0,
    clarification_fields: unique(["operation_kind", "technology_variant"]),
    included_boundaries: [],
    excluded_boundaries: [],
    replacement_catalog_id: null,
    normalized_catalog_id: normalize(row.catalogId),
    normalized_canonical_name: normalize(row.titleRu),
    normalized_aliases: aliases.map(normalize),
    normalized_search_terms: normalizedTerms,
    normalized_search_blob: normalizedTerms.join("\u001f"),
    source_provenance: {
      source_identity: row.sourceIdentity,
      definition_version: row.definitionVersion,
      source_metadata: row.sourceMetadata,
    },
  };
  return { ...body, document_sha256: sha256Object(body) };
}

const documents = [
  ...globalRows.map(buildGlobalDocument),
  ...externalWorks.map(buildExternalDocument),
].sort((left, right) => left.catalog_id.localeCompare(right.catalog_id));
invariant(documents.length === 12_270, `SEARCH_DOCUMENT_COUNT:${documents.length}`);
invariant(new Set(documents.map((row) => row.catalog_id)).size === 12_270, "SEARCH_DOCUMENT_DUPLICATES");

const groupsById = new Map<string, SearchDocument[]>();
for (const document of documents) groupsById.set(document.group_id, [...(groupsById.get(document.group_id) ?? []), document]);
const groups = [...groupsById.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([groupId, members]) => {
  const sorted = members.slice().sort((left, right) =>
    `${left.operation_kind}:${left.technology_variant}:${left.canonical_name_ru}:${left.catalog_id}`
      .localeCompare(`${right.operation_kind}:${right.technology_variant}:${right.canonical_name_ru}:${right.catalog_id}`));
  const first = sorted[0];
  const memberIds = sorted.map((row) => row.catalog_id);
  const body = {
    ...commonEnvelope("Explicit backend group identity and complete membership count"),
    group_id: groupId,
    group_name_ru: first.canonical_name_ru,
    domain_id: first.domain_id,
    system_id: first.system_id,
    subsystem_id: first.subsystem_id,
    assembly_id: first.assembly_id,
    work_family_id: first.work_family_id,
    breadcrumb: [first.domain_id, first.system_id, first.subsystem_id, first.assembly_id, first.work_family_id, groupId],
    member_count: memberIds.length,
    member_set_sha256: sha256Object(memberIds),
    oracle_disposition: {
      status: "STRUCTURAL_MEMBERSHIP_ONLY_NORMATIVE_COMPLETENESS_REQUIRES_INDEPENDENT_ORACLE",
      inferred_from_similarity: false,
      source_rule: groupId.startsWith("wg:global:") ? "GLOBAL_LEDGER_EXACT_CONTEXT_VARIANTS" : "EXTERNAL_CANONICAL_TECHNOLOGY_IDENTITY",
    },
  };
  return { ...body, group_sha256: sha256Object(body) };
});

const memberships = groups.flatMap((group) => {
  const members = groupsById.get(group.group_id)!;
  return members.slice().sort((left, right) => left.catalog_id.localeCompare(right.catalog_id)).map((member, ordinal) => ({
    ...commonEnvelope("Explicit GROUP_MEMBERSHIP; never inferred from query similarity"),
    group_id: group.group_id,
    catalog_id: member.catalog_id,
    ordinal,
    independent_disposition: {
      status: "STRUCTURAL_PASS_NORMATIVE_ORACLE_PENDING",
      evidence_sha256: member.document_sha256,
      similarity_used: false,
    },
  }));
});

function relationType(sourceOperation: string, targetOperation: string): string | null {
  if (sourceOperation === "DEMOLITION" && targetOperation === "NEW_INSTALLATION") return "FOLLOW_UP";
  if (sourceOperation === "NEW_INSTALLATION" && targetOperation === "DEMOLITION") return "DEMOLITION_VARIANT";
  if (sourceOperation === "REPAIR" && targetOperation === "REPLACEMENT") return "REPLACEMENT_VARIANT";
  if (sourceOperation === "REPLACEMENT" && targetOperation === "REPAIR") return "REPAIR_VARIANT";
  if (sourceOperation === "NEW_INSTALLATION" && ["TESTING", "COMMISSIONING"].includes(targetOperation)) return "TESTING_OR_COMMISSIONING_VARIANT";
  if (["TESTING", "COMMISSIONING"].includes(sourceOperation) && targetOperation === "NEW_INSTALLATION") return "PREREQUISITE";
  if (sourceOperation === "NEW_INSTALLATION" && targetOperation === "MAINTENANCE") return "MAINTENANCE_VARIANT";
  if (sourceOperation === "MAINTENANCE" && targetOperation === "NEW_INSTALLATION") return "NEW_INSTALLATION_VARIANT";
  return null;
}

const globalAssembly = new Map<string, SearchDocument[]>();
for (const document of documents.filter((row) => row.catalog_origin === "GLOBAL")) {
  const context = document.technology_variant;
  const key = `${document.assembly_id}:${context}`;
  globalAssembly.set(key, [...(globalAssembly.get(key) ?? []), document]);
}
const relationKeys = new Set<string>();
const relations = [...globalAssembly.values()].flatMap((members) => members.flatMap((sourceDocument) => members.flatMap((targetDocument) => {
  if (sourceDocument.catalog_id === targetDocument.catalog_id || sourceDocument.group_id === targetDocument.group_id) return [];
  const type = relationType(sourceDocument.operation_kind, targetDocument.operation_kind);
  if (!type) return [];
  const uniqueKey = `${sourceDocument.catalog_id}\u001f${targetDocument.catalog_id}\u001f${type}`;
  if (relationKeys.has(uniqueKey)) return [];
  relationKeys.add(uniqueKey);
  const body = {
    ...commonEnvelope("Typed cross-operation relation distinct from GROUP_MEMBERSHIP"),
    source_catalog_id: sourceDocument.catalog_id,
    target_catalog_id: targetDocument.catalog_id,
    relationship_type: type,
    direction: "OUTBOUND",
    source_locator: `${GLOBAL_LEDGER}#classificationSha256=${String((sourceDocument.source_provenance as Record<string, unknown>).ledger_classification_sha256 ?? "")}`.replace(/\\/gu, "/"),
    applicability_predicate: { same_assembly: sourceDocument.assembly_id, same_context: sourceDocument.technology_variant },
    required_when: { explicit_user_selection_required: true, auto_select: false },
    mutually_exclusive_with: [],
    explanation_ru: `Связана с той же конструкцией, но имеет другую физическую операцию: ${sourceDocument.operation_kind} → ${targetDocument.operation_kind}.`,
  };
  return [{ ...body, relation_sha256: sha256Object(body) }];
}))).sort((left, right) =>
  `${left.source_catalog_id}:${left.relationship_type}:${left.target_catalog_id}`
    .localeCompare(`${right.source_catalog_id}:${right.relationship_type}:${right.target_catalog_id}`));

const noRelationDispositions = documents.filter((document) => !relations.some((relation) => relation.source_catalog_id === document.catalog_id)).map((document) => ({
  ...commonEnvelope("Per-ID disposition for zero expected typed relations"),
  catalog_id: document.catalog_id,
  disposition: "NO_RELATION_APPLICABLE_STRUCTURAL_ORACLE_PENDING_NORMATIVE_REVIEW",
  assembly_id: document.assembly_id,
  operation_kind: document.operation_kind,
  reason_ru: "В текущем frozen taxonomy snapshot не найден другой operation-kind той же assembly/context; нормативная полнота ещё должна быть подтверждена независимым Oracle A/B.",
}));

const documentPath = path.join(searchRoot, "search-documents.jsonl");
const groupPath = path.join(searchRoot, "groups.jsonl");
const membershipPath = path.join(searchRoot, "group-memberships.jsonl");
const relationPath = path.join(searchRoot, "typed-relations.jsonl");
const noRelationPath = path.join(searchRoot, "no-relation-dispositions.jsonl");
writeJsonl(documentPath, documents);
writeJsonl(groupPath, groups);
writeJsonl(membershipPath, memberships);
writeJsonl(relationPath, relations);
writeJsonl(noRelationPath, noRelationDispositions);

const manifestBody = {
  ...producer(COMMAND, `Deterministic server-owned baseline search package ${target}`, inputPaths),
  package_target: target,
  ranking_contract_version: "estimate-search-ranking-r2.t1-t6.v1",
  taxonomy_version: "estimate-search-taxonomy-r2.v1",
  group_relation_version: "estimate-search-group-relation-r2.v1",
  counts: {
    global: documents.filter((row) => row.catalog_origin === "GLOBAL").length,
    external_d: documents.filter((row) => row.catalog_origin === "EXTERNAL_D").length,
    external_n: documents.filter((row) => row.catalog_origin === "EXTERNAL_N").length,
    external_total: documents.filter((row) => row.catalog_origin !== "GLOBAL").length,
    total: documents.length,
    admitted_backend: documents.filter((row) => row.publication_state === "ADMITTED_BACKEND").length,
    preliminary_not_canonical: documents.filter((row) => row.publication_state === "PRELIMINARY_NOT_CANONICAL").length,
    groups: groups.length,
    memberships: memberships.length,
    typed_relations: relations.length,
    no_relation_dispositions: noRelationDispositions.length,
    discovered_resolved: null,
  },
  invariants: {
    catalog_ids_unique: true,
    group_membership_union: memberships.length === documents.length,
    group_membership_overlap: memberships.length - new Set(memberships.map((row) => row.catalog_id)).size,
    frontend_search_owner: false,
    two_character_fuzzy_allowed: false,
    literal_total_excludes_t6: true,
    discovery_oracle_complete: false,
  },
  files: [
    [documentPath, "Searchable taxonomy documents"],
    [groupPath, "Explicit groups"],
    [membershipPath, "Complete structural membership"],
    [relationPath, "Typed relations"],
    [noRelationPath, "Zero-relation dispositions"],
  ].map(([file, role]) => ({
    file: path.relative(packageRoot, file).replace(/\\/gu, "/"),
    bytes: statSync(file).size,
    sha256: sha256File(file),
    semantic_role: role,
  })),
  status: "RED_PENDING_INDEPENDENT_NORMATIVE_GROUP_DISCOVERY_ORACLE",
};
const manifestPath = path.join(packageRoot, "FINAL_SEARCH_INDEX_MANIFEST.json");
writeJson(manifestPath, { ...manifestBody, manifest_sha256: sha256Object(manifestBody) });

if (target === "A") {
  writeJsonl(path.join(EVIDENCE, "SEARCH_BASELINE_12270_TAXONOMY_PASSPORTS.jsonl"), documents);
  writeJsonl(path.join(EVIDENCE, "SEARCH_FINAL_TAXONOMY_PASSPORTS.jsonl"), documents.map((document) => ({
    ...document,
    final_scope_status: "PROVISIONAL_BASELINE_ONLY_DISCOVERY_UNRESOLVED",
  })));
  writeJsonl(path.join(EVIDENCE, "GROUP_MEMBERSHIP_DISPOSITIONS_11610.jsonl"), memberships.filter((row) => row.catalog_id && documents.find((document) => document.catalog_id === row.catalog_id)?.catalog_origin === "GLOBAL"));
  writeJsonl(path.join(EVIDENCE, "TYPED_RELATION_GRAPH.jsonl"), [...relations, ...noRelationDispositions]);
  writeJson(path.join(EVIDENCE, "FINAL_SEARCH_INDEX_MANIFEST.json"), { ...manifestBody, manifest_sha256: sha256Object(manifestBody) });
  writeJson(path.join(EVIDENCE, "DISCOVERY_AWARE_FINAL_SCOPE_AND_QUEUE_ARITHMETIC.json"), {
    ...producer(COMMAND, "Discovery-aware arithmetic remains fail-closed until independent normative oracle", inputPaths),
    baseline: { global_denominator: 11_610, admitted_global_after_fire: 3_843, remaining_global_after_fire: 7_767, searchable: 12_270 },
    n_discovered_global_from_queue: null,
    n_discovered_global_new: null,
    n_discovered_external: null,
    status: "RED_UNRESOLVED_DISCOVERY_COUNTS",
  });
  journal({
    gate: "S0",
    check: "Backend taxonomy/search snapshot 12270 и явные group/relation ledgers",
    why: "Frontend не может владеть canonical index, скрытым top-K или membership по похожести слов.",
    command: `P0_R2_PACKAGE_TARGET=${target} npx tsx scripts/estimate/p0TruthRemediationR2/buildR2SearchIndex.ts`,
    result: `Материализовано ${documents.length} документов, ${groups.length} групп, ${relations.length} typed relations; normative discovery ещё не закрыт.`,
    status: "RED",
    affected: manifestBody.counts,
    rootCause: "Существующий structural ledger не доказывает нормативную полноту групп и N_DISCOVERED.",
    repair: "Создан versioned backend-owned snapshot без hidden top-K; preliminary global queue явно отделена от admitted backend.",
    completed: "Baseline 11610 global + 660 external reconciled exactly.",
    next: "Запустить независимые search/group discovery Oracle A/B и exhaustive literal substring corpus.",
  });
}

console.info(stableJson({
  status: manifestBody.status,
  target,
  manifest: manifestPath,
  counts: manifestBody.counts,
}));
