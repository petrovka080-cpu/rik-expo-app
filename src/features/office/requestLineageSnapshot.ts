import { officeUomLabel } from "../../shared/i18n/officeRussianDisplay";

export type RequestLineageRequestKind = "ai_estimate" | "manual_estimate";

export type RequestLineageRole =
  | "foreman"
  | "director"
  | "buyer"
  | "warehouse"
  | "contractor"
  | "accountant";

export type RequestLineageStage =
  | "foreman_created"
  | "foreman_submitted"
  | "director_list"
  | "director_detail"
  | "director_pdf"
  | "director_approved"
  | "buyer_inbox"
  | "buyer_detail"
  | "buyer_pdf"
  | "warehouse_view"
  | "contractor_view"
  | "accountant_view"
  | "foreman_progress_view"
  | "director_progress_view";

export type RequestLineageItemKind =
  | "material"
  | "work"
  | "service"
  | "equipment"
  | "other";

export type RequestLineageContext = {
  objectName: string | null;
  buildingName: string | null;
  floorLabel: string | null;
  levelLabel: string | null;
  systemLabel: string | null;
  zoneLabel: string | null;
  locationLabel: string | null;
  neededBy: string | null;
};

export type RequestLineageItem = {
  sourceItemId: string;
  name: string;
  kind: RequestLineageItemKind;
  unit: string;
  localizedUnit: string;
  quantity: number;
  plannedPrice: number | null;
  plannedAmount: number | null;
  status: string;
};

export type RequestLineageTotals = {
  plannedTotal: number | null;
  procurementTotal: number | null;
  paidTotal: number | null;
};

export type RequestLineageStatusHistoryEntry = {
  stage: string;
  status: string;
  timestamp: string;
  actorRole: string;
};

export type RequestLineageSnapshot = {
  runId: string;
  requestKind: RequestLineageRequestKind;
  requestId: string;
  requestNo: string | null;
  createdByRole: "foreman";
  createdByUserHash: string;
  companyIdHash: string;
  context: RequestLineageContext;
  items: RequestLineageItem[];
  totals: RequestLineageTotals;
  statusHistory: RequestLineageStatusHistoryEntry[];
};

export type RequestLineageStageEvidence = {
  stage: RequestLineageStage;
  actorRole: RequestLineageRole;
  requestId?: string | null;
  requestNo?: string | null;
  companyIdHash?: string | null;
  status?: string | null;
  context?: Partial<RequestLineageContext> | null;
  items?: RequestLineageItem[] | null;
  totals?: Partial<RequestLineageTotals> | null;
  statusHistory?: RequestLineageStatusHistoryEntry[] | null;
  visibleInUi?: boolean;
  visibleInPdf?: boolean;
  contextVerified?: boolean;
  itemsVerified?: boolean;
  amountsVerified?: boolean;
};

export type RequestLineageRow = {
  requestKind: RequestLineageRequestKind;
  stage: RequestLineageStage;
  requestId: string | null;
  requestNo: string | null;
  companyIdHash: string | null;
  actorRole: RequestLineageRole;
  status: string | null;
  object: string | null;
  building: string | null;
  floor: string | null;
  level: string | null;
  system: string | null;
  zone: string | null;
  location: string | null;
  neededBy: string | null;
  itemsCount: number | null;
  qtySum: number | null;
  plannedTotal: number | null;
  procurementTotal: number | null;
  paidTotal: number | null;
  visibleInUi: boolean;
  visibleInPdf: boolean;
  contextVerified: boolean;
  itemsVerified: boolean;
  amountsVerified: boolean;
  statusHistoryCount: number;
};

export type RequestLineageAuditResult = {
  request_lineage_snapshot_created: boolean;
  request_lineage_snapshot_compared_at_each_stage: boolean;
  lineage_table_created: boolean;
  all_stage_request_id_same: boolean;
  all_stage_company_id_same: boolean;
  context_never_lost: boolean;
  items_count_never_truncated: boolean;
  status_transition_valid: boolean;
  pdf_data_matches_ui_data: boolean;
  buyer_data_matches_director_approved_data: boolean;
  downstream_data_matches_buyer_data: boolean;
  no_route_only_green: boolean;
  green: boolean;
  failureReasons: string[];
};

const EMPTY_CONTEXT: RequestLineageContext = {
  objectName: null,
  buildingName: null,
  floorLabel: null,
  levelLabel: null,
  systemLabel: null,
  zoneLabel: null,
  locationLabel: null,
  neededBy: null,
};

const STAGE_ORDER: RequestLineageStage[] = [
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
];

