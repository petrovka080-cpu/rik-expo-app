import { listProfessionalWorkPassportTemplateIds } from "../../src/lib/estimate/buildProfessionalWorkPassport";
import {
  clearProfessionalWorkPassportRuntimeCaches,
  getProfessionalWorkPassport,
  getProfessionalWorkPassportRuntimeCacheStats,
} from "../../src/lib/estimate/professionalWorkPassportRegistry";

describe("professional work passport runtime cache", () => {
  beforeEach(() => {
    clearProfessionalWorkPassportRuntimeCaches();
  });

  afterEach(() => {
    clearProfessionalWorkPassportRuntimeCaches();
  });

  it("loads one requested passport without building the full registry", () => {
    const [templateId] = listProfessionalWorkPassportTemplateIds();
    const passport = getProfessionalWorkPassport(templateId);
    const stats = getProfessionalWorkPassportRuntimeCacheStats();

    expect(passport?.templateId).toBe(templateId);
    expect(stats.fullRegistryLoaded).toBe(false);
    expect(stats.singlePassportCacheSize).toBe(1);
    expect(stats.singlePassportCacheLimit).toBe(128);
  });

  it("keeps repeated single-passport access bounded by the LRU limit", () => {
    const ids = listProfessionalWorkPassportTemplateIds().slice(0, 160);
    for (const id of ids) getProfessionalWorkPassport(id);
    const stats = getProfessionalWorkPassportRuntimeCacheStats();

    expect(stats.fullRegistryLoaded).toBe(false);
    expect(stats.singlePassportCacheSize).toBeLessThanOrEqual(stats.singlePassportCacheLimit);
  });
});
