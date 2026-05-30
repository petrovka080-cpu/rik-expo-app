import { changedFiles } from "./real10000RemediationArchitectureTestHelpers";

test("Real10000 remediation does not add screen-local calculation", () => {
  const changedUiFiles = changedFiles().filter((file) => file.startsWith("app/"));

  expect(changedUiFiles).toEqual([]);
});
