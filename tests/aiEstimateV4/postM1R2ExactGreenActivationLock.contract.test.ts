import { jsonlLines } from "./postM1R2TestSupport";

test("proves activation manifest and replay before writes", () => {
  const ledger = jsonlLines("00-contract/ACTIVATION_DISCOVERY_LEDGER.jsonl");
  expect(ledger.find((entry) => entry.kind === "PREDECESSOR_DISCOVERY")?.validGreenCandidateRoots).toBe(1);
  expect(ledger.find((entry) => entry.kind === "CLOSEOUT_INTEGRITY")?.evidenceArtifacts).toBe("36/36");
  expect(ledger.find((entry) => entry.kind === "CLOSEOUT_INTEGRITY")?.replay).toBe("2/2");
});
