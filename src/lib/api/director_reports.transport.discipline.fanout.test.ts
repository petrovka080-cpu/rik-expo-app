import { readFileSync } from "fs";
import { join } from "path";

describe("director_reports.transport.discipline aggregation contract closeout", () => {
  const source = readFileSync(join(__dirname, "director_reports.transport.discipline.ts"), "utf8");

  it("keeps removed table fan-out fallbacks fail-closed behind the server aggregation contract", () => {
    expect(source).toContain("createDirectorReportsAggregationContractRequiredError");
    expect(source).toContain("director discipline table fallback");
    expect(source).toContain("director discipline row fallback");

    expect(source).not.toContain("forEachChunkParallel(");
    expect(source).not.toContain("DIRECTOR_DISCIPLINE_LOOKUP_CHUNK_SIZE");
    expect(source).not.toContain("DIRECTOR_DISCIPLINE_TABLE_LOOKUP_CONCURRENCY_LIMIT");
    expect(source).not.toContain(".from(\"warehouse_issues\"");
    expect(source).not.toContain(".from(\"warehouse_issue_items\"");
  });
});
