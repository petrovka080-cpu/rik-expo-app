import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  buildProfessionalWorkPassport,
  clearProfessionalWorkPassportBuildCaches,
  listProfessionalWorkPassportTemplateIds,
} from "../../src/lib/estimate/buildProfessionalWorkPassport";
import {
  buildAiEstimateParameterSchema,
  clearAiEstimateParameterSchemaCache,
} from "../../src/lib/estimate/aiEstimateParameterSchema";
import {
  buildAiEstimateNormativeWorkParameterPassport,
  clearAiEstimateNormativeWorkParameterPassportCache,
} from "../../src/lib/estimate/aiEstimateNormativeWorkParameterPassport";
import { clearInlineWorkParameterSchemaCache, getParameterSchemaForTemplate } from "../../src/lib/estimate/getParameterSchemaForTemplate";

type MemoryCycle = {
  cycle: number;
  passports_built: number;
  heap_used_before_gc_bytes: number;
  heap_used_after_gc_bytes: number;
  rss_bytes: number;
};

export type EstimatorMemoryLifecycleEvaluation = {
  retained_growth_bytes: number;
  retained_growth_limit_bytes: number;
  retained_growth_ratio: number;
  max_post_gc_heap_bytes: number;
  max_post_gc_heap_limit_bytes: number;
  passed: boolean;
  blockers: string[];
};

const MEBIBYTE = 1024 * 1024;
const DEFAULT_CYCLES = 8;
const DEFAULT_SAMPLE_SIZE = 512;
const MAX_POST_GC_HEAP_BYTES = 1024 * MEBIBYTE;

function numericArg(argv: readonly string[], prefix: string, fallback: number): number {
  const parsed = Number(argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function outputArg(argv: readonly string[]): string | null {
  return argv.find((arg) => arg.startsWith("--output="))?.slice("--output=".length) ?? null;
}

function git(args: string[]): string {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    timeout: 20_000,
  }).trim();
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
    : sorted[middle] ?? 0;
}

export function evaluateEstimatorMemoryLifecycle(
  postGcHeapBytes: readonly number[],
): EstimatorMemoryLifecycleEvaluation {
  if (postGcHeapBytes.length < 4) {
    return {
      retained_growth_bytes: 0,
      retained_growth_limit_bytes: 0,
      retained_growth_ratio: 0,
      max_post_gc_heap_bytes: Math.max(0, ...postGcHeapBytes),
      max_post_gc_heap_limit_bytes: MAX_POST_GC_HEAP_BYTES,
      passed: false,
      blockers: ["memory_cycles_below_four"],
    };
  }
  const baseline = median(postGcHeapBytes.slice(1, 3));
  const tail = median(postGcHeapBytes.slice(-2));
  const retainedGrowth = Math.max(0, tail - baseline);
  const growthLimit = Math.max(64 * MEBIBYTE, baseline * 0.2);
  const retainedGrowthRatio = baseline > 0 ? retainedGrowth / baseline : 0;
  const maxPostGcHeap = Math.max(...postGcHeapBytes);
  const blockers = [
    retainedGrowth <= growthLimit
      ? ""
      : `retained_growth_exceeded:${retainedGrowth}>${growthLimit}`,
    maxPostGcHeap <= MAX_POST_GC_HEAP_BYTES
      ? ""
      : `post_gc_heap_exceeded:${maxPostGcHeap}>${MAX_POST_GC_HEAP_BYTES}`,
  ].filter(Boolean);
  return {
    retained_growth_bytes: retainedGrowth,
    retained_growth_limit_bytes: growthLimit,
    retained_growth_ratio: retainedGrowthRatio,
    max_post_gc_heap_bytes: maxPostGcHeap,
    max_post_gc_heap_limit_bytes: MAX_POST_GC_HEAP_BYTES,
    passed: blockers.length === 0,
    blockers,
  };
}

function representativeTemplateIds(allIds: readonly string[], sampleSize: number): string[] {
  if (sampleSize >= allIds.length) return [...allIds];
  const result: string[] = [];
  for (let index = 0; index < sampleSize; index += 1) {
    const sourceIndex = Math.floor(index * allIds.length / sampleSize);
    result.push(allIds[sourceIndex]);
  }
  return result;
}

function clearEstimatorLifecycleCaches(): void {
  clearAiEstimateNormativeWorkParameterPassportCache();
  clearAiEstimateParameterSchemaCache();
  clearInlineWorkParameterSchemaCache();
  clearProfessionalWorkPassportBuildCaches();
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function main(): void {
  if (typeof global.gc !== "function") {
    throw new Error("estimator_memory_gate_requires_node_expose_gc");
  }
  const argv = process.argv.slice(2);
  const cyclesTotal = numericArg(argv, "--cycles=", DEFAULT_CYCLES);
  const sampleSize = numericArg(argv, "--sample-size=", DEFAULT_SAMPLE_SIZE);
  const allTemplateIds = listProfessionalWorkPassportTemplateIds();
  const sampleTemplateIds = representativeTemplateIds(allTemplateIds, sampleSize);
  const subjectSha = git(["rev-parse", "HEAD"]);
  const outputPath = path.resolve(
    outputArg(argv) ??
    path.join(process.cwd(), ".release-runtime", "estimator-memory-lifecycle", subjectSha, "terminal-summary.json"),
  );
  clearEstimatorLifecycleCaches();
  global.gc();
  const cycles: MemoryCycle[] = [];
  for (let cycle = 0; cycle < cyclesTotal; cycle += 1) {
    let passportsBuilt = 0;
    for (const templateId of sampleTemplateIds) {
      if (!buildProfessionalWorkPassport(templateId)) {
        throw new Error(`professional_passport_missing:${templateId}`);
      }
      buildAiEstimateParameterSchema(templateId);
      buildAiEstimateNormativeWorkParameterPassport(templateId);
      getParameterSchemaForTemplate(templateId);
      passportsBuilt += 1;
    }
    const beforeGc = process.memoryUsage();
    global.gc();
    const afterGc = process.memoryUsage();
    cycles.push({
      cycle: cycle + 1,
      passports_built: passportsBuilt,
      heap_used_before_gc_bytes: beforeGc.heapUsed,
      heap_used_after_gc_bytes: afterGc.heapUsed,
      rss_bytes: afterGc.rss,
    });
  }
  const evaluation = evaluateEstimatorMemoryLifecycle(cycles.map((cycle) => cycle.heap_used_after_gc_bytes));
  const summary = {
    final_status: evaluation.passed
      ? "GREEN_ESTIMATOR_MEMORY_LIFECYCLE_BOUNDED"
      : "STOP_ESTIMATOR_MEMORY_LIFECYCLE_UNBOUNDED",
    subject_sha: subjectSha,
    technical_template_count: allTemplateIds.length,
    representative_templates_per_cycle: sampleTemplateIds.length,
    cycles_total: cycles.length,
    total_passport_builds: cycles.length * sampleTemplateIds.length,
    explicit_gc_enabled: true,
    cache_clear_between_cycles: false,
    cache_clear_before_and_after_gate: true,
    evaluation,
    cycles,
    fake_green_claimed: false,
  };
  clearEstimatorLifecycleCaches();
  writeJson(outputPath, summary);
  console.info(JSON.stringify(summary, null, 2));
  if (!evaluation.passed) process.exitCode = 1;
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/runEstimatorMemoryLifecycleGate.ts")) {
  main();
}
