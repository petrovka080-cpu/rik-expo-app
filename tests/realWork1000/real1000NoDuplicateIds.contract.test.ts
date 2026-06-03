import { realWork1000Result } from "./real1000TestHelpers";

jest.setTimeout(180_000);

test("real work 1000 case ids are unique", () => {
  const { cases } = realWork1000Result();
  const ids = cases.map((item) => item.caseId);

  expect(new Set(ids).size).toBe(ids.length);
});
