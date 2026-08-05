import fs from "node:fs";
import path from "node:path";

import {
  isAssistantConfigured,
  sendAssistantMessage,
} from "../../src/features/ai/assistantClient";

const readSource = (relativePath: string): string =>
  fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("assistantClient model gateway migration contract", () => {
  it("keeps the public assistantClient API compatible", () => {
    expect(typeof isAssistantConfigured).toBe("function");
    expect(typeof sendAssistantMessage).toBe("function");

    const source = readSource("src/features/ai/assistantClient.ts");
    expect(source).toContain("export function isAssistantConfigured()");
    expect(source).toContain("export async function sendAssistantMessage(options:");
  });

  it("uses the platform provider backed by AiModelGateway", () => {
    const source = readSource("src/features/ai/assistantClient.ts");
    const providerSource = readSource(
      "src/lib/aiPlatform/providers/ServerAiModelProvider.ts",
    );

    expect(source).toContain("ServerAiModelProvider");
    expect(providerSource).toContain("AiModelGateway");
    expect(source).not.toContain("geminiGateway");
    expect(source).not.toContain("requestAiGeneratedText");
  });
});
