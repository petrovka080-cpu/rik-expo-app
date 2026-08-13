import { PREDECESSOR_HEAD, git } from "./batch00R3TestSupport";

test("adds focused gates without deleting or editing predecessor tests", () => {
  const diff = git("diff", "--name-status", PREDECESSOR_HEAD, "--", "tests").split(/\r?\n/u).filter(Boolean);
  expect(diff.length).toBeGreaterThanOrEqual(25);
  expect(diff.every((line) => line.startsWith("A\t") || line.startsWith("??"))).toBe(true);
});
