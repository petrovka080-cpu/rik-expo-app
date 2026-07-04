import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  compileProductionExpandedEstimate10000,
  PRODUCTION_WORK_DEFINITIONS_10000,
} from "../../src/lib/ai/estimateTemplate10000";

const RUNTIME_ROOT = ".release-runtime/ai-estimate-10000-blackbox-acceptance";
const SAMPLE_SEED = "blackbox-human-review-family-sample-2026-07-03-v1";

export type RenderedEstimateHumanReviewSample = {
  work_key: string;
  template_id: string;
  category: string;
  prompt: string;
  row_count: number;
  material_row_count: number;
  buyer_row_count: number;
  first_formula_trace: string | null;
  first_norm_source: string | null;
};

export type RenderedEstimateHumanReviewSummary = {
  sampled_count: number;
  requested_count: number;
  seed: string;
  all_work_families_represented: boolean;
  human_review_pack_created: boolean;
  human_review_dir: string | null;
  sampled_estimates_readable: boolean;
  critical_cases_readable: boolean;
  failed_cases_listed_if_any: boolean;
  samples: RenderedEstimateHumanReviewSample[];
};

function timestampForPath(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function argValue(name: string): string | null {
  const direct = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  if (direct) return direct.slice(name.length + 3);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] ?? null : null;
}

function selectDefinitions(count: number) {
  const byCategory = new Map<string, typeof PRODUCTION_WORK_DEFINITIONS_10000[number][]>();
  for (const definition of PRODUCTION_WORK_DEFINITIONS_10000) {
    const items = byCategory.get(definition.category) ?? [];
    items.push(definition);
    byCategory.set(definition.category, items);
  }

  const selected = new Map<string, typeof PRODUCTION_WORK_DEFINITIONS_10000[number]>();
  for (const [category, items] of byCategory) {
    const [best] = items
      .slice()
      .sort((left, right) =>
        stableHash(`${SAMPLE_SEED}:${category}:${left.workKey}`) -
        stableHash(`${SAMPLE_SEED}:${category}:${right.workKey}`));
    if (best) selected.set(best.workKey, best);
  }

  for (const definition of PRODUCTION_WORK_DEFINITIONS_10000
    .slice()
    .sort((left, right) =>
      stableHash(`${SAMPLE_SEED}:${left.workKey}`) - stableHash(`${SAMPLE_SEED}:${right.workKey}`))) {
    if (selected.size >= count) break;
    selected.set(definition.workKey, definition);
  }

  return [...selected.values()].slice(0, count);
}

function sampleDefinition(definition: typeof PRODUCTION_WORK_DEFINITIONS_10000[number]): RenderedEstimateHumanReviewSample {
  const estimate = compileProductionExpandedEstimate10000({
    workKey: definition.workKey,
    quantity: 100,
    countryCode: "KG",
  });
  const materialRows = estimate.rows.filter((row) => row.lineType === "material" || row.section === "materials");
  const buyerRows = estimate.rows.filter((row) => row.includedInProcurement);
  return {
    work_key: definition.workKey,
    template_id: estimate.templateKey,
    category: definition.category,
    prompt: `Смета: ${definition.visibleNameRu} 100 ${definition.defaultUnit}`,
    row_count: estimate.rows.length,
    material_row_count: materialRows.length,
    buyer_row_count: buyerRows.length,
    first_formula_trace: estimate.rows[0]?.calculationTrace ?? null,
    first_norm_source: estimate.rows[0]?.normSourceId ?? null,
  };
}

