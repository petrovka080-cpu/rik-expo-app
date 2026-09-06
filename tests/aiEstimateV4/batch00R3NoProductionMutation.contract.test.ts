import { BATCH00_SCOPE_HEAD, PREDECESSOR_HEAD, git } from "./batch00R3TestSupport";

test("changed no production or estimate-content path during the frozen BATCH-00 transition", () => {
  const changed = git("diff", "--name-only", PREDECESSOR_HEAD, BATCH00_SCOPE_HEAD, "--", "src", "data", "features").split(/\r?\n/u).filter(Boolean);
  expect(changed).toEqual([]);
});
