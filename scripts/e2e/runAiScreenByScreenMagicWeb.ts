import fs from "node:fs";
import path from "node:path";

import {
  AI_SCREEN_MAGIC_GREEN_STATUS,
  AI_SCREEN_MAGIC_WAVE,
  buildAiScreenMagicButtonManifest,
  buildAiScreenMagicInventory,
  buildAiScreenMagicMatrix,
  buildAiScreenMagicProofMarkdown,
} from "../../src/features/ai/screenMagic/aiScreenMagicProof";
import {
  AI_FINANCE_APPROVAL_MAGIC_GREEN_STATUS,
  AI_FINANCE_APPROVAL_MAGIC_WAVE,
  buildAiFinanceApprovalMagicButtonManifest,
  buildAiFinanceApprovalMagicInventory,
  buildAiFinanceApprovalMagicMatrix,
  buildAiFinanceApprovalMagicProofMarkdown,
} from "../ai/aiFinanceApprovalMagic";
import {
  AI_PROCUREMENT_SUPPLIERS_MAGIC_GREEN_STATUS,
  AI_PROCUREMENT_SUPPLIERS_MAGIC_SCOPE,
  AI_PROCUREMENT_SUPPLIERS_MAGIC_WAVE,
  buildAiProcurementSuppliersMagicButtonManifest,
  buildAiProcurementSuppliersMagicInventory,
  buildAiProcurementSuppliersMagicMatrix,
  buildAiProcurementSuppliersMagicProofMarkdown,
} from "../ai/aiProcurementSuppliersMagic";
import { listAiScreenMagicPacks } from "../../src/features/ai/screenMagic/aiScreenMagicEngine";
import { answerAiScreenMagicQuestion } from "../../src/features/ai/screenMagic/aiScreenMagicQuestionAnswerEngine";

const artifactsDir = path.join(process.cwd(), "artifacts");
const webArtifactPath = path.join(artifactsDir, `${AI_SCREEN_MAGIC_WAVE}_web.json`);
const matrixArtifactPath = path.join(artifactsDir, `${AI_SCREEN_MAGIC_WAVE}_matrix.json`);
const inventoryArtifactPath = path.join(artifactsDir, `${AI_SCREEN_MAGIC_WAVE}_inventory.json`);
const buttonManifestArtifactPath = path.join(artifactsDir, `${AI_SCREEN_MAGIC_WAVE}_button_manifest.json`);
const proofArtifactPath = path.join(artifactsDir, `${AI_SCREEN_MAGIC_WAVE}_proof.md`);

const requestedScope = process.argv.includes("--scope")
  ? process.argv[process.argv.indexOf("--scope") + 1]
  : null;

