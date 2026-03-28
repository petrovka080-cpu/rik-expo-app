import fs from "node:fs";
import path from "node:path";

type JsonRecord = Record<string, unknown>;

const projectRoot = process.cwd();
const artifactsDir = path.join(projectRoot, "artifacts");

const readText = (relativePath: string) =>
  fs.readFileSync(path.join(projectRoot, relativePath), "utf8");

const readJson = <T extends JsonRecord>(relativePath: string): T | null => {
  const fullPath = path.join(projectRoot, relativePath);
  if (!fs.existsSync(fullPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(fullPath, "utf8")) as T;
  } catch {
    return null;
  }
};

const writeJson = (fileName: string, payload: unknown) => {
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(path.join(artifactsDir, fileName), `${JSON.stringify(payload, null, 2)}\n`);
};

const includesAll = (text: string, needles: string[]) => needles.every((needle) => text.includes(needle));

const requestSheetSource = readText("src/screens/director/DirectorRequestSheet.tsx");
const proposalSheetSource = readText("src/screens/director/DirectorProposalSheet.tsx");
const sheetModalSource = readText("src/screens/director/DirectorSheetModal.tsx");
const directorStylesSource = readText("src/screens/director/director.styles.ts");
const foremanDraftBoundarySource = readText("src/screens/foreman/hooks/useForemanDraftBoundary.ts");
const foremanLocalDraftSource = readText("src/screens/foreman/foreman.localDraft.ts");
const foremanAiQuickFlowSource = readText("src/screens/foreman/hooks/useForemanAiQuickFlow.ts");
const directorReportsScopeSource = readText("src/lib/api/directorReportsScope.service.ts");
const directorReportsTransportScopeSource = readText("src/lib/api/directorReportsTransport.service.ts");
const directorFinanceScopeSource = readText("src/lib/api/directorFinanceScope.service.ts");
const directorFinanceSource = readText("src/screens/director/director.finance.ts");
const directorPdfDataSource = readText("src/lib/api/pdf_director.data.ts");

const directorReportsTruthSummary = readJson<JsonRecord>("artifacts/director-reports-truth.summary.json");
const directorFinanceTruthSummary = readJson<JsonRecord>("artifacts/director-finance-truth.summary.json");

const directorRequestScrollSmoke = {
  requestSheetUsesScrollableBody: includesAll(requestSheetSource, [
    "style={s.sheetScrollableBody}",
    "<View style={s.sheetFooter}>",
    "ListHeaderComponent",
  ]),
  requestSheetFooterOutsideList:
    requestSheetSource.indexOf("ListHeaderComponent") >= 0 &&
    requestSheetSource.indexOf("<View style={s.sheetFooter}>") >
      requestSheetSource.indexOf("ListHeaderComponent"),
  proposalSheetUsesScrollableBody: includesAll(proposalSheetSource, [
    "style={s.sheetScrollableBody}",
    "<View style={s.sheetFooter}>",
    "ListHeaderComponent={listHeader}",
  ]),
  proposalSheetFooterOutsideList:
    proposalSheetSource.indexOf("ListHeaderComponent={listHeader}") >= 0 &&
    proposalSheetSource.indexOf("<View style={s.sheetFooter}>") >
      proposalSheetSource.indexOf("ListHeaderComponent={listHeader}"),
  sheetModalOwnsBodyFrame: sheetModalSource.includes("<View style={s.sheetContent}>"),
  stylesProvideSheetDiscipline: includesAll(directorStylesSource, [
    "sheetContent:",
    "sheetScrollableBody:",
    "sheetFooter:",
  ]),
};
(directorRequestScrollSmoke as JsonRecord).passed =
  Object.values(directorRequestScrollSmoke).every((value) => value === true);

const foremanDraftRolloverSmoke = {
  freshSnapshotBuilderExported: foremanLocalDraftSource.includes(
    "export function buildFreshForemanLocalDraftSnapshot",
  ),
  freshSnapshotResetsOwnerAndRows: includesAll(foremanLocalDraftSource, [
    'requestId: ""',
    "displayNo: null",
    "items: []",
    "pendingDeletes: []",
  ]),
  postSubmitPromotesFreshSnapshot: includesAll(foremanDraftBoundarySource, [
    "const freshDraftSnapshot = buildFreshForemanLocalDraftSnapshot",
    "applyLocalDraftSnapshotToBoundary(freshDraftSnapshot",
    "snapshot: freshDraftSnapshot",
  ]),
  postSubmitClearsAiUi: includesAll(foremanDraftBoundarySource, [
    "resetAiQuickUi()",
    "clearAiQuickSessionHistory()",
  ]),
  postSubmitRebindsToLocalOwner: includesAll(foremanDraftBoundarySource, [
    'activeDraftIdAfter: FOREMAN_LOCAL_ONLY_REQUEST_ID',
    'runtimeResult: "post_submit_fresh_draft_state"',
  ]),
};
(foremanDraftRolloverSmoke as JsonRecord).passed =
  Object.values(foremanDraftRolloverSmoke).every((value) => value === true);

