import { readDomainGatewaySource } from "./aiDomainGatewayArchitectureTestHelpers";

describe("AI Domain Gateway architecture - no second AI framework", () => {
  it("does not instantiate model clients or provider frameworks", () => {
    const source = readDomainGatewaySource();
    expect(source).not.toMatch(/new\s+(OpenAI|Google|Gemini|Anthropic|AI)/);
    expect(source).not.toContain("geminiGateway");
    expect(source).not.toContain("createChatCompletion");
  });
});
