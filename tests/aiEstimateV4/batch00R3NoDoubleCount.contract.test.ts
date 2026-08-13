import { groupDirs, readJson } from "./batch00R3TestSupport";

test("typed children own disjoint payable scope", () => {
  for (const directory of groupDirs()) {
    const value = readJson(`03-semantic-contracts/groups/${directory}/GROUP_TYPED_CHILD_BOUNDARY.json`);
    expect(value.doubleCountConflicts).toBe(0);
    expect(value.owns.some((owned: string) => value.excludes.includes(owned))).toBe(false);
  }
});
