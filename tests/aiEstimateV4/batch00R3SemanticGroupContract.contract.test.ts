import { groupDirs, readJson } from "./batch00R3TestSupport";

test("every selected group has a real execution semantic contract", () => {
  for (const directory of groupDirs()) {
    const value = readJson(`03-semantic-contracts/groups/${directory}/EXECUTION_SEMANTIC_GROUP_CONTRACT.json`);
    expect(value.requiredStages.length).toBeGreaterThanOrEqual(4);
    expect(value.ownedScope.length).toBeGreaterThan(0);
    expect(value.excludedScope.length).toBeGreaterThan(0);
    expect(value.contentMutationAuthorized).toBe(false);
  }
});
