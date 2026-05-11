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
    expect(directorFlow).toContain("AI APP KNOWLEDGE BLOCK");
    expect(directorFlow).toContain("finance_documents");
    expect(directorFlow).toContain("warehouse_item");
    expect(directorFlow).toContain("approval_required");

    expect(foremanFlow).toContain("E2E_FOREMAN_EMAIL");
    expect(foremanFlow).toContain("rik://ai?context=foreman");
    expect(foremanFlow).toContain("prepare_report");
    expect(foremanFlow).toContain("prepare_request");
    expect(foremanFlow).toContain("prepare_act");
    expect(foremanFlow).toContain("assertNotVisible");
    expect(foremanFlow).toContain("accounting_posting");

    expect(buyerFlow).toContain("E2E_BUYER_EMAIL");
    expect(buyerFlow).toContain("supplier");
    expect(buyerFlow).toContain("compare");
    expect(buyerFlow).toContain("prepare_request");
    expect(buyerFlow).toContain("final order created");

    expect(accountantFlow).toContain("E2E_ACCOUNTANT_EMAIL");
    expect(accountantFlow).toContain("company_debt");
    expect(accountantFlow).toContain("payment");
    expect(accountantFlow).toContain("finance_documents");
    expect(accountantFlow).toContain("confirm_supplier:allowed");

    expect(contractorFlow).toContain("E2E_CONTRACTOR_EMAIL");
    expect(contractorFlow).toContain("own_records_only");
    expect(contractorFlow).toContain("prepare_act");
    expect(contractorFlow).toContain("internal_supplier_details");
    expect(contractorFlow).toContain("other_contractor_data");
  });
});
