import { readFileSync } from "fs";
import { join } from "path";

describe("director_reports.transport.discipline fan-out budget", () => {
  const source = readFileSync(join(__dirname, "director_reports.transport.discipline.ts"), "utf8");

  it("keeps table fallback lookup chunks on the shared report budget", () => {
    expect(source).toContain("const DIRECTOR_DISCIPLINE_LOOKUP_CHUNK_SIZE = 500;");
    expect(source).toContain("const DIRECTOR_DISCIPLINE_TABLE_LOOKUP_CONCURRENCY_LIMIT = 4;");

    const chunkedLookupCalls = source.match(/forEachChunkParallel\(/g) ?? [];
    const budgetUsages = source.match(/DIRECTOR_DISCIPLINE_TABLE_LOOKUP_CONCURRENCY_LIMIT/g) ?? [];
    const chunkSizeUsages = source.match(/DIRECTOR_DISCIPLINE_LOOKUP_CHUNK_SIZE/g) ?? [];

    expect(chunkedLookupCalls).toHaveLength(7);
    expect(budgetUsages).toHaveLength(chunkedLookupCalls.length + 1);
    expect(chunkSizeUsages).toHaveLength(chunkedLookupCalls.length + 1);
    expect(source).not.toMatch(/forEachChunkParallel\([\s\S]*?\n\s*500,\s*[46],/);
  });
});
