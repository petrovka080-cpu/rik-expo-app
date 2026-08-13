import { readJson } from "./batch00R3TestSupport";

test("byte-exact R3 contract identity is admitted", () => {
  const value = readJson("00-activation/BATCH00_R3_EXECUTED_CONTRACT_IDENTITY.json");
  expect(value).toMatchObject({ zipBytes: 17368, zipSha256: "d42940f6ff826bdc5832443ec717113b6f1b57386303b468943616a8e6f0c1c2", markdownRawSha256: "96b600e5488b40423a0a7be1d788b667136da48c870c6ed50dd3a285d898aeee", markdownCanonicalSha256: "da9159e585fcd16d8bb6b097dbed3e18f3c7634afddb8a9a6fdf3da063c6f181", admissionVerdict: "GREEN_BYTE_EXACT" });
});
