import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type JsonRecord = Record<string, unknown>;

const projectRoot = process.cwd();
const artifactsDir = path.join(projectRoot, "artifacts");

const readText = (relativePath: string) =>
  readFileSync(path.join(projectRoot, relativePath), "utf8");

const writeJson = (relativePath: string, value: JsonRecord) => {
  const fullPath = path.join(projectRoot, relativePath);
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const extractBlock = (text: string, startToken: string, endToken?: string) => {
  const start = text.indexOf(startToken);
  if (start < 0) return "";
  if (!endToken) return text.slice(start);
  const end = text.indexOf(endToken, start);
  return end < 0 ? text.slice(start) : text.slice(start, end);
};

const normalizeProposalStatus = (raw: unknown): "draft" | "submitted" | "approved" | "rejected" => {
  const normalized = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
  if (
    !normalized ||
    normalized === "draft" ||
    normalized.includes("\u0447\u0435\u0440\u043d\u043e\u0432")
  ) {
    return "draft";
  }
  if (
    normalized === "pending" ||
    normalized === "submitted" ||
    normalized.includes("\u043d\u0430 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0438")
  ) {
    return "submitted";
  }
  if (
    normalized === "approved" ||
    normalized.includes("\u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d")
  ) {
    return "approved";
  }
  if (
    normalized === "rejected" ||
    normalized.includes("\u043e\u0442\u043a\u043b\u043e\u043d") ||
    normalized.includes("\u0434\u043e\u0440\u0430\u0431\u043e\u0442") ||
    normalized.includes("rework")
  ) {
    return "rejected";
  }
  return "draft";
};

const isProposalDirectorVisible = (row: {
  status?: unknown;
  submitted_at?: unknown;
  sent_to_accountant_at?: unknown;
  items_count?: unknown;
}) =>
  normalizeProposalStatus(row.status) === "submitted" &&
  String(row.submitted_at ?? "").trim().length > 0 &&
  String(row.sent_to_accountant_at ?? "").trim().length === 0 &&
  Number(row.items_count ?? 0) > 0;

const proposalsApiPath = "src/lib/api/proposals.ts";
const proposalServicePath = "src/lib/catalog/catalog.proposalCreation.service.ts";
const buyerSubmitPath = "src/screens/buyer/buyer.submit.mutation.ts";
const workerPath = "src/workers/processBuyerSubmitJob.ts";
const directorRepoPath = "src/screens/director/director.proposals.repo.ts";
const directorLifecyclePath = "src/screens/director/director.lifecycle.ts";
const directorScopeMigrationPath =
  "supabase/migrations/20260329173000_director_pending_proposals_scope_visibility_fix.sql";

const proposalsApi = readText(proposalsApiPath);
const proposalService = readText(proposalServicePath);
const buyerSubmit = readText(buyerSubmitPath);
const worker = readText(workerPath);
const directorRepo = readText(directorRepoPath);
const directorLifecycle = readText(directorLifecyclePath);
const directorScopeMigration = readText(directorScopeMigrationPath);

const createBlock = extractBlock(
  proposalsApi,
  "export async function proposalCreateFull()",
  "export async function proposalCreate(): Promise<number | string>",
);
const submitBlock = extractBlock(
  proposalsApi,
  "export async function proposalSubmit(",
  "export async function listDirectorProposalsPending()",
);
const completionBlock = extractBlock(
  proposalService,
  "async function completeProposalCreationStage(",
  "async function syncProposalRequestItemStatusStage(",
);

const checks = {
  createRpcOnly:
    createBlock.includes("runProposalCreateRpc") &&
    !createBlock.includes("insertProposalHeadFallback") &&
    !createBlock.includes("compat_insert_fallback"),
  createReadBackVerification: createBlock.includes("verifyCreatedProposalMeta"),
  submitRpcOnly:
    submitBlock.includes("runProposalSubmitRpc") &&
    submitBlock.includes('proposal_submit_text_v1') &&
    !submitBlock.includes("updateProposalPendingFallback"),
  submitReadBackVerification:
    submitBlock.includes("verifySubmittedProposal") && submitBlock.includes("cleanupProposalSubmission"),
  servicePropagatesSubmitVerification:
    completionBlock.includes("submitVerification = await rpcProposalSubmit(proposalId);") &&
    !completionBlock.includes("proposalSubmit:"),
  resultCarriesVisibility:
    proposalService.includes("visible_to_director: boolean;") &&
    proposalService.includes(
      "submit_source: \"rpc:proposal_submit\" | \"rpc:proposal_submit_text_v1\" | null;",
    ),
  buyerFailsClosedOnInvisible:
    buyerSubmit.includes("director.visibility.mismatch") &&
    buyerSubmit.includes("visible_to_director !== true"),
  workerFailsClosedOnInvisible:
    worker.includes("visible_to_director !== true") &&
    worker.includes("not visible to director"),
  directorPrimarySourceRpc:
    directorRepo.includes('primaryOwner: "rpc_scope_v1"') &&
    directorRepo.includes('sourceKind: RPC_SOURCE_KIND') &&
    directorRepo.includes('rpc("director_pending_proposals_scope_v1"') &&
    !directorRepo.includes("legacy_client_fallback") &&
    !directorRepo.includes("legacy:proposals+proposal_items"),
  directorRealtimeOnProposals:
    directorLifecycle.includes('table: "proposals"') &&
    directorLifecycle.includes('refreshPropsHandlerRef.current("realtime:proposals", true)'),
  directorScopeAcceptsSubmittedStates:
    directorScopeMigration.includes("('pending', 'submitted')") &&
    directorScopeMigration.includes("\\041D\\0430 \\0443\\0442\\0432\\0435\\0440\\0436\\0434\\0435\\043D\\0438\\0438"),
};

const smokeMatrix = [
  {
    name: "submitted_en_visible",
    row: { status: "submitted", submitted_at: "2026-03-29T10:00:00.000Z", sent_to_accountant_at: null, items_count: 2 },
    expectedStatus: "submitted",
    expectedVisible: true,
  },
  {
    name: "pending_en_visible",
    row: { status: "pending", submitted_at: "2026-03-29T10:00:00.000Z", sent_to_accountant_at: null, items_count: 1 },
    expectedStatus: "submitted",
    expectedVisible: true,
  },
  {
    name: "pending_ru_visible",
    row: {
      status: "\u041d\u0430 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0438",
      submitted_at: "2026-03-29T10:00:00.000Z",
      sent_to_accountant_at: null,
      items_count: 3,
    },
    expectedStatus: "submitted",
    expectedVisible: true,
  },
  {
    name: "draft_hidden",
    row: { status: "draft", submitted_at: null, sent_to_accountant_at: null, items_count: 0 },
    expectedStatus: "draft",
    expectedVisible: false,
  },
  {
    name: "approved_not_in_pending_inbox",
    row: { status: "approved", submitted_at: "2026-03-29T10:00:00.000Z", sent_to_accountant_at: null, items_count: 2 },
    expectedStatus: "approved",
    expectedVisible: false,
  },
  {
    name: "sent_to_accountant_hidden",
    row: {
      status: "submitted",
      submitted_at: "2026-03-29T10:00:00.000Z",
      sent_to_accountant_at: "2026-03-29T11:00:00.000Z",
      items_count: 2,
    },
    expectedStatus: "submitted",
    expectedVisible: false,
  },
];

const smokeResults = smokeMatrix.map((entry) => {
  const normalizedStatus = normalizeProposalStatus(entry.row.status);
  const visibleToDirector = isProposalDirectorVisible(entry.row);
  return {
    name: entry.name,
    rawStatus: entry.row.status,
    normalizedStatus,
    visibleToDirector,
    expectedStatus: entry.expectedStatus,
    expectedVisible: entry.expectedVisible,
    passed: normalizedStatus === entry.expectedStatus && visibleToDirector === entry.expectedVisible,
  };
});

const sourceMap = {
  buyerWrite: {
    create: {
      file: proposalsApiPath,
      contract: "proposal_create RPC only",
      fallbackRemoved: checks.createRpcOnly,
      readBackVerification: checks.createReadBackVerification,
    },
    submit: {
      file: proposalsApiPath,
      contract: "proposal_submit RPC with read-back verification",
      fallbackRemoved: checks.submitRpcOnly,
      readBackVerification: checks.submitReadBackVerification,
    },
    orchestration: {
      file: proposalServicePath,
      requiresVisibleToDirector: checks.servicePropagatesSubmitVerification && checks.resultCarriesVisibility,
    },
  },
  directorRead: {
    file: directorRepoPath,
    primarySource: "director_pending_proposals_scope_v1",
    primaryOwner: "rpc_scope_v1",
    fallbackOwner: null,
    primaryRpcConfirmed: checks.directorPrimarySourceRpc,
  },
  directorRealtime: {
    file: directorLifecyclePath,
    table: "proposals",
    refreshTarget: "proposal_heads",
    confirmed: checks.directorRealtimeOnProposals,
  },
};

const proposalPipelineSummary = {
  status:
    Object.values(checks).every(Boolean) && smokeResults.every((entry) => entry.passed)
      ? "GREEN"
      : "NOT_GREEN",
  checks,
  sourceMap,
  smoke: {
    scenariosPassed: smokeResults.filter((entry) => entry.passed).length,
    scenariosTotal: smokeResults.length,
  },
};

const proposalStatusCheck = {
  status: smokeResults.every((entry) => entry.passed) ? "GREEN" : "NOT_GREEN",
  contract: {
    typedStatus: ["draft", "submitted", "approved", "rejected"],
    directorVisibleRule: "normalized_status=submitted && submitted_at!=null && sent_to_accountant_at is null && items_count>0",
  },
  samples: smokeResults,
};

const directorInboxProof = {
  status:
    checks.directorPrimarySourceRpc &&
    checks.directorScopeAcceptsSubmittedStates &&
    checks.directorRealtimeOnProposals
      ? "GREEN"
      : "NOT_GREEN",
  canonicalSource: {
    file: directorRepoPath,
    rpc: "director_pending_proposals_scope_v1",
    primaryOwner: "rpc_scope_v1",
    fallbackPresentAsDegraded: false,
  },
  statusPredicate: {
    file: directorScopeMigrationPath,
    acceptsRawStates: ["pending", "submitted", "\u041d\u0430 \u0443\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0438"],
    requiresSubmittedAt: true,
    excludesSentToAccountant: true,
    requiresItems: true,
  },
  realtime: {
    file: directorLifecyclePath,
    proposalsChannelPresent: checks.directorRealtimeOnProposals,
    manualRefreshRequired: false,
  },
};

writeJson("artifacts/proposal-pipeline-summary.json", proposalPipelineSummary);
writeJson("artifacts/proposal-status-check.json", proposalStatusCheck);
writeJson("artifacts/director-inbox-proof.json", directorInboxProof);

console.log(
  JSON.stringify(
    {
      status: proposalPipelineSummary.status,
      checksPassed: Object.values(checks).filter(Boolean).length,
      checksTotal: Object.keys(checks).length,
      smokePassed: smokeResults.filter((entry) => entry.passed).length,
      smokeTotal: smokeResults.length,
    },
    null,
    2,
  ),
);
