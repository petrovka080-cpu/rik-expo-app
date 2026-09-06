/* eslint-disable import/no-unresolved */
// @ts-nocheck

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  evaluateFormulaGraph,
} from "../../../src/lib/estimate/backendPlatform/formulaGraph.ts";
import {
  bindCanonicalEstimateResourcePriceKeys,
  canonicalRoundDecimal,
  compileCanonicalEstimateCore,
} from "../../../src/lib/estimate/backendPlatform/canonicalEstimateCompileCore.ts";
import { canonicalEstimateStableJson } from "../../../src/lib/estimate/backendPlatform/canonicalEstimateDeterminism.ts";
import {
  CANONICAL_ESTIMATE_REVISION_CONTRACT_VERSION,
  CANONICAL_ESTIMATE_REVISION_COMMIT_FUNCTION,
  buildCanonicalRevisionCommitPayload,
  buildCanonicalRevisionIdentity,
} from "../../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionWriter.ts";
import {
  buildCanonicalArtifactMetadata,
  buildCanonicalProcurementProjection,
  escapeCanonicalArtifactHtml as escapeHtml,
  selectCanonicalArtifactRows,
} from "../../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract.ts";
import {
  buildCanonicalProfessionalPdfProjection,
  CANONICAL_PROFESSIONAL_PDF_GENERATOR_VERSION,
} from "../../../src/lib/estimate/backendPlatform/canonicalProfessionalPdf.ts";
import {
  buildCanonicalEstimateRegistryEntry,
  CanonicalEstimateDefinitionRegistry,
} from "../../../src/lib/estimate/backendPlatform/canonicalEstimateDefinitionRegistry.ts";
import {
  evaluateEstimateAdmission,
  type EstimateAdmissionIngress,
} from "../../../src/lib/estimate/backendPlatform/estimateAdmissionR3.ts";
import { renderPdfBytes } from "../_shared/canonicalPdf.ts";

const WORKER_VERSION = "canonical-estimate-compiler.r2";
const MAX_JOBS_PER_INVOCATION = 4;
const MAX_RESOURCE_ROWS = 2_000;

type AdminClient = ReturnType<typeof createClient>;

type ClaimedJob = {
  id: string;
  operation: "compile" | "recalculate" | "pdf" | "professional_pdf" | "procurement" | "legacy_revision_migration";
  catalog_id: string;
  parent_revision_id: string | null;
  target_release_id: string;
  owner_user_id: string;
  input_payload: {
    parameters?: Record<string, string | number | boolean>;
    currencyCode?: string;
    priceSnapshotIds?: string[];
    rowOverrides?: Record<string, Record<string, unknown>>;
    customRows?: Record<string, unknown>[];
    releaseAdmission?: boolean;
    requestIdentity?: Record<string, unknown>;
  };
  attempt: number;
};

