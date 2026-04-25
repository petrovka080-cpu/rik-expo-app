import fs from "fs";
import path from "path";

const ROOT = process.cwd();

const read = (relativePath: string) =>
  fs.readFileSync(path.join(ROOT, relativePath), "utf8");

describe("maestro critical business phase 1 contracts", () => {
  const runnerSource = read("scripts/e2e/run-maestro-critical.ts");
  const seedSource = read("scripts/e2e/_shared/maestroCriticalBusinessSeed.ts");
  const wave2PlatformVerifySource = read("scripts/wave2_platform_verify.ts");
  const packageJson = JSON.parse(read("package.json")) as {
    scripts?: Record<string, string>;
  };

  const warehouseFlow = read("maestro/flows/critical/warehouse-receive-issue.yaml");
  const buyerRfqFlow = read("maestro/flows/critical/buyer-rfq-create.yaml");
  const buyerProposalFlow = read("maestro/flows/critical/buyer-proposal-review.yaml");
  const directorFlow = read("maestro/flows/critical/director-approve-report.yaml");
  const foremanFlow = read("maestro/flows/critical/foreman-draft-submit.yaml");
  const foremanExternalAiFlow = read("maestro/flows/external-ai/foreman-ai-draft-submit.yaml");
  const foremanCatalogSource = read("src/components/foreman/CatalogModal.tsx");

  const appButtonSource = read("src/ui/AppButton.tsx");
  const sendPrimaryButtonSource = read("src/ui/SendPrimaryButton.tsx");
  const topRightActionBarSource = read("src/ui/TopRightActionBar.tsx");
  const warehouseIncomingSource = read("src/screens/warehouse/components/IncomingItemsSheet.tsx");
  const warehouseIssueSource = read("src/screens/warehouse/components/ReqIssueModalRow.tsx");
  const warehouseRecipientSource = read("src/screens/warehouse/components/WarehouseRecipientModal.tsx");
  const buyerHeaderSource = read("src/screens/buyer/components/BuyerScreenHeader.tsx");
  const buyerRfqSource = read("src/screens/buyer/components/BuyerRfqSheetBody.tsx");
  const buyerProposalSource = read("src/screens/buyer/components/BuyerPropDetailsSheetBody.tsx");
  const directorDashboardSource = read("src/screens/director/DirectorDashboard.tsx");
  const directorProposalRowSource = read("src/screens/director/DirectorProposalRow.tsx");
  const directorProposalSheetSource = read("src/screens/director/DirectorProposalSheet.tsx");
  const directorSheetModalSource = read("src/screens/director/DirectorSheetModal.tsx");
  const directorFinanceCardModalSource = read("src/screens/director/DirectorFinanceCardModal.tsx");
  const directorReportsModalSource = read("src/screens/director/DirectorReportsModal.tsx");
  const directorScreenSource = read("src/screens/director/DirectorScreen.tsx");
  const foremanDropdownSource = read("src/screens/foreman/ForemanDropdown.tsx");
  const foremanAiSource = read("src/screens/foreman/ForemanAiQuickModal.tsx");
  const foremanDraftSource = read("src/screens/foreman/ForemanDraftModal.tsx");

  it("keeps the Maestro runner wired to the shared business seed env", () => {
    expect(runnerSource).toContain("createMaestroCriticalBusinessSeed");
    expect(runnerSource).toContain("function buildMaestroEnvArgs");
    expect(runnerSource).toContain("...buildMaestroEnvArgs(seed.env)");
    expect(runnerSource).toContain("function ensureCanonicalInputMethod");
    expect(runnerSource).toContain("show_ime_with_hard_keyboard");
    expect(runnerSource).toContain("enabled_input_methods");
    expect(runnerSource).toContain("default_input_method");
    expect(runnerSource).toContain("director-approve-report.yaml");
    expect(runnerSource).toContain("warehouse_issue_request_runtime_verify.ts");
    expect(packageJson.scripts?.["verify:wave2-platform"]).toBe(
      "tsx scripts/wave2_platform_verify.ts",
    );
    expect(wave2PlatformVerifySource).toContain(
      "tests/e2e/maestroCriticalBusinessPhase1.contract.test.ts",
    );
    expect(wave2PlatformVerifySource).toContain("verify:warehouse-issue-request-runtime");
    expect(wave2PlatformVerifySource).toContain("e2e:maestro:critical");
    expect(wave2PlatformVerifySource).toContain(
      "MAESTRO_SKIP_WAREHOUSE_ISSUE_RUNTIME_VERIFY",
    );

    expect(seedSource).toContain("MCRIT-");
    expect(seedSource).toContain("E2E_BUYER_RFQ_REQUEST_ID");
    expect(seedSource).toContain("type DirectorSeed = {");
    expect(seedSource).toContain("director: DirectorSeed;");
    expect(seedSource).toContain("seedDirectorPendingProposal");
    expect(seedSource).toContain("E2E_DIRECTOR_EMAIL");
    expect(seedSource).toContain("E2E_DIRECTOR_PROPOSAL_ID");
    expect(seedSource).toContain("E2E_WAREHOUSE_INCOMING_ID");
    expect(seedSource).toContain("E2E_FOREMAN_OBJECT_CODE_TOKEN");
    expect(seedSource).toContain("E2E_FOREMAN_LOCATOR_CODE_TOKEN");
    expect(seedSource).toContain("E2E_FOREMAN_EXPECTED_CODE");
    expect(seedSource).toContain('const FOREMAN_AI_PROMPT = "rebar 12 mm 10 pcs";');
    expect(seedSource).toContain('status: MUTABLE_REQUEST_STATUS');
    expect(seedSource).toContain("await finalizeSeedRequestStatus(admin, {");
    expect(seedSource).toContain("submitted_at: submissionTimestamp");
    expect(seedSource).toContain('await buyerClient.rpc("rpc_proposal_submit_v3"');
    expect(seedSource).toContain("signInWithPassword");
    expect(seedSource).toContain("await finalizeApprovedProposal(admin, {");
    expect(seedSource).toContain("await finalizePendingProposal(admin, {");
    expect(seedSource).toContain('status: "На утверждении"');
    expect(seedSource).toContain("approved_at: decisionTimestamp");
    expect(seedSource).toContain('status: PURCHASE_STATUS_APPROVED');
    expect(seedSource).toContain('status: PURCHASE_ITEM_STATUS_DRAFT');
    expect(seedSource).toContain('.from("wh_incoming")');
    expect(seedSource).toContain('.eq("purchase_id", purchaseId)');
    expect(seedSource).toContain(".maybeSingle()");
    expect(seedSource).toContain("cleanupTempUser(admin, foreman)");
    expect(seedSource).toContain('await admin.from("company_members").delete().eq("company_id", officeCompany.companyId);');
  });

  it("keeps every business flow bound to deterministic seeded ids instead of generic smoke selectors", () => {
    for (const flowSource of [warehouseFlow, buyerRfqFlow, buyerProposalFlow, directorFlow, foremanFlow]) {
      expect(flowSource).toContain("clearState: true");
    }

    expect(warehouseFlow).toContain("warehouse-incoming-row-${E2E_WAREHOUSE_INCOMING_ID}");
    expect(warehouseFlow).toContain("warehouse-incoming-qty-input-${E2E_WAREHOUSE_PURCHASE_ITEM_ID}");
    expect(warehouseFlow).toContain("warehouse-req-row-${E2E_WAREHOUSE_REQUEST_ID}");
    expect(warehouseFlow).toContain("warehouse-req-add-${E2E_WAREHOUSE_REQUEST_ITEM_ID}");
    expect(warehouseFlow).toContain("warehouse-recipient-confirm");

    expect(buyerRfqFlow).toContain("buyer-group-open-${E2E_BUYER_RFQ_REQUEST_ID}");
    expect(buyerRfqFlow).toContain("buyer-item-toggle-${E2E_BUYER_RFQ_ITEM_ID}");
    expect(buyerRfqFlow).toContain("buyer-rfq-email");
    expect(buyerRfqFlow).toContain("buyer-rfq-note");
    expect(buyerRfqFlow).toContain("buyer-rfq-publish");
    expect(buyerRfqFlow).toContain('id: "android:id/button1"');

    expect(buyerProposalFlow).toContain("buyer-tab-approved");
    expect(buyerProposalFlow).toContain("buyer-proposal-card-${E2E_BUYER_PROPOSAL_ID}");
    expect(buyerProposalFlow).toContain("buyer-proposal-pdf");
    expect(buyerProposalFlow).toContain("com.google.android.apps.docs:id/pdf_view");
    expect(buyerProposalFlow).not.toContain("native-pdf-webview");

    expect(directorFlow).toContain("office-direction-open-director");
    expect(directorFlow).toContain("director-top-tab-requests");
    expect(directorFlow).toContain("director-request-tab-buyer");
    expect(directorFlow).toContain("director-proposal-card-${E2E_DIRECTOR_PROPOSAL_ID}");
    expect(directorFlow).toContain("director-proposal-open-${E2E_DIRECTOR_PROPOSAL_ID}");
    expect(directorFlow).toContain("director-proposal-approve-${E2E_DIRECTOR_PROPOSAL_ID}");
    expect(directorFlow).toContain("director-sheet-close");
    expect(directorFlow).toContain("director-top-tab-finance");
    expect(directorFlow).toContain("director-finance-dashboard-debt-card");
    expect(directorFlow).toContain("director-finance-modal");
    expect(directorFlow).toContain("director-finance-debt-suppliers-toggle");
    expect(directorFlow).toContain("director-top-tab-reports");
    expect(directorFlow).toContain("director-reports-home-card");
    expect(directorFlow).toContain("director-reports-modal");
    expect(directorFlow).toContain("director-reports-tab-materials");
    expect(directorFlow).toContain("director-reports-tab-discipline");

    expect(foremanFlow).toContain("warehouse-fio-input");
    expect(foremanFlow).toContain("foreman-dropdown-open-foreman-object");
    expect(foremanFlow).toContain("foreman-dropdown-search-foreman-locator");
    expect(foremanFlow).toContain("foreman-dropdown-option-foreman-object-${E2E_FOREMAN_OBJECT_CODE_TOKEN}");
    expect(foremanFlow).toContain("foreman-dropdown-option-foreman-locator-${E2E_FOREMAN_LOCATOR_CODE_TOKEN}");
    expect(foremanFlow).toContain("foreman-catalog-open");
    expect(foremanFlow).toContain("foreman-catalog-add-${E2E_FOREMAN_EXPECTED_CODE_TOKEN}");
    expect(foremanFlow).toContain("foreman-draft-send");

    expect(foremanExternalAiFlow).toContain("foreman-ai-parse");
    expect(foremanExternalAiFlow).toContain("foreman-ai-apply");
    expect(foremanExternalAiFlow).toContain("foreman-draft-send");
  });

  it("exposes the selector surface required by the critical flows through source contracts", () => {
    expect(appButtonSource).toContain("testID?: string;");
    expect(appButtonSource).toContain("testID={testID}");

    expect(sendPrimaryButtonSource).toContain("testID?: string;");
    expect(sendPrimaryButtonSource).toContain("testID={testID}");
    expect(topRightActionBarSource).toContain("testID?: string;");
    expect(topRightActionBarSource).toContain("testID={testID}");

    expect(warehouseIncomingSource).toContain("warehouse-incoming-submit-${incomingId}");
    expect(warehouseIncomingSource).toContain("warehouse-incoming-qty-input-${inputKey}");
    expect(warehouseIssueSource).toContain("warehouse-req-add-${item.request_item_id}");
    expect(warehouseIssueSource).toContain("warehouse-req-max-${item.request_item_id}");
    expect(warehouseRecipientSource).toContain("warehouse-recipient-confirm");

    expect(buyerHeaderSource).toContain('testID="buyer-tab-approved"');
    expect(buyerRfqSource).toContain('testID="buyer-rfq-publish"');
    expect(buyerProposalSource).toContain('testID="buyer-proposal-pdf"');
    expect(directorDashboardSource).toContain("DIRECTOR_TOP_TAB_TEST_IDS");
    expect(directorDashboardSource).toContain("director-top-tab-${topTabTestId}");
    expect(directorDashboardSource).toContain("director-request-tab-${t}");
    expect(directorDashboardSource).toContain('testID="director-finance-dashboard-debt-card"');
    expect(directorDashboardSource).toContain('testID="director-reports-home-card"');
    expect(directorProposalRowSource).toContain("director-proposal-card-${pidStr}");
    expect(directorProposalRowSource).toContain("director-proposal-open-${pidStr}");
    expect(directorProposalSheetSource).toContain("director-proposal-sheet-${pidStr}");
    expect(directorProposalSheetSource).toContain("director-proposal-approve-${pidStr}");
    expect(directorSheetModalSource).toContain('testID="director-sheet-close"');
    expect(directorFinanceCardModalSource).toContain("modalTestID?: string;");
    expect(directorFinanceCardModalSource).toContain("testIdPrefix?: string;");
    expect(directorFinanceCardModalSource).toContain("testID={modalTestID}");
    expect(directorFinanceCardModalSource).toContain("testIdPrefix={testIdPrefix}");
    expect(directorReportsModalSource).toContain('modalTestID="director-reports-modal"');
    expect(directorReportsModalSource).toContain('testIdPrefix="director-reports"');
    expect(directorReportsModalSource).toContain("director-reports-tab-${tab}");
    expect(directorScreenSource).toContain('modalTestID="director-finance-modal"');
    expect(directorScreenSource).toContain('testIdPrefix="director-finance"');

    expect(foremanDropdownSource).toContain("foreman-dropdown-open-${toSelectorToken(key)}");
    expect(foremanDropdownSource).toContain("foreman-dropdown-option-${toSelectorToken(key)}-${toSelectorToken(item.code) || \"empty\"}");
    expect(foremanAiSource).toContain('testID="foreman-ai-apply"');
    expect(foremanDraftSource).toContain('testID="foreman-draft-send"');
    expect(foremanCatalogSource).toContain('testID="foreman-catalog-search-input"');
    expect(foremanCatalogSource).toContain('testID="foreman-catalog-close"');
    expect(foremanCatalogSource).toContain('testID={`foreman-catalog-add-${token}`}');
  });
});
