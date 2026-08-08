import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { renderPdfFromDraftRevision } from "../../src/features/pdf/renderPdfFromDraftRevision";
import { createBuyerHandoffFromDraftRevision } from "../../src/features/procurement/createBuyerHandoffFromDraftRevision";
import { validateAiEstimateBuyerPackageParity } from "../../src/lib/estimate/artifacts/validateAiEstimateBuyerPackageParity";
import { validateAiEstimatePdfSnapshotParity } from "../../src/lib/estimate/artifacts/validateAiEstimatePdfSnapshotParity";
import { buildEstimateFromInlineWorkPrompt } from "../../src/lib/estimate/buildEstimateFromInlineWorkPrompt";
import { estimateDeterministicHash } from "../../src/lib/estimate/estimateDeterministicHash";
import type {
  EstimateDraftRevision,
  EstimateDraftRevisionParam,
} from "../../src/lib/estimate/estimateDraftRevisionContract";
import { createDefaultAiEstimateRuntimePorts } from "../../src/lib/estimate/application/createAiEstimateRuntimePorts";
import { createAiEstimateRuntime } from "../../src/lib/estimate/runtime/createAiEstimateRuntime";
import { buildConsumerRepairDraftFromAiEstimateRevision } from "../../src/lib/estimate/runtime/buildConsumerRepairDraftFromAiEstimateRuntime";
import {
  DEFAULT_ROADWORKS_WAVE_A_INPUTS,
  RoadworksWaveAProductionRegistry,
  auditAsphalt35MaterialCompletenessV5,
  auditAsphalt35ScaledCloneIntegrityV5,
  buildAsphalt35MaterialCompletenessLedgerV5,
  buildAsphalt35NormativeCompositionLedgerV3,
  getRoadworksWaveAParameterKeys,
  roadworksWaveANaturalLanguageCases,
} from "../../src/lib/estimate/v4/roadworks";

const PRODUCER_VERSION = "post-r6-01-final-r5-execution-directive-01-v2";
const exactSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const status = execFileSync("git", ["status", "--porcelain=v1"], { encoding: "utf8" }).trim();
const diff = execFileSync("git", ["diff", "--binary"], { encoding: "utf8" });
const subjectTreeHash = createHash("sha256").update(JSON.stringify({ exactSha, status, diff })).digest("hex");
const generatedAt = new Date().toISOString();
const outDir = path.join(".release-runtime", "asphalt-v3-final-r5", exactSha, "runtime-v2");
const inputManifestHash = estimateDeterministicHash(RoadworksWaveAProductionRegistry.map((item) => ({
  workKey: item.workId,
  templateId: item.templateId,
  passportId: item.professionalPassport.passportId,
  calculationProfileId: item.calculationProfileId,
  formulaGraphId: item.formulaGraphId,
  normativeCompositionId: item.normativeCompositionId,
  semanticFingerprint: item.semanticFingerprint,
})));

type ArtifactEnvelope = {
  subject_sha: string;
  subject_tree_hash: string;
  generated_at: string;
  producer_version: string;
  input_manifest_hash: string;
  result_counts: Record<string, unknown>;
  failure_ledger: readonly string[];
  records: unknown;
  artifact_hash: string;
};

function writeArtifact(
  fileName: string,
  resultCounts: Record<string, unknown>,
  failureLedger: readonly string[],
  records: unknown,
): ArtifactEnvelope {
  const unsigned = {
    subject_sha: exactSha,
    subject_tree_hash: subjectTreeHash,
    generated_at: generatedAt,
    producer_version: PRODUCER_VERSION,
    input_manifest_hash: inputManifestHash,
    result_counts: resultCounts,
    failure_ledger: [...failureLedger],
    records,
  };
  const artifact = { ...unsigned, artifact_hash: estimateDeterministicHash(unsigned) };
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, fileName), `${JSON.stringify(artifact, null, 2)}\n`);
  return artifact;
}

function param(value: unknown, changedAt: string): EstimateDraftRevisionParam {
  if (!["string", "number", "boolean"].includes(typeof value)) {
    throw new Error(`ASPHALT_35_INVALID_POSITIVE_PARAMETER:${String(value)}`);
  }
  return {
    value: value as EstimateDraftRevisionParam["value"],
    source: "user_input",
    sourceText: "asphalt-35-runtime-positive-vector",
    lastChangedAt: changedAt,
  };
}

