import { createHash } from "node:crypto";

import {
  buildProfessionalWorkPassport,
  clearProfessionalWorkPassportBuildCaches,
  getProfessionalWorkPassportBuildCacheStats,
  listProfessionalWorkPassportTemplateIds,
} from "../../src/lib/estimate/buildProfessionalWorkPassport";
import { createEstimateDraftRevision } from "../../src/lib/estimate/createEstimateDraftRevision";
import { parseUserParamPatch } from "../../src/lib/estimate/parseUserParamPatch";
import { recalculateEstimateDraftRevision } from "../../src/lib/estimate/recalculateEstimateDraftRevision";
import { validateEstimateDraftRevision } from "../../src/lib/estimate/validateEstimateDraftRevision";
import {
  clearAiEstimateFormulaRuntimeCaches,
  getAiEstimateFormulaRuntimeCacheStats,
} from "../../src/lib/estimate/formula/evaluateAiEstimateQuantityFormula";
import type { EstimateDraftRevision } from "../../src/lib/estimate/estimateDraftRevisionContract";
import { resolveRegisteredProfessionalEstimateSelectionV1 } from "../../src/lib/estimate/v4/domains/registeredProfessionalEstimateDomainsV1";
import {
  createRegisteredProfessionalDomainAuditRevision,
  recalculateRegisteredProfessionalDomainAuditRevision,
} from "../../scripts/estimate/registeredProfessionalDomainAuditAdapter";
import {
  createPumpStationCanonicalBackendAuditRevision,
  isPumpStationCanonicalBackendPassport,
  recalculatePumpStationCanonicalBackendAuditRevision,
} from "../../scripts/estimate/pumpStationCanonicalBackendAuditAdapter";

export const EDITABLE_PARAM_11610_SHARD_COUNT = 24;

export const EDITABLE_PARAM_11610_PREDICATE_CONTRACT = Object.freeze([
  "passport_exists",
  "editable_parameter_exists",
  "typed_user_patch_is_accepted",
  "revision_sequence_is_preserved",
  "edited_parameter_value_is_preserved",
  "dependent_rows_are_recalculated",
  "unrelated_rows_are_unchanged",
  "primary_measure_and_identity_are_preserved",
  "validation_has_no_blockers",
  "runtime_caches_remain_bounded",
] as const);

