import { readFileSync } from "fs";
import { join } from "path";

describe("director_reports.transport.production aggregation contract closeout", () => {
  const source = readFileSync(join(__dirname, "director_reports.transport.production.ts"), "utf8");

  it("keeps price scope reads on the server RPC contract without table fallback fan-out", () => {
    expect(source).toContain("\"director_report_fetch_issue_price_scope_v1\"");
    expect(source).toContain("p_request_item_ids");
    expect(source).toContain("p_codes");

    expect(source).not.toContain("forEachChunkParallel(");
    expect(source).not.toContain("DIRECTOR_PRODUCTION_PRICE_LOOKUP_CHUNK_SIZE");
    expect(source).not.toContain("DIRECTOR_PRODUCTION_PRICE_LOOKUP_CONCURRENCY_LIMIT");
    expect(source).not.toContain(".from(\"purchase_items\"");
    expect(source).not.toContain(".from(\"proposal_items\"");
  });
});