function explicitOverrides(workId: string, changedAt: string) {
  return Object.fromEntries(getRoadworksWaveAParameterKeys(workId).map((key) => [
    key,
    param(DEFAULT_ROADWORKS_WAVE_A_INPUTS[key], changedAt),
  ]));
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function rowAffectedBy(row: EstimateDraftRevision["boq"]["rows"][number]): string[] {
  return stringArray(row.sourceParameters?.affectedBy);
}

function hasGenericRoadAssumptionLeakage(
  row: { sourceParameters?: Record<string, unknown> | null },
): boolean {
  return stringArray(row.sourceParameters?.professionalBoqDefaultAssumptionsRu).length > 0 ||
    row.sourceParameters?.professionalBoqDefaultsApplied === true ||
    row.sourceParameters?.asphaltV4 === true;
}

function normalizedRows(revision: EstimateDraftRevision) {
  return revision.boq.rows.map((row) => ({
    rowId: row.rowId,
    rowType: row.rowType,
    quantity: row.quantity,
    unit: row.unit,
    formulaId: row.formulaId,
    sourceId: row.sourceId,
    includedInProcurement: row.includedInProcurement,
    semanticOwner: row.sourceParameters?.semanticOwner,
  }));
}

const categoryLedger = new Map(buildAsphalt35MaterialCompletenessLedgerV5().map((record) => [record.work_key, record]));
const normativeLedger = new Map(buildAsphalt35NormativeCompositionLedgerV3().map((record) => [record.workId, record]));

const routingRecords: unknown[] = [];
const incompleteRecords: unknown[] = [];
const autoCompositionRecords: unknown[] = [];
const parameterEditRecords: unknown[] = [];
const durableReplayRecords: unknown[] = [];
const revisionProjectionRecords: unknown[] = [];
const pricingRecords: unknown[] = [];
const runtimeManifestRecords: unknown[] = [];
const exactOwnerGovernanceRecords: unknown[] = [];
const failures: string[] = [];

for (const [index, registration] of RoadworksWaveAProductionRegistry.entries()) {
  const workFailures: string[] = [];
  const changedAt = `2026-08-07T08:${String(index).padStart(2, "0")}:00.000Z`;
  const positiveOverrides = explicitOverrides(registration.workId, changedAt);

  const naturalRoutes = roadworksWaveANaturalLanguageCases(registration).map((rawInput) => {
    const routed = buildEstimateFromInlineWorkPrompt({ rawInput });
    const actual = routed.draft?.selectedWork?.selectedWorkKey ?? null;
    const passed = actual === registration.workId &&
      routed.draft?.items[0]?.sourceParameters?.roadworksWaveA === true;
    if (!passed) workFailures.push(`routing:${rawInput}:${actual}`);
    return { raw_input: rawInput, expected_work_key: registration.workId, actual_work_key: actual, passed };
  });
  const collisionInput = `${registration.professionalNameRu}; общий запрос: асфальтировать дорогу`;
  const collision = buildEstimateFromInlineWorkPrompt({ rawInput: collisionInput });
  const collisionPassed = collision.draft?.selectedWork?.selectedWorkKey === registration.workId &&
    collision.draft?.items[0]?.sourceParameters?.roadworksWaveA === true &&
    collision.draft?.items[0]?.sourceParameters?.asphaltV4 !== true;
  if (!collisionPassed) workFailures.push(`generic_preemption:${registration.workId}`);
  routingRecords.push({
    work_key: registration.workId,
    exact_title: registration.professionalNameRu,
    natural_routes: naturalRoutes,
    collision_input: collisionInput,
    collision_passed: collisionPassed,
  });

  const incomplete = buildEstimateFromInlineWorkPrompt({
    rawInput: `${registration.professionalNameRu} 120 м²`,
    selectedWorkKey: registration.workId,
    selectedTemplateId: registration.templateId,
  });
  const incompleteRows = incomplete.draft?.items ?? [];
  const incompletePassed = incomplete.draft?.selectedWork?.selectedWorkKey === registration.workId &&
    incompleteRows.length === 1 &&
    incompleteRows[0]?.category === "document" &&
    incompleteRows[0]?.sourceParameters?.domainResolutionReadiness === "NEEDS_REQUIRED_INPUTS" &&
    incompleteRows[0]?.sourceParameters?.executableAsphaltProfile === false &&
    incompleteRows[0]?.sourceParameters?.includedInProcurement === false;
  if (!incompletePassed) workFailures.push(`incomplete_p0_not_fail_closed:${registration.workId}`);
  incompleteRecords.push({
    work_key: registration.workId,
    readiness: incompleteRows[0]?.sourceParameters?.domainResolutionReadiness ?? null,
    row_count: incompleteRows.length,
    procurement_rows: incompleteRows.filter((row) => row.sourceParameters?.includedInProcurement === true).length,
    generic_fallback: incompleteRows.some((row) => row.sourceParameters?.roadworksWaveA !== true),
    passed: incompletePassed,
  });

  const ports = createDefaultAiEstimateRuntimePorts();
  const runtime = createAiEstimateRuntime({ ports });
  const created = runtime.createDraft({
    estimateDraftId: `asphalt-35-runtime-${index}`,
    rawInput: `${registration.professionalNameRu} площадь 100 м²`,
    selectedTemplateId: registration.templateId,
    selectedWorkKey: registration.workId,
    paramOverrides: positiveOverrides,
    createdAt: changedAt,
  });
  const revision = created.revision;
  const identity = revision.resolvedIdentity;
  const rows = revision.boq.rows;
  const categoryRecord = categoryLedger.get(registration.workId)!;
  const normativeRecord = normativeLedger.get(registration.workId)!;
  const exactIdentityPassed = identity?.requestedCatalogWorkId === registration.workId &&
    identity.passportId === registration.professionalPassport.passportId &&
    identity.calculationProfileId === registration.calculationProfileId &&
    identity.formulaGraphVersion === registration.formulaGraphId &&
    identity.normativeCompositionId === registration.normativeCompositionId &&
    identity.semanticFingerprint === registration.semanticFingerprint &&
    identity.selectedScope === registration.scopeProfile;
  const typedRowsPassed = rows.length > 0 && rows.every((row) =>
    Number.isFinite(row.quantity) && row.quantity > 0 &&
    Boolean(row.rowId && row.rowType && row.unit && row.formulaId && row.normSourceId) &&
    row.sourceParameters?.requestedCatalogWorkId === registration.workId &&
    row.sourceParameters?.professionalEstimatePassportId === registration.professionalPassport.passportId &&
    row.sourceParameters?.domainResolutionReadiness === "CALCULATION_READY" &&
    row.sourceParameters?.executableAsphaltProfile === true
  );
  const categoryEvidencePassed = categoryRecord.overall_estimate_status === "COMPLETE" &&
    categoryRecord.category_evidence.every((evidence) =>
      evidence.status !== "BLOCKED" &&
      evidence.ownerWorkKey === registration.workId &&
      evidence.scopeId === categoryRecord.scope_id &&
      Boolean(evidence.evidenceFingerprint) &&
      (evidence.status !== "COMPLETE" || evidence.rowIds.every((rowId) => rows.some((row) => row.rowId === rowId)))
    );
  const manualBoqAssemblyCount = rows.filter((row) => row.sourceParameters?.inlineWorkPrompt !== true).length;
  const genericFallbackCount = rows.filter((row) =>
    row.sourceParameters?.roadworksWaveA !== true || row.sourceParameters?.asphaltV4 === true
  ).length;
  const genericDefaultAssumptionsCount = rows.filter((row) =>
    hasGenericRoadAssumptionLeakage(row)
  ).length;
  const expectedParameterSnapshot = Object.fromEntries(
    registration.parameterSchema.map((key) => [key, DEFAULT_ROADWORKS_WAVE_A_INPUTS[key]]),
  );
  const snapshotRows = rows.filter((row) => row.sourceParameters?.parameterSnapshot != null);
  const exactParameterSnapshotPreserved = snapshotRows.length === 1 &&
    JSON.stringify(snapshotRows[0]?.sourceParameters?.parameterSnapshot) === JSON.stringify(expectedParameterSnapshot);
  const zeroQuantityRows = rows.filter((row) => !Number.isFinite(row.quantity) || row.quantity <= 0).map((row) => row.rowId);
  const dimensionalErrors = rows.filter((row) =>
    row.unit === "item" ||
    !Array.isArray(row.sourceParameters?.affectedBy) ||
    !row.formulaId ||
    !row.normSourceId
  ).map((row) => row.rowId);
  const areaOnlyLengthRows = rows.filter((row) =>
    row.unit === "m" &&
    rowAffectedBy(row).includes("area_m2") &&
    !rowAffectedBy(row).some((key) => /(?:length|width|perimeter|joint)/i.test(key))
  ).map((row) => row.rowId);
  const autoPassed = exactIdentityPassed && typedRowsPassed && categoryEvidencePassed &&
    manualBoqAssemblyCount === 0 && genericFallbackCount === 0 && genericDefaultAssumptionsCount === 0 &&
    zeroQuantityRows.length === 0 && dimensionalErrors.length === 0 && areaOnlyLengthRows.length === 0 &&
    normativeRecord.terminalDecision === "EXECUTABLE_B";
  if (!autoPassed) workFailures.push(`auto_composition:${registration.workId}`);

  const pdf = runtime.buildPdfSnapshot({ revision });
  const buyer = runtime.buildBuyerPackage({ revision: pdf.revision, snapshot: pdf.snapshot });
  const uiDraft = buildConsumerRepairDraftFromAiEstimateRevision(pdf.revision);
  const pdfParity = validateAiEstimatePdfSnapshotParity({ snapshot: pdf.snapshot, pdf: pdf.pdf });
  const procurementParity = validateAiEstimateBuyerPackageParity({
    snapshot: buyer.snapshot,
    buyerPackage: buyer.buyerPackage,
  });
  const uiParity = uiDraft.selectedWork?.selectedWorkKey === registration.workId &&
    uiDraft.items.length === rows.length &&
    uiDraft.items.every((row, rowIndex) =>
      row.sourceParameters?.requestedCatalogWorkId === registration.workId &&
      row.quantity === rows[rowIndex]?.quantity &&
      row.unit === rows[rowIndex]?.unit
    );
  const uiPdfGenericAssumptionLeakage = [
    ...uiDraft.items,
    ...pdf.revision.boq.rows,
  ].filter((row) => hasGenericRoadAssumptionLeakage(row)).length;
  const exactOwnerGovernancePassed = genericDefaultAssumptionsCount === 0 &&
    exactParameterSnapshotPreserved && uiPdfGenericAssumptionLeakage === 0;
  if (!exactOwnerGovernancePassed) workFailures.push(`exact_owner_governance:${registration.workId}`);
  exactOwnerGovernanceRecords.push({
    work_key: registration.workId,
    exact_wave_a_generic_road_assumptions: genericDefaultAssumptionsCount,
    expected_parameter_keys: registration.parameterSchema,
    actual_parameter_keys: Object.keys(
      (snapshotRows[0]?.sourceParameters?.parameterSnapshot ?? {}) as Record<string, unknown>,
    ),
    exact_parameter_snapshot_preserved: exactParameterSnapshotPreserved,
    ui_pdf_generic_assumption_leakage: uiPdfGenericAssumptionLeakage,
    passed: exactOwnerGovernancePassed,
  });
  if (!pdfParity || !procurementParity || !uiParity) workFailures.push(`projection_parity:${registration.workId}`);

  const immutableBefore = JSON.stringify(pdf.revision);
  const beforeRows = new Map(pdf.revision.boq.rows.map((row) => [row.rowId, row.quantity]));
  const areaAffectedRows = new Set(
    pdf.revision.trace.params.find((parameter) => parameter.key === "area_m2")?.affectsRowIds ?? [],
  );
  const changed = runtime.applyParameterOverride({
    revision: pdf.revision,
    operation: "update_param",
    paramKey: "area_m2",
    rawValue: "200",
    createdAt: `2026-08-07T09:${String(index).padStart(2, "0")}:00.000Z`,
    revisionIndex: 2,
  });
  const changedIds = changed.diff.changedRows.map((row) => row.rowId);
  const editPassed = changed.diff.changedRowsCount > 0 &&
    changedIds.every((rowId) => areaAffectedRows.has(rowId)) &&
    changed.revision.boq.rows.map((row) => row.rowId).join("\n") === pdf.revision.boq.rows.map((row) => row.rowId).join("\n") &&
    changed.revision.boq.rows.filter((row) => !areaAffectedRows.has(row.rowId))
      .every((row) => beforeRows.get(row.rowId) === row.quantity) &&
    changed.revision.previousRevisionId === pdf.revision.revisionId &&
    JSON.stringify(pdf.revision) === immutableBefore &&
    estimateDeterministicHash(normalizedRows(changed.revision)) !== estimateDeterministicHash(normalizedRows(pdf.revision));
  if (!editPassed) workFailures.push(`parameter_edit:${registration.workId}`);
  const changedPdf = runtime.buildPdfSnapshot({ revision: changed.revision });
  const changedBuyer = runtime.buildBuyerPackage({ revision: changedPdf.revision, snapshot: changedPdf.snapshot });
  const changedProjectionPassed = changedPdf.pdf.revisionId === changed.revision.revisionId &&
    validateAiEstimatePdfSnapshotParity({ snapshot: changedPdf.snapshot, pdf: changedPdf.pdf }) &&
    validateAiEstimateBuyerPackageParity({ snapshot: changedBuyer.snapshot, buyerPackage: changedBuyer.buyerPackage });
  let crossRevisionRejected = false;
  try {
    renderPdfFromDraftRevision({ revision: changed.revision, snapshot: pdf.snapshot });
  } catch (error) {
    crossRevisionRejected = String(error).includes("DRAFT_REVISION_SNAPSHOT_IDENTITY_MISMATCH");
  }
  if (!changedProjectionPassed || !crossRevisionRejected) workFailures.push(`changed_projection:${registration.workId}`);

  runtime.approveRevision({
    revision: pdf.revision,
    ownerUserId: `asphalt-35-owner-${index}`,
    approvedAt: `2026-08-07T10:${String(index).padStart(2, "0")}:00.000Z`,
  });
  const reopened = JSON.parse(JSON.stringify(pdf.revision)) as EstimateDraftRevision;
  const coldRuntime = createAiEstimateRuntime({ ports });
  const history = coldRuntime.loadApprovedHistory({ ownerUserId: `asphalt-35-owner-${index}`, limit: 1 });
  const replayed = coldRuntime.rebuildFromRevision({
    revision: reopened,
    createdAt: `2026-08-07T11:${String(index).padStart(2, "0")}:00.000Z`,
    revisionIndex: 2,
  });
  const replayPassed = history.totalCount === 1 &&
    history.records[0]?.family === registration.workId &&
    reopened.resolvedIdentity?.requestedCatalogWorkId === registration.workId &&
    replayed.revision.resolvedIdentity?.requestedCatalogWorkId === registration.workId &&
    replayed.revision.resolvedIdentity?.selectedScope === registration.scopeProfile &&
    estimateDeterministicHash(normalizedRows(replayed.revision)) === estimateDeterministicHash(normalizedRows(reopened));
  if (!replayPassed) workFailures.push(`durable_replay:${registration.workId}`);

  const priceCompleteRows = rows.filter((row) => row.unitPrice != null).length;
  const fakePrices = rows.filter((row) => row.unitPrice != null && !row.priceSourceId).map((row) => row.rowId);
  const pricingStatus = priceCompleteRows === rows.length
    ? "BOQ_COMPLETE_PRICES_COMPLETE"
    : "BOQ_COMPLETE_PRICES_MISSING";
  if (fakePrices.length > 0) workFailures.push(`fake_price:${registration.workId}`);

  autoCompositionRecords.push({
    work_key: registration.workId,
    row_count: rows.length,
    exact_identity: exactIdentityPassed,
    typed_boq_complete: typedRowsPassed,
    complete_professional_estimate: categoryEvidencePassed,
    manual_boq_assembly_count: manualBoqAssemblyCount,
    generic_fallback_count: genericFallbackCount,
    generic_default_assumptions_count: genericDefaultAssumptionsCount,
    zero_quantity_rows: zeroQuantityRows,
    dimensional_errors: dimensionalErrors,
    area_only_length_rows: areaOnlyLengthRows,
    passed: autoPassed,
  });
  parameterEditRecords.push({
    work_key: registration.workId,
    changed_param: "area_m2",
    changed_rows: changedIds,
    expected_affected_rows: [...areaAffectedRows],
    unexpected_changed_rows: changedIds.filter((rowId) => !areaAffectedRows.has(rowId)),
    previous_revision_immutable: JSON.stringify(pdf.revision) === immutableBefore,
    quantity_hash_changed: estimateDeterministicHash(normalizedRows(changed.revision)) !== estimateDeterministicHash(normalizedRows(pdf.revision)),
    passed: editPassed,
  });
  durableReplayRecords.push({
    work_key: registration.workId,
    approved_history_count: history.totalCount,
    work_key_preserved: replayed.revision.resolvedIdentity?.requestedCatalogWorkId === registration.workId,
    scope_preserved: replayed.revision.resolvedIdentity?.selectedScope === registration.scopeProfile,
    boq_parity: estimateDeterministicHash(normalizedRows(replayed.revision)) === estimateDeterministicHash(normalizedRows(reopened)),
    passed: replayPassed,
  });
  revisionProjectionRecords.push({
    work_key: registration.workId,
    revision_id: pdf.revision.revisionId,
    ui_parity: uiParity,
    pdf_parity: pdfParity,
    procurement_parity: procurementParity,
    changed_revision_projection_parity: changedProjectionPassed,
    cross_revision_rejected: crossRevisionRejected,
    passed: uiParity && pdfParity && procurementParity && changedProjectionPassed && crossRevisionRejected,
  });
  pricingRecords.push({
    work_key: registration.workId,
    pricing_status: pricingStatus,
    priced_rows: priceCompleteRows,
    fake_prices: fakePrices,
    grand_total_claimed: false,
    passed: fakePrices.length === 0,
  });
  runtimeManifestRecords.push({
    workKey: registration.workId,
    catalogWorkId: registration.workId,
    title: registration.professionalNameRu,
    positiveInputVectorId: `${registration.workId}:positive-runtime:v2`,
    incompleteInputVectorId: `${registration.workId}:incomplete-p0:v2`,
    editVectorId: `${registration.workId}:area-edit:v2`,
    expectedResolution: "CALCULATION_READY",
    expectedScope: registration.scopeProfile,
    passportId: registration.professionalPassport.passportId,
    calculationProfileId: registration.calculationProfileId,
    formulaGraphId: registration.formulaGraphId,
    normativeCompositionId: registration.normativeCompositionId,
    semanticOwner: registration.professionalPassport.migration.semanticOwner,
    runtimeResolutionStatus: exactIdentityPassed ? "PASS" : "FAIL",
    automaticCompileStatus: autoPassed ? "PASS" : "FAIL",
    categoryCompleteness: categoryRecord.category_completeness,
    missingRequiredMaterialRoles: categoryRecord.missing_material_roles,
    unexpectedMaterialRoles: categoryRecord.unexpected_material_roles,
    zeroQuantityRows,
    dimensionalErrors,
    duplicateOwners: categoryRecord.duplicate_material_owners,
    genericFallbackCount,
    manualBoqAssemblyCount,
    unresolvedBlockers: workFailures,
    pricingStatus,
    revisionParity: uiParity && pdfParity && procurementParity ? "PASS" : "FAIL",
    webStatus: "PENDING_TARGETED_WEB_GATE",
    androidCreateStatus: "PENDING_API34_GATE",
    androidEditStatus: "PENDING_API34_GATE",
    androidReplayStatus: "PENDING_API34_GATE",
    evidenceFingerprint: registration.semanticFingerprint,
  });
  failures.push(...workFailures);
}

const materialAudit = auditAsphalt35MaterialCompletenessV5();
const materialRecords = buildAsphalt35MaterialCompletenessLedgerV5();
const normativeRecords = buildAsphalt35NormativeCompositionLedgerV3();
const cloneAudit = auditAsphalt35ScaledCloneIntegrityV5();
const countPassed = (records: readonly unknown[]) => records.filter((record) =>
  Boolean((record as { passed?: boolean }).passed)
).length;
const totalNaturalRoutes = (routingRecords as Array<{ natural_routes: Array<{ passed: boolean }> }>).reduce(
  (sum, record) => sum + record.natural_routes.filter((route) => route.passed).length,
  0,
);

if (cloneAudit.cross_work_scaled_clone_count !== 0) failures.push("cross_work_scaled_clone_count");
if (cloneAudit.area_only_length_rows !== 0) failures.push("area_only_length_rows");
if (cloneAudit.hard_coded_111_row_boq_count !== 0) failures.push("hard_coded_111_row_boq_count");
if (cloneAudit.scaled_clone_pair_cases !== 2) failures.push("historical_900_780_regression");

writeArtifact("asphalt35-routing-ledger.json", {
  exact_work_keys: routingRecords.length,
  natural_language_routes: totalNaturalRoutes,
  generic_preemption: (routingRecords as Array<{ collision_passed: boolean }>).filter((record) => !record.collision_passed).length,
}, failures.filter((failure) => /routing|generic_preemption/.test(failure)), routingRecords);
writeArtifact("asphalt35-incomplete-p0-ledger.json", {
  incomplete_p0_fail_closed: countPassed(incompleteRecords),
  partial_boq_emitted: (incompleteRecords as Array<{ row_count: number }>).filter((record) => record.row_count !== 1).length,
  procurement_emitted: (incompleteRecords as Array<{ procurement_rows: number }>).reduce((sum, record) => sum + record.procurement_rows, 0),
}, failures.filter((failure) => failure.includes("incomplete_p0")), incompleteRecords);
writeArtifact("asphalt35-auto-composition-ledger.json", {
  runtime_auto_compiled_estimates: countPassed(autoCompositionRecords),
  complete_typed_boq: autoCompositionRecords.filter((record) => (record as { typed_boq_complete: boolean }).typed_boq_complete).length,
  manual_boq_assembly: autoCompositionRecords.reduce<number>((sum, record) => sum + (record as { manual_boq_assembly_count: number }).manual_boq_assembly_count, 0),
  generic_fallback: autoCompositionRecords.reduce<number>((sum, record) => sum + (record as { generic_fallback_count: number }).generic_fallback_count, 0),
}, failures.filter((failure) => failure.includes("auto_composition")), autoCompositionRecords);
writeArtifact("asphalt35-material-completeness-ledger.json", {
  complete_professional_estimates: materialAudit.complete_professional_estimates,
  complete_typed_boq: materialAudit.complete_typed_boq,
  missing_required_material_roles: materialAudit.missing_required_material_roles,
  unexpected_material_roles: materialAudit.unexpected_material_roles,
}, [], materialRecords);
writeArtifact("asphalt35-formula-dimensional-ledger.json", {
  unique_two_scale_shapes: cloneAudit.unique_two_scale_shapes,
  scaled_clone_pair_cases: `${cloneAudit.scaled_clone_pair_cases}/${cloneAudit.scaled_clone_pair_cases_total}`,
  same_work_900_780_semantic_stability: `${cloneAudit.same_work_900_780_semantic_stability}/1`,
  different_work_owner_separation: `${cloneAudit.different_work_owner_separation}/1`,
  cross_work_scaled_clone_count: cloneAudit.cross_work_scaled_clone_count,
  area_only_length_rows: cloneAudit.area_only_length_rows,
  hard_coded_111_row_boq_count: cloneAudit.hard_coded_111_row_boq_count,
  historical_revision_mutation: cloneAudit.historical_revision_mutation,
}, failures.filter((failure) => /clone|area_only|111|900_780/.test(failure)), cloneAudit);
writeArtifact("asphalt35-exact-owner-governance-ledger.json", {
  exact_wave_a_generic_road_assumptions: exactOwnerGovernanceRecords.reduce<number>(
    (sum, record) => sum + (record as { exact_wave_a_generic_road_assumptions: number }).exact_wave_a_generic_road_assumptions,
    0,
  ),
  exact_parameter_snapshot_preserved: `${countPassed(exactOwnerGovernanceRecords)}/35`,
  ui_pdf_generic_assumption_leakage: exactOwnerGovernanceRecords.reduce<number>(
    (sum, record) => sum + (record as { ui_pdf_generic_assumption_leakage: number }).ui_pdf_generic_assumption_leakage,
    0,
  ),
}, failures.filter((failure) => failure.includes("exact_owner_governance")), exactOwnerGovernanceRecords);
writeArtifact("asphalt35-parameter-edit-ledger.json", {
  parameter_edit: countPassed(parameterEditRecords),
  unexpected_rows_changed: parameterEditRecords.reduce<number>((sum, record) => sum + (record as { unexpected_changed_rows: string[] }).unexpected_changed_rows.length, 0),
}, failures.filter((failure) => failure.includes("parameter_edit")), parameterEditRecords);
writeArtifact("asphalt35-durable-replay-ledger.json", {
  durable_replay: countPassed(durableReplayRecords),
}, failures.filter((failure) => failure.includes("durable_replay")), durableReplayRecords);
writeArtifact("asphalt35-revision-pdf-procurement-ledger.json", {
  revision_pdf_procurement: countPassed(revisionProjectionRecords),
  cross_revision_acceptance: revisionProjectionRecords.filter((record) => !(record as { cross_revision_rejected: boolean }).cross_revision_rejected).length,
}, failures.filter((failure) => /projection/.test(failure)), revisionProjectionRecords);
writeArtifact("asphalt35-normative-composition-ledger.json", {
  records: normativeRecords.length,
  executable: normativeRecords.filter((record) => record.terminalDecision === "EXECUTABLE_B").length,
  unresolved_normative_gaps: normativeRecords.filter((record) => record.terminalDecision !== "EXECUTABLE_B").length,
}, [], normativeRecords);
writeArtifact("asphalt35-pricing-status-ledger.json", {
  pricing_status_complete: countPassed(pricingRecords),
  fake_prices: pricingRecords.reduce<number>((sum, record) => sum + (record as { fake_prices: string[] }).fake_prices.length, 0),
}, failures.filter((failure) => failure.includes("fake_price")), pricingRecords);
const manifest = writeArtifact("asphalt35-runtime-manifest.json", {
  catalog_work_keys: runtimeManifestRecords.length,
  unique_runtime_resolutions: new Set(runtimeManifestRecords.map((record) => (record as { workKey: string }).workKey)).size,
  unique_passports: new Set(runtimeManifestRecords.map((record) => (record as { passportId: string }).passportId)).size,
  unique_calculation_profiles: new Set(runtimeManifestRecords.map((record) => (record as { calculationProfileId: string }).calculationProfileId)).size,
  unique_formula_graphs: new Set(runtimeManifestRecords.map((record) => (record as { formulaGraphId: string }).formulaGraphId)).size,
  unique_semantic_fingerprints: new Set(runtimeManifestRecords.map((record) => (record as { evidenceFingerprint: string }).evidenceFingerprint)).size,
  runtime_auto_compiled_estimates: countPassed(autoCompositionRecords),
  incomplete_p0_fail_closed: countPassed(incompleteRecords),
  parameter_edit: countPassed(parameterEditRecords),
  durable_replay: countPassed(durableReplayRecords),
  revision_pdf_procurement: countPassed(revisionProjectionRecords),
  global_full_jest_run: false,
  dirty_subject: status.length > 0,
}, failures, runtimeManifestRecords);

console.info(JSON.stringify({
  output_dir: outDir,
  subject_sha: exactSha,
  subject_tree_hash: subjectTreeHash,
  artifact_hash: manifest.artifact_hash,
  records: `${runtimeManifestRecords.length}/35`,
  natural_routes: `${totalNaturalRoutes}/105`,
  runtime_auto_compiled: `${countPassed(autoCompositionRecords)}/35`,
  incomplete_p0_fail_closed: `${countPassed(incompleteRecords)}/35`,
  parameter_edit: `${countPassed(parameterEditRecords)}/35`,
  durable_replay: `${countPassed(durableReplayRecords)}/35`,
  revision_pdf_procurement: `${countPassed(revisionProjectionRecords)}/35`,
  cross_work_scaled_clone_count: cloneAudit.cross_work_scaled_clone_count,
  area_only_length_rows: cloneAudit.area_only_length_rows,
  exact_owner_governance: `${countPassed(exactOwnerGovernanceRecords)}/35`,
  failures: failures.slice(0, 100),
}, null, 2));
if (failures.length > 0) process.exitCode = 1;
