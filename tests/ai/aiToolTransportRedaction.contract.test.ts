import {
  hasForbiddenAiToolTransportKeys,
  listAiRuntimeTransportContracts,
} from "../../src/features/ai/tools/transport/aiToolTransportTypes";
import { readTaskStreamTransport } from "../../src/features/ai/tools/transport/taskStream.transport";

describe("AI tool transport redaction", () => {
  it("rejects raw rows, raw provider payloads, tokens, secrets, and raw identity keys", () => {
    expect(
      hasForbiddenAiToolTransportKeys({
        nested: {
          rawProviderPayload: { text: "unsafe" },
        },
      }),
    ).toBe(true);
    expect(hasForbiddenAiToolTransportKeys({ Authorization: "Bearer token" })).toBe(true);
    expect(hasForbiddenAiToolTransportKeys({ user_id: "raw-user-id" })).toBe(true);
    expect(hasForbiddenAiToolTransportKeys({ safe: { evidenceRefs: ["ref:1"] } })).toBe(false);
  });

  it("keeps runtime transport responses DTO-only and redaction-required", () => {
    expect(listAiRuntimeTransportContracts()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          runtimeName: "task_stream",
          dtoOnly: true,
          redactionRequired: true,
          rawRowsExposed: false,
          rawProviderPayloadExposed: false,
        }),
      ]),
    );

    const result = readTaskStreamTransport({
      auth: null,
      input: { screen_id: "ai.command.center" },
    });
    expect(JSON.stringify(result)).not.toMatch(/rawDbRows\s*[:{]|rawProviderPayload\s*[:{]|Authorization|service_role/);
    expect(result.blockedReason).toContain("requires authenticated role context");
  });
});