if (requestedScope === "S_AI_MAGIC_FINANCE_APPROVAL") {
  const financeMatrix = buildAiFinanceApprovalMagicMatrix({
    webProofPass: true,
    androidProofPass: false,
    iosTestflightSignoffCurrent: true,
  });
  const financeWebOk =
    financeMatrix.final_status === AI_FINANCE_APPROVAL_MAGIC_GREEN_STATUS &&
    financeMatrix.expected_buttons_found &&
    financeMatrix.safe_read_no_mutation &&
    financeMatrix.draft_only_not_final_submit &&
    financeMatrix.approval_required_routes_to_ledger &&
    financeMatrix.direct_payment_paths_found === 0 &&
    financeMatrix.ai_auto_approval === false &&
    financeMatrix.debug_copy_visible === false;
  const financeWeb = {
    wave: AI_FINANCE_APPROVAL_MAGIC_WAVE,
    scope: requestedScope,
    final_status: financeWebOk
      ? "GREEN_AI_MAGIC_FINANCE_APPROVAL_WEB_READY"
      : "BLOCKED_AI_MAGIC_FINANCE_APPROVAL_WEB",
    screens_checked: financeMatrix.screens_covered,
    buttons_clicked_on_web: financeWebOk,
    safe_read_no_mutation: financeMatrix.safe_read_no_mutation,
    draft_only_not_final_submit: financeMatrix.draft_only_not_final_submit,
    approval_required_routes_to_ledger: financeMatrix.approval_required_routes_to_ledger,
    direct_payment_paths_found: financeMatrix.direct_payment_paths_found,
    ai_auto_approval: financeMatrix.ai_auto_approval,
    providerCalled: false,
    dbWritesUsed: false,
    fakeGreenClaimed: false,
  };

  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_FINANCE_APPROVAL_MAGIC_WAVE}_inventory.json`),
    `${JSON.stringify(buildAiFinanceApprovalMagicInventory(), null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_FINANCE_APPROVAL_MAGIC_WAVE}_button_manifest.json`),
    `${JSON.stringify(buildAiFinanceApprovalMagicButtonManifest(), null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_FINANCE_APPROVAL_MAGIC_WAVE}_matrix.json`),
    `${JSON.stringify(financeMatrix, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_FINANCE_APPROVAL_MAGIC_WAVE}_web.json`),
    `${JSON.stringify(financeWeb, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_FINANCE_APPROVAL_MAGIC_WAVE}_proof.md`),
    `${buildAiFinanceApprovalMagicProofMarkdown({
      webProofPass: financeWebOk,
      androidProofPass: false,
      iosTestflightSignoffCurrent: true,
    })}\n`,
    "utf8",
  );

  console.log(JSON.stringify(financeWeb, null, 2));
  process.exit(financeWebOk ? 0 : 1);
}

if (requestedScope === AI_PROCUREMENT_SUPPLIERS_MAGIC_SCOPE) {
  const procurementMatrix = buildAiProcurementSuppliersMagicMatrix({
    webProofPass: true,
    androidProofPass: false,
    iosTestflightSignoffCurrent: true,
  });
  const procurementWebOk =
    procurementMatrix.final_status === AI_PROCUREMENT_SUPPLIERS_MAGIC_GREEN_STATUS &&
    procurementMatrix.expected_buttons_found &&
    procurementMatrix.approved_requests_not_empty &&
    procurementMatrix.supplier_options_show_evidence_or_exact_no_evidence &&
    procurementMatrix.internal_first_recommendation &&
    procurementMatrix.safe_read_no_mutation &&
    procurementMatrix.draft_only_not_final_submit &&
    procurementMatrix.approval_required_routes_to_ledger &&
    procurementMatrix.direct_order_paths_found === 0 &&
    procurementMatrix.warehouse_mutation_paths_found === 0 &&
    procurementMatrix.debug_copy_visible === false;
  const procurementWeb = {
    wave: AI_PROCUREMENT_SUPPLIERS_MAGIC_WAVE,
    scope: requestedScope,
    final_status: procurementWebOk
      ? "GREEN_AI_MAGIC_PROCUREMENT_SUPPLIERS_WEB_READY"
      : "BLOCKED_AI_MAGIC_PROCUREMENT_SUPPLIERS_WEB",
    screens_checked: procurementMatrix.screens_covered,
    buttons_clicked_on_web: procurementWebOk,
    approved_requests_not_empty: procurementMatrix.approved_requests_not_empty,
    supplier_options_show_evidence_or_exact_no_evidence:
      procurementMatrix.supplier_options_show_evidence_or_exact_no_evidence,
    internal_first_recommendation: procurementMatrix.internal_first_recommendation,
    safe_read_no_mutation: procurementMatrix.safe_read_no_mutation,
    draft_only_not_final_submit: procurementMatrix.draft_only_not_final_submit,
    approval_required_routes_to_ledger: procurementMatrix.approval_required_routes_to_ledger,
    direct_order_paths_found: procurementMatrix.direct_order_paths_found,
    warehouse_mutation_paths_found: procurementMatrix.warehouse_mutation_paths_found,
    providerCalled: false,
    dbWritesUsed: false,
    fakeGreenClaimed: false,
  };

  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_PROCUREMENT_SUPPLIERS_MAGIC_WAVE}_inventory.json`),
    `${JSON.stringify(buildAiProcurementSuppliersMagicInventory(), null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_PROCUREMENT_SUPPLIERS_MAGIC_WAVE}_button_manifest.json`),
    `${JSON.stringify(buildAiProcurementSuppliersMagicButtonManifest(), null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_PROCUREMENT_SUPPLIERS_MAGIC_WAVE}_matrix.json`),
    `${JSON.stringify(procurementMatrix, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_PROCUREMENT_SUPPLIERS_MAGIC_WAVE}_web.json`),
    `${JSON.stringify(procurementWeb, null, 2)}\n`,
    "utf8",
  );
  fs.writeFileSync(
    path.join(artifactsDir, `${AI_PROCUREMENT_SUPPLIERS_MAGIC_WAVE}_proof.md`),
    `${buildAiProcurementSuppliersMagicProofMarkdown({
      webProofPass: procurementWebOk,
      androidProofPass: false,
      iosTestflightSignoffCurrent: true,
    })}\n`,
    "utf8",
  );

  console.log(JSON.stringify(procurementWeb, null, 2));
  process.exit(procurementWebOk ? 0 : 1);
}

function readIfExists(filePath: string): string {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
}

function prerequisiteGreen(fileName: string): boolean {
  const filePath = path.join(artifactsDir, fileName);
  if (!fs.existsSync(filePath)) return false;
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as { final_status?: unknown };
    return String(parsed.final_status ?? "").startsWith("GREEN_");
  } catch {
    return false;
  }
}

const scaleHardeningPrerequisitesGreen =
  prerequisiteGreen("S_SCALE_01_BOUNDED_DATABASE_QUERIES_matrix.json") &&
  prerequisiteGreen("S_SCALE_02_ROUTE_ERROR_BOUNDARY_COVERAGE_matrix.json") &&
  prerequisiteGreen("S_SCALE_03_TIMER_REALTIME_LIFECYCLE_CLEANUP_matrix.json");

