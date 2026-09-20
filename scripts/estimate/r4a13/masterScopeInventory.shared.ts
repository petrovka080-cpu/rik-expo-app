export type MasterCriterion = Readonly<{
  id: string;
  requirement: string;
  evidenceRequirement: string | null;
}>;

export type MasterTechnologyBenchmark = Readonly<{
  ordinal: number;
  titleRu: string;
  compositionBoundaryRu: string;
}>;

export const MASTER_CRITERION_GROUP_COUNTS = Object.freeze({
  R6: 35,
  R7: 20,
  R8: 20,
  R9: 33,
  S12: 12,
  S14: 12,
  S15: 12,
  S15B: 12,
  S15C: 12,
  S19: 32,
} as const);

const CRITERION_ID = /^(R6|R7|R8|R9|S12|S14|S15|S15B|S15C|S19)-(\d{2})$/u;
const BENCHMARK_HEADING = "**Приложение B. Тридцать сохранённых технологических эталонов**";
const NEXT_APPENDIX_HEADING = "**Приложение C. Преемственность прежних обязательств**";

function markdownCells(line: string): string[] {
  if (!line.startsWith("|") || !line.endsWith("|")) return [];
  return line.slice(1, -1).split("|").map((cell) => cell.trim());
}

export function parseMasterCriteria(markdown: string): MasterCriterion[] {
  return markdown.split(/\r?\n/u).flatMap((line) => {
    const cells = markdownCells(line);
    if (cells.length < 2 || !CRITERION_ID.test(cells[0] ?? "")) return [];
    return [{
      id: cells[0],
      requirement: cells[1] ?? "",
      evidenceRequirement: cells.length > 2 ? cells.slice(2).join(" | ") : null,
    }];
  });
}

export function parseMasterTechnologyBenchmarks(markdown: string): MasterTechnologyBenchmark[] {
  const start = markdown.indexOf(BENCHMARK_HEADING);
  const end = markdown.indexOf(NEXT_APPENDIX_HEADING, start + BENCHMARK_HEADING.length);
  if (start < 0 || end < 0 || end <= start) return [];
  return markdown.slice(start, end).split(/\r?\n/u).flatMap((line) => {
    const cells = markdownCells(line);
    if (cells.length !== 3 || !/^\d{1,2}$/u.test(cells[0] ?? "")) return [];
    return [{
      ordinal: Number(cells[0]),
      titleRu: cells[1],
      compositionBoundaryRu: cells[2],
    }];
  });
}

export function assertMasterScopeInventory(input: {
  criteria: readonly MasterCriterion[];
  benchmarks: readonly MasterTechnologyBenchmark[];
}): void {
  if (input.criteria.length !== 200) {
    throw new Error(`MASTER_SCOPE_INVENTORY:CRITERION_COUNT:${input.criteria.length}`);
  }
  if (new Set(input.criteria.map((criterion) => criterion.id)).size !== input.criteria.length) {
    throw new Error("MASTER_SCOPE_INVENTORY:DUPLICATE_CRITERION_ID");
  }
  const expectedCriterionIds = Object.entries(MASTER_CRITERION_GROUP_COUNTS).flatMap(
    ([group, count]) => Array.from({ length: count }, (_, index) =>
      `${group}-${String(index + 1).padStart(2, "0")}`),
  );
  const actualCriterionIds = input.criteria.map((criterion) => criterion.id);
  if (JSON.stringify(actualCriterionIds) !== JSON.stringify(expectedCriterionIds)) {
    throw new Error("MASTER_SCOPE_INVENTORY:CRITERION_ORDER_OR_SEQUENCE");
  }
  if (input.criteria.some((criterion) => !criterion.requirement)) {
    throw new Error("MASTER_SCOPE_INVENTORY:CRITERION_CONTENT_EMPTY");
  }

  if (input.benchmarks.length !== 30) {
    throw new Error(`MASTER_SCOPE_INVENTORY:BENCHMARK_COUNT:${input.benchmarks.length}`);
  }
  if (input.benchmarks.some((benchmark, index) =>
    benchmark.ordinal !== index + 1
    || !benchmark.titleRu
    || !benchmark.compositionBoundaryRu)) {
    throw new Error("MASTER_SCOPE_INVENTORY:BENCHMARK_ORDER_OR_CONTENT");
  }
}
