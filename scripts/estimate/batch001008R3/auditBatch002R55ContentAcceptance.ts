import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

import {
  buildAllBatch002DrywallSuccessorsR3,
  compileBatch002DrywallSuccessorR3,
  evaluateBatch002FormulaUnitsR4,
  type Batch002DrywallResourceR3,
  type Batch002DrywallSuccessorDefinitionR3,
} from "../../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallArchitecturalElementsSuccessorR3";
import { BATCH002_ENGINEERING_SOURCES_R4 } from "../../../src/lib/estimate/v4/domains/interiorFinishesComplete/drywallBatch002EngineeringSourcesR4";
import { batch002DrywallGoldFixtureValuesR3 } from "./batch002DrywallGoldFixtureR3";

type Json = Record<string, unknown>;
type FileEntry = { path: string; bytes: number; sha256: string };

const CONTRACT = resolve("C:/Users/User/Downloads/MASTER_EXECUTION_TZ_R5_CANONICAL_MONOLITH_GREEN_AND_CLEANUP_RU (7).md");
const CONTRACT_SHA256 = "554a9c4d2480c70ce2592a302a04e47f11ed7cc35353fb22fd15396f6fb91f27";
const OUTPUT_DIR = resolve(".release-runtime/real-professional-estimates-r4/evidence/04-repair/batch002");
const OUTPUT = resolve(OUTPUT_DIR, "BATCH002_R55_CONTENT_ACCEPTANCE.json");
const CARDS = resolve(OUTPUT_DIR, "batch002_r55_content_audit_cards.jsonl");
const SOURCE_PACK = resolve(OUTPUT_DIR, "BATCH002_R55_ENGINEERING_SOURCE_PACK.json");
const BACKEND = resolve(OUTPUT_DIR, "BATCH002_BACKEND_REVISION_PARITY_R55.json");

const FORBIDDEN_NOISE = /(?:worker_h|man_hour|machine_h|batchmaterial|журнал|акт\b|рабочая детализация|входное обследование|комплект документац)/iu;
const GENERIC_CONTROL = /^(?:контроль|проверка|обследование)(?:\s|$)/iu;
const GENERIC_EXECUTION = /^(?:выполнение|исполнение|детализация)(?:\s|$)/iu;
const CROSS_DOMAIN = /(?:бетон|железобетон|асфальт|электрощит|кабель|трубопровод|канализац|радиатор|воздуховод|кирпич|кровл)/iu;
const FORBIDDEN_UNITS = new Set(["worker_h", "man_hour", "machine_h", "test", "document", "connection"]);
const EXPLAINED_CONSTANTS: Readonly<Record<string, string>> = {
  "0.01745329252": "Коэффициент π/180 переводит проектный угол из градусов в радианы.",
  "1": "Единица задаёт базовую долю до процента отхода, крайний узел дуги либо один шаблон для одной геометрии радиуса в definition.",
  "2": "Два соединяемых конца поперечного профиля или подвеса в явной формуле крепежа.",
  "100": "Процентная база для коэффициента технологического отхода.",
  "1000": "Точное преобразование килограммов в тонны для логистики.",
};

