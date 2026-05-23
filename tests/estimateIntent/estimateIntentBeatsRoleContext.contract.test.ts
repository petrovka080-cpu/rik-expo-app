import { expectRoleQaRoutesToGlobalEstimate } from "./anyEstimateTestHelpers";

describe("estimate intent beats role context", () => {
  it.each(["foreman", "director", "buyer", "warehouse", "accountant", "contractor"])(
    "does not let %s role QA override an estimate prompt",
    (role) => {
      const answer = expectRoleQaRoutesToGlobalEstimate("посчитай стоимость укладки ковролина 100 м2", role);
      expect(answer.globalEstimateResult?.work.workKey).toBe("carpet_laying");
    },
  );
});
