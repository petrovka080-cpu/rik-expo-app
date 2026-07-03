import {
  isExtended10000TemplateSummaryCacheValid,
  extended10000TemplateSummary,
} from "./extended100TestHelpers";
import {
  STOP_AI_ESTIMATE_10000_TEMPLATES_EXTENDED_VALIDATION_FAILED,
} from "../../src/lib/ai/estimateTemplate10000";

describe("extended 10000-template cache validity", () => {
  it("rejects stale or weakened template validation summaries", () => {
    const summary = extended10000TemplateSummary();

    expect(isExtended10000TemplateSummaryCacheValid(summary)).toBe(true);
    expect(isExtended10000TemplateSummaryCacheValid({
      ...summary,
      final_status: STOP_AI_ESTIMATE_10000_TEMPLATES_EXTENDED_VALIDATION_FAILED,
    })).toBe(false);
    expect(isExtended10000TemplateSummaryCacheValid({
      ...summary,
      rows_validated_count: summary.rows_validated_count - 1,
    })).toBe(false);
    expect(isExtended10000TemplateSummaryCacheValid({
      ...summary,
      all_templates_have_norm_trace: false,
    })).toBe(false);
    expect(isExtended10000TemplateSummaryCacheValid({
      ...summary,
      failures: [{ workKey: "synthetic", templateKey: "synthetic", blocker: "CACHE_SHOULD_NOT_ACCEPT_FAILURES" }],
    })).toBe(false);
    expect(isExtended10000TemplateSummaryCacheValid(undefined)).toBe(false);
  });
});
