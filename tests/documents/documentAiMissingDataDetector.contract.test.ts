import { documentProof } from "./documentTestFixtures";

test("document missing data detector finds invoice 45 missing act", () => {
  const { missingData } = documentProof();
  expect(missingData).toContain("акт по счету №45");
});
