import { changedFiles } from "./real10000RemediationArchitectureTestHelpers";

test("Real10000 remediation does not add inline rows in screens", () => {
  const changedScreenFiles = changedFiles().filter((file) => file.startsWith("app/") && /\.(tsx|jsx)$/.test(file));

  expect(changedScreenFiles).toEqual([]);
});