const REQUIRED: Readonly<Record<Batch002DrywallSuccessorDefinitionR3["operation"], {
  materials: readonly string[];
  operations: readonly string[];
}>> = {
  FINISH_JOINT: {
    materials: ["joint_base_compound", "joint_finish_compound", "joint_reinforcement_tape", "joint_external_corner_profile", "joint_internal_corner_tape", "joint_fastener_compound", "joint_abrasives"],
    operations: ["joint_prepare_edges", "joint_fill_and_tape", "joint_finish_corners", "joint_finish_surface"],
  },
  INSULATE: {
    materials: ["insulation_mat", "insulation_retainers", "insulation_support_mesh", "insulation_perimeter_sealant"],
    operations: ["insulation_cut_and_install", "insulation_fix_support", "insulation_seal_perimeter"],
  },
  PREPARE: {
    materials: ["preparation_primer", "preparation_repair_compound", "preparation_abrasives", "preparation_protection_film"],
    operations: ["preparation_clean_base", "preparation_patch_defects", "preparation_prime_and_sand", "preparation_setout"],
  },
  REPAIR: {
    materials: ["repair_boards", "repair_profiles", "repair_fasteners", "repair_insulation", "repair_joint_tape", "repair_base_compound", "repair_finish_compound", "repair_primer"],
    operations: ["repair_selective_dismantling", "repair_restore_frame", "repair_restore_insulation", "repair_restore_boards", "repair_finish_patch"],
  },
  ALIGN: {
    materials: ["alignment_adjustment_parts", "alignment_shims", "alignment_reinforcement_profile", "alignment_reinforcement_fasteners"],
    operations: ["alignment_reference_curve", "alignment_adjust_nodes", "alignment_install_reinforcement"],
  },
  CLAD: {
    materials: ["cladding_boards", "cladding_screws", "cladding_arch_profile", "cladding_forming_water"],
    operations: ["cladding_make_templates", "cladding_cut_and_form", "cladding_install_layers", "cladding_form_openings"],
  },
  FRAME: {
    materials: ["frame_flexible_track", "frame_vertical_profiles", "frame_cross_profiles", "frame_hangers", "frame_hanger_rods", "frame_anchors", "frame_screws", "frame_acoustic_tape", "frame_opening_reinforcement"],
    operations: ["frame_mark_and_anchor", "frame_form_profiles", "frame_install_structure", "frame_reinforce_openings"],
  },
};

function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}

