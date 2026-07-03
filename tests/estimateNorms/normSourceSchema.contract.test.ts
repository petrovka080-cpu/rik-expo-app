import {
  ESTIMATE_NORM_SOURCES,
  GREEN_AI_ESTIMATE_10000_WORKS_NORM_KNOWLEDGE_BASE_AND_GOLDEN_CERTIFICATION_NO_BUILDS,
  NORM_WORK_TAXONOMY_GROUPS,
} from "../../src/lib/ai/estimateTemplate10000";
import { normValidation } from "./normTestHelpers";

describe("estimate norm source schema", () => {
  it("uses reviewed non-AI norm sources and at least 30 work groups", () => {
    const summary = normValidation();

    expect(summary.final_status).toBe(GREEN_AI_ESTIMATE_10000_WORKS_NORM_KNOWLEDGE_BASE_AND_GOLDEN_CERTIFICATION_NO_BUILDS);
    expect(summary.norm_sources_schema_passed).toBe(true);
    expect(summary.no_ai_or_unknown_norm_sources).toBe(true);
    expect(summary.work_groups_count).toBeGreaterThanOrEqual(30);
    expect(NORM_WORK_TAXONOMY_GROUPS.length).toBeGreaterThanOrEqual(30);
    expect(ESTIMATE_NORM_SOURCES.every((source) =>
      source.source_id &&
      source.document_version &&
      source.license_status &&
      source.quality_status === "reviewed" &&
      !/unknown|(^|_)ai($|_)/i.test(`${source.source_id} ${source.source_type}`)
    )).toBe(true);
  });
});
