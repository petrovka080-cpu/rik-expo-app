import { readJsonl } from "./batch00R3TestSupport";

test("decides all eight global systems and rejects withdrawn active use", () => {
  const rows = readJsonl("06-normative-global/GLOBAL_APPLICABILITY_DECISIONS.jsonl");
  expect(rows).toHaveLength(24);
  expect(rows.filter((row) => row.system === "ISO").every((row) => row.decision === "SUPERSEDED_OR_WITHDRAWN_REFERENCE_ONLY")).toBe(true);
  expect(rows.every((row) => row.kgMandatory === false)).toBe(true);
});
