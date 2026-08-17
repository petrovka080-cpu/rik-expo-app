import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { buildAiEstimateParameterCards } from "../../src/lib/estimate/buildAiEstimateParameterCards";
import { buildNormativeParameterCompletenessModel } from "../../src/lib/estimate/buildNormativeParameterCompletenessModel";
import { buildAiEstimateCatalogIndex } from "../../src/lib/estimate/catalog/buildAiEstimateCatalogIndex";
import { isAiEstimateTechnicalHiddenParam } from "../../src/lib/estimate/aiEstimateRuParameterDictionary";
import { createAiEstimateRuntime } from "../../src/lib/estimate/runtime/createAiEstimateRuntime";
import type { EstimateDraftRevision } from "../../src/lib/estimate/estimateDraftRevisionContract";
import { PROFESSIONAL_DOMAIN_VISIBLE_BASELINE_VERSION_V1 } from "../../src/lib/estimate/v4/domains/professionalDomainVisibleBaselineV1";

const R53_SPEC_SHA256 = "1692ec051abcda1e4b973e1a3c9d053c22e17748ee5838d23f83d631f1b341b2";
const SOURCE_CHECKPOINT = "30f366222eba23bc9dc1645b278a96bd623fdf3a2c88058216ff2da1825f09f5";
const EVIDENCE_ROOT = path.join(
  ".release-runtime",
  "p0-one-monolith-r5",
  "evidence",
  "02-phase1a",
  "r53-missing-parameter-passports",
);

export const R53_PREVIOUSLY_MISSING_PARAMETER_PASSPORT_IDS = Object.freeze([
  "chimney_stack_tender_boq_expanded_complex_v1",
  "drywall_ceiling_interior_bulkhead_clad_small_area_professional_expanded_v1",
  "drywall_ceiling_interior_curve_clad_small_area_professional_expanded_v1",
  "drywall_ceiling_interior_drywall_ceiling_clad_large_area_professional_expanded_v1",
  "drywall_ceiling_interior_drywall_partition_clad_high_load_professional_expanded_v1",
  "drywall_ceiling_interior_fire_partition_align_wet_zone_professional_expanded_v1",
  "drywall_ceiling_interior_joint_align_technical_room_professional_expanded_v1",
  "drywall_ceiling_interior_moisture_partition_align_technical_room_professional_expanded_v1",
  "drywall_ceiling_interior_niche_align_technical_room_professional_expanded_v1",
  "drywall_ceiling_interior_revision_hatch_align_standard_professional_expanded_v1",
  "drywall_ceiling_interior_shaft_align_standard_professional_expanded_v1",
  "drywall_ceiling_interior_sound_partition_align_small_area_professional_expanded_v1",
  "drywall_ceiling_interior_wall_cladding_align_large_area_professional_expanded_v1",
  "drywall_ceiling_interior_wall_cladding_repair_wet_zone_professional_expanded_v1",
  "electrical_poles_04kv_detailed_boq_from_drawings_expanded_complex_v1",
]);

