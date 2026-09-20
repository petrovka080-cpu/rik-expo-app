import {
  assertMasterBenchmarkFixtureMapping,
  MASTER_BENCHMARK_FIXTURE_MAPPING,
} from "./masterBenchmarkEvidence.shared";

describe("S20 MASTER technological benchmark evidence mapping", () => {
  const benchmarks = MASTER_BENCHMARK_FIXTURE_MAPPING.map((mapping) => ({
    ordinal: mapping.ordinal,
    titleRu: mapping.masterTitleRu,
    compositionBoundaryRu: "boundary",
  }));

  test("binds all thirty MASTER benchmarks to unique stable fixture IDs", () => {
    expect(() => assertMasterBenchmarkFixtureMapping({ benchmarks })).not.toThrow();
    expect(MASTER_BENCHMARK_FIXTURE_MAPPING).toHaveLength(30);
    expect(new Set(MASTER_BENCHMARK_FIXTURE_MAPPING.map((mapping) => mapping.fixtureId)).size)
      .toBe(30);
    expect(MASTER_BENCHMARK_FIXTURE_MAPPING[1].currentSemanticSuccessorCatalogId).toBe(
      "canonical-work:base:concrete_foundation_interior_slab_foundation_pour_standard",
    );
    expect(MASTER_BENCHMARK_FIXTURE_MAPPING[6].currentSemanticSuccessorCatalogId).toBe(
      "canonical-work:expanded:steel_frame_building",
    );
    expect(MASTER_BENCHMARK_FIXTURE_MAPPING[13].currentSemanticSuccessorCatalogId).toBe(
      "canonical-work:base:paving_roads_landscape_interior_asphalt_drain_large_area",
    );
    expect(MASTER_BENCHMARK_FIXTURE_MAPPING[14].currentSemanticSuccessorCatalogId).toBe(
      "canonical-work:base:plumbing_interior_pnd_pipe_connect_standard",
    );
    expect(MASTER_BENCHMARK_FIXTURE_MAPPING[15].currentSemanticSuccessorCatalogId).toBe(
      "canonical-work:base:plumbing_interior_sewer_route_standard",
    );
    expect(MASTER_BENCHMARK_FIXTURE_MAPPING[16].currentSemanticSuccessorCatalogId).toBe(
      "canonical-work:base:paving_roads_landscape_interior_drainage_lay_standard",
    );
    expect(MASTER_BENCHMARK_FIXTURE_MAPPING[20].currentSemanticSuccessorCatalogId).toBe(
      "canonical-work:expanded:sprinkler_system",
    );
  });

  test("does not silently accept ordinal-only mapping after a MASTER title change", () => {
    const changed = benchmarks.map((benchmark) => ({ ...benchmark }));
    changed[13].titleRu = "Соседняя технология вместо водоотводного лотка";
    expect(() => assertMasterBenchmarkFixtureMapping({ benchmarks: changed }))
      .toThrow("MASTER_BENCHMARK_MAPPING:TITLE:14");
  });

  test("rejects a duplicated stable fixture ID", () => {
    const duplicated = MASTER_BENCHMARK_FIXTURE_MAPPING.map((mapping) => ({ ...mapping }));
    duplicated[29].fixtureId = duplicated[28].fixtureId;
    expect(() => assertMasterBenchmarkFixtureMapping({ benchmarks, mappings: duplicated }))
      .toThrow("MASTER_BENCHMARK_MAPPING:DUPLICATE_FIXTURE_ID");
  });
});
