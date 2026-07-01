import {
  buildRequestLineageAudit,
  buildRequestLineageItem,
  buildRequestLineageSnapshot,
  type RequestLineageRequestKind,
  type RequestLineageSnapshot,
  type RequestLineageStageEvidence,
} from "../../src/features/office/requestLineageSnapshot";

const baseContext = {
  objectName: "Admin building",
  buildingName: "Block A",
  floorLabel: "2 floor",
  levelLabel: "L2",
  systemLabel: "Electrical",
  zoneLabel: "Panel room",
  locationLabel: "Bishkek site",
  neededBy: "2026-07-10",
};

const stages = [
  "foreman_created",
  "foreman_submitted",
  "director_list",
  "director_detail",
  "director_pdf",
  "director_approved",
  "buyer_inbox",
  "buyer_detail",
  "buyer_pdf",
  "warehouse_view",
  "contractor_view",
  "accountant_view",
  "foreman_progress_view",
  "director_progress_view",
] as const;

const roleByStage = {
  foreman_created: "foreman",
  foreman_submitted: "foreman",
  director_list: "director",
  director_detail: "director",
  director_pdf: "director",
  director_approved: "director",
  buyer_inbox: "buyer",
  buyer_detail: "buyer",
  buyer_pdf: "buyer",
  warehouse_view: "warehouse",
  contractor_view: "contractor",
  accountant_view: "accountant",
  foreman_progress_view: "foreman",
  director_progress_view: "director",
} as const;

const statusByStage = {
  foreman_created: "draft",
  foreman_submitted: "submitted",
  director_list: "submitted",
  director_detail: "submitted",
  director_pdf: "submitted",
  director_approved: "approved",
  buyer_inbox: "procurement_ready",
  buyer_detail: "procurement_ready",
  buyer_pdf: "procurement_ready",
  warehouse_view: "procurement_ready",
  contractor_view: "procurement_ready",
  accountant_view: "procurement_ready",
  foreman_progress_view: "procurement_ready",
  director_progress_view: "procurement_ready",
} as const;

export function createSnapshot(kind: RequestLineageRequestKind = "ai_estimate"): RequestLineageSnapshot {
  const items = [
    buildRequestLineageItem({
      sourceItemId: `${kind}-material`,
      name: "Cable VVG",
      kind: "material",
      unit: "linear_m",
      quantity: 10,
      plannedPrice: 120,
      status: "approved",
    }),
    buildRequestLineageItem({
      sourceItemId: `${kind}-work`,
      name: "Cable laying",
      kind: "work",
      unit: "pcs",
      quantity: 2,
      plannedPrice: 300,
      status: "approved",
    }),
  ];

  return buildRequestLineageSnapshot({
    runId: "lineage-contract",
    requestKind: kind,
    requestId: kind === "ai_estimate" ? "11111111-1111-4111-8111-111111111111" : "22222222-2222-4222-8222-222222222222",
    requestNo: kind === "ai_estimate" ? "REQ-0701/2026" : "REQ-0702/2026",
    createdByUserHash: "foreman-user-hash",
    companyIdHash: "company-hash",
    context: baseContext,
    items,
    totals: {
      procurementTotal: 1800,
      paidTotal: 900,
    },
    statusHistory: [
      { stage: "foreman_created", status: "draft", timestamp: "2026-07-01T08:00:00.000Z", actorRole: "foreman" },
      { stage: "foreman_submitted", status: "submitted", timestamp: "2026-07-01T08:05:00.000Z", actorRole: "foreman" },
      { stage: "director_approved", status: "approved", timestamp: "2026-07-01T08:10:00.000Z", actorRole: "director" },
    ],
  });
}

export function createStages(
  overrides: Partial<Record<(typeof stages)[number], Partial<RequestLineageStageEvidence>>> = {},
): RequestLineageStageEvidence[] {
  return stages.map((stage) => ({
    stage,
    actorRole: roleByStage[stage],
    status: statusByStage[stage],
    visibleInUi: stage !== "director_pdf" && stage !== "buyer_pdf",
    visibleInPdf: stage === "director_pdf" || stage === "buyer_pdf",
    contextVerified: true,
    itemsVerified: true,
    amountsVerified: stage === "accountant_view" || stage === "director_progress_view",
    ...overrides[stage],
  }));
}

export function createGreenLineage() {
  const snapshots = [createSnapshot("ai_estimate"), createSnapshot("manual_estimate")];
  const stagesByKind = {
    ai_estimate: createStages(),
    manual_estimate: createStages(),
  };
  return buildRequestLineageAudit({ snapshots, stagesByKind });
}
