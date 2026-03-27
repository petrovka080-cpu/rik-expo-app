import fs from "fs";
import path from "path";

type WarehouseWriteSurface = {
  key: string;
  files: string[];
  currentEntry: string;
  currentMutations: string[];
  localState: string[];
  persistedState: string[];
  serverAssignedIdTransition: boolean;
  queueNeed: "none" | "light" | "full";
  riskLevel: "low" | "medium" | "high";
  exactRisk: string;
};

type WarehouseConflictClass = {
  type:
    | "retryable_network_failure"
    | "validation_insufficient_stock"
    | "server_terminal_transition"
    | "remote_divergence"
    | "stale_local_selection"
    | "server_assigned_id_transition";
  retryable: boolean;
  attentionNeeded: boolean;
  appliesTo: string[];
  notes: string;
};

const writeSurfaces: WarehouseWriteSurface[] = [
  {
    key: "receive_selected_for_head",
    files: [
      "src/screens/warehouse/hooks/useWarehouseReceiveFlow.ts",
      "src/screens/warehouse/hooks/useWarehouseReceiveApply.ts",
      "src/screens/warehouse/warehouse.incoming.ts",
    ],
    currentEntry: "receiveSelectedForHead(incomingId)",
    currentMutations: ["wh_receive_apply_ui"],
    localState: ["qtyInputByItem", "itemsModal", "receivingHeadId"],
    persistedState: ["recipientText", "warehousemanFio", "warehousemanHistory"],
    serverAssignedIdTransition: false,
    queueNeed: "light",
    riskLevel: "medium",
    exactRisk:
      "single known incomingId makes durable local draft + retryable command feasible, but qtyInputByItem and current modal context are in-memory only and are lost on kill/offline",
  },
  {
    key: "request_issue_batch",
    files: [
      "src/screens/warehouse/hooks/useWarehouseIssueFlow.ts",
      "src/screens/warehouse/warehouse.issue.ts",
      "src/screens/warehouse/warehouse.issue.repo.ts",
      "src/screens/warehouse/warehouse.reqPick.ts",
    ],
    currentEntry: "submitReqPick({ requestId, reqPick, reqItems })",
    currentMutations: ["issue_via_ui", "issue_add_items_via_ui", "acc_issue_commit_ledger"],
    localState: ["reqPick", "reqQtyInputByItem", "reqModal", "reqItems"],
    persistedState: ["recipientText", "warehousemanFio", "warehousemanHistory"],
    serverAssignedIdTransition: true,
    queueNeed: "full",
    riskLevel: "high",
    exactRisk:
      "multi-step server transaction depends on server-assigned issueId after createWarehouseIssue; blind queue replay would be fragile without staged command handling or additive atomic backend RPC",
  },
  {
    key: "stock_issue_batch",
    files: [
      "src/screens/warehouse/hooks/useWarehouseIssueFlow.ts",
      "src/screens/warehouse/warehouse.issue.ts",
      "src/screens/warehouse/warehouse.issue.repo.ts",
      "src/screens/warehouse/warehouse.stockPick.ts",
    ],
    currentEntry: "submitStockPick({ stockPick })",
    currentMutations: ["wh_issue_free_atomic_v4"],
    localState: ["stockPick", "stockIssueModal", "stockIssueQty", "scope selectors"],
    persistedState: ["recipientText", "warehousemanFio", "warehousemanHistory"],
    serverAssignedIdTransition: false,
    queueNeed: "light",
    riskLevel: "medium",
    exactRisk:
      "single atomic RPC is reliability-friendly, but stock cart and selected scope are not durable and current client-side availability checks can go stale while offline",
  },
];

