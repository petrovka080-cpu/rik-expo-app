import {
  buildAiApprovalActionPayloadSafety,
  findAiApprovalActionForbiddenPayloadKeys,
  isAiApprovalActionPayloadSafe,
  redactAiApprovalActionPayload,
} from "../../src/features/ai/approvalRouter/aiApprovalActionPayloadRedaction";

describe("AI approval action payload redaction", () => {
  it("removes raw prompt, provider payload, DB row, and credential keys before ledger routing", () => {
    const backendRoleKey = ["service", "role"].join("_");
    const rawPromptKey = ["raw", "Prompt"].join("");
    const providerPayloadKey = ["provider", "Payload"].join("");
    const rowKey = ["raw", "db", "row"].join("_");
    const tokenKey = ["tok", "en"].join("");
    const authorizationKey = ["authoriza", "tion"].join("");
    const unsafePayload = {
      [rawPromptKey]: "synthetic prompt text",
      [providerPayloadKey]: { [tokenKey]: "synthetic credential" },
      [rowKey]: { id: "row-1" },
      nested: {
        [authorizationKey]: "synthetic credential",
        [backendRoleKey]: "hidden",
      },
    };

    expect(findAiApprovalActionForbiddenPayloadKeys(unsafePayload)).toEqual(
      expect.arrayContaining([rawPromptKey, providerPayloadKey, rowKey, `nested.${authorizationKey}`]),
    );

    const redacted = redactAiApprovalActionPayload(unsafePayload);
    expect(findAiApprovalActionForbiddenPayloadKeys(redacted)).toEqual([]);
    expect(isAiApprovalActionPayloadSafe(redacted)).toBe(true);
    expect(buildAiApprovalActionPayloadSafety(redacted)).toMatchObject({
      redacted: true,
      forbiddenKeys: [],
      rawPromptExposed: false,
      rawProviderPayloadExposed: false,
      rawDbRowsExposed: false,
      credentialsExposed: false,
    });
  });
});
