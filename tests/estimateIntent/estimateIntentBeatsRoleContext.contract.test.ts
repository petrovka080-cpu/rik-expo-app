import { expectRoleQaRoutesToCanonicalBackendEstimate } from "./anyEstimateTestHelpers";

describe("estimate intent beats role context", () => {
  it.each(["foreman", "director", "buyer", "warehouse", "accountant", "contractor"])(
    "does not let %s role QA override an estimate prompt",
    (role) => {
      const answer = expectRoleQaRoutesToCanonicalBackendEstimate("посчитай стоимость укладки ковролина 100 м2", role);
      expect(answer.answerKind).toBe("backend_estimate_handoff");
      expect(answer.openLinks).toHaveLength(1);
    },
  );
});
