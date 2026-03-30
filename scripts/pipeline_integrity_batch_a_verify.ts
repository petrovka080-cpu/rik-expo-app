import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { classifyRpcCompatError } from "../src/lib/api/_core";

const root = process.cwd();
const artifactsDir = resolve(root, "artifacts");

const proposalsPath = "src/lib/api/proposals.ts";
const requestsPath = "src/lib/api/requests.ts";
const corePath = "src/lib/api/_core.ts";
const proposalTypesPath = "src/lib/api/types.ts";
const directorProposalRowPath = "src/screens/director/director.proposal.row.tsx";

const readText = (relativePath: string) => readFileSync(resolve(root, relativePath), "utf8");

const extractBlock = (text: string, startMarker: string, endMarker: string) => {
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker);
  if (start < 0 || end < 0 || end <= start) return "";
  return text.slice(start, end);
};

const proposalsText = readText(proposalsPath);
const requestsText = readText(requestsPath);
const coreText = readText(corePath);
const typesText = readText(proposalTypesPath);
const directorProposalRowText = readText(directorProposalRowPath);

const proposalCreateBlock = extractBlock(
  proposalsText,
  "export async function proposalCreateFull()",
  "export async function proposalCreate()",
);
const proposalItemsBlock = extractBlock(
  proposalsText,
  "export async function proposalItems(",
  "export async function proposalSnapshotItems(",
);
const requestSubmitBlock = extractBlock(
  requestsText,
  "async function runRequestSubmitAtomicStage(",
  "function mapRequestSubmitMutationResult(",
);

const matrix = [
  {
    name: "missing_function",
    input: { message: "Could not find the function public.acc_add_payment_min(args) in the schema cache", code: "PGRST302" },
    expectedAllowNextVariant: true,
    expectedKind: "missing_function",
  },
  {
    name: "permission_denied",
    input: { message: "permission denied for function acc_add_payment_min", code: "42501" },
    expectedAllowNextVariant: false,
    expectedKind: "permission",
  },
  {
    name: "auth_error",
    input: { message: "JWT expired", code: "PGRST301" },
    expectedAllowNextVariant: false,
    expectedKind: "auth",
  },
  {
    name: "validation_error",
    input: { message: "null value in column violates not-null constraint", code: "23502" },
    expectedAllowNextVariant: false,
    expectedKind: "validation",
  },
  {
    name: "transient_transport",
    input: { message: "network timeout while calling RPC", code: "08006" },
    expectedAllowNextVariant: false,
    expectedKind: "transient",
  },
];

const rpcCompatCases = matrix.map((entry) => {
  const decision = classifyRpcCompatError(entry.input);
  return {
    ...entry,
    decision,
    passed:
      decision.allowNextVariant === entry.expectedAllowNextVariant &&
      decision.kind === entry.expectedKind,
  };
});

const proposalCreateVerification = {
  compatibilityGuardPresent: proposalCreateBlock.includes("classifyRpcCompatError"),
  postCreateVerificationPresent: proposalCreateBlock.includes("verifyCreatedProposalMeta"),
  silentCatchPresent: /catch\s*\{\s*\}/.test(proposalCreateBlock),
};

const proposalItemsVerification = {
  sourcePlanPresent: proposalItemsBlock.includes("const sourcePlan"),
  primarySourceSnapshot:
    proposalItemsBlock.indexOf('"view:proposal_snapshot_items"') >= 0 &&
    proposalItemsBlock.indexOf('"view:proposal_snapshot_items"') <
      proposalItemsBlock.indexOf('"view:proposal_items_view"'),
  tableNoLongerPrimary:
    proposalItemsBlock.indexOf('"table:proposal_items"') >
    proposalItemsBlock.indexOf('"view:proposal_items_view"'),
  silentCatchPresent: /catch\s*\{\s*\}/.test(proposalItemsBlock),
  typedContractIncludesRequestItemId: typesText.includes("request_item_id?: string | null;"),
  typedContractIncludesPrice: typesText.includes("price?: number | null;"),
  directorUsesSharedLoader: directorProposalRowText.includes('import { proposalItems } from "../../lib/api/proposals";'),
  directorNoDirectProposalItemsQueries:
    !directorProposalRowText.includes('.from("proposal_snapshot_items")') &&
    !directorProposalRowText.includes('.from("proposal_items_view")') &&
    !directorProposalRowText.includes('.from("proposal_items")'),
};