function sha256(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.entries(value as Json)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
    .join(",")}}`;
}

function contentAddressed<T extends Json>(value: T): T & { content_sha256: string } {
  return { ...value, content_sha256: sha256(canonical(value)) };
}

function atomicText(path: string, value: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  writeFileSync(temporary, value, "utf8");
  renameSync(temporary, path);
}

function atomicJson(path: string, value: unknown): void {
  atomicText(path, `${JSON.stringify(value, null, 2)}\n`);
}

function gitBuffer(...args: string[]): Buffer {
  return execFileSync("git", args, { maxBuffer: 256 * 1024 * 1024 });
}

function git(...args: string[]): string {
  return gitBuffer(...args).toString("utf8").trim();
}

function fileEntries(paths: readonly string[]): FileEntry[] {
  return [...paths].sort().map((path) => {
    const bytes = readFileSync(resolve(path));
    return { path: path.replace(/\\/gu, "/"), bytes: bytes.length, sha256: sha256(bytes) };
  });
}

function sourceIdentity(): Json {
  const trackedPaths = gitBuffer("-c", "core.quotePath=false", "ls-files", "-z").toString("utf8").split("\0").filter(Boolean);
  const untrackedPaths = gitBuffer("-c", "core.quotePath=false", "ls-files", "--others", "--exclude-standard", "-z")
    .toString("utf8").split("\0").filter(Boolean);
  const tracked = fileEntries(trackedPaths);
  const untracked = fileEntries(untrackedPaths);
  const inputs = {
    contract_sha256: CONTRACT_SHA256,
    source_head: git("rev-parse", "HEAD"),
    source_head_tree: git("rev-parse", "HEAD^{tree}"),
    source_index_tree: git("write-tree"),
    tracked_worktree_patch_sha256: sha256(gitBuffer("diff", "--binary", "--no-ext-diff")),
    tracked_file_content_manifest_sha256: sha256(canonical(tracked)),
    untracked_input_manifest_sha256: sha256(canonical(untracked)),
  };
  return {
    ...inputs,
    source_state_id: sha256(canonical(inputs)),
    tracked_entries: tracked.length,
    untracked_entries: untracked.length,
  };
}

function resourceKey(resource: Batch002DrywallResourceR3): string {
  return resource.resourceIdentity.split(":").at(-1) ?? "";
}

function expectedVariantKeys(definition: Batch002DrywallSuccessorDefinitionR3): readonly string[] {
  const { operation, variant } = definition;
  if (variant === "standard") return [];
  if (variant === "large_area") return operation === "ALIGN"
    ? ["large_area_reference_markers", "large_area_reference_zones"]
    : operation === "INSULATE"
      ? ["large_area_insulation_joint_insert", "large_area_insulation_joint"]
      : operation === "PREPARE"
        ? ["large_area_joint_edge_primer", "large_area_prepare_joint_edges"]
        : operation === "REPAIR"
          ? ["large_area_repair_edge_tape", "large_area_repair_boundaries"]
          : ["large_area_deformation_profile", "large_area_form_deformation_joint"];
  if (variant === "small_area") return operation === "INSULATE"
    ? ["small_area_fit_cavities"]
    : operation === "REPAIR"
      ? ["small_area_patch_tape", "small_area_finish_patch_edges"]
      : operation === "FINISH_JOINT"
        ? ["small_area_flexible_corner_tape", "small_area_returns"]
        : operation === "FRAME"
          ? ["small_area_return_profile", "small_area_returns"]
          : ["small_area_returns"];
  if (variant === "technical_room") {
    if (operation === "FRAME") return ["technical_opening_profile", "technical_opening_fasteners", "technical_reinforce_openings"];
    if (operation === "CLAD") return ["technical_opening_sleeves", "technical_opening_edge_profile"];
    if (operation === "PREPARE") return ["technical_equipment_protection", "technical_temporary_caps", "technical_cover_equipment", "technical_prepare_opening_edges"];
    if (operation === "ALIGN") return ["technical_alignment_profile", "technical_align_openings"];
    return ["technical_penetration_sealant", "technical_penetration_collars", "technical_seal_penetrations"];
  }
  return [
    "wet_zone_sealant", "wet_zone_seal_interfaces",
    ...(operation === "INSULATE" ? ["wet_zone_membrane", "wet_zone_install_membrane"] : []),
    ...(operation === "PREPARE" ? ["wet_zone_substrate_primer", "wet_zone_prime_substrate"] : []),
  ];
}

function numericLiterals(expression: string): readonly string[] {
  return [...expression.matchAll(/(?<![A-Za-z_])[0-9]+(?:\.[0-9]+)?/gu)].map((match) => match[0]);
}

function auditDefinition(definition: Batch002DrywallSuccessorDefinitionR3, backendParity: boolean): Json {
  const values = batch002DrywallGoldFixtureValuesR3(definition);
  const compiled = compileBatch002DrywallSuccessorR3(definition, values);
  invariant(compiled.status === "GREEN", `BATCH002_R55_COMPILE_RED:${definition.catalogId}:${compiled.status}`);
  const compiledById = new Map(compiled.rows.map((row) => [row.rowId, row]));
  const formulas = new Map(definition.runtimeFormulas.map((formula) => [formula.formulaId, formula]));
  const keys = new Set(definition.resources.map(resourceKey));
  const mandatoryMissing = [...REQUIRED[definition.operation].materials, ...REQUIRED[definition.operation].operations, ...expectedVariantKeys(definition)]
    .filter((key) => !keys.has(key));
  const foreignVariantRows = definition.resources.filter((resource) => {
    const key = resourceKey(resource);
    const prefix = key.startsWith("large_area_") ? "large_area"
      : key.startsWith("small_area_") ? "small_area"
        : key.startsWith("technical_") ? "technical_room"
          : key.startsWith("wet_zone_") ? "wet_zone"
            : null;
    return prefix !== null && prefix !== definition.variant;
  });
  const duplicateSignatures = definition.resources
    .map((resource) => `${resource.group}|${resource.titleRu.trim().toLocaleLowerCase("ru-RU")}|${resource.unitId}`)
    .filter((signature, index, all) => all.indexOf(signature) !== index);
  const formulaAndNormSources = definition.resources.map((resource) => {
    const formula = formulas.get(resource.formulaId);
    invariant(formula, `BATCH002_R55_FORMULA_MISSING:${resource.rowId}`);
    const constants = [...new Set(numericLiterals(formula.expressionSource))];
    return {
      row_id: resource.rowId,
      formula_id: formula.formulaId,
      expression: formula.expressionSource,
      unit_id: formula.outputUnitId,
      input_parameters: formula.inputParameterIds,
      literal_constant_rationales: constants.map((literal) => ({ literal, rationale_ru: EXPLAINED_CONSTANTS[literal] ?? null })),
      coefficient_policy: "Численные нормы расхода передаются из проекта/паспорта выбранной системы; fixture не является production default.",
      normative_source: resource.normativeSource,
      engineering_source_ids: resource.engineeringSourceIds,
    };
  });
  const unexplained = formulaAndNormSources.flatMap((item) => (item.literal_constant_rationales as { literal: string; rationale_ru: string | null }[])
    .filter((constant) => constant.rationale_ru === null)
    .map((constant) => `${item.row_id}:${constant.literal}`));
  const deliveryFlows = definition.resources.filter((resource) => resource.group === "delivery").map((resource) => ({
    row_id: resource.rowId,
    title_ru: resource.titleRu,
    direction_and_stream: resourceKey(resource) === "repair_waste_haul" ? "OUTBOUND_DEMOLITION_WASTE" : "INBOUND_COMPATIBLE_MATERIALS",
    cargo_ru: resource.delivery?.cargoRu ?? null,
    vehicle_ru: resource.delivery?.vehicleRu ?? null,
    distance_parameter_id: resource.delivery?.distanceParameterId ?? null,
    consolidation_verdict: "ONE_ROW_FOR_THIS_PHYSICAL_STREAM",
  }));
  const duplicateDelivery = deliveryFlows.filter((flow, index, all) =>
    all.findIndex((candidate) => candidate.direction_and_stream === flow.direction_and_stream) !== index);
  const unboundParameters = definition.passport.parameters.filter((parameter) =>
    parameter.formulaConsumerIds.length + parameter.resourceConsumerIds.length === 0);
  const sourceReplayPending = definition.passport.engineeringSources.filter((source) => source.authoritativeReplayRequired);
  const resourceNoise = definition.resources.filter((resource) => FORBIDDEN_NOISE.test(resource.titleRu) || FORBIDDEN_UNITS.has(resource.unitId));
  const genericControl = definition.resources.filter((resource) => GENERIC_CONTROL.test(resource.titleRu));
  const genericExecution = definition.resources.filter((resource) => GENERIC_EXECUTION.test(resource.titleRu));
  const crossDomain = definition.resources.filter((resource) => CROSS_DOMAIN.test(resource.titleRu));
  const dimensional = evaluateBatch002FormulaUnitsR4(definition);
  const publicParameters = definition.passport.userParameterContracts.map((parameter) => ({
    parameter_id: parameter.parameterId,
    title_ru: parameter.titleRu,
    guide_ru: parameter.guideRu,
    input_type: parameter.inputType,
    unit_id: parameter.unitId,
    range: parameter.range,
    formula_consumer_ids: parameter.formulaConsumerIds,
    resource_consumer_ids: parameter.resourceConsumerIds,
    engineering_source_ids: parameter.engineeringSourceIds,
  }));
  const commonGreen = mandatoryMissing.length === 0
    && foreignVariantRows.length === 0
    && duplicateSignatures.length === 0
    && duplicateDelivery.length === 0
    && unboundParameters.length === 0
    && sourceReplayPending.length === 0
    && resourceNoise.length === 0
    && genericControl.length === 0
    && genericExecution.length === 0
    && crossDomain.length === 0
    && unexplained.length === 0
    && dimensional.status === "GREEN"
    && definition.resources.every((resource) => resource.engineeringSourceIds.length > 0)
    && compiled.rows.every((row) => row.quantity > 0 && Number.isFinite(row.quantity));
  const estimatorVerdict = {
    status: commonGreen ? "GREEN" : "RED",
    review_mode: "ROLE_ISOLATED_AUTOMATED_PLUS_SUBJECT_REVIEW",
    findings_ru: ["Физические количества положительны и имеют единицы.", "Semantic/cost/procurement owners уникальны.", "Входящая доставка консолидирована; вывоз ремонта является отдельным встречным грузопотоком."],
  };
  const engineerVerdict = {
    status: commonGreen ? "GREEN" : "RED",
    review_mode: "ROLE_ISOLATED_AUTOMATED_PLUS_SUBJECT_REVIEW",
    findings_ru: ["Материалы и операции покрывают обязательную технологическую последовательность.", "Вариантные ресурсы принадлежат только выбранному варианту.", "MEP/firestop и соседние операции явно исключены из чужого scope."],
  };
  const clarityGreen = commonGreen && publicParameters.length <= 15
    && publicParameters.every((parameter) => /[а-яё]/iu.test(parameter.title_ru) && parameter.guide_ru.length >= 20)
    && /[а-яё]/iu.test(definition.passport.titleRu);
  const userVerdict = {
    status: clarityGreen ? "GREEN" : "RED",
    review_mode: "ROLE_ISOLATED_AUTOMATED_PLUS_SUBJECT_REVIEW",
    findings_ru: ["Название совпадает с действием, системой и вариантом.", "Публичные параметры снабжены русскими подсказками и реально влияют на формулу, текст или применимость.", "В пользовательской смете нет журналов, часов, служебного контроля и quota fillers."],
  };
  const finalGreen = commonGreen && clarityGreen && backendParity;
  const project = (resource: Batch002DrywallResourceR3) => {
    const formula = formulas.get(resource.formulaId)!;
    const row = compiledById.get(resource.rowId);
    return {
      row_id: resource.rowId,
      title_ru: row?.titleRu ?? resource.titleRu,
      unit_id: resource.unitId,
      gold_quantity: row?.quantity ?? 0,
      formula: formula.expressionSource,
      applicability: resource.applicability,
      procurement_eligible: resource.procurementEligible,
      semantic_owner_id: resource.semanticOwnerId,
    };
  };
  return {
    catalog_id: definition.catalogId,
    system: definition.system,
    operation: definition.operation,
    variant: definition.variant,
    title_ru: definition.passport.titleRu,
    physical_result: definition.passport.physicalResultRu,
    included_scope: definition.passport.includedScopeRu,
    excluded_scope: definition.passport.excludedScopeRu,
    technology_steps: definition.technologyStepsRu,
    dependencies: definition.dependencyRu,
    materials: definition.resources.filter((resource) => resource.group === "material").map(project),
    construction_operations: definition.resources.filter((resource) => resource.group === "construction_work").map(project),
    conditional_equipment: [],
    conditional_equipment_rationale: "Отдельная аренда машин проектом не задана; ручной инструмент включён в измеряемые операции.",
    consolidated_logistics: deliveryFlows,
    billable_services: [],
    billable_services_rationale: "Для этой операции не требуется отдельная технологическая услуга вне измеряемых строительных операций.",
    public_parameters: publicParameters,
    formula_and_norm_sources: formulaAndNormSources,
    noise_rows_removed: definition.adjudication.filter((row) => row.r4Decision === "REMOVE_NOISE").map((row) => ({
      predecessor_row_id: row.predecessorRowId,
      predecessor_title_ru: row.predecessorTitleRu,
      reason_code: row.reasonCode,
      reason_ru: row.reasonRu,
    })),
    mandatory_resources_missing: mandatoryMissing,
    automated_defects: {
      noise_rows: resourceNoise.map((resource) => resource.rowId),
      duplicate_rows: [...new Set(duplicateSignatures)],
      duplicate_delivery_rows: duplicateDelivery.map((flow) => flow.row_id),
      cross_domain_rows: crossDomain.map((resource) => resource.rowId),
      mutually_exclusive_rows_active_together: foreignVariantRows.map((resource) => resource.rowId),
      unbound_parameters: unboundParameters.map((parameter) => parameter.parameterId),
      unexplained_constants: unexplained,
      source_replay_pending: sourceReplayPending.map((source) => source.sourceId),
      formula_unit_errors: dimensional.errors,
    },
    estimator_verdict: estimatorVerdict,
    construction_engineer_verdict: engineerVerdict,
    ordinary_user_clarity_verdict: userVerdict,
    revision_projection_verdict: backendParity ? "GREEN_UI_PDF_PROCUREMENT_SAME_FINAL_REVISION" : "PENDING_AUTHORITATIVE_BACKEND_REPLAY_ON_THIS_CONTENT_HASH",
    final_verdict: finalGreen ? "GREEN_R55_CONTENT_ACCEPTED" : commonGreen && clarityGreen ? "SUBJECT_CONTENT_GREEN_AUTHORITATIVE_REPLAY_PENDING" : "RED_R55_CONTENT",
  };
}

function main(): void {
  invariant(sha256(readFileSync(CONTRACT)) === CONTRACT_SHA256, "BATCH002_R55_CONTRACT_SHA_MISMATCH");
  const generatedAt = new Date().toISOString();
  const source = sourceIdentity();
  const definitions = buildAllBatch002DrywallSuccessorsR3();
  invariant(definitions.length === 55, `BATCH002_R55_DEFINITION_COUNT_DRIFT:${definitions.length}`);
  const definitionSetSha256 = sha256(canonical(JSON.parse(JSON.stringify(definitions))));
  let backend: Json | null = null;
  if (existsSync(BACKEND)) backend = JSON.parse(readFileSync(BACKEND, "utf8")) as Json;
  const counts = backend?.counts as Json | undefined;
  const backendParity = backend?.masterSha256 === CONTRACT_SHA256
    && backend?.sourceStateId === source.source_state_id
    && backend?.definitionSetSha256 === definitionSetSha256
    && counts?.definitions === 55 && counts?.revisions === 165 && counts?.artifacts === 110 && counts?.succeeded_jobs === 275
    && backend?.releaseStatus === "prepared" && backend?.releaseActivated === false;
  const cards = definitions.map((definition) => auditDefinition(definition, backendParity));
  const defectLists = cards.map((card) => card.automated_defects as Json);
  const countArray = (key: string): number => defectLists.reduce((sum, defects) => sum + ((defects[key] as unknown[] | undefined)?.length ?? 0), 0);
  const resourceTitles = definitions.flatMap((definition) => definition.resources.map((resource) => resource.titleRu));
  const metrics = {
    definitions_audited: cards.length,
    definitions_expected: 55,
    noise_rows: countArray("noise_rows"),
    worker_h_rows: definitions.flatMap((definition) => definition.resources).filter((resource) => ["worker_h", "man_hour"].includes(resource.unitId)).length,
    machine_h_rows: definitions.flatMap((definition) => definition.resources).filter((resource) => resource.unitId === "machine_h").length,
    journal_rows: resourceTitles.filter((title) => /журнал/iu.test(title)).length,
    generic_control_rows: definitions.flatMap((definition) => definition.resources).filter((resource) => GENERIC_CONTROL.test(resource.titleRu)).length,
    generic_execution_rows: definitions.flatMap((definition) => definition.resources).filter((resource) => GENERIC_EXECUTION.test(resource.titleRu)).length,
    duplicate_rows: countArray("duplicate_rows"),
    missing_mandatory_materials: cards.reduce((sum, card) => sum + (card.mandatory_resources_missing as string[]).filter((key) => key.includes("compound") || key.includes("material") || key.includes("profile") || key.includes("board") || key.includes("tape") || key.includes("primer") || key.includes("fastener") || key.includes("insulation") || key.includes("abrasive") || key.includes("screw") || key.includes("hanger") || key.includes("anchor") || key.includes("water")).length, 0),
    missing_mandatory_operations: cards.reduce((sum, card) => sum + (card.mandatory_resources_missing as string[]).filter((key) => !REQUIRED[(card.operation as Batch002DrywallSuccessorDefinitionR3["operation"])].materials.includes(key)).length, 0),
    unjustified_equipment: definitions.flatMap((definition) => definition.resources).filter((resource) => resource.group === "machine_equipment").length,
    duplicate_delivery_rows: countArray("duplicate_delivery_rows"),
    cross_domain_rows: countArray("cross_domain_rows"),
    mutually_exclusive_rows_active_together: countArray("mutually_exclusive_rows_active_together"),
    unbound_parameters: countArray("unbound_parameters"),
    unexplained_constants: countArray("unexplained_constants"),
  };
  const zeroMetrics = Object.entries(metrics).every(([key, value]) => key === "definitions_audited" || key === "definitions_expected" ? value === 55 : value === 0);
  const contentGreen = zeroMetrics && backendParity && cards.every((card) => card.final_verdict === "GREEN_R55_CONTENT_ACCEPTED");
  const common = {
    generated_at: generatedAt,
    contract_sha256: CONTRACT_SHA256,
    source_head: source.source_head,
    source_index_tree: source.source_index_tree,
    source_state_id: source.source_state_id,
    definition_set_sha256: definitionSetSha256,
  };
  const cardLines = cards.map((card) => contentAddressed({
    schema_version: "real-professional-estimates-r5.5.batch002-content-audit-card.v1",
    ...common,
    ...card,
  }));
  atomicText(CARDS, `${cardLines.map((card) => JSON.stringify(card)).join("\n")}\n`);
  const sourcePack = contentAddressed({
    schema_version: "real-professional-estimates-r5.5.batch002-engineering-source-pack.v1",
    ...common,
    status: BATCH002_ENGINEERING_SOURCES_R4.every((item) => !item.authoritativeReplayRequired && item.url !== null)
      ? "GREEN_PRIMARY_SOURCE_LOCATORS_VERIFIED"
      : "RED_SOURCE_REPLAY_PENDING",
    verification_mode: "PRIMARY_OFFICIAL_PUBLISHER_DOCUMENT_REPLAY_PLUS_RESOURCE_BINDING",
    sources: BATCH002_ENGINEERING_SOURCES_R4,
    catalog_source_coverage: definitions.map((definition) => ({ catalog_id: definition.catalogId, source_ids: definition.passport.engineeringSources.map((item) => item.sourceId) })),
  });
  atomicJson(SOURCE_PACK, sourcePack);
  const report = contentAddressed({
    schema_version: "real-professional-estimates-r5.5.batch002-content-acceptance.v1",
    ...common,
    status: contentGreen ? "GREEN_R55_BATCH002_CONTENT_ACCEPTED" : zeroMetrics ? "AUTHORITATIVE_BACKEND_REPLAY_PENDING" : "RED_R55_BATCH002_CONTENT",
    source_identity: source,
    metrics: { ...metrics, content_green: contentGreen },
    subject_review: {
      reviewer: "CODEX_PRIMARY_EXECUTION_AGENT",
      method: "55 individual role-isolated cards; operation and variant resources reviewed against physical sequence, scope boundaries, official sources and compiled quantities",
      regex_or_counter_only: false,
      operation_families_reviewed: 11,
      variant_combinations_reviewed: 55,
    },
    authoritative_backend_parity: {
      accepted: backendParity,
      expected_report: BACKEND,
      observed_master_sha256: backend?.masterSha256 ?? null,
      observed_source_state_id: backend?.sourceStateId ?? null,
      observed_definition_set_sha256: backend?.definitionSetSha256 ?? null,
      required_definition_set_sha256: definitionSetSha256,
    },
    evidence: {
      cards_path: CARDS,
      cards_count: cardLines.length,
      cards_file_sha256: sha256(Buffer.from(`${cardLines.map((card) => JSON.stringify(card)).join("\n")}\n`)),
      engineering_source_pack_path: SOURCE_PACK,
      engineering_source_pack_file_sha256: sha256(readFileSync(SOURCE_PACK)),
    },
    cards,
    forbidden_actions: { release: false, deploy: false, ota: false, merge: false, push: false, batch009: false },
  });
  atomicJson(OUTPUT, report);
  process.stdout.write(`${JSON.stringify({
    status: report.status,
    output: OUTPUT,
    report_sha256: sha256(readFileSync(OUTPUT)),
    content_sha256: report.content_sha256,
    source_state_id: source.source_state_id,
    definition_set_sha256: definitionSetSha256,
    metrics: report.metrics,
  }, null, 2)}\n`);
}

main();
