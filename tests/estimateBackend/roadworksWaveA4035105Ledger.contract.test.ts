import { buildAllR555AsphaltCanonicalDefinitions } from "../../scripts/estimate/r555/asphaltCanonicalDefinitionsR555";
import { buildRoadworksWaveA4035105Ledger } from "../../scripts/estimate/r6/roadworksWaveA4035105Ledger";
import { RoadworksWaveAInventory } from "../../src/lib/estimate/v4/roadworks";

describe("Roadworks Wave A 40/35/105 identity ledger", () => {
  test("explains every Cartesian candidate, registered profile, definition owner and phrase", () => {
    const registeredWorkIds = new Set(RoadworksWaveAInventory.map((entry) => entry.workId));
    const serverDefinitions = buildAllR555AsphaltCanonicalDefinitions()
      .filter((definition) => registeredWorkIds.has(definition.canonicalTechnologyId))
      .map((definition) => ({
        catalogId: definition.catalogId,
        canonicalTechnologyId: definition.canonicalTechnologyId,
        definitionSha256: definition.definitionSha256,
      }));
    const ledger = buildRoadworksWaveA4035105Ledger(serverDefinitions);

    expect(ledger).toEqual(expect.objectContaining({
      candidateProfileCount: 40,
      registeredProfileCount: 35,
      serverDefinitionCount: 35,
      phraseCount: 105,
      registeredProfilesWithoutServerDefinition: [],
      serverDefinitionsWithoutRegisteredProfile: [],
    }));
    const unpublished = ledger.profiles.filter((entry) =>
      entry.registrationStatus === "UNPUBLISHED_NO_CATALOG_RECORD"
    );
    expect(unpublished.map((entry) => entry.workId).sort()).toEqual([
      "paving_roads_landscape_interior_asphalt_drain_technical_room",
      "paving_roads_landscape_interior_asphalt_finish_technical_room",
      "paving_roads_landscape_interior_asphalt_level_technical_room",
      "paving_roads_landscape_interior_asphalt_prepare_technical_room",
      "paving_roads_landscape_interior_asphalt_repair_technical_room",
    ]);
    expect(unpublished.every((entry) =>
      entry.catalogItemId == null
      && entry.serverDefinition == null
      && entry.phraseCount === 0
      && entry.reason === "CATALOG_RECORD_ABSENT_UNPUBLISHED_PROFILE"
    )).toBe(true);
    expect(ledger.profiles.filter((entry) => entry.registrationStatus === "REGISTERED")
      .every((entry) => entry.catalogItemId != null
        && entry.serverDefinition != null
        && entry.phraseCount === 3)).toBe(true);
  });
});
