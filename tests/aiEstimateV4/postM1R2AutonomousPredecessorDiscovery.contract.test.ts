import { readJson } from "./postM1R2TestSupport";

test("binds exactly one canonical GREEN predecessor", () => {
  const binding = readJson<any>("00-contract/EXACT_PREDECESSOR_BINDING.json");
  expect(binding.remediationHead).toBe("ea262b018998cf7edf62ce239a0a60096efaf656");
  expect(binding.remediationTree).toBe("0526e4f80a4ec61f53c567a302aa09d27100b3a7");
  expect(binding.token).toMatch(/^GREEN_M1_ASPHALT_.+_EXACT_SHA_ea262b018998cf7edf62ce239a0a60096efaf656_STOP_BEFORE_BATCH00$/u);
  expect(binding.immutable).toBe(true);
});
