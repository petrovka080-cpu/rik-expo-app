import {
  AI_MODEL_MAX_MESSAGES,
  AI_MODEL_MAX_OUTPUT_TOKENS,
  AI_MODEL_MESSAGE_CONTENT_CHAR_LIMIT,
  AI_MODEL_TIMEOUT_MS,
  AiModelGateway,
  type AiModelClient,
  type AiModelRequest,
  type AiModelResponse,
} from "../../src/features/ai/model";

const buildRequest = (overrides?: Partial<AiModelRequest>): AiModelRequest => ({
  taskType: "chat",
  messages: [{ role: "user", content: "hello" }],
  maxOutputTokens: 128,
  temperature: 0.2,
  timeoutMs: 1000,
  redactionRequired: true,
  ...overrides,
});

const providerResponse = (model: string, text: string): AiModelResponse => ({
  provider: "legacy_gemini",
  model,
  text,
  safety: { redacted: true, blocked: false },
});

describe("AiModelGateway contract", () => {
  it("fails closed on invalid provider config", async () => {
    const gateway = new AiModelGateway({
      env: { AI_MODEL_PROVIDER: "unexpected_provider" },
    });

    const response = await gateway.generate(buildRequest());

    expect(response.provider).toBe("disabled");
    expect(response.safety.blocked).toBe(true);
    expect(response.safety.reason).toBe("AI model provider disabled");
  });

  it("blocks requests when redactionRequired is not true", async () => {
    const provider: AiModelClient = {
      providerId: "legacy_gemini",
      generate: jest.fn(async () => providerResponse("should-not-run", "not safe")),
    };
    const request = buildRequest();
    Object.defineProperty(request, "redactionRequired", {
      configurable: true,
      value: false,
    });

    const response = await new AiModelGateway({ provider }).generate(request);

    expect(provider.generate).not.toHaveBeenCalled();
    expect(response.safety.blocked).toBe(true);
    expect(response.safety.reason).toBe("AI model request redaction is required");
  });

  it("blocks oversized maxOutputTokens, timeoutMs, messages, and content", async () => {
    const provider: AiModelClient = {
      providerId: "legacy_gemini",
      generate: jest.fn(async () => providerResponse("should-not-run", "not safe")),
    };
    const gateway = new AiModelGateway({ provider });
    const tooManyMessages = Array.from({ length: AI_MODEL_MAX_MESSAGES + 1 }, () => ({
      role: "user" as const,
      content: "hello",
    }));

    await expect(gateway.generate(buildRequest({
      maxOutputTokens: AI_MODEL_MAX_OUTPUT_TOKENS + 1,
    }))).resolves.toMatchObject({
      safety: { blocked: true, reason: "AI model request maxOutputTokens exceeded" },
    });
    await expect(gateway.generate(buildRequest({
      timeoutMs: AI_MODEL_TIMEOUT_MS + 1,
    }))).resolves.toMatchObject({
      safety: { blocked: true, reason: "AI model request timeoutMs exceeded" },
    });
    await expect(gateway.generate(buildRequest({
      messages: tooManyMessages,
    }))).resolves.toMatchObject({
      safety: { blocked: true, reason: "AI model request message count exceeded" },
    });
    await expect(gateway.generate(buildRequest({
      messages: [{ role: "user", content: "x".repeat(AI_MODEL_MESSAGE_CONTENT_CHAR_LIMIT + 1) }],
    }))).resolves.toMatchObject({
      safety: { blocked: true, reason: "AI model request message content exceeded" },
    });
    expect(provider.generate).not.toHaveBeenCalled();
  });

  it("normalizes messages and provider response shape", async () => {
    const provider: AiModelClient = {
      providerId: "legacy_gemini",
      generate: jest.fn(async (request) => {
        expect(request.messages).toEqual([{ role: "user", content: "42" }]);
        return providerResponse("", "ok");
      }),
    };

    const response = await new AiModelGateway({ provider }).generate(buildRequest({
      messages: [{ role: "user", content: "42" }],
    }));

    expect(response).toMatchObject({
      provider: "legacy_gemini",
      model: "legacy_gemini",
      text: "ok",
      safety: { redacted: true, blocked: false },
    });
  });
});
