import {
  buildWholeAppIndexesAudit,
  buildWholeAppUnboundedQueriesAudit,
} from "../../scripts/audit/wholeApp50kExplainP95.shared";

describe("architecture: no unbounded large table queries", () => {
  it("keeps large-table reads bounded and backed by source/index evidence", () => {
    const unbounded = buildWholeAppUnboundedQueriesAudit();
    const indexes = buildWholeAppIndexesAudit();

    expect(unbounded.large_table_select_star_found).toBe(false);
    expect(unbounded.all_core_list_queries_bounded).toBe(true);
    expect(unbounded.cursor_pagination_all_core_lists).toBe(true);
    expect(indexes.index_or_rpc_evidence_complete).toBe(true);
    expect(indexes.query_source_evidence_complete).toBe(true);
  });
});
