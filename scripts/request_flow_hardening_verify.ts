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
const foremanDraftModalSource = readText("src/screens/foreman/ForemanDraftModal.tsx");
const directorReportsScopeSource = readText("src/lib/api/directorReportsScope.service.ts");
const directorReportsTransportScopeSource = readText("src/lib/api/directorReportsTransport.service.ts");
const directorFinanceScopeSource = readText("src/lib/api/directorFinanceScope.service.ts");
const directorFinanceSource = readText("src/screens/director/director.finance.ts");
const directorPdfDataSource = readText("src/lib/api/pdf_director.data.ts");

const directorReportsTruthSummary = readJson<JsonRecord>("artifacts/director-reports-truth.summary.json");
const directorFinanceTruthSummary = readJson<JsonRecord>("artifacts/director-finance-truth.summary.json");
const foremanRequestSyncRuntimeSummary = readJson<JsonRecord>("artifacts/foreman-request-sync-runtime.summary.json");
const foremanRuntimeGatePassed = Boolean(
  foremanRequestSyncRuntimeSummary &&
  (foremanRequestSyncRuntimeSummary.runtimeVerified === true ||
    foremanRequestSyncRuntimeSummary.status === "passed"),
);

const directorRequestScrollSmoke = {
  requestSheetUsesScrollableBody: includesAll(requestSheetSource, [
    "style={s.sheetScrollableBody}",
    "style={s.sheetFooter}",
    "ListHeaderComponent",
  ]),
  requestSheetMeasuresFooterInset: includesAll(requestSheetSource, [
    "const [footerHeight, setFooterHeight] = React.useState(0);",
    "contentContainerStyle={{ paddingBottom: bodyBottomInset }}",
    "onLayout={(event) => {",
  ]),
  requestSheetFooterOutsideList:
    requestSheetSource.indexOf("ListHeaderComponent") >= 0 &&
    requestSheetSource.indexOf("style={s.sheetFooter}") >
      requestSheetSource.indexOf("ListHeaderComponent"),
  proposalSheetUsesScrollableBody: includesAll(proposalSheetSource, [
    "style={s.sheetScrollableBody}",
    "style={s.sheetFooter}",
    "ListHeaderComponent={listHeader}",
  ]),
  proposalSheetMeasuresFooterInset: includesAll(proposalSheetSource, [
    "const [footerHeight, setFooterHeight] = React.useState(0);",
    "contentContainerStyle={{ paddingBottom: bodyBottomInset }}",
    "onLayout={(event) => {",
  ]),
  proposalSheetFooterOutsideList:
    proposalSheetSource.indexOf("ListHeaderComponent={listHeader}") >= 0 &&
    proposalSheetSource.indexOf("style={s.sheetFooter}") >
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
  localDraftCarriesOwnerId: includesAll(foremanLocalDraftSource, [
    "ownerId: string;",
    "ownerId: makeDraftOwnerId()",
    "ownerId: resolveDraftOwnerId(base?.ownerId ?? params.ownerId, requestId)",
  ]),
  freshSnapshotResetsOwnerAndRows: includesAll(foremanLocalDraftSource, [
    "ownerId: makeDraftOwnerId()",
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
  boundaryTracksActiveOwner: includesAll(foremanDraftBoundarySource, [
    "const activeDraftOwnerIdRef = useRef(createEphemeralForemanDraftOwnerId());",
    "const [activeDraftOwnerId, setActiveDraftOwnerIdState] = useState<string | null>(",
    "activeDraftOwnerId,",
  ]),
  postSubmitRebindsToLocalOwner: includesAll(foremanDraftBoundarySource, [
    'activeDraftIdAfter: FOREMAN_LOCAL_ONLY_REQUEST_ID',
    "activeDraftOwnerIdAfter: freshDraftSnapshot.ownerId",
    'runtimeResult: "post_submit_fresh_draft_state"',
  ]),
  draftModalUsesVisualModel: includesAll(foremanDraftModalSource, [
    "buildForemanDraftVisualModel",
    "draftVisualModel.statusLabel",
    "draftVisualModel.helperText",
    "Черновик {draftVisualModel.requestLabel}",
  ]),
};
(foremanDraftRolloverSmoke as JsonRecord).passed =
  Object.values(foremanDraftRolloverSmoke).every((value) => value === true);

const foremanAiDraftOwnerSmoke = {
  tracksOpenedDraftOwner: foremanAiQuickFlowSource.includes("openedDraftOwnerIdRef"),
  aiUsesCanonicalActiveOwner: foremanAiQuickFlowSource.includes("activeDraftOwnerId: string | null;"),
  lifecycleRebindsOnOwnerChange: foremanAiQuickFlowSource.includes(
    'rebindAiQuickToActiveDraft("lifecycle")',
  ),
  ownerComparisonUsesCanonicalOwner: includesAll(foremanAiQuickFlowSource, [
    "const currentOwnerId = ridStr(activeDraftOwnerId);",
    "if (!openedOwnerId || openedOwnerId === currentOwnerId) return true;",
  ]),
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
  duplicateSubmitGuard: includesAll(foremanDraftBoundarySource, [
    "lastSubmittedOwnerIdRef.current === submitOwnerId",
    "submitInFlightOwnerIdRef.current === submitOwnerId && draftSyncInFlightRef.current",
    'throw new Error("Этот черновик уже отправлен. Откройте новый активный черновик.");',
  ]),
  directorWorkInclusion: (directorWorkInclusionAudit as JsonRecord).passed === true,
  foremanRuntimeVerified: foremanRuntimeGatePassed,
  green:
    (directorRequestScrollSmoke as JsonRecord).passed === true &&
    (foremanDraftRolloverSmoke as JsonRecord).passed === true &&
    (foremanAiDraftOwnerSmoke as JsonRecord).passed === true &&
    includesAll(foremanDraftBoundarySource, [
      "lastSubmittedOwnerIdRef.current === submitOwnerId",
      "submitInFlightOwnerIdRef.current === submitOwnerId && draftSyncInFlightRef.current",
      'throw new Error("Этот черновик уже отправлен. Откройте новый активный черновик.");',
    ]) &&
    (directorWorkInclusionAudit as JsonRecord).passed === true &&
    foremanRuntimeGatePassed,
  status:
    (directorRequestScrollSmoke as JsonRecord).passed === true &&
    (foremanDraftRolloverSmoke as JsonRecord).passed === true &&
    (foremanAiDraftOwnerSmoke as JsonRecord).passed === true &&
    includesAll(foremanDraftBoundarySource, [
      "lastSubmittedOwnerIdRef.current === submitOwnerId",
      "submitInFlightOwnerIdRef.current === submitOwnerId && draftSyncInFlightRef.current",
      'throw new Error("Этот черновик уже отправлен. Откройте новый активный черновик.");',
    ]) &&
    (directorWorkInclusionAudit as JsonRecord).passed === true &&
    foremanRuntimeGatePassed
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
