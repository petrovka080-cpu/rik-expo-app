import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEstimateReadinessManifest, parseWorkCatalogArtifact } from "../../src/lib/estimate/catalogArtifactDataContract";
import { estimate10000ReadinessManifest } from "../../src/lib/estimate/estimate10000ReadinessManifest";
import { workCatalog10000Artifact } from "../../src/lib/estimate/workCatalog10000Artifact";

const actualManifest: unknown = require("../../data/estimate-templates/estimate-10000-readiness-manifest.json");
const actualCatalog: unknown = require("../../data/estimate-catalog/work-items/work-catalog-10000.json");
describe("runtime schema contracts for real full catalog artifacts", () => {
  it("loads the same real artifact objects and every record without changing source metadata or readiness", () => {
    expect(estimate10000ReadinessManifest).toBe(actualManifest);
    expect(workCatalog10000Artifact).toBe(actualCatalog);
    expect(estimate10000ReadinessManifest.templates).toHaveLength(estimate10000ReadinessManifest.manifest_total_templates);
    expect(workCatalog10000Artifact.items).toHaveLength(workCatalog10000Artifact.work_catalog_items_count);
    expect(estimate10000ReadinessManifest).toEqual(JSON.parse(readFileSync(resolve("data/estimate-templates/estimate-10000-readiness-manifest.json"), "utf8")));
    expect(workCatalog10000Artifact).toEqual(JSON.parse(readFileSync(resolve("data/estimate-catalog/work-items/work-catalog-10000.json"), "utf8")));
    expect(estimate10000ReadinessManifest.ready_professional_count).toBe(0);
    expect(estimate10000ReadinessManifest.not_ready_count).toBe(10000);
    expect(estimate10000ReadinessManifest.full_10000_real_norm_green_claimed).toBe(false);
    expect(estimate10000ReadinessManifest.fake_green_claimed).toBe(false);
  });
  it.each([null, [], {}, { ...estimate10000ReadinessManifest, schema: "other" },
    { ...estimate10000ReadinessManifest, manifest_total_templates: 9999 },
    { ...estimate10000ReadinessManifest, ready_professional_count: -1 },
    { ...estimate10000ReadinessManifest, fake_green_claimed: "false" },
    { ...estimate10000ReadinessManifest, approved_backfill_batch_ids: [1] }])("rejects invalid readiness root metadata without normalization or defaults", input => {
    expect(() => parseEstimateReadinessManifest(input)).toThrow("CATALOG_ARTIFACT_DATA_INVALID:readiness");
  });
  it.each([{ work_key: null }, { aliases: [7] }, { blocking_reasons: "missing source" },
    { row_count: 1.5 }, { unverified_norm_row_count: -1 }, { material_recipe_status: false }])("validates persisted readiness fields even beyond the first record: %j", patch => {
    const templates: unknown[] = [...estimate10000ReadinessManifest.templates];
    const last = templates.length - 1;
    templates[last] = { ...estimate10000ReadinessManifest.templates[last], ...patch };
    expect(() => parseEstimateReadinessManifest({ ...estimate10000ReadinessManifest, templates })).toThrow(`readiness.templates[${last}]`);
  });
  it("rejects missing records and sparse arrays, and preserves added metadata and row identities", () => {
    const row = { ...estimate10000ReadinessManifest.templates[0], future_metadata: { preserved: true } };
    const input = { ...estimate10000ReadinessManifest, manifest_total_templates: 1, templates: [row], future_source: "unchanged" };
    expect(parseEstimateReadinessManifest(input)).toBe(input);
    expect(parseEstimateReadinessManifest(input).templates[0]).toBe(row);
    expect(() => parseEstimateReadinessManifest({ ...input, templates: [null] })).toThrow("readiness.templates[0]");
    expect(() => parseEstimateReadinessManifest({ ...input, templates: new Array(1) })).toThrow("readiness.templates[0]");
    expect(() => parseEstimateReadinessManifest({ ...input, approved_backfill_batch_ids: new Array(1) })).toThrow("readiness.approved_backfill_batch_ids");
  });
  it.each([{ schema: "other" }, { work_catalog_items_count: 0 }, { generated_at: null }, { items: [null] },
    { items: [{ ...workCatalog10000Artifact.items[0], professional_name_ru: 7 }], work_catalog_items_count: 1 }])("rejects invalid work catalog data at the same real loading boundary: %j", patch => {
    expect(() => parseWorkCatalogArtifact({ ...workCatalog10000Artifact, ...patch })).toThrow("CATALOG_ARTIFACT_DATA_INVALID:work-catalog");
  });
});