function stableSample<T>(values: readonly T[], count: number, salt: number): T[] {
  const selected: T[] = [];
  const used = new Set<number>();
  for (let index = 0; selected.length < count && index < values.length * 4; index += 1) {
    const sourceIndex = (index * 41 + salt * 97) % values.length;
    if (used.has(sourceIndex)) continue;
    used.add(sourceIndex);
    selected.push(values[sourceIndex]);
  }
  return selected;
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sorted(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function exactArray(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function promptForTemplate(templateId: string, localizedNameRu: string, index: number): string {
  return [
    localizedNameRu || templateId,
    `${80 + index} m2`,
    "length 20 m",
    "width 5 m",
    "height 3 m",
    "diameter 110 mm",
    "voltage 10 kV",
  ].join(" ");
}

function sourceIdentity(revision: EstimateDraftRevision): Record<string, unknown> | null {
  return revision.boq.rows.find((row) => row.sourceParameters?.professionalDomainFactoryV1 === true)?.sourceParameters ?? null;
}

function primitiveSnapshot(source: Record<string, unknown>): Record<string, unknown> {
  const snapshot = source.parameterSnapshot;
  return snapshot && typeof snapshot === "object" && !Array.isArray(snapshot)
    ? snapshot as Record<string, unknown>
    : {};
}

function metadataSnapshot(source: Record<string, unknown>): Record<string, Record<string, unknown>> {
  const metadata = source.professionalDomainParameterMetadata;
  return metadata && typeof metadata === "object" && !Array.isArray(metadata)
    ? metadata as Record<string, Record<string, unknown>>
    : {};
}

function rowResourceOwner(row: EstimateDraftRevision["boq"]["rows"][number]): unknown {
  return row.sourceParameters?.professionalResourceGraphV3 ??
    row.sourceParameters?.resourceGraphV3 ??
    row.sourceParameters?.costOwnerId ??
    row.costOwnershipId ??
    null;
}

function changedDependentRows(before: EstimateDraftRevision, after: EstimateDraftRevision, rowIds: readonly string[]): string[] {
  const previous = new Map(before.boq.rows.map((row) => [row.rowId, row]));
  return rowIds.filter((rowId) => {
    const left = previous.get(rowId);
    const right = after.boq.rows.find((row) => row.rowId === rowId);
    return Boolean(left && right && (left.quantity !== right.quantity || left.unitPrice !== right.unitPrice));
  });
}

function auditOne(input: {
  runtime: ReturnType<typeof createAiEstimateRuntime>;
  templateId: string;
  localizedNameRu: string;
  matrixSampleIndex: number;
}) {
  const created = input.runtime.createDraft({
    estimateDraftId: `r53-passport-audit-${input.matrixSampleIndex}-${input.templateId}`,
    rawInput: promptForTemplate(input.templateId, input.localizedNameRu, input.matrixSampleIndex),
    selectedTemplateId: input.templateId,
    createdAt: "2026-08-17T00:00:00.000Z",
  }).revision;
  const source = sourceIdentity(created);
  const failures: string[] = [];
  if (!source) failures.push("professional_domain_source_identity_missing");
  const parameterKeys = Array.isArray(source?.parameterKeys)
    ? source.parameterKeys.filter((key): key is string => typeof key === "string")
    : [];
  const metadata = source ? metadataSnapshot(source) : {};
  const snapshot = source ? primitiveSnapshot(source) : {};
  const completeness = buildNormativeParameterCompletenessModel(created);
  const cards = buildAiEstimateParameterCards({ revision: created, includeMissing: true });
  const workSpecificParameterSignature = created.workSpecificParameterSignature ?? [];
  const visibleSignature = workSpecificParameterSignature.filter((key) => !isAiEstimateTechnicalHiddenParam(key));
  const cardKeys = cards.map((card) => card.key);
  const normativeSourceIds = sorted(created.boq.rows.flatMap((row) => {
    const ids = [
      row.sourceParameters?.normativeSourceIds,
      row.sourceParameters?.applicableSourceIds,
    ].flatMap((value) => Array.isArray(value) ? value : []);
    return [
      ...ids.filter((id): id is string => typeof id === "string" && id.trim().length > 0),
      ...(typeof row.normSourceId === "string" && row.normSourceId.trim() ? [row.normSourceId] : []),
    ];
  }));

  if (created.selectedTemplateId !== input.templateId) failures.push("selected_template_identity_changed");
  if (created.professionalWorkId !== source?.workKey) failures.push("professional_work_identity_mismatch");
  if (source?.requestedCatalogWorkId !== input.templateId) failures.push("requested_catalog_identity_mismatch");
  if (typeof source?.catalogId !== "string" || !source.catalogId) failures.push("domain_catalog_identity_missing");
  if (typeof source?.canonicalTechnologyId !== "string" || !source.canonicalTechnologyId) failures.push("canonical_technology_identity_missing");
  if (typeof source?.projectAssemblyId !== "string" || !source.projectAssemblyId) failures.push("project_assembly_identity_missing");
  if (source?.parameterSchemaId !== created.workSpecificParameterSchemaId) failures.push("revision_schema_identity_mismatch");
  if (created.resolvedIdentity?.parameterSchemaId !== created.workSpecificParameterSchemaId) failures.push("resolved_schema_identity_mismatch");
  if (created.resolvedIdentity?.requestedCatalogWorkId !== input.templateId) failures.push("resolved_catalog_identity_mismatch");
  if (created.resolvedIdentity?.legacyFallbackUsed !== false || created.legacyRowsCount !== 0) failures.push("legacy_fallback_or_rows_present");
  if (source?.professionalDomainVisibleBaselineVersion !== PROFESSIONAL_DOMAIN_VISIBLE_BASELINE_VERSION_V1) failures.push("baseline_version_mismatch");
  if (!exactArray(parameterKeys, workSpecificParameterSignature)) failures.push("parameter_signature_mismatch");
  if (workSpecificParameterSignature.some((key) => metadata[key] == null)) failures.push("schema_metadata_projection_incomplete");
  if (Object.keys(snapshot).some((key) => !workSpecificParameterSignature.includes(key))) failures.push("snapshot_contains_foreign_parameter");
  if (!completeness) failures.push("completeness_passport_missing");
  if (completeness?.passport.templateId !== input.templateId) failures.push("passport_template_identity_mismatch");
  if (!exactArray(completeness?.passport.requirements.map((item) => item.key) ?? [], workSpecificParameterSignature)) failures.push("passport_signature_mismatch");
  if (created.boq.rows.length === 0) failures.push("baseline_boq_empty");
  if (normativeSourceIds.length === 0) failures.push("normative_provenance_missing");
  if (cards.length === 0) failures.push("parameter_cards_empty");
  if (new Set(cardKeys).size !== cardKeys.length) failures.push("duplicate_parameter_cards");
  if (cards.some((card) => !visibleSignature.includes(card.key))) failures.push("foreign_parameter_card");
  if (cards.some((card) => !card.guideShortRu || !card.guideKind || !card.guideDetailsRu?.length || !card.provenanceRu)) {
    failures.push("visible_guide_or_provenance_missing");
  }
  if (cards.some((card) => /\b(?:норма|нормативный диапазон)\b/iu.test(card.guideShortRu ?? "") && !card.guideDetailsRu?.some((line) => /locator|источник/iu.test(line)))) {
    failures.push("norm_hint_without_locator");
  }
  if (cards.some((card) => Object.is(card.value, card.guideShortRu))) failures.push("guide_saved_as_user_value");

  const formulaCandidate = created.trace.params
    .filter((parameter) => parameter.affectsRowIds.length > 0 &&
      typeof created.params[parameter.key]?.value === "number" &&
      created.params[parameter.key]?.source === "default_assumption")
    .sort((left, right) => right.affectsRowIds.length - left.affectsRowIds.length)[0];
  if (!formulaCandidate) failures.push("formula_bound_baseline_parameter_missing");
  const candidateCard = formulaCandidate ? cards.find((card) => card.key === formulaCandidate.key) : null;
  if (!candidateCard?.formulaRefs.length || !candidateCard.affectsRowIds.length) failures.push("formula_consumer_projection_missing");
  const resourceConsumerRowIds = formulaCandidate?.affectsRowIds.filter((rowId) => {
    const row = created.boq.rows.find((candidate) => candidate.rowId === rowId);
    return Boolean(row && rowResourceOwner(row));
  }) ?? [];
  if (resourceConsumerRowIds.length === 0) failures.push("resource_consumer_projection_missing");

  let recalculated: EstimateDraftRevision | null = null;
  let changedRows: string[] = [];
  if (formulaCandidate) {
    const before = Number(created.params[formulaCandidate.key]?.value);
    const result = input.runtime.applyParameterOverride({
      revision: created,
      operation: "update_param",
      paramKey: formulaCandidate.key,
      rawValue: String(before + 5),
      createdAt: "2026-08-17T00:01:00.000Z",
      revisionIndex: 2,
    });
    recalculated = result.revision;
    changedRows = changedDependentRows(created, recalculated, formulaCandidate.affectsRowIds);
    if (recalculated.revisionId === created.revisionId || recalculated.previousRevisionId !== created.revisionId) failures.push("revision_not_immutable");
    if (recalculated.params[formulaCandidate.key]?.source !== "edited_by_user") failures.push("user_value_did_not_replace_assumption");
    if (changedRows.length === 0 || result.diff.changedRowsCount === 0) failures.push("dependent_boq_rows_not_mutated");
  }

  const declaredFormulaConsumers = formulaCandidate
    ? metadata[formulaCandidate.key]?.formulaConsumers
    : null;
  const formulaConsumers = formulaCandidate
    ? sorted([
      ...(Array.isArray(declaredFormulaConsumers)
        ? declaredFormulaConsumers.filter((item: unknown): item is string => typeof item === "string")
        : []),
      ...(candidateCard?.formulaRefs ?? []),
    ])
    : [];
  return {
    catalog_id: input.templateId,
    matrix_sample_index: input.matrixSampleIndex,
    selected_identity: created.selectedTemplateId,
    requested_catalog_identity: source?.requestedCatalogWorkId ?? null,
    domain_catalog_identity: source?.catalogId ?? null,
    professional_work_identity: created.professionalWorkId,
    canonical_technology_id: source?.canonicalTechnologyId ?? null,
    project_assembly_id: source?.projectAssemblyId ?? null,
    schema_id: created.workSpecificParameterSchemaId,
    resolved_identity_checksum: created.resolvedIdentity?.checksum ?? null,
    parameter_signature_count: workSpecificParameterSignature.length,
    projected_parameter_count: Object.keys(snapshot).length,
    completeness_requirement_count: completeness?.passport.requirements.length ?? 0,
    parameter_cards: cards.map((card) => ({
      key: card.key,
      label_ru: card.labelRu,
      uom: created.params[card.key]?.canonicalUnit ?? null,
      guide_kind: card.guideKind ?? null,
      compact_hint_ru: card.guideShortRu ?? null,
      provenance_ru: card.provenanceRu ?? null,
      formula_consumers: card.formulaRefs,
      affected_row_ids: card.affectsRowIds,
    })),
    normative_source_ids: normativeSourceIds,
    guide_source_owners: sorted(Object.values(metadata).flatMap((item) =>
      Array.isArray(item.sourceOwnership)
        ? item.sourceOwnership.filter((owner): owner is string => typeof owner === "string")
        : []
    )),
    baseline_boq_rows: created.boq.rows.length,
    formula_mutation: formulaCandidate ? {
      parameter_key: formulaCandidate.key,
      formula_consumers: formulaConsumers,
      resource_consumer_row_ids: resourceConsumerRowIds,
      before_revision_id: created.revisionId,
      after_revision_id: recalculated?.revisionId ?? null,
      changed_dependent_row_ids: changedRows,
    } : null,
    status: failures.length === 0 ? "GREEN" : "RED",
    failures,
  };
}

export function auditP0OneMonolithR53MissingParameterPassports() {
  const startedAt = new Date().toISOString();
  const catalog = buildAiEstimateCatalogIndex();
  const templateIds = catalog.entries.map((entry) => entry.templateId);
  const matrixSample = stableSample(templateIds, 100, 4);
  const localizedName = new Map(catalog.entries.map((entry) => [entry.templateId, entry.localizedNameRu]));
  const topLevelFailures: string[] = [];
  if (R53_PREVIOUSLY_MISSING_PARAMETER_PASSPORT_IDS.length !== 15) topLevelFailures.push("expected_missing_denominator_changed");
  if (new Set(R53_PREVIOUSLY_MISSING_PARAMETER_PASSPORT_IDS).size !== 15) topLevelFailures.push("duplicate_expected_missing_id");
  if (R53_PREVIOUSLY_MISSING_PARAMETER_PASSPORT_IDS.some((id) => !matrixSample.includes(id))) topLevelFailures.push("expected_id_not_in_unchanged_matrix_sample");
  const runtime = createAiEstimateRuntime();
  const results = R53_PREVIOUSLY_MISSING_PARAMETER_PASSPORT_IDS.map((templateId) => auditOne({
    runtime,
    templateId,
    localizedNameRu: localizedName.get(templateId) ?? templateId,
    matrixSampleIndex: matrixSample.indexOf(templateId),
  }));
  const failed = results.filter((result) => result.status !== "GREEN");
  const evidence = {
    schema: "p0-one-monolith-r5.3-missing-parameter-passport-audit.v1",
    spec_sha256: R53_SPEC_SHA256,
    source_checkpoint: SOURCE_CHECKPOINT,
    pid: process.pid,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    matrix_sample_contract: { count: 100, salt: 4, step: 41, offset_multiplier: 97 },
    exact_previous_missing_ids_sha256: sha256(`${R53_PREVIOUSLY_MISSING_PARAMETER_PASSPORT_IDS.join("\n")}\n`),
    exact_previous_missing_denominator: `${results.length}/15`,
    green: `${results.length - failed.length}/15`,
    status: topLevelFailures.length === 0 && failed.length === 0 ? "GREEN" : "RED",
    top_level_failures: topLevelFailures,
    results,
    db_writes: 0,
    runtime_cutover: false,
    localhost_8081_touched: false,
  };
  fs.mkdirSync(EVIDENCE_ROOT, { recursive: true });
  const outputPath = path.join(EVIDENCE_ROOT, "MISSING_PARAMETER_PASSPORT_15_AUDIT.json");
  if (fs.existsSync(outputPath)) {
    const previous = fs.readFileSync(outputPath);
    const previousHash = crypto.createHash("sha256").update(previous).digest("hex");
    const previousJson = JSON.parse(previous.toString("utf8")) as { status?: string; finished_at?: string };
    const finished = String(previousJson.finished_at ?? "unknown-time").replace(/[:.]/g, "-");
    const status = String(previousJson.status ?? "UNKNOWN").replace(/[^A-Z0-9_-]/gi, "_");
    fs.renameSync(
      outputPath,
      path.join(EVIDENCE_ROOT, `ATTEMPT_${finished}_${status}_${previousHash.slice(0, 16)}.json`),
    );
  }
  fs.writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  return { evidence, outputPath };
}

if (require.main === module) {
  const { evidence, outputPath } = auditP0OneMonolithR53MissingParameterPassports();
  console.log(JSON.stringify({
    status: evidence.status,
    green: evidence.green,
    exact_previous_missing_denominator: evidence.exact_previous_missing_denominator,
    output_path: outputPath,
    failed: evidence.results.filter((result) => result.status !== "GREEN").map((result) => ({
      catalog_id: result.catalog_id,
      failures: result.failures,
    })),
  }, null, 2));
  if (evidence.status !== "GREEN") process.exitCode = 1;
}
