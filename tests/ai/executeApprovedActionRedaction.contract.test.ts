import {
  approvedActionPayloadHasForbiddenFields,
  readRedactedCreatedEntityRef,
} from "../../src/features/ai/executors/executeApprovedActionRedaction";

describe("executeApprovedActionRedaction contract", () => {
  it("rejects raw DB, prompt, provider, and credential fields recursively", () => {
    expect(approvedActionPayloadHasForbiddenFields({ rawPrompt: "do it" })).toBe(true);
    expect(approvedActionPayloadHasForbiddenFields({ nested: { provider_payload: {} } })).toBe(true);
    expect(approvedActionPayloadHasForbiddenFields({ nested: [{ user_id: "raw-user" }] })).toBe(true);
    expect(approvedActionPayloadHasForbiddenFields({ token: "secret" })).toBe(true);
  });

  it("returns only redacted created entity refs", () => {
    expect(readRedactedCreatedEntityRef({
      createdEntityRef: { entityType: "request", entityIdHash: "request:hash" },
    })).toEqual({ entityType: "request", entityIdHash: "request:hash" });
    expect(readRedactedCreatedEntityRef({
      createdEntityRef: { entityType: "request", raw_request_id: "raw" },
    })).toBeUndefined();
  });
});