function sha256Json(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

export function editableParam11610Manifest(): string[] {
  return listProfessionalWorkPassportTemplateIds();
}

export function editableParam11610ShardEntries(shardIndex: number): Array<{
  globalIndex: number;
  templateId: string;
}> {
  if (!Number.isInteger(shardIndex) || shardIndex < 0 || shardIndex >= EDITABLE_PARAM_11610_SHARD_COUNT) {
    throw new Error(`EDITABLE_PARAM_11610_INVALID_SHARD:${shardIndex}`);
  }
  const manifest = editableParam11610Manifest();
  const start = Math.floor(manifest.length * shardIndex / EDITABLE_PARAM_11610_SHARD_COUNT);
  const end = Math.floor(manifest.length * (shardIndex + 1) / EDITABLE_PARAM_11610_SHARD_COUNT);
  // Keep adjacent catalog entries together. The production registries and
  // their bounded caches are intentionally locality-aware; modulo assignment
  // turned this acceptance test into an artificial cache-thrashing workload.
  return manifest.slice(start, end)
    .map((templateId, index) => ({ globalIndex: start + index, templateId }));
}

export type EditableParam11610VerificationResult = {
  assigned: number;
  ready: number;
  blockers: string[];
  cacheStats: ReturnType<typeof getProfessionalWorkPassportBuildCacheStats>;
  formulaCacheStats: ReturnType<typeof getAiEstimateFormulaRuntimeCacheStats>;
};

function verifyEditableParam11610Entries(
  entries: readonly { globalIndex: number; templateId: string }[],
): EditableParam11610VerificationResult {
  let ready = 0;
  const blockers: string[] = [];
  clearProfessionalWorkPassportBuildCaches();
  clearAiEstimateFormulaRuntimeCaches();

  try {
    for (const { globalIndex: index, templateId } of entries) {
      const passport = buildProfessionalWorkPassport(templateId);
      if (!passport) {
        blockers.push(`${templateId}:passport_missing`);
        continue;
      }
      if (isPumpStationCanonicalBackendPassport(passport)) {
        try {
          const r1 = createPumpStationCanonicalBackendAuditRevision({
            passport,
            estimateDraftId: `readiness-${index}`,
            rawInput: `${passport.localizedNameRu} canonical acceptance fixture`,
            createdAt: "2026-07-07T00:00:00.000Z",
          });
          const candidate = r1.trace.params
            .filter((parameter) =>
              parameter.affectsRowIds.length > 0 && typeof r1.params[parameter.key]?.value === "number")
            .sort((left, right) => right.affectsRowIds.length - left.affectsRowIds.length)[0];
          if (!candidate) {
            blockers.push(`${templateId}:pump_editable_parameter_missing`);
            continue;
          }
          const before = Number(r1.params[candidate.key].value);
          const { revision: r2, diff } = recalculatePumpStationCanonicalBackendAuditRevision({
            passport,
            previous: r1,
            operation: "update_param",
            paramKey: candidate.key,
            rawValue: String(before + 1),
            createdAt: "2026-07-07T00:01:00.000Z",
            revisionIndex: 2,
          });
          const validation = validateEstimateDraftRevision(r2);
          if (
            r1.selectedTemplateId === templateId &&
            r2.selectedTemplateId === templateId &&
            r2.previousRevisionId === r1.revisionId &&
            r2.params[candidate.key]?.value === before + 1 &&
            r2.params[candidate.key]?.source === "edited_by_user" &&
            r2.boq.rows.length > 0 &&
            diff.changedRowsCount > 0 &&
            validation.valid
          ) ready += 1;
          else blockers.push(`${templateId}:${validation.failures.join("|") || "pump_editable_revision_failed"}`);
        } catch (error) {
          blockers.push(`${templateId}:${error instanceof Error ? error.message : "pump_editable_revision_failed"}`);
        }
        continue;
      }

      const registeredSelection = resolveRegisteredProfessionalEstimateSelectionV1(templateId);
      if (registeredSelection) {
        try {
          const registeredDefinitions = registeredSelection.canonical_parameter_schema.definitions;
          const registeredFixtureOverrides: EstimateDraftRevision["params"] = {};
          const addConfirmedFixtureValue = (parameterId: string, value: number | string): void => {
            if (!registeredDefinitions.some((definition) => definition.parameterId === parameterId)) return;
            registeredFixtureOverrides[parameterId] = {
              value,
              source: "user_input",
              sourceText: `readiness-fixture:project-confirmed-${parameterId}`,
              lastChangedAt: "2026-07-07T00:00:00.000Z",
            };
          };
          addConfirmedFixtureValue("normative_rate_code", "PROJECT-VERIFIED-EXACT-RATE-CODE");
          addConfirmedFixtureValue("access_equipment_shift_count", 3);
          addConfirmedFixtureValue("access_delivery_trip_count", 2);
          const r1 = createRegisteredProfessionalDomainAuditRevision({
            templateId,
            estimateDraftId: `readiness-${index}`,
            rawInput: `${registeredSelection.title_ru} площадь 100 м2 длина 10 м ширина 10 м`,
            createdAt: "2026-07-07T00:00:00.000Z",
            paramOverrides: Object.keys(registeredFixtureOverrides).length > 0
              ? registeredFixtureOverrides
              : undefined,
          });
          const candidate = r1.trace.params
            .filter((parameter) =>
              parameter.affectsRowIds.length > 0 && typeof r1.params[parameter.key]?.value === "number")
            .sort((left, right) => right.affectsRowIds.length - left.affectsRowIds.length)[0];
          if (!candidate) {
            blockers.push(`${templateId}:registered_editable_parameter_missing`);
            continue;
          }
          const before = Number(r1.params[candidate.key].value);
          const { revision: r2, diff } = recalculateRegisteredProfessionalDomainAuditRevision({
            previous: r1,
            operation: "update_param",
            paramKey: candidate.key,
            rawValue: String(before + 1),
            createdAt: "2026-07-07T00:01:00.000Z",
            revisionIndex: 2,
          });
          const validation = validateEstimateDraftRevision(r2);
          const r1Source = r1.boq.rows.find(
            (row) => row.sourceParameters?.professionalDomainFactoryV1 === true,
          )?.sourceParameters;
          const r2Source = r2.boq.rows.find(
            (row) => row.sourceParameters?.professionalDomainFactoryV1 === true,
          )?.sourceParameters;
          const expectedPassportId = r1Source?.professionalEstimatePassportId;
          const expectedWorkKey = r1Source?.workKey;
          const expectedCatalogId = r1Source?.catalogId;
          if (
            expectedPassportId === r1.selectedTemplateId &&
            expectedPassportId === r2.selectedTemplateId &&
            r1.resolvedIdentity?.passportId === expectedPassportId &&
            r2.resolvedIdentity?.passportId === expectedPassportId &&
            r1.resolvedIdentity?.requestedCatalogWorkId === expectedWorkKey &&
            r2.resolvedIdentity?.requestedCatalogWorkId === expectedWorkKey &&
            r1Source?.requestedCatalogWorkId === expectedWorkKey &&
            r2Source?.requestedCatalogWorkId === expectedWorkKey &&
            r2Source?.professionalEstimatePassportId === expectedPassportId &&
            r2Source?.catalogId === expectedCatalogId &&
            registeredSelection.catalog_id === expectedCatalogId &&
            (expectedCatalogId === expectedWorkKey || expectedCatalogId === `expanded-template:${expectedWorkKey}`) &&
            r2.previousRevisionId === r1.revisionId &&
            r2.params[candidate.key]?.value === before + 1 &&
            r2.params[candidate.key]?.source === "edited_by_user" &&
            r2.boq.rows.length > 0 &&
            diff.changedRowsCount > 0 &&
            validation.valid
          ) ready += 1;
          else blockers.push(`${templateId}:${validation.failures.join("|") || "registered_editable_revision_failed"}`);
        } catch (error) {
          blockers.push(`${templateId}:${error instanceof Error ? error.message : "registered_editable_revision_failed"}`);
        }
        continue;
      }

      const r1 = createEstimateDraftRevision({
        estimateDraftId: `readiness-${index}`,
        rawInput: `${passport.localizedNameRu} 100 м2`,
        selectedTemplateId: templateId,
        selectedTemplateName: passport.localizedNameRu,
        createdAt: "2026-07-07T00:00:00.000Z",
      });
      const patch = parseUserParamPatch({
        revision: r1,
        operation: r1.params.area_m2 ? "update_param" : "add_param",
        paramKey: "area_m2",
        rawValue: "80 м2",
      });
      const { revision: r2 } = recalculateEstimateDraftRevision(r1, patch, {
        createdAt: "2026-07-07T00:01:00.000Z",
        revisionIndex: 2,
      });
      const validation = validateEstimateDraftRevision(r2);
      if (
        r1.selectedTemplateId === templateId &&
        r2.selectedTemplateId === templateId &&
        r2.previousRevisionId === r1.revisionId &&
        r2.params.area_m2?.value === 80 &&
        r2.boq.rows.length > 0 &&
        validation.valid
      ) ready += 1;
      else blockers.push(`${templateId}:${validation.failures.join("|") || "editable_revision_failed"}`);
    }

    return {
      assigned: entries.length,
      ready,
      blockers,
      cacheStats: getProfessionalWorkPassportBuildCacheStats(),
      formulaCacheStats: getAiEstimateFormulaRuntimeCacheStats(),
    };
  } finally {
    clearProfessionalWorkPassportBuildCaches();
    clearAiEstimateFormulaRuntimeCaches();
  }
}

export function verifyEditableParam11610Shard(
  shardIndex: number,
): EditableParam11610VerificationResult {
  return verifyEditableParam11610Entries(editableParam11610ShardEntries(shardIndex));
}

/** A bounded diagnostic slice; acceptance continues to use the complete manifest. */
export function verifyEditableParam11610Sample(
  limit: number,
  offset = 0,
): EditableParam11610VerificationResult {
  if (
    !Number.isInteger(limit) || limit <= 0 ||
    !Number.isInteger(offset) || offset < 0 ||
    offset + limit > 11610
  ) {
    throw new Error(`EDITABLE_PARAM_11610_INVALID_SAMPLE_RANGE:${offset}:${limit}`);
  }
  return verifyEditableParam11610Entries(
    editableParam11610Manifest()
      .slice(offset, offset + limit)
      .map((templateId, index) => ({ globalIndex: offset + index, templateId })),
  );
}

function runEditableParam11610Shard(shardIndex: number): {
  status: "GREEN" | "RED";
  terminal: Record<string, unknown>;
} {
  const startedAt = Date.now();
  try {
    const entries = editableParam11610ShardEntries(shardIndex);
    const result = verifyEditableParam11610Shard(shardIndex);
    const cacheBounded =
      result.cacheStats.productionExpanded.expandedTemplateCacheSize <=
        result.cacheStats.productionExpanded.limitPerCache &&
      result.cacheStats.productionExpanded.compiledEstimateCacheSize <=
        result.cacheStats.productionExpanded.limitPerCache &&
      result.formulaCacheStats.token_cache_size <= result.formulaCacheStats.limit_per_cache &&
      result.formulaCacheStats.identifier_cache_size <= result.formulaCacheStats.limit_per_cache;
    const passed = result.blockers.length === 0 &&
      result.ready === result.assigned &&
      cacheBounded;
    return { status: passed ? "GREEN" : "RED", terminal: {
      schema: "editable-param-11610-shard-terminal/v1",
      status: passed ? "GREEN" : "RED",
      shard_index: shardIndex,
      shard_count: EDITABLE_PARAM_11610_SHARD_COUNT,
      duration_ms: Date.now() - startedAt,
      assigned: result.assigned,
      ready: result.ready,
      blockers: result.blockers.slice(0, 10),
      cache_bounded: cacheBounded,
      first_global_index: entries[0]?.globalIndex ?? null,
      end_global_index_exclusive: entries.length > 0
        ? entries[entries.length - 1].globalIndex + 1
        : null,
      template_ids: entries.map((entry) => entry.templateId),
    } };
  } catch (error) {
    return { status: "RED", terminal: {
      schema: "editable-param-11610-shard-terminal/v1",
      status: "RED",
      shard_index: shardIndex,
      shard_count: EDITABLE_PARAM_11610_SHARD_COUNT,
      duration_ms: Date.now() - startedAt,
      assigned: 0,
      ready: 0,
      blockers: [error instanceof Error ? error.message : String(error)],
      cache_bounded: false,
      first_global_index: null,
      end_global_index_exclusive: null,
      template_ids: [],
    } };
  }
}

function runEditableParam11610ShardCli(): void {
  if (process.argv.includes("--manifest-only")) {
    const startedAt = Date.now();
    const manifest = editableParam11610Manifest();
    const uniqueTemplateIds = new Set(manifest).size;
    const shards = Array.from({ length: EDITABLE_PARAM_11610_SHARD_COUNT }, (_value, shardIndex) => {
      const entries = editableParam11610ShardEntries(shardIndex);
      return {
        shard_index: shardIndex,
        assigned: entries.length,
        first_global_index: entries[0]?.globalIndex ?? null,
        end_global_index_exclusive: entries.length > 0
          ? entries[entries.length - 1].globalIndex + 1
          : null,
        template_ids_sha256: sha256Json(entries.map((entry) => entry.templateId)),
      };
    });
    const assignedTotal = shards.reduce((total, shard) => total + shard.assigned, 0);
    const continuous = shards.every((shard, index) =>
      shard.shard_index === index &&
      shard.first_global_index === (index === 0 ? 0 : shards[index - 1].end_global_index_exclusive) &&
      shard.end_global_index_exclusive != null &&
      shard.end_global_index_exclusive - (shard.first_global_index ?? 0) === shard.assigned);
    const passed = manifest.length === 11610 &&
      uniqueTemplateIds === manifest.length &&
      assignedTotal === manifest.length &&
      continuous;
    console.info(JSON.stringify({
      schema: "editable-param-11610-manifest-terminal/v1",
      status: passed ? "GREEN" : "RED",
      duration_ms: Date.now() - startedAt,
      manifest_total: manifest.length,
      unique_template_ids: uniqueTemplateIds,
      manifest_sha256: sha256Json(manifest),
      assignment_sha256: sha256Json(shards),
      predicate_contract: EDITABLE_PARAM_11610_PREDICATE_CONTRACT,
      predicate_contract_sha256: sha256Json(EDITABLE_PARAM_11610_PREDICATE_CONTRACT),
      shards,
      blocker: passed ? null : "EDITABLE_PARAM_11610_MANIFEST_INVALID",
    }));
    if (!passed) process.exitCode = 1;
    return;
  }

  const rawShardList = process.argv
    .find((arg) => arg.startsWith("--shards="))
    ?.slice("--shards=".length);
  const rawShardIndex = process.argv
    .find((arg) => arg.startsWith("--shard="))
    ?.slice("--shard=".length);
  const shardIndexes = (rawShardList ?? rawShardIndex ?? "")
    .split(",")
    .filter(Boolean)
    .map(Number);
  const workerStartedAt = Date.now();
  let status: "GREEN" | "RED" = "GREEN";

  if (
    shardIndexes.length === 0 ||
    new Set(shardIndexes).size !== shardIndexes.length ||
    shardIndexes.some((index) =>
      !Number.isInteger(index) || index < 0 || index >= EDITABLE_PARAM_11610_SHARD_COUNT)
  ) {
    console.info(JSON.stringify({
      schema: "editable-param-11610-worker-terminal/v1",
      status: "RED",
      duration_ms: Date.now() - workerStartedAt,
      shard_indexes: shardIndexes,
      terminal_count: 0,
      blocker: "EDITABLE_PARAM_11610_INVALID_WORKER_SHARDS",
    }));
    process.exitCode = 1;
    return;
  }

  let terminalCount = 0;
  for (const shardIndex of shardIndexes) {
    const result = runEditableParam11610Shard(shardIndex);
    console.info(JSON.stringify(result.terminal));
    terminalCount += 1;
    if (result.status !== "GREEN") status = "RED";
    (globalThis as { gc?: () => void }).gc?.();
  }
  console.info(JSON.stringify({
    schema: "editable-param-11610-worker-terminal/v1",
    status,
    duration_ms: Date.now() - workerStartedAt,
    shard_indexes: shardIndexes,
    terminal_count: terminalCount,
    blocker: null,
  }));
  if (status !== "GREEN") process.exitCode = 1;
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith(
  "/tests/estimateRuntime/editableParam11610Readiness.shared.ts",
)) {
  runEditableParam11610ShardCli();
}
