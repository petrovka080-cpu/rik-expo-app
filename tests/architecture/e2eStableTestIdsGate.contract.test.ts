import fs from "fs";
import path from "path";

const ROOT = process.cwd();

const read = (relativePath: string) =>
  fs.readFileSync(path.join(ROOT, relativePath), "utf8");

const touchedRuntimeFiles = [
  "app/auth/login.tsx",
  "src/features/ai/AssistantFab.tsx",
  "src/features/ai/AIAssistantScreen.tsx",
];

describe("e2e stable test IDs architecture gate", () => {
  it("anchors auth and AI targetability in real runtime surfaces", () => {
    const loginSource = read("app/auth/login.tsx");
    const assistantSource = read("src/features/ai/AIAssistantScreen.tsx");
    const assistantFabSource = read("src/features/ai/AssistantFab.tsx");

    expect(loginSource).toContain('export default function LoginScreen()');
    expect(loginSource).toContain('testID="auth.login.email"');
    expect(loginSource).toContain('testID="auth.login.password"');
    expect(loginSource).toContain('testID="auth.login.submit"');

    expect(assistantFabSource).toContain('testID="ai.assistant.open"');
    expect(assistantSource).toContain('testID="ai.assistant.input"');
    expect(assistantSource).toContain('testID="ai.assistant.send"');
    expect(assistantSource).toContain('"ai.assistant.response"');
  });

  it("does not add auth discovery, seed, service-role, or bypass behavior to touched runtime files", () => {
    for (const filePath of touchedRuntimeFiles) {
      const source = read(filePath);
      expect(source).not.toContain("auth.admin");
      expect(source).not.toContain("listUsers");
      expect(source).not.toContain("service_role");
      expect(source).not.toContain("createUser");
      expect(source).not.toContain("createTempUser");
      expect(source).not.toContain("known-password");
      expect(source).not.toContain("autoLogin");
      expect(source).not.toContain("fake login");
      expect(source).not.toContain("fake AI answer");
      expect(source).not.toContain("hardcoded AI response");
    }
  });

  it("keeps credentials out of source-owned role-screen flows", () => {
    const flowDir = path.join(ROOT, "tests", "e2e", "ai-role-screen-knowledge");
    const flows = fs
      .readdirSync(flowDir)
      .filter((file) => file.endsWith(".yaml"))
      .map((file) => read(path.join("tests", "e2e", "ai-role-screen-knowledge", file)));

    expect(flows.length).toBeGreaterThanOrEqual(5);
    for (const flow of flows) {
      expect(flow).toContain("${E2E_");
      expect(flow).not.toMatch(/E2E_[A-Z_]+=(?!\$\{)/);
      expect(flow).not.toMatch(/@[^{}\s]+/);
      expect(flow).not.toMatch(/password\s*[:=]\s*[^${\s]/i);
    }
  });
});
