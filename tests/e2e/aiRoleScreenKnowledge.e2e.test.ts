import fs from "fs";
import path from "path";

const ROOT = process.cwd();

const read = (relativePath: string) =>
  fs.readFileSync(path.join(ROOT, relativePath), "utf8");

describe("AI role-screen knowledge Maestro e2e contract", () => {
  const runnerSource = read("scripts/e2e/run-maestro-ai-role-screen-knowledge.ts");
  const directorFlow = read("tests/e2e/ai-role-screen-knowledge/director-control-knowledge.yaml");
  const foremanFlow = read("tests/e2e/ai-role-screen-knowledge/foreman-knowledge.yaml");
  const buyerFlow = read("tests/e2e/ai-role-screen-knowledge/buyer-knowledge.yaml");
  const accountantFlow = read("tests/e2e/ai-role-screen-knowledge/accountant-knowledge.yaml");
  const contractorFlow = read("tests/e2e/ai-role-screen-knowledge/contractor-knowledge.yaml");

  it("uses the real Maestro runner and shared seeded users", () => {
    expect(fs.existsSync(path.join(ROOT, "scripts/e2e/run-maestro-ai-role-screen-knowledge.ts"))).toBe(true);
    expect(runnerSource).toContain('"tests", "e2e", "ai-role-screen-knowledge"');
    expect(runnerSource).toContain("createMaestroCriticalBusinessSeed");
    expect(runnerSource).toContain("maestro");
    expect(runnerSource).toContain("director-control-knowledge.yaml");
    expect(runnerSource).toContain("foreman-knowledge.yaml");
    expect(runnerSource).toContain("buyer-knowledge.yaml");
    expect(runnerSource).toContain("accountant-knowledge.yaml");
    expect(runnerSource).toContain("contractor-knowledge.yaml");
    expect(runnerSource).toContain("ensureAppInstalled");
    expect(runnerSource).toContain("detectDeviceId");
    expect(runnerSource).toContain("report.xml");
  });

  it("covers the required role-screen AI knowledge flows without fake answers", () => {
    expect(directorFlow).toContain("E2E_DIRECTOR_EMAIL");
    expect(directorFlow).toContain("rik://ai?context=director");
    expect(directorFlow).toContain('id: "ai.knowledge.preview"');
    expect(directorFlow).toContain('id: "ai.knowledge.approval-boundary"');

    expect(foremanFlow).toContain("E2E_FOREMAN_EMAIL");
    expect(foremanFlow).toContain("rik://ai?context=foreman");
    expect(foremanFlow).toContain("assertNotVisible");
    expect(foremanFlow).toContain("accounting_posting");

    expect(buyerFlow).toContain("E2E_BUYER_EMAIL");
    expect(buyerFlow).toContain("final order created");

    expect(accountantFlow).toContain("E2E_ACCOUNTANT_EMAIL");
    expect(accountantFlow).toContain("confirm_supplier:allowed");

    expect(contractorFlow).toContain("E2E_CONTRACTOR_EMAIL");
    expect(contractorFlow).toContain("accounting_posting");
    expect(contractorFlow).toContain("other_contractor_data");

    for (const flow of [directorFlow, foremanFlow, buyerFlow, accountantFlow, contractorFlow]) {
      const sendIndex = flow.indexOf('id: "ai.assistant.send"');
      expect(flow).not.toContain("AI APP KNOWLEDGE BLOCK");
      expect(flow).toContain('id: "ai.knowledge.role"');
      expect(flow).toContain('id: "ai.knowledge.domain"');
      expect(flow).toContain('id: "ai.knowledge.allowed-intents"');
      expect(sendIndex).toBeGreaterThan(0);
      expect(flow.slice(sendIndex)).toContain("waitForAnimationToEnd");
      expect(flow.slice(sendIndex)).not.toContain('id: "ai.assistant.response"');
      expect(flow.slice(sendIndex)).not.toContain("scrollUntilVisible:");
      expect(flow.slice(sendIndex)).not.toContain('visible: "AI APP KNOWLEDGE BLOCK"');
    }
  });
});
