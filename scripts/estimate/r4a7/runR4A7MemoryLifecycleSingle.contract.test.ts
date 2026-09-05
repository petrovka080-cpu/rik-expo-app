import { evaluateR4A7MemoryLifecycle } from "./runR4A7MemoryLifecycleSingle";
import {
  clearProfessionalWorkPassportBuildCaches,
  getProfessionalWorkPassportBuildCacheStats,
  listProfessionalWorkPassportTemplateIndex,
} from "../../../src/lib/estimate/buildProfessionalWorkPassport";

const emptyCaches = {
  professionalWorkPassport: {
    templateIndexEntryCount: 0,
    productionExpanded: {
      expandedTemplateCacheSize: 0,
      compiledEstimateCacheSize: 0,
    },
  },
  aiEstimateParameterSchema: { size: 0, limit: 128 },
  normativeWorkParameterPassport: { size: 0, limit: 128 },
  inlineWorkParameterSchema: { size: 0, limit: 128 },
};

describe("R4-A7 memory lifecycle evaluation", () => {
  it("disposes the mutable professional template index at its owner boundary", () => {
    clearProfessionalWorkPassportBuildCaches();
    expect(getProfessionalWorkPassportBuildCacheStats()).toMatchObject({
      templateIndexLoaded: false,
      templateIndexEntryCount: 0,
      registryFingerprintLoaded: false,
    });

    expect(listProfessionalWorkPassportTemplateIndex()).toHaveLength(11_610);
    expect(getProfessionalWorkPassportBuildCacheStats()).toMatchObject({
      templateIndexLoaded: true,
      templateIndexEntryCount: 11_610,
      registryFingerprintLoaded: true,
    });

    clearProfessionalWorkPassportBuildCaches();
    expect(getProfessionalWorkPassportBuildCacheStats()).toMatchObject({
      templateIndexLoaded: false,
      templateIndexEntryCount: 0,
      registryFingerprintLoaded: false,
    });
  });

  it("accepts a stable retained set with disposed caches and handles", () => {
    expect(evaluateR4A7MemoryLifecycle({
      cyclePostGcHeapBytes: [100, 101, 102, 102, 103, 103, 103, 104].map((value) => value * 1024 * 1024),
      idle60HeapBytes: 100 * 1024 * 1024,
      idle300HeapBytes: 101 * 1024 * 1024,
      cacheAfterDispose: emptyCaches,
      handlesAtStart: { Socket: 2 },
      handlesAtEnd: { Socket: 2 },
    })).toMatchObject({ passed: true, blockers: [] });
  });

  it("rejects an undisposed professional template index", () => {
    const result = evaluateR4A7MemoryLifecycle({
      cyclePostGcHeapBytes: [100, 101, 102, 102].map((value) => value * 1024 * 1024),
      idle60HeapBytes: 100 * 1024 * 1024,
      idle300HeapBytes: 100 * 1024 * 1024,
      cacheAfterDispose: {
        ...emptyCaches,
        professionalWorkPassport: {
          ...emptyCaches.professionalWorkPassport,
          templateIndexEntryCount: 11_610,
        },
      },
      handlesAtStart: {},
      handlesAtEnd: {},
    });
    expect(result.passed).toBe(false);
    expect(result.blockers).toContain("professional_template_index_cache_not_disposed");
  });

  it("rejects a rising retained heap and new owned handles", () => {
    const result = evaluateR4A7MemoryLifecycle({
      cyclePostGcHeapBytes: [100, 110, 130, 170, 220].map((value) => value * 1024 * 1024),
      idle60HeapBytes: 100 * 1024 * 1024,
      idle300HeapBytes: 140 * 1024 * 1024,
      cacheAfterDispose: emptyCaches,
      handlesAtStart: {},
      handlesAtEnd: { Worker: 1 },
    });
    expect(result.passed).toBe(false);
    expect(result.blockers).toEqual(expect.arrayContaining([
      "retained_growth_exceeded",
      "retained_slope_exceeded",
      "idle_growth_exceeded",
      "active_handle_growth_after_dispose",
    ]));
  });
});
