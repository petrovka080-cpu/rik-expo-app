import fs from "node:fs";
import path from "node:path";

import { DisabledModelProvider, type AiModelRequest } from "../../src/features/ai/model";

const request: AiModelRequest = {
  taskType: "chat",
  messages: [{ role: "user", content: "hello" }],
  maxOutputTokens: 32,
  temperature: 0,
  timeoutMs: 1000,
  redactionRequired: true,
};

describe("DisabledModelProvider contract", () => {
  it("returns a blocked normalized response without external calls", async () => {
    const response = await new DisabledModelProvider().generate(request);

    expect(response).toEqual({
      provider: "disabled",
      model: "disabled",
      text: "",
      safety: {
        redacted: true,
        blocked: true,
        reason: "AI model provider disabled",
      },
    });
  });

  it("does not read env, API keys, fetch, or provider gateways", () => {
    const source = fs.readFileSync(
      path.join(process.cwd(), "src/features/ai/model/DisabledModelProvider.ts"),
      "utf8",
    );

    expect(source).not.toContain("process.env");
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toContain("geminiGateway");
    expect(source).not.toMatch(/\bAPI_KEY\b/);
  });
});
