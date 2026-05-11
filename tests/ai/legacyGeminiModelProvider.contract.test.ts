jest.mock("../../src/lib/ai/geminiGateway", () => ({
  invokeGeminiGateway: jest.fn(async () => "legacy response"),
  isGeminiGatewayConfigured: jest.fn(() => true),
}));

import {
  invokeGeminiGateway,
  isGeminiGatewayConfigured,
} from "../../src/lib/ai/geminiGateway";
import {
  LegacyGeminiModelProvider,
  type AiModelRequest,
} from "../../src/features/ai/model";

const request: AiModelRequest = {
  taskType: "chat",
  messages: [
    { role: "system", content: "system prompt" },
    { role: "user", content: "hello" },
    { role: "assistant", content: "previous answer" },
  ],
  maxOutputTokens: 128,
  temperature: 0.3,
  topP: 0.8,
  timeoutMs: 1000,
  redactionRequired: true,
  responseFormat: "json",
};

describe("LegacyGeminiModelProvider contract", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("wraps the existing Gemini gateway and normalizes the response", async () => {
    const provider = new LegacyGeminiModelProvider({ model: "gemini-test" });

    const response = await provider.generate(request);

    expect(response).toEqual({
      provider: "legacy_gemini",
      model: "gemini-test",
      text: "legacy response",
      safety: {
        redacted: true,
        blocked: false,
      },
    });
    expect(jest.mocked(invokeGeminiGateway)).toHaveBeenCalledWith({
      model: "gemini-test",
      systemInstruction: "system prompt",
      contents: [
        { role: "user", parts: [{ text: "hello" }] },
        { role: "model", parts: [{ text: "previous answer" }] },
      ],
      generationConfig: {
        temperature: 0.3,
        topP: 0.8,
        maxOutputTokens: 128,
        responseMimeType: "application/json",
      },
    });
  });

  it("keeps provider availability behind the existing gateway configuration", () => {
    const provider = new LegacyGeminiModelProvider({ model: "gemini-test" });

    expect(provider.isConfigured()).toBe(true);
    expect(jest.mocked(isGeminiGatewayConfigured)).toHaveBeenCalledTimes(1);
  });
});