const foremanAiDraftOwnerSmoke = {
  tracksOpenedDraftOwner: foremanAiQuickFlowSource.includes("openedDraftRequestIdRef"),
  lifecycleRebindsOnOwnerChange: foremanAiQuickFlowSource.includes(
    'rebindAiQuickToActiveDraft("lifecycle")',
  ),
  parseGuardPresent: foremanAiQuickFlowSource.includes('ensureActiveAiQuickDraftOwner("parse")'),
  applyGuardPresent: foremanAiQuickFlowSource.includes('ensureActiveAiQuickDraftOwner("apply")'),
  sessionHistoryClearedOnRebind: foremanAiQuickFlowSource.includes("clearAiQuickSessionHistory()"),
  observabilityEventPresent: foremanAiQuickFlowSource.includes('"stale_draft_owner_rebound"'),
};
(foremanAiDraftOwnerSmoke as JsonRecord).passed =
  Object.values(foremanAiDraftOwnerSmoke).every((value) => value === true);

const directorWorkInclusionAudit = {
  reportTransportLoadsWorks: includesAll(directorReportsTransportScopeSource, [
    "fetchDirectorReportCanonicalWorks",
    "includeDiscipline",
  ]),
  reportScopeAggregatesWorks: directorReportsScopeSource.includes(
    "const works = Array.isArray(args.discipline?.works) ? args.discipline.works : [];",
  ),
  reportPdfIncludesWorks: directorPdfDataSource.includes("worksRows"),
  financeScopeKeepsKindDimension: directorFinanceScopeSource.includes(
    "kind_code,kind_name,approved_alloc,paid_alloc",
  ),
  financeAggregationUsesKindName: includesAll(directorFinanceSource, [
    "const kindName = financeText(row.kind_name)",
    "const totalsByKind = new Map",
  ]),
  financeAndReportsTruthStillGreen:
    directorReportsTruthSummary?.green === true && directorFinanceTruthSummary?.green === true,
  codeChangesRequired: false,
};
(directorWorkInclusionAudit as JsonRecord).passed =
  directorWorkInclusionAudit.reportTransportLoadsWorks &&
  directorWorkInclusionAudit.reportScopeAggregatesWorks &&
  directorWorkInclusionAudit.reportPdfIncludesWorks &&
  directorWorkInclusionAudit.financeScopeKeepsKindDimension &&
  directorWorkInclusionAudit.financeAggregationUsesKindName &&
  directorWorkInclusionAudit.financeAndReportsTruthStillGreen;

const summary = {
  gate: "request_flow_hardening_verify",
  directorRequestScroll: (directorRequestScrollSmoke as JsonRecord).passed === true,
  foremanDraftRollover: (foremanDraftRolloverSmoke as JsonRecord).passed === true,
  foremanAiDraftOwner: (foremanAiDraftOwnerSmoke as JsonRecord).passed === true,
  directorWorkInclusion: (directorWorkInclusionAudit as JsonRecord).passed === true,
  green:
    (directorRequestScrollSmoke as JsonRecord).passed === true &&
    (foremanDraftRolloverSmoke as JsonRecord).passed === true &&
    (foremanAiDraftOwnerSmoke as JsonRecord).passed === true &&
    (directorWorkInclusionAudit as JsonRecord).passed === true,
  status:
    (directorRequestScrollSmoke as JsonRecord).passed === true &&
    (foremanDraftRolloverSmoke as JsonRecord).passed === true &&
    (foremanAiDraftOwnerSmoke as JsonRecord).passed === true &&
    (directorWorkInclusionAudit as JsonRecord).passed === true
      ? "GREEN"
      : "NOT GREEN",
};

writeJson("director-request-scroll-smoke.json", directorRequestScrollSmoke);
writeJson("foreman-draft-rollover-smoke.json", foremanDraftRolloverSmoke);
writeJson("foreman-ai-draft-owner-smoke.json", foremanAiDraftOwnerSmoke);
writeJson("director-work-inclusion-audit.json", directorWorkInclusionAudit);
writeJson("request-flow-hardening-summary.json", summary);

console.log(JSON.stringify(summary, null, 2));

if (!summary.green) {
  process.exitCode = 1;
}
