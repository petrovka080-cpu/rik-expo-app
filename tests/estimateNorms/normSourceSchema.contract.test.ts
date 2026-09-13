import {
  ESTIMATE_NORM_SOURCES,
  STOP_AI_ESTIMATE_10000_WORKS_NORM_KNOWLEDGE_BASE_AND_GOLDEN_CERTIFICATION_FAILED,
  NORM_WORK_TAXONOMY_GROUPS,
} from "../../src/lib/ai/estimateTemplate10000";
import { normValidation } from "./normTestHelpers";

describe("estimate norm source schema", () => {
  it("uses reviewed non-AI norm sources and at least 35 work groups", () => {
    const summary = normValidation();

    expect(summary.final_status).toBe(STOP_AI_ESTIMATE_10000_WORKS_NORM_KNOWLEDGE_BASE_AND_GOLDEN_CERTIFICATION_FAILED);
    expect(summary.norm_sources_schema_passed).toBe(true);
    expect(summary.no_ai_or_unknown_norm_sources).toBe(true);
    expect(summary.registered_professional_norm_items_count).toBe(0);
    expect(summary.unverified_norm_items_count).toBe(599000);
    expect(summary.all_norm_items_have_registered_professional_sources).toBe(false);
    expect(summary.work_groups_count).toBeGreaterThanOrEqual(35);
    expect(NORM_WORK_TAXONOMY_GROUPS.length).toBeGreaterThanOrEqual(35);
    expect(NORM_WORK_TAXONOMY_GROUPS).toEqual(expect.arrayContaining([
      "baseboards",
      "cleaning",
      "documentation",
    ]));
    expect(ESTIMATE_NORM_SOURCES.every((source) =>
      source.source_id &&
      source.document_version &&
      source.license_status &&
      source.quality_status === "reviewed" &&
      !/unknown|(^|_)ai($|_)/i.test(`${source.source_id} ${source.source_type}`)
    )).toBe(true);
  });
});
