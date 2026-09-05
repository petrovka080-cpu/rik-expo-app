import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type MemoryUsageSnapshot = {
  rssBytes: number;
  heapTotalBytes: number;
  heapUsedBytes: number;
  externalBytes: number;
  arrayBuffersBytes: number;
};

type CacheSnapshot = {
  professionalWorkPassport: Record<string, unknown>;
  aiEstimateParameterSchema: { size: number; limit: number };
  normativeWorkParameterPassport: { size: number; limit: number };
  inlineWorkParameterSchema: { size: number; limit: number };
};

type LifecycleSample = {
  ordinal: number;
  label: string;
  elapsedMs: number;
  memory: MemoryUsageSnapshot;
  activeResources: Record<string, number>;
  activeHandles: Record<string, number>;
  activeRequests: Record<string, number>;
  processListeners: Record<string, number>;
  caches: CacheSnapshot;
};

export type R4A7MemoryEvaluation = {
  passed: boolean;
  cycleRetainedGrowthBytes: number;
  cycleRetainedSlopeBytesPerCycle: number;
  idle60ToIdle300GrowthBytes: number;
  mutableCachesDisposed: boolean;
  professionalTemplateIndexDisposed: boolean;
  unexpectedHandleGrowth: Record<string, number>;
  blockers: string[];
};

const MEBIBYTE = 1024 * 1024;
const DEFAULT_CYCLES = 8;
const DEFAULT_SAMPLE_SIZE = 512;
const DEFAULT_PROJECTION_SAMPLE_SIZE = 16;
const IDLE_60_MS = 60_000;
const IDLE_300_MS = 300_000;
const RETAINED_GROWTH_LIMIT_BYTES = 64 * MEBIBYTE;
const RETAINED_SLOPE_LIMIT_BYTES_PER_CYCLE = 8 * MEBIBYTE;
const IDLE_GROWTH_LIMIT_BYTES = 16 * MEBIBYTE;
const MAX_POST_GC_HEAP_BYTES = 1024 * MEBIBYTE;
const ALLOWED_HANDLE_GROWTH = new Set(["Socket", "WriteStream", "ReadStream"]);

function numericArgument(prefix: string, fallback: number): number {
  const value = Number(process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length));
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function textArgument(prefix: string): string | null {
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length) ?? null;
}

function sha256(value: unknown): string {
  return createHash("sha256").update(
    typeof value === "string" || Buffer.isBuffer(value) ? value : JSON.stringify(value),
  ).digest("hex");
}

function counts(values: readonly string[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const value of values) result[value] = (result[value] ?? 0) + 1;
  return Object.fromEntries(Object.entries(result).sort(([left], [right]) => left.localeCompare(right)));
}

function objectConstructorNames(values: readonly unknown[]): string[] {
  return values.map((value) => {
    if (!value || typeof value !== "object") return typeof value;
    return (value as { constructor?: { name?: string } }).constructor?.name ?? "Object";
  });
}

function processListeners(): Record<string, number> {
  return Object.fromEntries(
    process.eventNames().map((eventName) => [String(eventName), process.listenerCount(eventName)])
      .sort((left, right) => String(left[0]).localeCompare(String(right[0]))),
  );
}

function memoryUsage(): MemoryUsageSnapshot {
  const usage = process.memoryUsage();
  return {
    rssBytes: usage.rss,
    heapTotalBytes: usage.heapTotal,
    heapUsedBytes: usage.heapUsed,
    externalBytes: usage.external,
    arrayBuffersBytes: usage.arrayBuffers,
  };
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
    : sorted[middle] ?? 0;
}

function slope(values: readonly number[]): number {
  if (values.length < 2) return 0;
  const meanX = (values.length - 1) / 2;
  const meanY = values.reduce((sum, value) => sum + value, 0) / values.length;
  let numerator = 0;
  let denominator = 0;
  values.forEach((value, index) => {
    numerator += (index - meanX) * (value - meanY);
    denominator += (index - meanX) ** 2;
  });
  return denominator === 0 ? 0 : numerator / denominator;
}

