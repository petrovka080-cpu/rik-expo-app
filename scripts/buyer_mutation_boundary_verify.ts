import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

type JsonRecord = Record<string, unknown>;

type JestAssertionRecord = {
  ancestorTitles?: string[];
  title?: string;
  status?: string;
};

type JestSuiteRecord = {
  assertionResults?: JestAssertionRecord[];
};

type JestReport = {
  success?: boolean;
  testResults?: JestSuiteRecord[];
};

const projectRoot = process.cwd();

const readSource = (relativePath: string) =>
  readFileSync(path.join(projectRoot, relativePath), "utf8");

const readJson = <T,>(relativePath: string): T =>
  JSON.parse(readFileSync(path.join(projectRoot, relativePath), "utf8")) as T;

const writeJson = (relativePath: string, value: JsonRecord) => {
  const fullPath = path.join(projectRoot, relativePath);
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const flattenAssertions = (report: JestReport) =>
  (report.testResults || []).flatMap((suite) =>
    (suite.assertionResults || []).map((assertion) => ({
      fullName: [...(assertion.ancestorTitles || []), assertion.title || ""]
        .filter(Boolean)
        .join(" > "),
      status: assertion.status || "unknown",
    })),
  );

const findAssertion = (
  assertions: Array<{ fullName: string; status: string }>,
  pattern: string,
) =>
  assertions.find((assertion) => assertion.fullName.includes(pattern)) ?? {
    fullName: pattern,
    status: "missing",
  };

const isPassed = (assertion: { status: string }) => assertion.status === "passed";

const hasImport = (source: string, needle: string) => source.includes(needle);

const jestReport = readJson<JestReport>("artifacts/buyer-mutation-jest.json");
const assertions = flattenAssertions(jestReport);

const buyerActionsSource = readSource("src/screens/buyer/buyer.actions.ts");
const buyerAttachmentsActionsSource = readSource("src/screens/buyer/buyer.attachments.actions.ts");
const createFlowHookSource = readSource("src/screens/buyer/hooks/useBuyerCreateProposalsFlow.ts");
const accountingSendHookSource = readSource("src/screens/buyer/hooks/useBuyerAccountingSend.ts");
const rfqHookSource = readSource("src/screens/buyer/hooks/useBuyerRfqPublish.ts");
const reworkHookSource = readSource("src/screens/buyer/hooks/useBuyerReworkFlow.ts");
const proposalAttachmentsHookSource = readSource("src/screens/buyer/useBuyerProposalAttachments.ts");
const proposalPipelineVerifySource = readSource("scripts/proposal_pipeline_verify.ts");

const boundaryChecks = {
  buyerActionsFacadeOnly:
    buyerActionsSource.includes("./buyer.submit.mutation") &&
    buyerActionsSource.includes("./buyer.status.mutation") &&
    buyerActionsSource.includes("./buyer.rfq.mutation") &&
    buyerActionsSource.includes("./buyer.rework.mutation") &&
    !buyerActionsSource.includes("export async function handleCreateProposalsBySupplierAction") &&
    !buyerActionsSource.includes("export async function publishRfqAction") &&
    !buyerActionsSource.includes("export async function sendToAccountingAction") &&
    !buyerActionsSource.includes("export async function openReworkAction"),
  buyerAttachmentsActionsFacadeOnly:
    buyerAttachmentsActionsSource.includes("./buyer.attachments.mutation") &&
    !buyerAttachmentsActionsSource.includes("export async function attachFileToProposalAction"),
  createFlowUsesSubmitOwner: hasImport(
    createFlowHookSource,
    'from "../buyer.submit.mutation"',
  ),
  accountingHookUsesStatusOwner: hasImport(
    accountingSendHookSource,
    'from "../buyer.status.mutation"',
  ),
  accountingHookUsesAttachmentsOwner: hasImport(
    accountingSendHookSource,
    'from "../buyer.attachments.mutation"',
  ),
  rfqHookUsesOwner: hasImport(rfqHookSource, 'from "../buyer.rfq.mutation"'),
  reworkHookUsesOwner: hasImport(reworkHookSource, 'from "../buyer.rework.mutation"'),
  proposalAttachmentsUsesOwner: hasImport(
    proposalAttachmentsHookSource,
    'from "./buyer.attachments.mutation"',
  ),
  proposalPipelineVerifyMovedToSubmitOwner:
    proposalPipelineVerifySource.includes(
      'const buyerSubmitPath = "src/screens/buyer/buyer.submit.mutation.ts";',
    ) &&
    proposalPipelineVerifySource.includes("buyerFailsClosedOnInvisible"),
};

const submitHappy = findAssertion(assertions, "keeps submit happy path inside the submit owner");
const submitFailure = findAssertion(
  assertions,
  "surfaces the exact submit failure stage when director visibility breaks",
);
const submitPartial = findAssertion(
  assertions,
  "publishes partial success when post-submit status sync degrades",
);
const attachmentsHappy = findAssertion(
  assertions,
  "keeps attach-file happy path inside the attachments owner",
);
const attachmentsFailure = findAssertion(
  assertions,
  "surfaces the exact attachment stage when reload fails",
);
const attachmentsPartial = findAssertion(
  assertions,
  "does not hide partial supplier attachment upload success",
);
const statusHappy = findAssertion(
  assertions,
  "keeps status propagation happy path inside the status owner",
);
const statusFailure = findAssertion(
  assertions,
  "does not hide degraded status propagation after primary and fallback failures",
);
const accountingFailure = findAssertion(
  assertions,
  "surfaces the exact accounting handoff stage on failure",
);
const rfqHappy = findAssertion(assertions, "keeps RFQ happy path inside the rfq owner");
const rfqFailure = findAssertion(
  assertions,
  "surfaces RFQ publish failures without hiding the exact stage",
);
const reworkHappy = findAssertion(
  assertions,
  "keeps rework send-to-director happy path observable and owned",
);
const reworkFailure = findAssertion(
  assertions,
  "surfaces rework send-to-director failures at the exact stage",
);

const submitMatrix = {
  submit_happy_path: {
    test: submitHappy.fullName,
    status: submitHappy.status,
  },
  submit_mid_chain_failure: {
    test: submitFailure.fullName,
    status: submitFailure.status,
    expectedFailedStage: "verify_director_visibility",
  },
  submit_partial_success_visibility: {
    test: submitPartial.fullName,
    status: submitPartial.status,
    expectedWarningStage: "sync_request_items_status",
  },
  status_propagation_happy_path: {
    test: statusHappy.fullName,
    status: statusHappy.status,
  },
  status_propagation_failure_path: {
    test: statusFailure.fullName,
    status: statusFailure.status,
    expectedWarningStages: [
      "set_request_items_director_status",
      "clear_request_item_reject_state",
    ],
  },
  accounting_handoff_failure_path: {
    test: accountingFailure.fullName,
    status: accountingFailure.status,
    expectedFailedStage: "ensure_accounting_flags",
  },
};

const attachmentsProof = {
  attachment_happy_path: {
    test: attachmentsHappy.fullName,
    status: attachmentsHappy.status,
  },
  attachment_failure_path: {
    test: attachmentsFailure.fullName,
    status: attachmentsFailure.status,
    expectedFailedStage: "reload_attachments",
  },
  supplier_attachment_partial_success: {
    test: attachmentsPartial.fullName,
    status: attachmentsPartial.status,
    expectedWarningStage: "upload_supplier_attachments",
  },
};

const summary = {
  status:
    jestReport.success === true &&
    Object.values(boundaryChecks).every(Boolean) &&
    [
      submitHappy,
      submitFailure,
      submitPartial,
      attachmentsHappy,
      attachmentsFailure,
      attachmentsPartial,
      statusHappy,
      statusFailure,
      accountingFailure,
      rfqHappy,
      rfqFailure,
      reworkHappy,
      reworkFailure,
    ].every(isPassed)
      ? "GREEN"
      : "NOT_GREEN",
  inventory: {
    families: [
      {
        family: "submit",
        owner: "src/screens/buyer/buyer.submit.mutation.ts",
        hook: "src/screens/buyer/hooks/useBuyerCreateProposalsFlow.ts",
      },
      {
        family: "attachments",
        owner: "src/screens/buyer/buyer.attachments.mutation.ts",
        hook: "src/screens/buyer/useBuyerProposalAttachments.ts",
      },
      {
        family: "status",
        owner: "src/screens/buyer/buyer.status.mutation.ts",
        hook: "src/screens/buyer/hooks/useBuyerAccountingSend.ts",
      },
      {
        family: "rfq",
        owner: "src/screens/buyer/buyer.rfq.mutation.ts",
        hook: "src/screens/buyer/hooks/useBuyerRfqPublish.ts",
      },
      {
        family: "rework",
        owner: "src/screens/buyer/buyer.rework.mutation.ts",
        hook: "src/screens/buyer/hooks/useBuyerReworkFlow.ts",
      },
    ],
    criticalHooksNoLongerUseBuyerActions: [
      boundaryChecks.createFlowUsesSubmitOwner,
      boundaryChecks.accountingHookUsesStatusOwner,
      boundaryChecks.rfqHookUsesOwner,
      boundaryChecks.reworkHookUsesOwner,
    ].every(Boolean),
  },
  boundaryChecks,
  testSummary: {
    totalAssertions: assertions.length,
    passedAssertions: assertions.filter(isPassed).length,
  },
  mutationSmoke: {
    submitHappy: submitHappy.status,
    submitFailure: submitFailure.status,
    submitPartial: submitPartial.status,
    attachmentHappy: attachmentsHappy.status,
    attachmentFailure: attachmentsFailure.status,
    statusFailure: statusFailure.status,
    rfqFailure: rfqFailure.status,
    reworkFailure: reworkFailure.status,
  },
};

writeJson("artifacts/buyer-mutation-boundary-summary.json", summary);
writeJson("artifacts/buyer-submit-failure-matrix.json", submitMatrix);
writeJson("artifacts/buyer-attachments-stage-proof.json", attachmentsProof);

console.log(
  JSON.stringify(
    {
      status: summary.status,
      boundaryChecksPassed: Object.values(boundaryChecks).filter(Boolean).length,
      boundaryChecksTotal: Object.keys(boundaryChecks).length,
      passedAssertions: assertions.filter(isPassed).length,
      totalAssertions: assertions.length,
    },
    null,
    2,
  ),
);
