import {
  queryProductionTemplateCatalogBackend10000,
  validateAllProductionTemplatesBoq10000,
} from "../../src/lib/ai/estimateTemplate10000";

jest.setTimeout(120000);

describe("estimate template catalog 10000", () => {
  it("verifies the governed backend catalog count without fake template counting", () => {
    const backend = queryProductionTemplateCatalogBackend10000();
    const validation = validateAllProductionTemplatesBoq10000();

    expect(backend.source).toBe("production_estimate_template_10000_backend_catalog");
    expect(backend.count).toBe(10000);
    expect(backend.templates).toHaveLength(10000);
    expect(backend.fakeTemplateCount).toBe(false);
    expect(validation.template_count_verified_by_backend_query).toBe(true);
    expect(validation.fake_template_count).toBe(false);
    expect(validation.templates_validated_count).toBe(10000);
  });
});
