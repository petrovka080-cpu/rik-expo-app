import { readFileSync } from "node:fs";
import path from "node:path";

import { GREEN_AI_ESTIMATE_CATALOG_SOURCE_REGISTRY_READY_NO_BUILDS } from "../../scripts/estimate/validateCatalogSourceRegistry";
import type { CatalogSourceRegistry } from "../../scripts/estimate/validateCatalogSourceRegistry";

function readJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(path.join(process.cwd(), relativePath), "utf8")) as T;
}

describe("catalog source registry artifact", () => {
  it("links every P0 critical case to source-backed norm sources", () => {
    const registry = readJson<CatalogSourceRegistry>("data/estimate-catalog/source-registry.json");

    expect(registry.final_status).toBe(GREEN_AI_ESTIMATE_CATALOG_SOURCE_REGISTRY_READY_NO_BUILDS);
    expect(registry.row_source_count).toBeGreaterThan(0);
    expect(registry.p0_source_count).toBeGreaterThan(0);
    expect(registry.p0_source_coverage).toHaveLength(14);
    expect(registry.p0_source_coverage.every((item) =>
      item.source_backed &&
      item.expected_source_token_found &&
      item.row_count > 0 &&
      item.blocking_reasons.length === 0
    )).toBe(true);
    expect(registry.sources.some((item) => item.is_generated_family_default)).toBe(false);
    expect(registry.sources.filter((item) => item.is_source_backed_professional_norm_pack).every((item) =>
      item.source_url_or_document_ref !== "unknown" &&
      Boolean(item.evidence_kind)
    )).toBe(true);
    expect(registry.blockers).toEqual([]);
  });
});