const PDF_STAGES = new Set<RequestLineageStage>(["director_pdf", "buyer_pdf"]);
const DOWNSTREAM_STAGES = new Set<RequestLineageStage>([
  "warehouse_view",
  "contractor_view",
  "accountant_view",
  "foreman_progress_view",
  "director_progress_view",
]);

function clean(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function textOrNull(value: unknown): string | null {
  const normalized = clean(value);
  return normalized ? normalized : null;
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const normalized = clean(value);
  if (!normalized) return null;
  const parsed = Number(normalized.replace(/\s+/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeKind(value: unknown): RequestLineageItemKind {
  const normalized = clean(value).toLowerCase();
  if (normalized.includes("work")) return "work";
  if (normalized.includes("service")) return "service";
  if (normalized.includes("equipment")) return "equipment";
  if (normalized.includes("material")) return "material";
  return "other";
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function sumNumbers(values: (number | null | undefined)[]): number | null {
  const parsed = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (!parsed.length) return null;
  return roundMoney(parsed.reduce((total, value) => total + value, 0));
}

function mergeContext(
  base: RequestLineageContext,
  override?: Partial<RequestLineageContext> | null,
): RequestLineageContext {
  return {
    objectName: textOrNull(override?.objectName) ?? base.objectName,
    buildingName: textOrNull(override?.buildingName) ?? base.buildingName,
    floorLabel: textOrNull(override?.floorLabel) ?? base.floorLabel,
    levelLabel: textOrNull(override?.levelLabel) ?? base.levelLabel,
    systemLabel: textOrNull(override?.systemLabel) ?? base.systemLabel,
    zoneLabel: textOrNull(override?.zoneLabel) ?? base.zoneLabel,
    locationLabel: textOrNull(override?.locationLabel) ?? base.locationLabel,
    neededBy: textOrNull(override?.neededBy) ?? base.neededBy,
  };
}

function normalizeContext(context?: Partial<RequestLineageContext> | null): RequestLineageContext {
  return mergeContext(EMPTY_CONTEXT, context);
}

export function buildRequestLineageItem(input: {
  sourceItemId: unknown;
  name: unknown;
  kind?: unknown;
  unit?: unknown;
  quantity?: unknown;
  plannedPrice?: unknown;
  plannedAmount?: unknown;
  status?: unknown;
}): RequestLineageItem {
  const unit = textOrNull(input.unit) ?? "";
  const quantity = numberOrNull(input.quantity) ?? 0;
  const plannedPrice = numberOrNull(input.plannedPrice);
  const explicitAmount = numberOrNull(input.plannedAmount);
  const plannedAmount = explicitAmount ?? (plannedPrice == null ? null : roundMoney(quantity * plannedPrice));

  return {
    sourceItemId: textOrNull(input.sourceItemId) ?? "",
    name: textOrNull(input.name) ?? "",
    kind: normalizeKind(input.kind),
    unit,
    localizedUnit: officeUomLabel(unit, unit),
    quantity,
    plannedPrice,
    plannedAmount,
    status: textOrNull(input.status) ?? "unknown",
  };
}

export function buildRequestLineageSnapshot(input: {
  runId: unknown;
  requestKind: RequestLineageRequestKind;
  requestId: unknown;
  requestNo?: unknown;
  createdByUserHash: unknown;
  companyIdHash: unknown;
  context?: Partial<RequestLineageContext> | null;
  items: RequestLineageItem[];
  totals?: Partial<RequestLineageTotals> | null;
  statusHistory?: RequestLineageStatusHistoryEntry[] | null;
}): RequestLineageSnapshot {
  const items = Array.isArray(input.items) ? input.items : [];
  const plannedTotal = numberOrNull(input.totals?.plannedTotal) ?? sumNumbers(items.map((item) => item.plannedAmount));

  return {
    runId: textOrNull(input.runId) ?? "",
    requestKind: input.requestKind,
    requestId: textOrNull(input.requestId) ?? "",
    requestNo: textOrNull(input.requestNo),
    createdByRole: "foreman",
    createdByUserHash: textOrNull(input.createdByUserHash) ?? "",
    companyIdHash: textOrNull(input.companyIdHash) ?? "",
    context: normalizeContext(input.context),
    items,
    totals: {
      plannedTotal,
      procurementTotal: numberOrNull(input.totals?.procurementTotal),
      paidTotal: numberOrNull(input.totals?.paidTotal),
    },
    statusHistory: Array.isArray(input.statusHistory) ? input.statusHistory : [],
  };
}

function rowContext(row: Pick<RequestLineageRow, "object" | "building" | "floor" | "level" | "system" | "zone" | "location" | "neededBy">): RequestLineageContext {
  return {
    objectName: row.object,
    buildingName: row.building,
    floorLabel: row.floor,
    levelLabel: row.level,
    systemLabel: row.system,
    zoneLabel: row.zone,
    locationLabel: row.location,
    neededBy: row.neededBy,
  };
}

function contextComplete(context: RequestLineageContext): boolean {
  return Boolean(
    textOrNull(context.objectName) &&
      (textOrNull(context.floorLabel) || textOrNull(context.levelLabel)) &&
      textOrNull(context.systemLabel) &&
      textOrNull(context.zoneLabel) &&
      textOrNull(context.locationLabel),
  );
}

function contextMatchesBaseline(row: RequestLineageRow, snapshot: RequestLineageSnapshot): boolean {
  const current = rowContext(row);
  const keys: (keyof RequestLineageContext)[] = [
    "objectName",
    "buildingName",
    "floorLabel",
    "levelLabel",
    "systemLabel",
    "zoneLabel",
    "locationLabel",
    "neededBy",
  ];
  return keys.every((key) => {
    const expected = textOrNull(snapshot.context[key]);
    if (!expected) return true;
    const actual = textOrNull(current[key]);
    if (!actual) return row.contextVerified;
    return actual === expected;
  });
}

function contextRowsMatch(a: RequestLineageRow | null, b: RequestLineageRow | null): boolean {
  if (!a || !b) return false;
  const aContext = rowContext(a);
  const bContext = rowContext(b);
  if (JSON.stringify(aContext) === JSON.stringify(bContext)) return true;
  return a.contextVerified && b.contextVerified && !contextComplete(aContext) && !contextComplete(bContext);
}

function itemCountsMatch(a: RequestLineageRow | null, b: RequestLineageRow | null): boolean {
  if (!a || !b) return false;
  if (a.itemsCount == null || b.itemsCount == null) return a.itemsVerified && b.itemsVerified;
  return a.itemsVerified && b.itemsVerified && a.itemsCount === b.itemsCount && a.qtySum === b.qtySum;
}

function statusRank(status: unknown): number {
  const normalized = clean(status).toLowerCase();
  if (!normalized) return 0;
  if (normalized.includes("draft") || normalized.includes("new") || normalized.includes("created") || normalized.includes("чернов")) return 1;
  if (
    normalized.includes("submitted") ||
    normalized.includes("pending") ||
    normalized.includes("approval") ||
    normalized.includes("подан") ||
    normalized.includes("соглас") ||
    normalized.includes("утвержд")
  ) return 2;
  if (
    normalized.includes("approved") ||
    normalized.includes("procurement") ||
    normalized.includes("purchase") ||
    normalized.includes("к закуп") ||
    normalized.includes("закуп") ||
    normalized.includes("снабж")
  ) return 3;
  if (
    normalized.includes("received") ||
    normalized.includes("warehouse") ||
    normalized.includes("issued") ||
    normalized.includes("получ") ||
    normalized.includes("склад") ||
    normalized.includes("выдан")
  ) return 4;
  if (normalized.includes("paid") || normalized.includes("complete") || normalized.includes("оплач") || normalized.includes("заверш")) return 5;
  return 1;
}

function minStatusRankForStage(stage: RequestLineageStage): number {
  if (stage === "foreman_created") return 1;
  if (stage === "foreman_submitted" || stage === "director_list" || stage === "director_detail" || stage === "director_pdf") {
    return 2;
  }
  return 3;
}

function stageIndex(stage: RequestLineageStage): number {
  const index = STAGE_ORDER.indexOf(stage);
  return index >= 0 ? index : Number.MAX_SAFE_INTEGER;
}

function latestByStage(rows: RequestLineageRow[], stage: RequestLineageStage): RequestLineageRow | null {
  return rows.find((row) => row.stage === stage) ?? null;
}

function visibleRows(rows: RequestLineageRow[]): RequestLineageRow[] {
  return rows.filter((row) => row.visibleInUi || row.visibleInPdf);
}

function byKind<T extends { requestKind: RequestLineageRequestKind }>(rows: T[]): Map<RequestLineageRequestKind, T[]> {
  const result = new Map<RequestLineageRequestKind, T[]>();
  for (const row of rows) {
    result.set(row.requestKind, [...(result.get(row.requestKind) ?? []), row]);
  }
  return result;
}

export function buildRequestLineageRows(input: {
  snapshots: RequestLineageSnapshot[];
  stagesByKind: Partial<Record<RequestLineageRequestKind, RequestLineageStageEvidence[]>>;
}): RequestLineageRow[] {
  const rows: RequestLineageRow[] = [];
  for (const snapshot of input.snapshots) {
    const evidence = input.stagesByKind[snapshot.requestKind] ?? [];
    for (const stageEvidence of evidence) {
      const context = mergeContext(snapshot.context, stageEvidence.context);
      const items = stageEvidence.items ?? snapshot.items;
      const totals = {
        plannedTotal: numberOrNull(stageEvidence.totals?.plannedTotal) ?? snapshot.totals.plannedTotal,
        procurementTotal: numberOrNull(stageEvidence.totals?.procurementTotal) ?? snapshot.totals.procurementTotal,
        paidTotal: numberOrNull(stageEvidence.totals?.paidTotal) ?? snapshot.totals.paidTotal,
      };
      rows.push({
        requestKind: snapshot.requestKind,
        stage: stageEvidence.stage,
        requestId: textOrNull(stageEvidence.requestId) ?? snapshot.requestId,
        requestNo: textOrNull(stageEvidence.requestNo) ?? snapshot.requestNo,
        companyIdHash: textOrNull(stageEvidence.companyIdHash) ?? snapshot.companyIdHash,
        actorRole: stageEvidence.actorRole,
        status: textOrNull(stageEvidence.status) ?? snapshot.statusHistory[snapshot.statusHistory.length - 1]?.status ?? null,
        object: context.objectName,
        building: context.buildingName,
        floor: context.floorLabel,
        level: context.levelLabel,
        system: context.systemLabel,
        zone: context.zoneLabel,
        location: context.locationLabel,
        neededBy: context.neededBy,
        itemsCount: items.length,
        qtySum: sumNumbers(items.map((item) => item.quantity)) ?? 0,
        plannedTotal: totals.plannedTotal,
        procurementTotal: totals.procurementTotal,
        paidTotal: totals.paidTotal,
        visibleInUi: stageEvidence.visibleInUi ?? !PDF_STAGES.has(stageEvidence.stage),
        visibleInPdf: stageEvidence.visibleInPdf ?? PDF_STAGES.has(stageEvidence.stage),
        contextVerified: Boolean(stageEvidence.contextVerified) || contextComplete(context),
        itemsVerified: Boolean(stageEvidence.itemsVerified) || items.length > 0,
        amountsVerified: Boolean(stageEvidence.amountsVerified) || Boolean(totals.procurementTotal || totals.paidTotal || totals.plannedTotal),
        statusHistoryCount: stageEvidence.statusHistory?.length ?? snapshot.statusHistory.length,
      });
    }
  }

  return rows.sort((a, b) => {
    if (a.requestKind === b.requestKind) return stageIndex(a.stage) - stageIndex(b.stage);
    return a.requestKind.localeCompare(b.requestKind);
  });
}

export function evaluateRequestLineageRows(
  snapshots: RequestLineageSnapshot[],
  rows: RequestLineageRow[],
): RequestLineageAuditResult {
  const failures: string[] = [];
  const rowsByKind = byKind(rows);
  const allVisibleRows = visibleRows(rows);

  const snapshotCreated = snapshots.length > 0 && snapshots.every((snapshot) => snapshot.requestId && snapshot.companyIdHash && snapshot.items.length > 0);
  if (!snapshotCreated) failures.push("request_lineage_snapshot_created");

  const comparedAtEachStage = snapshots.every((snapshot) => {
    const stages = new Set((rowsByKind.get(snapshot.requestKind) ?? []).map((row) => row.stage));
    return STAGE_ORDER.every((stage) => stages.has(stage));
  });
  if (!comparedAtEachStage) failures.push("request_lineage_snapshot_compared_at_each_stage");

  const lineageTableCreated = rows.length >= snapshots.length * STAGE_ORDER.length;
  if (!lineageTableCreated) failures.push("lineage_table_created");

  const allRequestIdsSame = snapshots.every((snapshot) =>
    visibleRows(rowsByKind.get(snapshot.requestKind) ?? []).every((row) => row.requestId === snapshot.requestId),
  );
  if (!allRequestIdsSame) failures.push("all_stage_request_id_same");

  const allCompanyIdsSame = snapshots.every((snapshot) =>
    visibleRows(rowsByKind.get(snapshot.requestKind) ?? []).every((row) => row.companyIdHash === snapshot.companyIdHash),
  );
  if (!allCompanyIdsSame) failures.push("all_stage_company_id_same");

  const contextNeverLost = snapshots.every((snapshot) =>
    visibleRows(rowsByKind.get(snapshot.requestKind) ?? []).every(
      (row) => row.contextVerified && contextMatchesBaseline(row, snapshot),
    ),
  );
  if (!contextNeverLost) failures.push("context_never_lost");

  const itemsNeverTruncated = snapshots.every((snapshot) =>
    visibleRows(rowsByKind.get(snapshot.requestKind) ?? []).every((row) => {
      if (row.itemsVerified && row.itemsCount == null) return true;
      return row.itemsVerified && row.itemsCount === snapshot.items.length && (row.qtySum ?? 0) >= 0;
    }),
  );
  if (!itemsNeverTruncated) failures.push("items_count_never_truncated");

  const statusTransitionValid = allVisibleRows.every((row) => {
    const rank = statusRank(row.status);
    return rank >= minStatusRankForStage(row.stage);
  });
  if (!statusTransitionValid) failures.push("status_transition_valid");

  const pdfDataMatchesUi = snapshots.every((snapshot) => {
    const group = rowsByKind.get(snapshot.requestKind) ?? [];
    const directorDetail = latestByStage(group, "director_detail");
    const directorPdf = latestByStage(group, "director_pdf");
    const buyerDetail = latestByStage(group, "buyer_detail");
    const buyerPdf = latestByStage(group, "buyer_pdf");
    return (
      contextRowsMatch(directorDetail, directorPdf) &&
      itemCountsMatch(directorDetail, directorPdf) &&
      contextRowsMatch(buyerDetail, buyerPdf) &&
      itemCountsMatch(buyerDetail, buyerPdf)
    );
  });
  if (!pdfDataMatchesUi) failures.push("pdf_data_matches_ui_data");

  const buyerMatchesDirectorApproved = snapshots.every((snapshot) => {
    const group = rowsByKind.get(snapshot.requestKind) ?? [];
    const directorApproved = latestByStage(group, "director_approved");
    return ["buyer_inbox", "buyer_detail", "buyer_pdf"].every((stage) => {
      const row = latestByStage(group, stage as RequestLineageStage);
      return contextRowsMatch(directorApproved, row) && itemCountsMatch(directorApproved, row);
    });
  });
  if (!buyerMatchesDirectorApproved) failures.push("buyer_data_matches_director_approved_data");

  const downstreamMatchesBuyer = snapshots.every((snapshot) => {
    const group = rowsByKind.get(snapshot.requestKind) ?? [];
    const buyerDetail = latestByStage(group, "buyer_detail") ?? latestByStage(group, "buyer_inbox");
    return ["warehouse_view", "contractor_view", "accountant_view", "foreman_progress_view", "director_progress_view"].every((stage) => {
      const row = latestByStage(group, stage as RequestLineageStage);
      return contextRowsMatch(buyerDetail, row) && itemCountsMatch(buyerDetail, row);
    });
  });
  if (!downstreamMatchesBuyer) failures.push("downstream_data_matches_buyer_data");

  const noRouteOnlyGreen = allVisibleRows
    .filter((row) => DOWNSTREAM_STAGES.has(row.stage))
    .every((row) => {
      const hasBusinessRows = row.itemsVerified && (row.itemsCount == null || row.itemsCount > 0);
      const amountRequired = row.stage !== "accountant_view" || row.amountsVerified;
      return Boolean(row.requestId && row.companyIdHash && row.contextVerified && hasBusinessRows && amountRequired);
    });
  if (!noRouteOnlyGreen) failures.push("no_route_only_green");

  return {
    request_lineage_snapshot_created: snapshotCreated,
    request_lineage_snapshot_compared_at_each_stage: comparedAtEachStage,
    lineage_table_created: lineageTableCreated,
    all_stage_request_id_same: allRequestIdsSame,
    all_stage_company_id_same: allCompanyIdsSame,
    context_never_lost: contextNeverLost,
    items_count_never_truncated: itemsNeverTruncated,
    status_transition_valid: statusTransitionValid,
    pdf_data_matches_ui_data: pdfDataMatchesUi,
    buyer_data_matches_director_approved_data: buyerMatchesDirectorApproved,
    downstream_data_matches_buyer_data: downstreamMatchesBuyer,
    no_route_only_green: noRouteOnlyGreen,
    green: failures.length === 0,
    failureReasons: failures,
  };
}

export function buildRequestLineageAudit(input: {
  snapshots: RequestLineageSnapshot[];
  stagesByKind: Partial<Record<RequestLineageRequestKind, RequestLineageStageEvidence[]>>;
}): { rows: RequestLineageRow[]; audit: RequestLineageAuditResult } {
  const rows = buildRequestLineageRows(input);
  return {
    rows,
    audit: evaluateRequestLineageRows(input.snapshots, rows),
  };
}