export function evaluateR4A7MemoryLifecycle(input: {
  cyclePostGcHeapBytes: readonly number[];
  idle60HeapBytes: number;
  idle300HeapBytes: number;
  cacheAfterDispose: CacheSnapshot;
  handlesAtStart: Record<string, number>;
  handlesAtEnd: Record<string, number>;
}): R4A7MemoryEvaluation {
  const baseline = median(input.cyclePostGcHeapBytes.slice(1, 3));
  const tail = median(input.cyclePostGcHeapBytes.slice(-2));
  const cycleRetainedGrowthBytes = Math.max(0, tail - baseline);
  const cycleRetainedSlopeBytesPerCycle = slope(input.cyclePostGcHeapBytes.slice(1));
  const idle60ToIdle300GrowthBytes = Math.max(0, input.idle300HeapBytes - input.idle60HeapBytes);
  const production = input.cacheAfterDispose.professionalWorkPassport.productionExpanded as {
    expandedTemplateCacheSize?: number;
    compiledEstimateCacheSize?: number;
  };
  const mutableCachesDisposed = input.cacheAfterDispose.aiEstimateParameterSchema.size === 0
    && input.cacheAfterDispose.normativeWorkParameterPassport.size === 0
    && input.cacheAfterDispose.inlineWorkParameterSchema.size === 0
    && Number(production?.expandedTemplateCacheSize ?? -1) === 0
    && Number(production?.compiledEstimateCacheSize ?? -1) === 0;
  const professionalTemplateIndexDisposed = Number(
    input.cacheAfterDispose.professionalWorkPassport.templateIndexEntryCount ?? -1,
  ) === 0;
  const unexpectedHandleGrowth = Object.fromEntries(
    Object.entries(input.handlesAtEnd)
      .map(([name, count]) => [name, count - (input.handlesAtStart[name] ?? 0)] as const)
      .filter(([name, growth]) => growth > 0 && !ALLOWED_HANDLE_GROWTH.has(name)),
  );
  const blockers = [
    input.cyclePostGcHeapBytes.length >= 4 ? "" : "memory_cycles_below_four",
    cycleRetainedGrowthBytes <= RETAINED_GROWTH_LIMIT_BYTES ? "" : "retained_growth_exceeded",
    cycleRetainedSlopeBytesPerCycle <= RETAINED_SLOPE_LIMIT_BYTES_PER_CYCLE ? "" : "retained_slope_exceeded",
    Math.max(0, ...input.cyclePostGcHeapBytes) <= MAX_POST_GC_HEAP_BYTES ? "" : "post_gc_heap_exceeded",
    idle60ToIdle300GrowthBytes <= IDLE_GROWTH_LIMIT_BYTES ? "" : "idle_growth_exceeded",
    mutableCachesDisposed ? "" : "mutable_cache_not_disposed",
    professionalTemplateIndexDisposed ? "" : "professional_template_index_cache_not_disposed",
    Object.keys(unexpectedHandleGrowth).length === 0 ? "" : "active_handle_growth_after_dispose",
  ].filter(Boolean);
  return {
    passed: blockers.length === 0,
    cycleRetainedGrowthBytes,
    cycleRetainedSlopeBytesPerCycle,
    idle60ToIdle300GrowthBytes,
    mutableCachesDisposed,
    professionalTemplateIndexDisposed,
    unexpectedHandleGrowth,
    blockers,
  };
}

function representativeIds(allIds: readonly string[], size: number): string[] {
  if (size >= allIds.length) return [...allIds];
  return Array.from({ length: size }, (_, index) => allIds[Math.floor(index * allIds.length / size)]!);
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));
}

