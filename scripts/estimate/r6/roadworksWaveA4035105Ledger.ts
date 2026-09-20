import {
  ROADWORKS_WAVE_A_OPERATIONS,
  ROADWORKS_WAVE_A_SCOPES,
  RoadworksWaveAInventory,
  roadworksWaveANaturalLanguageCases,
  type RoadworksWaveAOperation,
  type RoadworksWaveAScope,
} from "../../../src/lib/estimate/v4/roadworks";

export const ROADWORKS_WAVE_A_WORK_ID_PREFIX =
  "paving_roads_landscape_interior_asphalt_" as const;

export type RoadworksWaveAServerDefinitionIdentity = {
  catalogId: string;
  canonicalTechnologyId: string;
  definitionVersion?: number | null;
  definitionSha256?: string | null;
};

export type RoadworksWaveA4035105Ledger = {
  candidateProfileCount: number;
  registeredProfileCount: number;
  serverDefinitionCount: number;
  phraseCount: number;
  profiles: Array<{
    workId: string;
    operation: RoadworksWaveAOperation;
    scope: RoadworksWaveAScope;
    registrationStatus: "REGISTERED" | "UNPUBLISHED_NO_CATALOG_RECORD";
    catalogItemId: string | null;
    serverDefinition: RoadworksWaveAServerDefinitionIdentity | null;
    phraseCount: number;
    reason: "CATALOG_AND_DEFINITION_PRESENT" | "CATALOG_RECORD_ABSENT_UNPUBLISHED_PROFILE";
  }>;
  serverDefinitionsWithoutRegisteredProfile: RoadworksWaveAServerDefinitionIdentity[];
  registeredProfilesWithoutServerDefinition: string[];
};

export function buildRoadworksWaveA4035105Ledger(
  serverDefinitions: readonly RoadworksWaveAServerDefinitionIdentity[],
): RoadworksWaveA4035105Ledger {
  const registeredByWorkId = new Map(
    RoadworksWaveAInventory.map((entry) => [entry.workId, entry]),
  );
  const definitionByTechnologyId = new Map(
    serverDefinitions.map((entry) => [entry.canonicalTechnologyId, entry]),
  );
  const profiles = ROADWORKS_WAVE_A_OPERATIONS.flatMap((operation) =>
    ROADWORKS_WAVE_A_SCOPES.map((scope) => {
      const workId = `${ROADWORKS_WAVE_A_WORK_ID_PREFIX}${operation}_${scope}`;
      const registered = registeredByWorkId.get(workId) ?? null;
      const serverDefinition = definitionByTechnologyId.get(workId) ?? null;
      return {
        workId,
        operation,
        scope,
        registrationStatus: registered ? "REGISTERED" as const : "UNPUBLISHED_NO_CATALOG_RECORD" as const,
        catalogItemId: registered?.catalogItemId ?? null,
        serverDefinition,
        phraseCount: registered ? roadworksWaveANaturalLanguageCases(registered).length : 0,
        reason: registered
          ? "CATALOG_AND_DEFINITION_PRESENT" as const
          : "CATALOG_RECORD_ABSENT_UNPUBLISHED_PROFILE" as const,
      };
    })
  );
  const registeredWorkIds = new Set(registeredByWorkId.keys());
  const serverDefinitionsWithoutRegisteredProfile = serverDefinitions.filter((definition) =>
    !registeredWorkIds.has(definition.canonicalTechnologyId)
  );
  const registeredProfilesWithoutServerDefinition = RoadworksWaveAInventory
    .filter((profile) => !definitionByTechnologyId.has(profile.workId))
    .map((profile) => profile.workId);
  return {
    candidateProfileCount: profiles.length,
    registeredProfileCount: RoadworksWaveAInventory.length,
    serverDefinitionCount: serverDefinitions.length,
    phraseCount: profiles.reduce((sum, profile) => sum + profile.phraseCount, 0),
    profiles,
    serverDefinitionsWithoutRegisteredProfile,
    registeredProfilesWithoutServerDefinition,
  };
}
