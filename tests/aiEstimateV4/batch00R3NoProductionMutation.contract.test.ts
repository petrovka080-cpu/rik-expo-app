import { PREDECESSOR_HEAD, git } from "./batch00R3TestSupport";

test("changes no production or estimate-content path during BATCH-00", () => {
  const changed = git("diff", "--name-only", PREDECESSOR_HEAD, "--", "src", "data", "features").split(/\r?\n/u).filter(Boolean);
  expect(changed).toEqual([]);
});
