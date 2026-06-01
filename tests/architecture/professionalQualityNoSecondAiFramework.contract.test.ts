import fs from "node:fs";
import path from "node:path";

function readSources(relativeRoot: string): string {
  const root = path.join(process.cwd(), relativeRoot);
  if (!fs.existsSync(root)) return "";
  const chunks: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "fixtures") continue;
        walk(absolute);
      } else if (/\.(?:ts|tsx)$/.test(entry.name)) {
        chunks.push(fs.readFileSync(absolute, "utf8"));
      }
    }
  };
  walk(root);
  return chunks.join("\n");
}

describe("professional quality architecture", () => {
  it("does not create a second AI framework or provider path", () => {
    const source = [
      readSources("src/lib/ai/professionalQuality"),
      fs.readFileSync(path.join(process.cwd(), "src/lib/ai/enterpriseGuardrails/aiEnterpriseAllowedLayers.ts"), "utf8"),
      fs.readFileSync(path.join(process.cwd(), "src/lib/ai/enterpriseGuardrails/aiEnterpriseArchitecturePolicy.ts"), "utf8"),
    ].join("\n");

    expect(source).toContain("professionalQuality");
    expect(source).not.toMatch(/openai|gpt-|gemini|LegacyGeminiModelProvider|AiModelGateway|@ai-sdk|generateText/i);
  });
});
