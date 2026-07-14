import {
  GREEN_AI_ESTIMATE_10000_WORKS_NORM_KNOWLEDGE_BASE_AND_GOLDEN_CERTIFICATION_NO_BUILDS,
} from "../../src/lib/ai/estimateTemplate10000";
import { normCertification } from "./normTestHelpers";

describe("all 10000 estimate template norm certification", () => {
  it("certifies every template with norm id, source and version in compiled traces", () => {
    const summary = normCertification();

    expect(summary.final_status).toBe(GREEN_AI_ESTIMATE_10000_WORKS_NORM_KNOWLEDGE_BASE_AND_GOLDEN_CERTIFICATION_NO_BUILDS);
    expect(summary.templates_certified_count).toBe(10000);
    expect(summary.templates_failed_count).toBe(0);
    expect(summary.all_templates_compile_with_norm_trace).toBe(true);
    expect(summary.all_compiled_rows_have_norm_id).toBe(true);
    expect(summary.all_compiled_rows_have_norm_source).toBe(true);
    expect(summary.all_compiled_rows_have_norm_version).toBe(true);
    expect(summary.trace_includes_norm_id_source_version).toBe(true);
    expect(summary.failures).toEqual([]);
  });
});
