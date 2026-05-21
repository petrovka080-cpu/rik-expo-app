import { normalUserRuntimeAnswer, expectReadOnly } from "./aiSecurityRuntimeTestHelpers";

describe("security runtime normal user permission limited", () => {
  it("returns only a permission-limited answer for normal users", () => {
    const answer = normalUserRuntimeAnswer();
    expect(answer.answerKind).toBe("permission_limited_answer");
    expect(answer.securityEvents).toHaveLength(0);
    expect(answer.runtimeEvents).toHaveLength(0);
    expect(answer.hiddenByPermission.map((item) => item.sourceType)).toEqual(expect.arrayContaining(["role_policy", "runtime_artifact"]));
    expectReadOnly(answer);
  });
});
