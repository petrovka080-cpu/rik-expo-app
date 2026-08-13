import { readJson } from "./postM1R2TestSupport";

test("accepts only the byte-exact R2 contract identity", () => {
  const identity = readJson<any>("00-contract/EXECUTED_R2_CONTRACT_IDENTITY.json");
  expect(identity.transport.archiveSha256).toBe("446f0765df784402f61e5d510c8dde13cc9ebd111ac53f665a100f98874f6cef");
  expect(identity.executedContract.rawSha256).toBe("fb35ec645b51a04bcf07acdf2f327e2ef41ab09101ed284c7607d5d161fde775");
  expect(identity.executedContract.canonicalMatchesDeclared).toBe(true);
  expect(identity.executedContract.excludedLineCount).toBe(1);
});