const conflictClasses: WarehouseConflictClass[] = [
  {
    type: "retryable_network_failure",
    retryable: true,
    attentionNeeded: false,
    appliesTo: ["receive_selected_for_head", "request_issue_batch", "stock_issue_batch"],
    notes: "transport/session loss before RPC confirmation; local draft must remain and command should stay pending",
  },
  {
    type: "validation_insufficient_stock",
    retryable: false,
    attentionNeeded: true,
    appliesTo: ["request_issue_batch", "stock_issue_batch"],
    notes: "server/client availability drift; user must review or rehydrate before retry",
  },
  {
    type: "server_terminal_transition",
    retryable: false,
    attentionNeeded: true,
    appliesTo: ["receive_selected_for_head", "request_issue_batch"],
    notes: "incoming head already fully received or request line already fulfilled/closed on server",
  },
  {
    type: "remote_divergence",
    retryable: false,
    attentionNeeded: true,
    appliesTo: ["receive_selected_for_head", "request_issue_batch", "stock_issue_batch"],
    notes: "current warehouse stock / request remaining qty changed while local selection was offline",
  },
  {
    type: "stale_local_selection",
    retryable: false,
    attentionNeeded: true,
    appliesTo: ["receive_selected_for_head", "request_issue_batch", "stock_issue_batch"],
    notes: "modal context, selected head, qty input or recipient/scope combination no longer matches refreshed server rows",
  },
  {
    type: "server_assigned_id_transition",
    retryable: false,
    attentionNeeded: true,
    appliesTo: ["request_issue_batch"],
    notes: "createWarehouseIssue returns issueId required by later steps; this is the main reason request_issue should not be the first Wave 1 target without extra orchestration",
  },
];

const artifact = {
  status: "passed",
  generatedAt: new Date().toISOString(),
  role: "warehouse",
  phase: "reliability_wave_0_assessment",
  currentPersistence: {
    present: [
      "recipientText + recipientRecent via warehouse.recipient",
      "warehousemanFio + history + daily confirm timestamp via useWarehousemanFio",
    ],
    missing: [
      "reqPick",
      "reqQtyInputByItem",
      "stockPick",
      "stockIssueModal",
      "stockIssueQty",
      "qtyInputByItem for incoming receive",
      "reqModal context",
      "itemsModal context",
    ],
  },
  writeSurfaces,
  conflictClasses,
  recommendation: {
    wave1Target: "receive_selected_for_head",
    reason:
      "known incomingId + single wh_receive_apply_ui mutation makes this the lowest-risk first Warehouse reliability rollout",
    wave1MinimalArchitecture: [
      "durable local receive draft keyed by incomingId",
      "light mutation queue for receive command only",
      "worker-driven retry for wh_receive_apply_ui",
      "sync state model + retry/failed status surface reused from Foreman pattern",
      "manual retry / discard / rehydrate controls only for receive path",
    ],
    notForWave1: [
      "request_issue_batch should not be first rollout target without staged multi-step command handling or an additive atomic backend RPC",
      "full-role queue copied from Foreman would be overkill before receive path is proven",
    ],
    foremanReuse: [
      "durable draft persistence",
      "queue status vocabulary",
      "retry/conflict telemetry shape",
      "manual recovery actions",
    ],
    foremanDoNotCopyBlindly: [
      "request_sync_draft_v2 snapshot-first worker",
      "server-id rekey pattern without adapting it to issueId create/add/commit choreography",
      "full conflict surface before Warehouse receive path exists",
    ],
  },
  blockersForWave1: [
    "request issue flow is multi-step and depends on server-assigned issueId",
    "current incoming/issue selections are fully in-memory and will be lost on app kill",
    "no role-specific durable draft boundary exists yet for Warehouse",
  ],
};

const summary = {
  status: artifact.status,
  recommendedWave1Target: artifact.recommendation.wave1Target,
  fullQueueNeededForWholeRole: false,
  receivePathQueueNeed: "light",
  requestIssueQueueNeed: "full",
  stockIssueQueueNeed: "light",
  currentDurableStateCount: artifact.currentPersistence.present.length,
  currentMissingDurableStateCount: artifact.currentPersistence.missing.length,
  topBlockers: artifact.blockersForWave1,
};

const artifactsDir = path.join(process.cwd(), "artifacts");
fs.mkdirSync(artifactsDir, { recursive: true });
fs.writeFileSync(
  path.join(artifactsDir, "warehouse-reliability-wave0.json"),
  JSON.stringify(artifact, null, 2),
  "utf8",
);
fs.writeFileSync(
  path.join(artifactsDir, "warehouse-reliability-wave0.summary.json"),
  JSON.stringify(summary, null, 2),
  "utf8",
);

console.log(JSON.stringify(summary, null, 2));