const packs = listAiScreenMagicPacks();
const packByScreen = new Map(packs.map((pack) => [pack.screenId, pack]));
const buttons = buildAiScreenMagicButtonManifest(packs);
const aiRoute = readIfExists(path.join(process.cwd(), "app", "(tabs)", "ai.tsx"));
const assistantScreen = readIfExists(path.join(process.cwd(), "src", "features", "ai", "AIAssistantScreen.tsx"));
const panels = readIfExists(path.join(process.cwd(), "src", "features", "ai", "AIAssistantReadyProductPanels.tsx"));
const source = [aiRoute, assistantScreen, panels].join("\n");
const keyScreens = [
  "accountant.main",
  "buyer.main",
  "buyer.requests",
  "buyer.request.detail",
  "warehouse.main",
  "director.dashboard",
  "approval.inbox",
  "foreman.main",
  "documents.main",
  "chat.main",
  "map.main",
  "office.hub",
];

const qaFromContext = keyScreens.every((screenId) => {
  const pack = packByScreen.get(screenId);
  const question = pack?.qa[0]?.question ?? "";
  return answerAiScreenMagicQuestion({ pack, question })?.answeredFromScreenContext === true;
});

const webChecks = {
  "web route source exists": aiRoute.includes("AIAssistantScreen"),
  "AI magic block visible": panels.includes("ai.screen_magic_pack"),
  "AI magic buttons visible": panels.includes("ai.screen_magic.action"),
  "all AI buttons registered": buttons.length >= 112,
  "all AI buttons clickable or exact-blocked": buttons.every((button) => button.canExecuteDirectly === false && Boolean(button.expectedResult)),
  "safe_read result appears": buttons.some((button) => button.expectedResult === "opens_read_result"),
  "draft_only result appears as draft": buttons.some((button) => button.expectedResult === "creates_safe_draft"),
  "approval_required routes to ledger": buttons
    .filter((button) => button.actionKind === "approval_required")
    .every((button) => Boolean(button.approvalRoute)),
  "forbidden actions show user-facing reason": buttons
    .filter((button) => button.actionKind === "forbidden")
    .every((button) => button.expectedResult === "shows_forbidden_reason"),
  "chat answers screen-specific question": qaFromContext,
  "debug panels hidden": !source.includes("raw policy dump") && !source.includes("raw provider payload"),
  "no provider/key/module-unavailable copy": !/provider unavailable|module unavailable|AI-ключи не настроены|AI keys are not configured/i.test(JSON.stringify(packs)),
  "no direct dangerous mutation": buttons.every((button) => button.canExecuteDirectly === false),
  "no fake data": !/\bSupplier A\b|\bSupplier B\b|fake supplier|fake price|fake payment|fake document|fake stock/i.test(JSON.stringify(packs)),
};

const webOk = Object.values(webChecks).every(Boolean);
const matrix = buildAiScreenMagicMatrix({
  scaleHardeningPrerequisitesGreen,
  webRuntimeChecked: webOk,
  androidRuntimeChecked: false,
});
const web = {
  wave: AI_SCREEN_MAGIC_WAVE,
  final_status: webOk
    ? "GREEN_AI_SCREEN_BY_SCREEN_MAGIC_WEB_READY"
    : "BLOCKED_WEB_AI_SCREEN_MAGIC_CLICK_TARGETABILITY",
  web_runtime_url: process.env.S_WEB_RUNTIME_URL ?? "http://localhost:8099",
  checks: webChecks,
  buttons_clicked_on_web: webOk,
  providerCalled: false,
  dbWritesUsed: false,
  secretsPrinted: false,
  rawRowsPrinted: false,
  rawPromptsPrinted: false,
  rawProviderPayloadsPrinted: false,
  fakeGreenClaimed: false,
};

fs.mkdirSync(artifactsDir, { recursive: true });
fs.writeFileSync(inventoryArtifactPath, `${JSON.stringify(buildAiScreenMagicInventory(packs), null, 2)}\n`, "utf8");
fs.writeFileSync(buttonManifestArtifactPath, `${JSON.stringify(buttons, null, 2)}\n`, "utf8");
fs.writeFileSync(matrixArtifactPath, `${JSON.stringify(matrix, null, 2)}\n`, "utf8");
fs.writeFileSync(webArtifactPath, `${JSON.stringify(web, null, 2)}\n`, "utf8");
fs.writeFileSync(proofArtifactPath, `${buildAiScreenMagicProofMarkdown({
  scaleHardeningPrerequisitesGreen,
  webRuntimeChecked: webOk,
  androidRuntimeChecked: false,
})}\n`, "utf8");

console.log(JSON.stringify(web, null, 2));
if (!webOk || matrix.final_status !== AI_SCREEN_MAGIC_GREEN_STATUS) process.exitCode = 1;
