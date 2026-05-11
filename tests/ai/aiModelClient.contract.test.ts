import type {
  AiModelClient,
  AiModelRequest,
  AiModelResponse,
} from "../../src/features/ai/model";

const baseRequest: AiModelRequest = {
  taskType: "chat",
  messages: [{ role: "user", content: "hello" }],
  maxOutputTokens: 64,
  temperature: 0.2,
  timeoutMs: 1000,
  redactionRequired: true,
};

describe("AiModelClient contract", () => {
  it("keeps provider implementations behind a provider-neutral interface", async () => {
    const client: AiModelClient = {
      providerId: "legacy_gemini",
      generate: async (request) => ({
        provider: "legacy_gemini",
        model: "contract-model",
        text: request.messages[0]?.content ?? "",
        safety: {
          redacted: true,
          blocked: false,
        },
      }),
    };

    const response: AiModelResponse = await client.generate(baseRequest);

    expect(response).toEqual({
      provider: "legacy_gemini",
      model: "contract-model",
      text: "hello",
      safety: {
        redacted: true,
        blocked: false,
      },
    });
  });
});