async function sha256(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(typeof value === "string" ? value : canonicalEstimateStableJson(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256Bytes(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function secretMatches(request: Request): Promise<boolean> {
  const expected = String(Deno.env.get("ESTIMATE_WORKER_SECRET") ?? "");
  const actual = String(request.headers.get("x-estimate-worker-secret") ?? "");
  if (expected.length < 32 || expected.length !== actual.length) return false;
  const encoder = new TextEncoder();
  const [expectedHash, actualHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
    crypto.subtle.digest("SHA-256", encoder.encode(actual)),
  ]);
  const a = new Uint8Array(expectedHash);
  const b = new Uint8Array(actualHash);
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

function jobAdmissionIngress(operation: ClaimedJob["operation"]): EstimateAdmissionIngress {
  if (operation === "compile") return "direct_catalog_compile";
  if (operation === "recalculate") return "parameter_recalculation";
  if (operation === "procurement") return "procurement_artifact_create";
  if (operation === "pdf" || operation === "professional_pdf") return "pdf_artifact_create";
  return "revision_replay_migration";
}

async function assertClaimedJobAdmission(admin: AdminClient, job: ClaimedJob): Promise<void> {
  const [{ data: release, error: releaseError }, { data: searchRelease, error: searchReleaseError }] = await Promise.all([
    admin.from("estimate_definition_release").select("id,status").eq("id", job.target_release_id).maybeSingle(),
    admin.from("estimate_search_index_release").select("id").eq("status", "active").order("activated_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (releaseError || searchReleaseError) {
    throw Object.assign(new Error("job admission release load failed"), { code: "ADMISSION_LOAD_FAILED" });
  }
  const { data: manifest, error: manifestError } = release?.id
    ? await admin.from("estimate_cumulative_manifest_entry")
      .select("release_id,catalog_id,definition_version_id,runtime_publication_state,baseline_ready,scenario_ready")
      .eq("release_id", release.id).eq("catalog_id", job.catalog_id).maybeSingle()
    : { data: null, error: null };
  if (manifestError) {
    throw Object.assign(new Error("job admission manifest load failed"), { code: "ADMISSION_LOAD_FAILED" });
  }
  const { data: definition, error: definitionError } = manifest?.definition_version_id
    ? await admin.from("estimate_definition_version")
      .select("id,release_id,catalog_id,content_status,content_gate_status,source_metadata")
      .eq("id", manifest.definition_version_id).maybeSingle()
    : { data: null, error: null };
  if (definitionError) {
    throw Object.assign(new Error("job admission definition load failed"), { code: "ADMISSION_LOAD_FAILED" });
  }
  const { data: search, error: searchError } = searchRelease?.id
    ? await admin.from("estimate_search_document")
      .select("search_release_id,catalog_id,definition_version_id,definition_release_id,adjudication_class,selectable,canonical_target_catalog_id,replacement_catalog_id")
      .eq("search_release_id", searchRelease.id).eq("catalog_id", job.catalog_id).maybeSingle()
    : { data: null, error: null };
  if (searchError) {
    throw Object.assign(new Error("job admission search load failed"), { code: "ADMISSION_LOAD_FAILED" });
  }
  const registry = new CanonicalEstimateDefinitionRegistry([buildCanonicalEstimateRegistryEntry({
    catalogId: job.catalog_id,
    manifestPresent: Boolean(manifest),
    definitionPresent: Boolean(definition),
    searchDocumentPresent: Boolean(search),
    definitionVersionId: definition?.id ?? manifest?.definition_version_id ?? null,
    definitionReleaseId: manifest && release ? release.id : definition?.release_id ?? null,
    searchDefinitionVersionId: search?.definition_version_id ?? null,
    searchReleaseId: search?.search_release_id ?? null,
    adjudicationClass: search?.adjudication_class ?? null,
    selectable: search?.selectable,
    canonicalTargetCatalogId: search?.canonical_target_catalog_id ?? null,
    replacementCatalogId: search?.replacement_catalog_id ?? null,
    sourceMetadata: definition?.source_metadata,
  })]);
  const registryEntry = registry.get(job.catalog_id)!;
  const decision = evaluateEstimateAdmission({
    mode: "production",
    ingress: jobAdmissionIngress(job.operation),
    releaseId: release?.id ?? job.target_release_id,
    definitionVersionId: definition?.id ?? manifest?.definition_version_id ?? null,
    catalogId: job.catalog_id,
    releaseStatus: release?.status ?? null,
    manifestPublicationState: manifest?.runtime_publication_state ?? null,
    baselineReady: manifest?.baseline_ready === true,
    scenarioReady: manifest?.scenario_ready === true,
    definitionContentStatus: definition?.content_status ?? null,
    contentGateStatus: definition?.content_gate_status ?? null,
    definitionReleaseId: registryEntry.definitionReleaseId,
    selectedSearchReleaseId: searchRelease?.id ?? null,
    definitionSearchReleaseId: registryEntry.searchReleaseId,
    unresolvedDisposition: registryEntry.unresolvedDisposition,
    authorizationValid: true,
  });
  if (!decision.allowed) {
    throw Object.assign(new Error("claimed job definition is not admitted"), {
      code: decision.reasons[0]?.code ?? "ESTIMATE_ADMISSION_DENIED",
    });
  }
}

async function loadPriceItems(admin: AdminClient, snapshotIds: string[]) {
  const prices = new Map<string, Record<string, unknown>>();
  if (snapshotIds.length === 0) return prices;
  const { data, error } = await admin
    .from("estimate_price_snapshot_item")
    .select("snapshot_id,price_key,unit_id,unit_price,currency_code,estimate_price_snapshot!inner(route_id,captured_at)")
    .in("snapshot_id", snapshotIds)
    .order("captured_at", { foreignTable: "estimate_price_snapshot", ascending: false })
    .limit(20_000);
  if (error) throw Object.assign(new Error("price snapshot load failed"), { code: "PRICE_LOAD_FAILED" });
  for (const item of data ?? []) {
    const key = `${item.price_key}:${item.unit_id}`;
    if (!prices.has(key)) prices.set(key, item);
  }
  return prices;
}

async function compileJob(admin: AdminClient, workerId: string, job: ClaimedJob): Promise<string> {
  const { data: release, error: releaseError } = await admin
    .from("estimate_definition_release")
    .select("id,status")
    .eq("id", job.target_release_id)
    .single();
  if (releaseError || (release.status !== "active" && !(release.status === "prepared" && job.input_payload?.releaseAdmission === true))) {
    throw Object.assign(new Error("target release load failed"), { code: "DEFINITION_LOAD_FAILED" });
  }

  const { data: manifestEntry, error: manifestError } = await admin
    .from("estimate_cumulative_manifest_entry")
    .select("definition_version_id,approved_template_baseline_id,baseline_ready,scenario_ready")
    .eq("release_id", release.id)
    .eq("catalog_id", job.catalog_id)
    .maybeSingle();
  if (manifestError) throw Object.assign(new Error("definition manifest load failed"), { code: "DEFINITION_LOAD_FAILED" });
  let definitionVersionId: string | null = null;
  let cumulativeManifest = false;
  let approvedTemplateBaselineId: string | null = null;
  if (manifestEntry?.baseline_ready === true && manifestEntry?.scenario_ready === true) {
    definitionVersionId = manifestEntry.definition_version_id;
    cumulativeManifest = true;
    approvedTemplateBaselineId = manifestEntry.approved_template_baseline_id ?? null;
  } else {
    const { data: direct, error: directError } = await admin
      .from("estimate_definition_version")
      .select("id")
      .eq("release_id", release.id)
      .eq("catalog_id", job.catalog_id)
      .maybeSingle();
    if (directError) throw Object.assign(new Error("definition load failed"), { code: "DEFINITION_LOAD_FAILED" });
    definitionVersionId = direct?.id ?? null;
  }
  if (!definitionVersionId) {
    throw Object.assign(new Error("definition content is not admitted"), { code: "DEFINITION_CONTENT_NOT_ADMITTED" });
  }
  const [{ data: definitionVersion, error: definitionError }, { data: identity, error: identityError }] = await Promise.all([
    admin.from("estimate_definition_version").select("id,definition_version,catalog_id,passport").eq("id", definitionVersionId).single(),
    admin.from("estimate_work_identity").select("title_ru,domain").eq("catalog_id", job.catalog_id).single(),
  ]);
  if (definitionError || identityError) {
    throw Object.assign(new Error("definition identity load failed"), { code: "DEFINITION_LOAD_FAILED" });
  }
  let baselineParameters: Record<string, unknown> = {};
  if (approvedTemplateBaselineId) {
    const { data: baseline, error: baselineError } = await admin
      .from("estimate_approved_template_baseline")
      .select("input_values")
      .eq("id", approvedTemplateBaselineId)
      .single();
    if (baselineError) throw Object.assign(new Error("definition baseline load failed"), { code: "DEFINITION_LOAD_FAILED" });
    baselineParameters = baseline.input_values ?? {};
  }
  const definition = {
    ...definitionVersion,
    title_ru: identity.title_ru,
    domain: identity.domain,
    cumulative_manifest: cumulativeManifest,
    approved_template_baseline_id: approvedTemplateBaselineId,
  };

  const [parameterResult, formulaResult, resourceResult] = await Promise.all([
    admin.from("estimate_parameter_definition").select("parameter_id,value_type,required,default_value,constraints_json,truth_metadata,unit_id,approved_template_baseline_id").eq("definition_version_id", definition.id).order("ordinal"),
    admin.from("estimate_formula_graph").select("formula_id,ast,input_parameter_ids,ast_sha256").eq("definition_version_id", definition.id),
    admin.from("estimate_resource_spec").select("id,row_id,ordinal,section,category,title_ru,unit_id,formula_id,inclusion_ast,resource_graph,procurement_eligible,cost_owner_id,source_metadata,row_sha256").eq("definition_version_id", definition.id).order("ordinal").limit(MAX_RESOURCE_ROWS + 1),
  ]);
  if (parameterResult.error || formulaResult.error || resourceResult.error) {
    throw Object.assign(new Error("definition graph load failed"), { code: "DEFINITION_LOAD_FAILED" });
  }
  if ((resourceResult.data?.length ?? 0) > MAX_RESOURCE_ROWS) {
    throw Object.assign(new Error("resource graph row limit exceeded"), { code: "DEFINITION_LIMIT_EXCEEDED" });
  }
  const resourceIds = (resourceResult.data ?? []).map((resource) => resource.id);
  const resourceBindingResult = resourceIds.length === 0
    ? { data: [], error: null }
    : await admin
      .from("estimate_resource_price_route_binding")
      .select("resource_spec_id,price_key")
      .in("resource_spec_id", resourceIds);
  if (resourceBindingResult.error) {
    throw Object.assign(new Error("definition price binding load failed"), { code: "DEFINITION_LOAD_FAILED" });
  }
  const resources = bindCanonicalEstimateResourcePriceKeys(
    resourceResult.data ?? [],
    resourceBindingResult.data ?? [],
  );

  const submittedParameters = { ...(job.input_payload?.parameters ?? {}) } as Record<string, unknown>;
  let confirmedParameters: Record<string, unknown> = { ...baselineParameters };
  let inheritedUserParameters: Record<string, unknown> = {};
  let parentRevision: Record<string, unknown> | null = null;
  if (job.operation === "recalculate") {
    const { data: parent, error: parentError } = await admin
      .from("estimate_revision")
      .select("release_id,catalog_id,input_parameters,amendment_contract,source_request_text,source_request_hash,primary_measure_parameter_id,revision_contract_version")
      .eq("id", job.parent_revision_id)
      .single();
    if (parentError || parent.catalog_id !== job.catalog_id) {
      throw Object.assign(new Error("parent revision parameter source unavailable"), { code: "PARENT_REVISION_INVALID" });
    }
    if (parent.release_id === release.id) {
      confirmedParameters = { ...baselineParameters, ...(parent.input_parameters ?? {}) };
      inheritedUserParameters = parent.amendment_contract?.parameterSources?.userParameters ?? {};
    }
    parentRevision = parent;
  }
  const effectiveUserParameters = { ...inheritedUserParameters, ...submittedParameters };
  const snapshotIds = Array.isArray(job.input_payload?.priceSnapshotIds) ? job.input_payload.priceSnapshotIds : [];
  const prices = await loadPriceItems(admin, snapshotIds);
  const compiled = await compileCanonicalEstimateCore({
    operation: job.operation as "compile" | "recalculate",
    compilerVersion: WORKER_VERSION,
    catalogId: job.catalog_id,
    primaryMeasureParameterId: String(
      (parentRevision?.revision_contract_version === CANONICAL_ESTIMATE_REVISION_CONTRACT_VERSION
        ? parentRevision.primary_measure_parameter_id
        : job.input_payload?.requestIdentity?.primaryMeasureParameterId) ?? "",
    ).trim() || null,
    parameterDefinitions: parameterResult.data ?? [],
    formulaDefinitions: formulaResult.data ?? [],
    resourceDefinitions: resources,
    submittedParameters,
    confirmedParameters,
    currencyCode: String(job.input_payload?.currencyCode ?? ""),
    priceSnapshotIds: snapshotIds,
    priceItems: [...prices.values()],
    rowOverrides: job.input_payload?.rowOverrides ?? {},
    customRows: job.input_payload?.customRows ?? [],
    maximumResourceRows: MAX_RESOURCE_ROWS,
    hashJson: sha256,
  });
  const { rows, totals } = compiled;
  const parameters = compiled.parameters;
  const currencyCode = compiled.totals.currencyCode;
  const baselineAssumptions = Object.fromEntries(Object.entries(baselineParameters)
    .filter(([parameterId, value]) => !(parameterId in effectiveUserParameters)
      && canonicalEstimateStableJson(parameters[parameterId]) === canonicalEstimateStableJson(value)));
  const { data: searchRelease } = await admin
    .from("estimate_search_index_release")
    .select("id")
    .eq("status", "active")
    .order("activated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const identityContract = await buildCanonicalRevisionIdentity({
    catalogId: job.catalog_id,
    parentRevisionId: job.parent_revision_id,
    requestIdentity: job.input_payload?.requestIdentity ?? {},
    definition,
    parameterDefinitions: parameterResult.data ?? [],
    parameters,
    effectiveUserParameters,
    baselineAssumptions,
    parent: parentRevision,
    searchReleaseId: searchRelease?.id ?? null,
    compilerVersion: WORKER_VERSION,
    hashText: sha256,
  });
  const revisionProjection = { ...compiled.revisionProjection, identity: identityContract };
  const commitPayload = buildCanonicalRevisionCommitPayload({
    rowCount: rows.length,
    currencyCode,
    totals,
    checksumSha256: await sha256(revisionProjection),
    compilerVersion: WORKER_VERSION,
    parameters,
    approvedTemplateBaselineId,
    baselineAssumptions,
    effectiveUserParameters,
    parentRevisionId: job.parent_revision_id,
    identityContract,
  });
  const { data: revisionId, error: commitError } = await admin.rpc(CANONICAL_ESTIMATE_REVISION_COMMIT_FUNCTION, {
    p_job_id: job.id,
    p_worker_id: workerId,
    p_revision: commitPayload,
    p_rows: rows,
  });
  if (commitError) {
    const conflict = /optimistic revision conflict/i.test(String(commitError.message ?? ""));
    const transient = !conflict && ["40001", "40P01"].includes(String(commitError.code ?? ""));
    throw Object.assign(new Error("atomic revision commit failed"), {
      code: conflict ? "REVISION_CONFLICT" : transient ? "REVISION_COMMIT_RETRYABLE" : "REVISION_COMMIT_FAILED",
    });
  }
  return revisionId;
}

function requiredText(value: unknown, field: string, maxLength = 240): string {
  const normalized = String(value ?? "").trim();
  if (!normalized || normalized.length > maxLength) {
    throw Object.assign(new Error(`invalid ${field}`), { code: "LEGACY_REVISION_INVALID" });
  }
  return normalized;
}

function numericText(value: unknown, field: string, nullable = false): string | null {
  if (value == null && nullable) return null;
  const normalized = String(value ?? "").trim();
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(normalized) || !Number.isFinite(Number(normalized))) {
    throw Object.assign(new Error(`invalid ${field}`), { code: "LEGACY_REVISION_INVALID" });
  }
  return normalized;
}

async function compileLegacyRevisionJob(admin: AdminClient, workerId: string, job: ClaimedJob): Promise<string> {
  const payload = job.input_payload as Record<string, unknown>;
  const sourceEstimateId = requiredText(payload.sourceEstimateId, "sourceEstimateId");
  const sourceRevisionId = requiredText(payload.sourceRevisionId, "sourceRevisionId");
  const currencyCode = requiredText(payload.currencyCode, "currencyCode", 3);
  if (!/^[A-Z]{3}$/.test(currencyCode)) throw Object.assign(new Error("invalid currency"), { code: "LEGACY_REVISION_INVALID" });
  const sourceRows = Array.isArray(payload.rows) ? payload.rows : null;
  if (!sourceRows || sourceRows.length > 5_000) {
    throw Object.assign(new Error("invalid legacy rows"), { code: "LEGACY_REVISION_INVALID" });
  }
  const sourceProjection = {
    sourceEstimateId,
    sourceRevisionId,
    catalogId: job.catalog_id,
    currencyCode,
    parameters: payload.parameters ?? {},
    totals: payload.totals ?? {},
    rows: sourceRows,
  };
  const sourceChecksumSha256 = await sha256(sourceProjection);
  if (sourceChecksumSha256 !== payload.sourceChecksumSha256) {
    throw Object.assign(new Error("legacy source checksum mismatch"), { code: "LEGACY_CHECKSUM_MISMATCH" });
  }

  const { data: release, error: releaseError } = await admin
    .from("estimate_definition_release").select("id,status").eq("id", job.target_release_id).single();
  if (releaseError || release.status !== "active") throw Object.assign(new Error("target release load failed"), { code: "DEFINITION_LOAD_FAILED" });
  const { data: definition, error: definitionError } = await admin
    .from("estimate_definition_version").select("id").eq("release_id", release.id).eq("catalog_id", job.catalog_id).single();
  if (definitionError) throw Object.assign(new Error("definition load failed"), { code: "DEFINITION_LOAD_FAILED" });
  const { data: specs, error: specsError } = await admin
    .from("estimate_resource_spec").select("id,row_id").eq("definition_version_id", definition.id).limit(MAX_RESOURCE_ROWS + 1);
  if (specsError || (specs?.length ?? 0) > MAX_RESOURCE_ROWS) {
    throw Object.assign(new Error("resource map load failed"), { code: "DEFINITION_LOAD_FAILED" });
  }
  const specByRowId = new Map((specs ?? []).map((entry) => [String(entry.row_id), entry.id]));
  const seen = new Set<string>();
  const rows: Record<string, unknown>[] = [];
  let totalAmount = "0";
  let matchedRows = 0;
  let unmatchedRows = 0;
  for (let ordinal = 0; ordinal < sourceRows.length; ordinal += 1) {
    const source = sourceRows[ordinal] as Record<string, unknown>;
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      throw Object.assign(new Error("legacy row must be an object"), { code: "LEGACY_REVISION_INVALID" });
    }
    const rowId = requiredText(source.rowId, `rows[${ordinal}].rowId`);
    if (seen.has(rowId)) throw Object.assign(new Error("duplicate legacy row id"), { code: "LEGACY_REVISION_INVALID" });
    seen.add(rowId);
    const sourceQuantity = numericText(source.quantity, `rows[${ordinal}].quantity`, true);
    const sourceUnitPrice = numericText(source.unitPrice, `rows[${ordinal}].unitPrice`, true);
    const sourceAmount = numericText(source.amount, `rows[${ordinal}].amount`, true);
    const quantity = sourceQuantity == null ? null : canonicalRoundDecimal(sourceQuantity, 9);
    const unitPrice = sourceUnitPrice == null ? null : canonicalRoundDecimal(sourceUnitPrice, 6);
    const amount = sourceAmount == null ? null : canonicalRoundDecimal(sourceAmount, 2);
    const sourcePayload = source.sourcePayload && typeof source.sourcePayload === "object" && !Array.isArray(source.sourcePayload)
      ? source.sourcePayload as Record<string, unknown>
      : source;
    const calculationTrace = source.calculationTrace && typeof source.calculationTrace === "object" && !Array.isArray(source.calculationTrace)
      ? source.calculationTrace as Record<string, unknown>
      : {};
    const normativeTrace = Array.isArray(source.normativeTrace) ? source.normativeTrace : [];
    const resourceSpecId = specByRowId.get(rowId) ?? null;
    const includedInEstimate = resourceSpecId != null;
    const procurementEligible = source.procurementEligible === true;
    if (includedInEstimate) {
      matchedRows += 1;
      if (amount != null) {
        totalAmount = evaluateFormulaGraph({
          kind: "binary",
          operator: "+",
          left: { kind: "literal", value: totalAmount },
          right: { kind: "literal", value: amount },
        }, {});
      }
    } else {
      unmatchedRows += 1;
    }
    const row = {
      row_id: rowId,
      ordinal,
      resource_spec_id: resourceSpecId,
      section: requiredText(source.section ?? "legacy", `rows[${ordinal}].section`),
      category: requiredText(source.category ?? "legacy", `rows[${ordinal}].category`),
      title_ru: requiredText(source.titleRu, `rows[${ordinal}].titleRu`, 2_000),
      unit_id: requiredText(source.unitId ?? "unit", `rows[${ordinal}].unitId`),
      quantity,
      unit_price: unitPrice,
      amount,
      currency_code: unitPrice == null && amount == null ? null : currencyCode,
      procurement_eligible: procurementEligible,
      included_in_estimate: includedInEstimate,
      included_in_procurement: includedInEstimate && procurementEligible,
      ownership_status: includedInEstimate ? "OWNED" : "MIGRATED_UNOWNED_EXCLUDED_FROM_TOTAL",
      calculation_trace: {
        ...calculationTrace,
        migration: { sourceEstimateId, sourceRevisionId, sourceOrdinal: ordinal },
      },
      normative_trace: normativeTrace,
      legacy_row_payload: sourcePayload,
      price_snapshot_id: null,
      price_route_id: null,
      price_resolution_trace: {
        migrated: true,
        sourcePricePreserved: sourceUnitPrice != null,
        ownershipDisposition: includedInEstimate
          ? "OWNED"
          : "MIGRATED_UNOWNED_EXCLUDED_FROM_TOTAL",
      },
    } as Record<string, unknown>;
    row.row_sha256 = await sha256(row);
    rows.push(row);
  }

  const sourceTotals = payload.totals && typeof payload.totals === "object" ? payload.totals : {};
  const totals = {
    ...(sourceTotals as Record<string, unknown>),
    amount: totalAmount,
    includedRowCount: matchedRows,
    excludedRowCount: unmatchedRows,
    pricedRowCount: rows.filter((row) => row.included_in_estimate && row.unit_price != null).length,
    unpricedRowCount: rows.filter((row) => row.included_in_estimate && row.unit_price == null).length,
    currencyCode,
  };
  const revisionProjection = {
    sourceChecksumSha256,
    catalogId: job.catalog_id,
    totals,
    rows: rows.map((row) => ({ rowId: row.row_id, rowSha256: row.row_sha256 })),
    compilerVersion: WORKER_VERSION,
  };

  const { data: revisionId, error: commitError } = await admin.rpc(CANONICAL_ESTIMATE_REVISION_COMMIT_FUNCTION, {
    p_job_id: job.id,
    p_worker_id: workerId,
    p_revision: {
      rowCount: rows.length,
      currencyCode,
      totals,
      checksumSha256: await sha256(revisionProjection),
      compilerVersion: WORKER_VERSION,
      migrationSource: {
        kind: "legacy_revision_post_line_v2",
        sourceEstimateId,
        sourceRevisionId,
        sourceChecksumSha256,
        sourceTotals,
        rowsPreserved: rows.length,
        matchedRows,
        unmatchedRows,
        unmatchedDisposition: "MIGRATED_UNOWNED_EXCLUDED_FROM_TOTAL",
      },
    },
    p_rows: rows,
  });
  if (commitError) throw Object.assign(new Error("atomic legacy revision commit failed"), { code: "REVISION_COMMIT_FAILED" });
  return revisionId;
}

async function buildArtifactJob(admin: AdminClient, workerId: string, job: ClaimedJob): Promise<string> {
  if (!job.parent_revision_id || !["pdf", "professional_pdf", "procurement"].includes(job.operation)) {
    throw Object.assign(new Error("invalid artifact job"), { code: "ARTIFACT_JOB_INVALID" });
  }
  const [{ data: revision, error: revisionError }, { data: rowData, error: rowsError }] = await Promise.all([
    admin.from("estimate_revision")
      .select("id,release_id,definition_version_id,catalog_id,organization_id,owner_user_id,revision_number,input_parameters,user_input_snapshot,amendment_contract,currency_code,totals,row_count,checksum_sha256,compiler_version,migration_source,source_request_text,source_request_hash,canonical_work_title_ru,display_title_ru,primary_measure_parameter_id,primary_measure_value,primary_measure_unit_id,created_at")
      .eq("id", job.parent_revision_id).single(),
    admin.from("estimate_revision_row")
      .select("row_id,ordinal,section,category,title_ru,unit_id,quantity,unit_price,amount,currency_code,procurement_eligible,included_in_estimate,included_in_procurement,ownership_status,calculation_trace,normative_trace,legacy_row_payload,row_sha256")
      .eq("revision_id", job.parent_revision_id).order("ordinal").limit(5_001),
  ]);
  if (revisionError || rowsError || !revision || (rowData?.length ?? 0) > 5_000
    || rowData?.length !== revision.row_count) {
    throw Object.assign(new Error("artifact source revision load failed"), { code: "ARTIFACT_SOURCE_INVALID" });
  }
  const selection = selectCanonicalArtifactRows(rowData ?? []);
  const rows = selection.estimateRows;
  const selectedProcurementRows = selection.procurementRows;
  let bytes: Uint8Array;
  let contentType: string;
  let extension: string;
  let renderer: string;
  let pageCount: number | null = null;
  let definitionVersionId: string | null = null;
  let grandTotalStatus: "COMPLETE" | "PARTIAL_NEEDS_PRICE" | null = null;
  if (job.operation === "procurement") {
    const projection = buildCanonicalProcurementProjection({
      revision,
      procurementRows: selectedProcurementRows,
    });
    bytes = new TextEncoder().encode(canonicalEstimateStableJson(projection));
    contentType = "application/json; charset=utf-8";
    extension = "json";
    renderer = "canonical-procurement-projection.r2";
  } else if (job.operation === "professional_pdf") {
    const { data: identity, error: identityError } = await admin
      .from("estimate_work_identity")
      .select("title_ru")
      .eq("catalog_id", revision.catalog_id)
      .maybeSingle();
    if (identityError || !revision.definition_version_id) {
      throw Object.assign(new Error("professional artifact identity load failed"), { code: "ARTIFACT_IDENTITY_LOAD_FAILED" });
    }
    definitionVersionId = String(revision.definition_version_id);
    const projection = buildCanonicalProfessionalPdfProjection({
      revision,
      rows,
      workTitleRu: String(revision.canonical_work_title_ru ?? revision.display_title_ru ?? identity?.title_ru ?? "Строительно-монтажные работы"),
      definitionVersionId,
    });
    const rendered = await renderPdfBytes(projection.html, {
      footerTemplate: projection.footerTemplate,
    });
    bytes = rendered.pdfBytes;
    pageCount = rendered.pageCount;
    grandTotalStatus = projection.grandTotalStatus;
    contentType = "application/pdf";
    extension = "pdf";
    renderer = CANONICAL_PROFESSIONAL_PDF_GENERATOR_VERSION;
  } else {
    const tableRows = rows.map((row) => {
      const normative = Array.isArray(row.normative_trace)
        ? row.normative_trace.map((entry) => {
          if (entry && typeof entry === "object") {
            const record = entry as Record<string, unknown>;
            return [record.sourceId, record.locator, record.postRowLocator].filter(Boolean).join(" · ");
          }
          return String(entry ?? "");
        }).filter(Boolean).join("; ")
        : "";
      const manual = row.calculation_trace?.manualAmendment == null
        ? ""
        : `manual: ${canonicalEstimateStableJson(row.calculation_trace.manualAmendment)}`;
      const disposition = [row.ownership_status, row.included_in_estimate ? "в смете" : "исключена",
        row.included_in_procurement ? "в закупке" : "не в закупке", manual].filter(Boolean).join(" · ");
      return `<tr><td>${row.ordinal + 1}</td><td>${escapeHtml(row.section)}<br><span class="muted">${escapeHtml(row.category)}</span></td><td>${escapeHtml(row.title_ru)}<br><span class="muted">${escapeHtml(disposition)}</span></td><td>${escapeHtml(row.unit_id)}</td><td>${escapeHtml(row.quantity ?? "—")}</td><td>${escapeHtml(row.unit_price ?? "—")}</td><td>${escapeHtml(row.amount ?? "—")}</td><td>${escapeHtml(normative || "—")}</td></tr>`;
    }).join("");
    const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><style>@page{size:A4;margin:12mm}body{font-family:Arial,sans-serif;color:#111827}h1{font-size:20px;margin:0 0 8px}h2{font-size:14px;margin:12px 0 5px}.meta,.muted{font-size:9px;color:#4b5563;word-break:break-word}.identity{font-size:10px;word-break:break-all}pre{white-space:pre-wrap;word-break:break-word;border:1px solid #e5e7eb;background:#f9fafb;padding:6px;font-size:9px}table{width:100%;border-collapse:collapse;font-size:8px}thead{display:table-header-group}tr{break-inside:avoid}th,td{border:1px solid #d1d5db;padding:4px;text-align:left;vertical-align:top}th{background:#f3f4f6}</style></head><body><h1>Каноническая смета</h1><div class="identity">revision_id: ${escapeHtml(revision.id)}<br>release_id: ${escapeHtml(revision.release_id)}<br>catalog_id: ${escapeHtml(revision.catalog_id)}<br>checksum: ${escapeHtml(revision.checksum_sha256)}<br>compiler: ${escapeHtml(revision.compiler_version)}</div><h2>Параметры</h2><pre>${escapeHtml(canonicalEstimateStableJson(revision.input_parameters))}</pre><h2>Итоги</h2><pre>${escapeHtml(canonicalEstimateStableJson(revision.totals))}</pre><h2>Позиции и нормативные ссылки</h2><table><thead><tr><th>№</th><th>Раздел / категория</th><th>Позиция / disposition</th><th>Ед.</th><th>Кол-во</th><th>Цена</th><th>Сумма</th><th>Норматив</th></tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
    const rendered = await renderPdfBytes(html);
    bytes = rendered.pdfBytes;
    pageCount = rendered.pageCount;
    contentType = "application/pdf";
    extension = "pdf";
    renderer = rendered.renderer;
  }
  const artifactSha256 = await sha256Bytes(bytes);
  const bucketId = String(Deno.env.get("CANONICAL_ESTIMATE_ARTIFACT_BUCKET") ?? "estimate-artifacts").trim();
  const storageKey = `${job.owner_user_id}/${revision.id}/${job.operation}/${revision.checksum_sha256}.${extension}`;
  const { error: uploadError } = await admin.storage.from(bucketId).upload(storageKey, bytes, {
    contentType,
    upsert: true,
  });
  if (uploadError) throw Object.assign(new Error("artifact storage upload failed"), { code: "ARTIFACT_STORAGE_FAILED" });
  const { data: artifactId, error: commitError } = await admin.rpc("estimate_commit_artifact_job_v1", {
    p_job_id: job.id,
    p_worker_id: workerId,
    p_artifact: {
      kind: job.operation,
      storageBucket: bucketId,
      storageKey,
      contentType,
      byteSize: bytes.byteLength,
      sha256: artifactSha256,
      metadata: buildCanonicalArtifactMetadata({
        operation: job.operation,
        renderer,
        revision,
        sourceRowCount: selection.sourceRows.length,
        projectedRowCount: job.operation === "procurement" ? selectedProcurementRows.length : rows.length,
        selectedProcurementRowCount: selectedProcurementRows.length,
        definitionVersionId,
        pageCount,
        grandTotalStatus,
      }),
    },
  });
  if (commitError) throw Object.assign(new Error("artifact commit failed"), { code: "ARTIFACT_COMMIT_FAILED" });
  return artifactId;
}

async function failJob(admin: AdminClient, workerId: string, job: ClaimedJob, error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const code = typeof error === "object" && error && "code" in error
    ? String(error.code)
    : /timed?\s*out|timeout/iu.test(message)
      ? "ARTIFACT_RENDER_TIMEOUT"
      : "COMPILER_FAILED";
  const retryDelay = Math.min(300, 2 ** Math.min(job.attempt, 8));
  const retryable = code.endsWith("_LOAD_FAILED")
    || code.endsWith("_STORAGE_FAILED")
    || code === "ARTIFACT_RENDER_TIMEOUT"
    || code === "REVISION_COMMIT_RETRYABLE";
  const { error: failError } = await admin.rpc("estimate_fail_compile_job_v2", {
    p_job_id: job.id,
    p_worker_id: workerId,
    p_error_code: code.slice(0, 100),
    p_error_detail: { compilerVersion: WORKER_VERSION, retryable },
    p_retryable: retryable,
    p_retry_delay_seconds: retryDelay,
  });
  // Cancellation clears the lease. A late worker is intentionally unable to
  // resurrect or rewrite the cancelled job.
  if (failError && String(failError.code ?? "") !== "55000") {
    throw Object.assign(new Error("job failure transition failed"), { code: "JOB_FAILURE_TRANSITION_FAILED" });
  }
  return code;
}

Deno.serve(async (request: Request) => {
  const requestId = crypto.randomUUID();
  if (request.method !== "POST") return new Response(JSON.stringify({ error: "METHOD_NOT_ALLOWED", requestId }), { status: 405 });
  if (!(await secretMatches(request))) return new Response(JSON.stringify({ error: "AUTH_REQUIRED", requestId }), { status: 401 });

  const url = String(Deno.env.get("SUPABASE_URL") ?? "").trim();
  const serviceKey = String(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
  if (!url || !serviceKey) return new Response(JSON.stringify({ error: "BACKEND_CONFIGURATION_ERROR", requestId }), { status: 503 });
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const workerId = `edge:${requestId}`;
  const requestedLimit = Number(new URL(request.url).searchParams.get("limit") ?? 1);
  const limit = Number.isInteger(requestedLimit) ? Math.min(MAX_JOBS_PER_INVOCATION, Math.max(1, requestedLimit)) : 1;
  const { data: jobs, error: claimError } = await admin.rpc("estimate_claim_compile_jobs_v1", {
    p_worker_id: workerId,
    p_limit: limit,
    p_lease_seconds: 120,
  });
  if (claimError) return new Response(JSON.stringify({ error: "JOB_CLAIM_FAILED", requestId }), { status: 503 });

  const results = [];
  for (const job of (jobs ?? []) as ClaimedJob[]) {
    try {
      await assertClaimedJobAdmission(admin, job);
      if (job.operation === "legacy_revision_migration") {
        results.push({ jobId: job.id, revisionId: await compileLegacyRevisionJob(admin, workerId, job), status: "succeeded" });
      } else if (job.operation === "pdf" || job.operation === "professional_pdf" || job.operation === "procurement") {
        results.push({ jobId: job.id, artifactId: await buildArtifactJob(admin, workerId, job), status: "succeeded" });
      } else {
        results.push({ jobId: job.id, revisionId: await compileJob(admin, workerId, job), status: "succeeded" });
      }
    } catch (error) {
      const code = await failJob(admin, workerId, job, error);
      console.error("[canonical-estimate-worker] compile failed", { requestId, jobId: job.id, code });
      results.push({ jobId: job.id, status: "retry_or_failed", code });
    }
  }
  return new Response(JSON.stringify({ requestId, workerVersion: WORKER_VERSION, claimed: results.length, results }), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
});