const requestSubmitVerification = {
  headUpdateFallbackRemoved: !requestsText.includes('"head_update_fallback"'),
  noClientHeadFallbackUpdate: !requestsText.includes("buildRequestSubmitFallbackUpdate"),
  noClientItemsPendingSyncFallback: !requestsText.includes("updateRequestItemsPendingStatus("),
  legacyPostDraftBranchRemoved: !requestsText.includes('"post_draft_short_circuit"'),
  noClientStatusProbe: !requestsText.includes("requestHasPostDraftItems("),
  noClientReconcilePlan: !requestsText.includes("reconcileRequestHeadStatus("),
  atomicRpcOwnerPresent: requestSubmitBlock.includes('"request_submit_atomic_v1"'),
  atomicParserPresent: requestsText.includes("parseRequestSubmitAtomicResult("),
  atomicErrorSurfacePresent: requestsText.includes("RequestSubmitAtomicError"),
  noClientRequestItemsProbeInSubmitBlock: !requestSubmitBlock.includes('.from("request_items")'),
  submitHydratesRecordAfterServerTruth: requestSubmitBlock.includes("selectRequestRecordById("),
};

const proposalCreateStatus =
  proposalCreateVerification.compatibilityGuardPresent &&
  proposalCreateVerification.postCreateVerificationPresent &&
  !proposalCreateVerification.silentCatchPresent
    ? "GREEN"
    : "NOT_GREEN";

const proposalItemsStatus =
  proposalItemsVerification.sourcePlanPresent &&
  proposalItemsVerification.primarySourceSnapshot &&
  proposalItemsVerification.tableNoLongerPrimary &&
  !proposalItemsVerification.silentCatchPresent &&
  proposalItemsVerification.typedContractIncludesRequestItemId &&
  proposalItemsVerification.typedContractIncludesPrice &&
  proposalItemsVerification.directorUsesSharedLoader &&
  proposalItemsVerification.directorNoDirectProposalItemsQueries
    ? "GREEN"
    : "NOT_GREEN";

const rpcCompatStatus = rpcCompatCases.every((entry) => entry.passed) ? "GREEN" : "NOT_GREEN";

const requestSubmitStatus =
  requestSubmitVerification.headUpdateFallbackRemoved &&
  requestSubmitVerification.noClientHeadFallbackUpdate &&
  requestSubmitVerification.noClientItemsPendingSyncFallback &&
  requestSubmitVerification.legacyPostDraftBranchRemoved &&
  requestSubmitVerification.noClientStatusProbe &&
  requestSubmitVerification.noClientReconcilePlan &&
  requestSubmitVerification.atomicRpcOwnerPresent &&
  requestSubmitVerification.atomicParserPresent &&
  requestSubmitVerification.atomicErrorSurfacePresent &&
  requestSubmitVerification.noClientRequestItemsProbeInSubmitBlock &&
  requestSubmitVerification.submitHydratesRecordAfterServerTruth
    ? "GREEN"
    : "NOT_GREEN";

const status =
  proposalCreateStatus === "GREEN" &&
  proposalItemsStatus === "GREEN" &&
  rpcCompatStatus === "GREEN" &&
  requestSubmitStatus === "GREEN"
    ? "GREEN"
    : "NOT_GREEN";

mkdirSync(artifactsDir, { recursive: true });

writeFileSync(
  join(artifactsDir, "proposal-create-verification.json"),
  `${JSON.stringify(
    {
      status: proposalCreateStatus,
      file: proposalsPath,
      ...proposalCreateVerification,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

writeFileSync(
  join(artifactsDir, "proposal-items-canonical-contract.json"),
  `${JSON.stringify(
    {
      status: proposalItemsStatus,
      files: [proposalsPath, proposalTypesPath, directorProposalRowPath],
      ...proposalItemsVerification,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

writeFileSync(
  join(artifactsDir, "rpccompat-semantic-stop-rules.json"),
  `${JSON.stringify(
    {
      status: rpcCompatStatus,
      file: corePath,
      cases: rpcCompatCases,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

writeFileSync(
  join(artifactsDir, "request-submit-atomicity-check.json"),
  `${JSON.stringify(
    {
      status: requestSubmitStatus,
      file: requestsPath,
      ...requestSubmitVerification,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

const batchSummary = {
  status,
  proposalCreateStatus,
  proposalItemsStatus,
  rpcCompatStatus,
  requestSubmitStatus,
  files: [proposalsPath, corePath, requestsPath, proposalTypesPath, directorProposalRowPath],
};

writeFileSync(
  join(artifactsDir, "pipeline-integrity-batch-a-summary.json"),
  `${JSON.stringify(batchSummary, null, 2)}\n`,
  "utf8",
);

writeFileSync(
  join(artifactsDir, "pipeline-batch-a-summary.json"),
  `${JSON.stringify(batchSummary, null, 2)}\n`,
  "utf8",
);

console.log(
  JSON.stringify(
    {
      status,
      proposalCreateStatus,
      proposalItemsStatus,
      rpcCompatStatus,
      requestSubmitStatus,
    },
    null,
    2,
  ),
);
