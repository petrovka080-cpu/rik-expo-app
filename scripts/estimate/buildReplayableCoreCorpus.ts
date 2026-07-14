import { readFileSync } from "node:fs";
import path from "node:path";

export type ReplayableCoreBasePrompt = {
  family: string;
  selectedTemplateId: string;
  prompt: string;
};

export type ReplayableCoreCorpusFile = {
  schema: "ai-estimate-replayable-core-corpus-v1";
  minimumCases: number;
  basePrompts: ReplayableCoreBasePrompt[];
  dimensions: { category: string; count: number }[];
};

export type ReplayableCoreCorpusCase = {
  case_id: string;
  category: string;
  family: string;
  selected_template_id: string;
  prompt: string;
  variant_index: number;
};

const DEFAULT_CORPUS_PATH = path.join("tests", "fixtures", "estimate", "replayableCoreCriticalCases.json");

export function loadReplayableCoreCorpusFile(filePath: string = DEFAULT_CORPUS_PATH): ReplayableCoreCorpusFile {
  return JSON.parse(readFileSync(filePath, "utf8")) as ReplayableCoreCorpusFile;
}

function variantSuffix(category: string, index: number): string {
  const scale = 1 + (index % 9);
  const precision = index % 3 === 0 ? "with explicit material quantity trace" : "with trusted costing trace";
  return `${category} variant ${index + 1}, scale ${scale}, ${precision}`;
}

export function buildReplayableCoreCorpus(file: ReplayableCoreCorpusFile = loadReplayableCoreCorpusFile()): ReplayableCoreCorpusCase[] {
  return file.dimensions.flatMap((dimension) =>
    Array.from({ length: dimension.count }, (_, index) => {
      const base = file.basePrompts[index % file.basePrompts.length];
      return {
        case_id: `${dimension.category}_${String(index + 1).padStart(3, "0")}_${base.family}`,
        category: dimension.category,
        family: base.family,
        selected_template_id: base.selectedTemplateId,
        prompt: `${base.prompt}; ${variantSuffix(dimension.category, index)}`,
        variant_index: index + 1,
      };
    }),
  );
}

export function validateReplayableCoreCorpus(file: ReplayableCoreCorpusFile = loadReplayableCoreCorpusFile()) {
  const cases = buildReplayableCoreCorpus(file);
  const failures = [
    file.schema === "ai-estimate-replayable-core-corpus-v1" ? "" : "corpus_schema_invalid",
    cases.length >= file.minimumCases ? "" : `corpus_cases_below_minimum:${cases.length}/${file.minimumCases}`,
    file.basePrompts.length >= 10 ? "" : "priority_prompt_families_below_10",
    file.dimensions.some((item) => item.category === "approved_history") ? "" : "approved_history_dimension_missing",
    file.dimensions.some((item) => item.category === "foreman") ? "" : "foreman_dimension_missing",
    file.dimensions.some((item) => item.category === "pdf_buyer") ? "" : "pdf_buyer_dimension_missing",
  ].filter(Boolean);
  return {
    replay_corpus_created: true,
    replay_cases_total: cases.length,
    replay_cases_required: file.minimumCases,
    priority_prompt_families_total: file.basePrompts.length,
    dimensions_total: file.dimensions.length,
    valid: failures.length === 0,
    failures,
    cases,
  };
}