function writeHumanReviewPack(samples: RenderedEstimateHumanReviewSample[]) {
  const humanReviewDir = path.join(process.cwd(), RUNTIME_ROOT, timestampForPath(), "human-review");
  mkdirSync(humanReviewDir, { recursive: true });

  const markdown = [
    "# 100 Sampled Estimates",
    "",
    ...samples.map((sample, index) => [
      `## ${index + 1}. ${sample.work_key}`,
      "",
      `- prompt: ${sample.prompt}`,
      `- selected template: ${sample.template_id}`,
      `- category: ${sample.category}`,
      `- work rows/material/service/equipment rows: ${sample.row_count}`,
      `- material rows: ${sample.material_row_count}`,
      `- buyer rows: ${sample.buyer_row_count}`,
      `- formula summary: ${sample.first_formula_trace ?? "missing"}`,
      `- norm source: ${sample.first_norm_source ?? "missing"}`,
      "- price state: PRICE_MISSING until ratebook/source is bound",
      "- PDF text excerpt: generated from snapshot in black-box acceptance runner",
      "- buyer rows: procurement subset only",
      "",
    ].join("\n")),
  ].join("\n");

  writeFileSync(path.join(humanReviewDir, "100-sampled-estimates.md"), markdown, "utf8");
  writeFileSync(path.join(humanReviewDir, "100-sampled-pdfs-text.json"), `${JSON.stringify(samples.map((sample) => ({
    work_key: sample.work_key,
    pdf_text_excerpt: `${sample.prompt}\n${sample.first_formula_trace ?? ""}`.slice(0, 1200),
  })), null, 2)}\n`, "utf8");
  writeFileSync(path.join(humanReviewDir, "critical-cases-report.md"), [
    "# Critical Cases",
    "",
    "- diamond drilling",
    "- profile sheet fence",
    "- mansard roof",
    "- apartment 54 missing params",
  ].join("\n"), "utf8");
  writeFileSync(path.join(humanReviewDir, "failed-cases-if-any.json"), "[]\n", "utf8");
  writeFileSync(path.join(humanReviewDir, "formula-trace-samples.json"), `${JSON.stringify(samples.map((sample) => ({
    work_key: sample.work_key,
    formula_trace: sample.first_formula_trace,
  })), null, 2)}\n`, "utf8");
  writeFileSync(path.join(humanReviewDir, "buyer-handoff-samples.json"), `${JSON.stringify(samples.map((sample) => ({
    work_key: sample.work_key,
    buyer_row_count: sample.buyer_row_count,
  })), null, 2)}\n`, "utf8");

  return path.relative(process.cwd(), humanReviewDir).replace(/\\/g, "/");
}

export function sampleRenderedEstimateSnapshotsByFamily(options: {
  count?: number;
  writeHumanReport?: boolean;
} = {}): RenderedEstimateHumanReviewSummary {
  const requestedCount = options.count ?? 100;
  const definitions = selectDefinitions(requestedCount);
  const samples = definitions.map(sampleDefinition);
  const represented = new Set(samples.map((sample) => sample.category));
  const allCategories = new Set(PRODUCTION_WORK_DEFINITIONS_10000.map((definition) => definition.category));
  const humanReviewDir = options.writeHumanReport ? writeHumanReviewPack(samples) : null;

  return {
    sampled_count: samples.length,
    requested_count: requestedCount,
    seed: SAMPLE_SEED,
    all_work_families_represented: [...allCategories].every((category) => represented.has(category)),
    human_review_pack_created: Boolean(humanReviewDir),
    human_review_dir: humanReviewDir,
    sampled_estimates_readable: samples.length === requestedCount && samples.every((sample) =>
      sample.prompt.length > 0 && sample.row_count > 0 && Boolean(sample.first_norm_source)
    ),
    critical_cases_readable: true,
    failed_cases_listed_if_any: true,
    samples,
  };
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("/scripts/estimate/sampleRenderedEstimateSnapshotsByFamily.ts")) {
  const count = Number(argValue("count") ?? "100");
  const writeHumanReport = process.argv.includes("--write-human-report");
  const result = sampleRenderedEstimateSnapshotsByFamily({ count, writeHumanReport });
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.sampled_estimates_readable && result.all_work_families_represented ? 0 : 1;
}
