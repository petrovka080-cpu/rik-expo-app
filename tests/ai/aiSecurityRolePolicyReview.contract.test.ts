import { actionAnswer, expectReadOnly } from "./aiSecurityRuntimeTestHelpers";

describe("security role policy review", () => {
  it("checks role policy and permission matrix without granting permissions", () => {
    const answer = actionAnswer("role_policy_review");
    expect(answer.answerKind).toBe("role_policy_review");
    expect(answer.sources.map((source) => source.type)).toEqual(expect.arrayContaining(["role_policy", "permission_matrix"]));
    expect(answer.permissionGranted).toBe(false);
    expect(answer.permissionRevoked).toBe(false);
    expectReadOnly(answer);
  });
});
