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

const requestsText = readText("src/lib/api/requests.ts");
const requestAtomicity = readJson<JsonRecord>("artifacts/request-submit-atomicity-check.json");
const requestsWave = readJson<JsonRecord>("artifacts/requests-mutation-wave-summary.json");

const flow = (requestsWave?.flow ?? {}) as Record<string, unknown>;
const submit = (flow.submit ?? {}) as Record<string, unknown>;
const reconcileExisting = (flow.reconcileExisting ?? {}) as Record<string, unknown>;
const controlledFailure = (flow.controlledFailure ?? {}) as Record<string, unknown>;

const ownerProof = {
  atomicRpcOwnerPresent: requestsText.includes('"request_submit_atomic_v1"'),
  noClientPostDraftProbe: !requestsText.includes("requestHasPostDraftItems("),
  noClientReconcilePlan: !requestsText.includes("reconcileRequestHeadStatus("),
  noClientRequestItemsSubmitProbe:
    !requestsText.includes('.from("request_items")\n      .select("status")'),
  controlledFailureSurface: requestsText.includes("RequestSubmitAtomicError"),
  observabilityAtomicStart: requestsText.includes("request_submit_atomic_succeeded"),
  observabilityAtomicFailure: requestsText.includes("request_submit_atomic_failed"),
};

const liveProof = {
  normalSubmitPath: String(submit.path ?? ""),
  normalSubmitPending:
    String(submit.path ?? "") === "rpc_submit" &&
    String(submit.status ?? "").trim().toLowerCase().includes("pending"),
  reconcileExistingPath: String(reconcileExisting.path ?? ""),
  reconcileExistingApproved:
    String(reconcileExisting.path ?? "") === "server_reconcile_existing" &&
    String(reconcileExisting.status ?? "").trim().length > 0,
  controlledFailureMessage: String(controlledFailure.message ?? ""),
  controlledRequestNotFound: controlledFailure.requestNotFound === true,
};

const summary = {
  gate: "request_submit_boundary_verify",
  sourceStatus: requestAtomicity?.status ?? "missing",
  runtimeStatus: requestsWave?.status ?? "missing",
  ownerProof,
  liveProof,
  green:
    requestAtomicity?.status === "GREEN" &&
    requestsWave?.status === "GREEN" &&
    Object.values(ownerProof).every((value) => value === true) &&
    liveProof.normalSubmitPending &&
    liveProof.reconcileExistingApproved &&
    liveProof.controlledRequestNotFound,
  status: "NOT GREEN",
};

summary.status = summary.green ? "GREEN" : "NOT GREEN";

writeJson("request-submit-owner-proof.json", ownerProof);
writeJson(
  "request-submit-failure-matrix.json",
  {
    controlledFailure,
    requestAtomicityStatus: requestAtomicity?.status ?? "missing",
    runtimeStatus: requestsWave?.status ?? "missing",
  },
);
writeJson("request-submit-boundary-summary.json", summary);

console.log(JSON.stringify(summary, null, 2));

if (!summary.green) {
  process.exitCode = 1;
}
