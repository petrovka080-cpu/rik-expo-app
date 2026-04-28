import fs from "fs";
import path from "path";

const ROOT = process.cwd();

const read = (relativePath: string) =>
  fs.readFileSync(path.join(ROOT, relativePath), "utf8");

const flowPaths = [
  "maestro/flows/warehouse-accountant-edge/warehouse-receive-edge.yaml",
  "maestro/flows/warehouse-accountant-edge/warehouse-expense-edge.yaml",
  "maestro/flows/warehouse-accountant-edge/warehouse-stock-empty-state.yaml",
  "maestro/flows/warehouse-accountant-edge/accountant-subcontract-list-edge.yaml",
  "maestro/flows/warehouse-accountant-edge/accountant-payment-status-edge.yaml",
  "maestro/flows/warehouse-accountant-edge/accountant-document-fallback-edge.yaml",
];

describe("S-E2E-2 warehouse/accountant edge E2E contracts", () => {
  const runnerSource = read("scripts/e2e/run-maestro-warehouse-accountant.ts");
  const accountantHeaderSource = read("src/screens/accountant/components/Header.tsx");
  const accountantSubcontractSource = read("src/screens/accountant/AccountantSubcontractTab.tsx");
  const warehouseHeaderSource = read("src/screens/warehouse/components/WarehouseHeader.tsx");
  const accountantCardSource = read("src/screens/accountant/components/AccountantCardContent.tsx");
  const accountantListRowSource = read("src/screens/accountant/components/ListRow.tsx");

  it("keeps the dedicated runner scoped to seeded warehouse/accountant edge flows", () => {
    expect(runnerSource).toContain("createMaestroCriticalBusinessSeed");
    expect(runnerSource).toContain('"maestro", "flows", "warehouse-accountant-edge"');
    expect(runnerSource).toContain("warehouse-receive-edge.yaml");
    expect(runnerSource).toContain("warehouse-expense-edge.yaml");
    expect(runnerSource).toContain("warehouse-stock-empty-state.yaml");
    expect(runnerSource).toContain("accountant-subcontract-list-edge.yaml");
    expect(runnerSource).toContain("accountant-payment-status-edge.yaml");
    expect(runnerSource).toContain("accountant-document-fallback-edge.yaml");
    expect(runnerSource).toContain("...buildMaestroEnvArgs(seed.env)");
    expect(runnerSource).toContain("cleanupWarehouseAccountantSuiteSeed");
    expect(runnerSource).not.toContain("eas build");
    expect(runnerSource).not.toContain("eas submit");
    expect(runnerSource).not.toContain("eas update");
  });

  it("adds stable selector surfaces without changing business semantics", () => {
    expect(warehouseHeaderSource).toContain("warehouse-tab-incoming");
    expect(warehouseHeaderSource).toContain("warehouse-tab-stock");
    expect(warehouseHeaderSource).toContain("warehouse-tab-issue");

    expect(accountantHeaderSource).toContain("accountant-tab-pay");
    expect(accountantHeaderSource).toContain("accountant-tab-partial");
    expect(accountantHeaderSource).toContain("accountant-tab-paid");
    expect(accountantHeaderSource).toContain("accountant-tab-rework");
    expect(accountantHeaderSource).toContain("accountant-tab-history");
    expect(accountantHeaderSource).toContain("accountant-tab-subcontracts");

    expect(accountantSubcontractSource).toContain("accountant-subcontract-list");
    expect(accountantSubcontractSource).toContain("accountant-subcontract-row-${item.id}");
    expect(accountantSubcontractSource).toContain("accountant-subcontract-empty");
    expect(accountantSubcontractSource).toContain("accountant-subcontract-load-more");

    expect(accountantListRowSource).toContain("accountant-proposal-row-${proposalId}");
    expect(accountantCardSource).toContain("accountant-card-supplier");
    expect(accountantCardSource).toContain("accountant-card-invoice");
    expect(accountantCardSource).toContain("accountant-card-amount");
    expect(accountantCardSource).toContain("accountant-card-status");
  });

  it("keeps new flows read-only and free of external document viewer dependencies", () => {
    for (const flowPath of flowPaths) {
      const source = read(flowPath);

      expect(source).toContain("clearState: true");
      expect(source).toContain("profile-open-office-access");
      expect(source).not.toContain("warehouse-incoming-submit");
      expect(source).not.toContain("warehouse-req-submit");
      expect(source).not.toContain("buyer-rfq-publish");
      expect(source).not.toContain("director-proposal-approve");
      expect(source).not.toContain("bar_pay");
      expect(source).not.toContain("com.google.android.apps.docs:id/pdf_view");
      expect(source).not.toContain("signedUrl");
      expect(source).not.toContain("token");
    }
  });

  it("covers the intended edge surfaces with deterministic seeded ids", () => {
    const receiveFlow = read(flowPaths[0]);
    const expenseFlow = read(flowPaths[1]);
    const stockFlow = read(flowPaths[2]);
    const subcontractFlow = read(flowPaths[3]);
    const paymentFlow = read(flowPaths[4]);
    const documentFlow = read(flowPaths[5]);

    expect(receiveFlow).toContain("warehouse-incoming-row-${E2E_WAREHOUSE_INCOMING_ID}");
    expect(receiveFlow).toContain("warehouse-incoming-qty-input-${E2E_WAREHOUSE_PURCHASE_ITEM_ID}");

    expect(expenseFlow).toContain("warehouse-req-row-${E2E_WAREHOUSE_REQUEST_ID}");
    expect(expenseFlow).toContain("warehouse-req-add-${E2E_WAREHOUSE_REQUEST_ITEM_ID}");

    expect(stockFlow).toContain("warehouse-tab-stock");

    expect(subcontractFlow).toContain("accountant-tab-subcontracts");
    expect(subcontractFlow).toContain("accountant-subcontract-list");

    expect(paymentFlow).toContain("accountant-proposal-row-${E2E_ACCOUNTANT_PROPOSAL_ID}");
    expect(paymentFlow).toContain("accountant-card-status");
    expect(paymentFlow).toContain("payment-form-rest");

    expect(documentFlow).toContain("accountant-card-supplier");
    expect(documentFlow).toContain("accountant-card-invoice");
    expect(documentFlow).toContain("accountant-card-amount");
  });
});