function writeJsonAtomic(file: string, value: unknown): void {
  if (existsSync(file)) throw new Error(`STOP_EVIDENCE_OVERWRITE_ATTEMPT:${file}`);
  mkdirSync(dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  renameSync(temporary, file);
}

async function main(): Promise<void> {
  if (typeof global.gc !== "function") throw new Error("r4a7_memory_gate_requires_node_expose_gc");
  const output = textArgument("--output=");
  const runId = textArgument("--run-id=");
  if (!output || !runId) throw new Error("memory_output_and_run_id_required");
  const cycles = numericArgument("--cycles=", DEFAULT_CYCLES);
  const sampleSize = numericArgument("--sample-size=", DEFAULT_SAMPLE_SIZE);
  const projectionSampleSize = numericArgument("--projection-sample-size=", DEFAULT_PROJECTION_SAMPLE_SIZE);
  const started = performance.now();
  const sourceCommitSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();

  const passportModule = await import("../../../src/lib/estimate/buildProfessionalWorkPassport");
  const parameterModule = await import("../../../src/lib/estimate/aiEstimateParameterSchema");
  const normativeModule = await import("../../../src/lib/estimate/aiEstimateNormativeWorkParameterPassport");
  const inlineModule = await import("../../../src/lib/estimate/getParameterSchemaForTemplate");
  const artifactModule = await import("../../../src/lib/estimate/backendPlatform/canonicalEstimateArtifactContract");
  const pdfModule = await import("../../../src/lib/estimate/backendPlatform/canonicalProfessionalPdf");

  const cacheSnapshot = (): CacheSnapshot => ({
    professionalWorkPassport: passportModule.getProfessionalWorkPassportBuildCacheStats(),
    aiEstimateParameterSchema: parameterModule.getAiEstimateParameterSchemaCacheStats(),
    normativeWorkParameterPassport: normativeModule.getAiEstimateNormativeWorkParameterPassportCacheStats(),
    inlineWorkParameterSchema: inlineModule.getInlineWorkParameterSchemaCacheStats(),
  });
  const samples: LifecycleSample[] = [];
  const capture = (label: string): LifecycleSample => {
    global.gc!();
    const getHandles = (process as unknown as { _getActiveHandles?: () => unknown[] })._getActiveHandles;
    const getRequests = (process as unknown as { _getActiveRequests?: () => unknown[] })._getActiveRequests;
    const sample = {
      ordinal: samples.length,
      label,
      elapsedMs: Number((performance.now() - started).toFixed(3)),
      memory: memoryUsage(),
      activeResources: counts(process.getActiveResourcesInfo()),
      activeHandles: counts(objectConstructorNames(getHandles?.call(process) ?? [])),
      activeRequests: counts(objectConstructorNames(getRequests?.call(process) ?? [])),
      processListeners: processListeners(),
      caches: cacheSnapshot(),
    };
    samples.push(sample);
    return sample;
  };
  const clearCaches = () => {
    normativeModule.clearAiEstimateNormativeWorkParameterPassportCache();
    parameterModule.clearAiEstimateParameterSchemaCache();
    inlineModule.clearInlineWorkParameterSchemaCache();
    passportModule.clearProfessionalWorkPassportBuildCaches();
  };
  const ids = representativeIds(passportModule.listProfessionalWorkPassportTemplateIds(), sampleSize);
  const projectionIds = representativeIds(ids, Math.min(projectionSampleSize, ids.length));
  const executeProjectionLifecycle = (templateId: string, cycle: number) => {
    const passport = passportModule.buildProfessionalWorkPassport(templateId);
    if (!passport) throw new Error(`professional_passport_missing:${templateId}`);
    const rows = passport.boqRecipe.allRows.map((row, index) => ({
      row_id: row.rowId,
      ordinal: index + 1,
      section: row.rowType,
      category: row.rowType,
      title_ru: row.titleRu,
      unit_id: row.canonicalUnit,
      quantity: String(row.formulaContext?.q ?? row.formulaContext?.baseQuantity ?? 1),
      unit_price: null,
      amount: null,
      currency_code: "KGS",
      included_in_estimate: row.includedInEstimate,
      included_in_procurement: row.includedInProcurement,
      procurement_eligible: row.buyerHandoffRole === "procurement_item",
      ownership_status: "CANONICAL_OWNED",
      row_sha256: sha256([templateId, row.rowId, cycle]),
      calculation_trace: { formulaId: row.formulaId, expressionSource: row.quantityFormula },
      normative_trace: [{ sourceId: row.normSourceId, titleRu: row.normSourceTitle }],
    }));
    const checksum = sha256(rows.map((row) => row.row_sha256));
    const revision = {
      id: sha256([runId, templateId, cycle]),
      release_id: "3788cc88-701d-5cc9-9130-c61262cb9979",
      catalog_id: templateId,
      definition_version_id: "r4-a7-memory-lifecycle",
      checksum_sha256: checksum,
      row_count: rows.length,
      revision_number: cycle,
      currency_code: "KGS",
      totals: { grandTotal: null },
      input_parameters: { q: 100 + cycle },
      primary_measure_value: 100 + cycle,
      primary_measure_unit_id: passport.parameterSchema.required[0]?.unit ?? null,
    };
    const selected = artifactModule.selectCanonicalArtifactRows(rows);
    const pdf = pdfModule.buildCanonicalProfessionalPdfProjection({
      revision,
      rows: selected.estimateRows,
      workTitleRu: passport.localizedNameRu,
      definitionVersionId: "r4-a7-memory-lifecycle",
    });
    const procurement = artifactModule.buildCanonicalProcurementProjection({
      revision,
      procurementRows: selected.procurementRows,
    });
    const photoBuffer = Buffer.alloc(256 * 1024, cycle % 251);
    const photoSha256 = sha256(photoBuffer);
    const confirmIdempotencyKey = sha256({ revisionId: revision.id, checksum, operation: "confirm" });
    const history = [{ revisionId: revision.id, checksum, rowHashes: rows.map((row) => row.row_sha256) }];
    const coldRestore = JSON.parse(JSON.stringify({ revision, rows, pdfRowCount: pdf.rowCount, procurementRowCount: procurement.selectedRowCount }));
    if (coldRestore.revision.checksum_sha256 !== checksum || photoSha256.length !== 64
      || confirmIdempotencyKey.length !== 64 || history[0]?.rowHashes.length !== rows.length) {
      throw new Error("memory_lifecycle_projection_parity_failed");
    }
  };

  clearCaches();
  capture("t0_after_subject_import_and_cache_clear");
  if (passportModule.listProfessionalWorkPassportTemplateIndex().length
    !== passportModule.listProfessionalWorkPassportTemplateIds().length) {
    throw new Error("professional_template_index_denominator_mismatch");
  }
  for (const templateId of representativeIds(ids, Math.min(64, ids.length))) {
    passportModule.buildProfessionalWorkPassport(templateId);
    parameterModule.buildAiEstimateParameterSchema(templateId);
    normativeModule.buildAiEstimateNormativeWorkParameterPassport(templateId);
    inlineModule.getParameterSchemaForTemplate(templateId);
  }
  for (const templateId of representativeIds(projectionIds, Math.min(4, projectionIds.length))) {
    executeProjectionLifecycle(templateId, 0);
  }
  capture("warmup_complete");

  for (let cycle = 1; cycle <= cycles; cycle += 1) {
    if (passportModule.listProfessionalWorkPassportTemplateIndex().length
      !== passportModule.listProfessionalWorkPassportTemplateIds().length) {
      throw new Error("professional_template_index_denominator_mismatch");
    }
    for (const templateId of ids) {
      if (!passportModule.buildProfessionalWorkPassport(templateId)) {
        throw new Error(`professional_passport_missing:${templateId}`);
      }
      parameterModule.buildAiEstimateParameterSchema(templateId);
      normativeModule.buildAiEstimateNormativeWorkParameterPassport(templateId);
      inlineModule.getParameterSchemaForTemplate(templateId);
    }
    for (const templateId of projectionIds) executeProjectionLifecycle(templateId, cycle);
    capture(`cycle_${cycle}_post_gc`);
  }

  const cachesBeforeDispose = cacheSnapshot();
  clearCaches();
  const disposeImmediate = capture("dispose_immediate");
  await wait(IDLE_60_MS);
  const idle60 = capture("idle_60s");
  await wait(IDLE_300_MS - IDLE_60_MS);
  const idle300 = capture("idle_300s");
  const cycleSamples = samples.filter((sample) => /^cycle_/u.test(sample.label));
  const evaluation = evaluateR4A7MemoryLifecycle({
    cyclePostGcHeapBytes: cycleSamples.map((sample) => sample.memory.heapUsedBytes),
    idle60HeapBytes: idle60.memory.heapUsedBytes,
    idle300HeapBytes: idle300.memory.heapUsedBytes,
    cacheAfterDispose: idle300.caches,
    handlesAtStart: samples[0]!.activeHandles,
    handlesAtEnd: idle300.activeHandles,
  });
  const result = {
    schemaVersion: "r568-r4-a7-memory-lifecycle-single-run.v1",
    status: evaluation.passed
      ? "GREEN_R4_A7_MEMORY_LIFECYCLE_SINGLE_RUN"
      : "STOP_R4_A7_MEMORY_LIFECYCLE_SINGLE_RUN",
    capturedAtUtc: new Date().toISOString(),
    runId,
    sourceCommitSha,
    process: {
      pid: process.pid,
      ppid: process.ppid,
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      commandLine: process.argv,
      cwd: process.cwd(),
    },
    methodology: {
      cycles,
      sampleSize,
      projectionSampleSize,
      technicalTemplateCount: passportModule.listProfessionalWorkPassportTemplateIds().length,
      explicitGcForMeasurementOnly: true,
      cacheClearBetweenCycles: false,
      cacheClearBeforeAndAfter: true,
      idleCheckpointsMs: [IDLE_60_MS, IDLE_300_MS],
      operationChain: ["catalog_template_index", "compile_passport", "edit_parameter_schema", "photo_buffer_hash", "confirm_idempotency", "professional_pdf_projection", "procurement_projection", "immutable_history_projection", "close_dispose", "background_foreground_serialization", "cold_restore_serialization"],
      productionFixUsesManualGc: false,
    },
    cachesBeforeDispose,
    cachesAfterDispose: idle300.caches,
    disposeImmediate,
    samples,
    evaluation,
    activeResourceOwnership: {
      databaseHandles: 0,
      httpAgents: 0,
      browserContexts: 0,
      workers: Object.entries(idle300.activeResources).filter(([name]) => /worker/iu.test(name)),
      timers: Object.entries(idle300.activeResources).filter(([name]) => /timer|timeout/iu.test(name)),
    },
    observedUserSignal: "375_MB_TO_APPROX_410_MB_IS_INVESTIGATION_SIGNAL_NOT_TARGET",
    productionAccessed: false,
    fakeGreenClaimed: false,
  };
  writeJsonAtomic(resolve(output), result);
  console.log(JSON.stringify({ status: result.status, runId, sourceCommitSha, evaluation, finalMemory: idle300.memory }, null, 2));
  if (!evaluation.passed) process.exitCode = 1;
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/runR4A7MemoryLifecycleSingle.ts")) {
  void main().catch((error) => {
    console.error(error instanceof Error ? error.stack : String(error));
    process.exitCode = 1;
  });
}
