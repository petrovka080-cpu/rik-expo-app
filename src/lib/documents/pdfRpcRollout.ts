export type PdfRpcRolloutId =
  | "payment_pdf_source_v1"
  | "warehouse_incoming_source_v1"
  | "warehouse_incoming_materials_source_v1"
  | "warehouse_object_work_source_v1"
  | "warehouse_day_materials_source_v1"
  | "director_finance_source_v1"
  | "director_production_source_v1"
  | "director_subcontract_source_v1";

export type PdfRpcRolloutMode = "force_on" | "force_off" | "auto";
export type PdfRpcRolloutAvailability = "unknown" | "available" | "missing";
export type PdfRpcRolloutFallbackReason =
  | "rpc_error"
  | "invalid_payload"
  | "disabled"
  | "missing_fields";
export type PdfRpcRolloutBranchMeta = {
  sourceBranch: "rpc_v1" | "legacy_fallback";
  fallbackReason?: PdfRpcRolloutFallbackReason;
  rpcVersion?: "v1";
  payloadShapeVersion?: "v1";
};

type PdfRpcRolloutDescriptor = {
  id: PdfRpcRolloutId;
  label: string;
  rpcFunction: string;
  migrationFile: string;
  envVar: string;
  servicePath: string;
  smokeFlow: string;
  parityFocus: string;
};

type PdfRpcRolloutRuntimeState = PdfRpcRolloutDescriptor & {
  mode: PdfRpcRolloutMode;
  availability: PdfRpcRolloutAvailability;
  lastSource: string | null;
  lastBranchMeta: PdfRpcRolloutBranchMeta | null;
  lastErrorMessage: string | null;
  lastUpdatedAt: string | null;
  missingSince: string | null;
};

const PDF_RPC_ROLLOUT_ORDER: PdfRpcRolloutDescriptor[] = [
  {
    id: "payment_pdf_source_v1",
    label: "Payment PDF source",
    rpcFunction: "pdf_payment_source_v1",
    migrationFile: "db/20260319_pdf_payment_source_rpc_v1.sql",
    envVar: "EXPO_PUBLIC_PAYMENT_PDF_SOURCE_RPC_V1",
    servicePath: "src/lib/api/paymentPdf.service.ts",
    smokeFlow: "Accountant payment preview/export",
    parityFocus: "totals, grouping, sections, manual allocations",
  },
  {
    id: "warehouse_incoming_source_v1",
    label: "Warehouse incoming form PDF source",
    rpcFunction: "pdf_warehouse_incoming_source_v1",
    migrationFile: "db/20260319_pdf_warehouse_incoming_source_rpc_v1.sql",
    envVar: "EXPO_PUBLIC_WAREHOUSE_INCOMING_PDF_SOURCE_RPC_V1",
    servicePath: "src/screens/warehouse/warehouse.incomingForm.pdf.service.ts",
    smokeFlow: "Warehouse incoming form preview/export",
    parityFocus: "header fields, rows, qty total",
  },
  {
    id: "warehouse_incoming_materials_source_v1",
    label: "Warehouse incoming materials PDF source",
    rpcFunction: "pdf_warehouse_incoming_materials_source_v1",
    migrationFile: "db/20260321_pdf_warehouse_incoming_materials_source_rpc_v1.sql",
    envVar: "EXPO_PUBLIC_WAREHOUSE_INCOMING_MATERIALS_PDF_SOURCE_RPC_V1",
    servicePath: "src/screens/warehouse/warehouse.incomingMaterialsReport.pdf.service.ts",
    smokeFlow: "Warehouse incoming materials preview/export",
    parityFocus: "rows, docsTotal, qty totals, grouping",
  },
  {
    id: "warehouse_object_work_source_v1",
    label: "Warehouse object-work PDF source",
    rpcFunction: "pdf_warehouse_object_work_source_v1",
    migrationFile: "db/20260321_pdf_warehouse_object_work_source_rpc_v1.sql",
    envVar: "EXPO_PUBLIC_WAREHOUSE_OBJECT_WORK_PDF_SOURCE_RPC_V1",
    servicePath: "src/screens/warehouse/warehouse.objectWorkReport.pdf.service.ts",
    smokeFlow: "Warehouse object-work preview/export",
    parityFocus: "rows, docsTotal, recipients, top materials, grouping",
  },
  {
    id: "warehouse_day_materials_source_v1",
    label: "Warehouse day materials PDF source",
    rpcFunction: "pdf_warehouse_day_materials_source_v1",
    migrationFile: "db/20260321_pdf_warehouse_day_materials_source_rpc_v1.sql",
    envVar: "EXPO_PUBLIC_WAREHOUSE_DAY_MATERIALS_PDF_SOURCE_RPC_V1",
    servicePath: "src/screens/warehouse/warehouse.dayMaterialsReport.pdf.service.ts",
    smokeFlow: "Warehouse day materials preview/export",
    parityFocus: "rows, docsTotal, qty totals, grouping",
  },
  {
    id: "director_finance_source_v1",
    label: "Director finance PDF source",
    rpcFunction: "pdf_director_finance_source_v1",
    migrationFile: "db/20260321_pdf_director_finance_source_rpc_v1.sql",
    envVar: "EXPO_PUBLIC_DIRECTOR_FINANCE_PDF_SOURCE_RPC_V1",
    servicePath: "src/lib/api/directorPdfSource.service.ts",
    smokeFlow: "Director finance management/supplier preview/export",
    parityFocus: "supplier grouping, debt totals, spend-kind rows",
  },
  {
    id: "director_production_source_v1",
    label: "Director production PDF source",
    rpcFunction: "pdf_director_production_source_v1",
    migrationFile: "db/20260321_pdf_director_production_source_rpc_v1.sql",
    envVar: "EXPO_PUBLIC_DIRECTOR_PRODUCTION_PDF_SOURCE_RPC_V1",
    servicePath: "src/lib/api/directorPdfSource.service.ts",
    smokeFlow: "Director reports production preview/export",
    parityFocus: "materials rows, discipline tree, base/priced stage",
  },
  {
    id: "director_subcontract_source_v1",
    label: "Director subcontract PDF source",
    rpcFunction: "pdf_director_subcontract_source_v1",
    migrationFile: "db/20260321_pdf_director_subcontract_source_rpc_v1.sql",
    envVar: "EXPO_PUBLIC_DIRECTOR_SUBCONTRACT_PDF_SOURCE_RPC_V1",
    servicePath: "src/lib/api/directorPdfSource.service.ts",
    smokeFlow: "Director subcontract preview/export",
    parityFocus: "subcontract rows, counts, object/date filtering",
  },
];

const rolloutState = new Map<PdfRpcRolloutId, PdfRpcRolloutRuntimeState>(
  PDF_RPC_ROLLOUT_ORDER.map((item) => [
    item.id,
    {
      ...item,
      mode: "auto",
      availability: "unknown",
      lastSource: null,
      lastBranchMeta: null,
      lastErrorMessage: null,
      lastUpdatedAt: null,
      missingSince: null,
    },
  ]),
);

const toIsoNow = () => new Date().toISOString();

const getStateOrThrow = (id: PdfRpcRolloutId): PdfRpcRolloutRuntimeState => {
  const state = rolloutState.get(id);
  if (!state) {
    throw new Error(`Unknown pdf rpc rollout id: ${id}`);
  }
  return state;
};

const cloneState = (state: PdfRpcRolloutRuntimeState): PdfRpcRolloutRuntimeState => ({
  ...state,
  lastBranchMeta: state.lastBranchMeta ? { ...state.lastBranchMeta } : null,
});

const getDescriptors = (ids?: PdfRpcRolloutId[]) =>
  ids?.length
    ? PDF_RPC_ROLLOUT_ORDER.filter((item) => ids.includes(item.id))
    : PDF_RPC_ROLLOUT_ORDER;

const adoptionStateOf = (state: PdfRpcRolloutRuntimeState) => {
  if (state.mode === "force_off") return "forced_legacy";
  if (state.mode === "auto" && state.availability === "missing") return "auto_disabled";
  if (state.lastBranchMeta?.sourceBranch === "rpc_v1") return "rpc_active";
  if (state.lastBranchMeta?.sourceBranch === "legacy_fallback") return "legacy_fallback";
  return "idle";
};

const nextActionOf = (state: PdfRpcRolloutRuntimeState) => {
  if (state.mode === "force_off") {
    return `Unset ${state.envVar} or switch it on before verifying rpc_v1`;
  }
  if (state.mode === "auto" && state.availability === "missing") {
    return `Apply ${state.migrationFile} on remote, then reset session disable for ${state.id}`;
  }
  if (state.lastBranchMeta?.sourceBranch === "rpc_v1") {
    return `Run parity + forced fallback checks for ${state.label}`;
  }
  if (state.lastBranchMeta?.fallbackReason === "invalid_payload") {
    return `Inspect payload shape for ${state.rpcFunction} before re-testing`;
  }
  if (state.lastBranchMeta?.fallbackReason === "missing_fields") {
    return `Fix missing required fields in ${state.rpcFunction} before enabling rpc_v1`;
  }
  if (state.lastBranchMeta?.sourceBranch === "legacy_fallback") {
    return `Inspect last RPC error and re-open ${state.smokeFlow}`;
  }
  return `Open ${state.smokeFlow} once to collect runtime branch state`;
};

export function resolvePdfRpcRolloutMode(rawValue: string): PdfRpcRolloutMode {
  const normalized = String(rawValue ?? "").trim().toLowerCase();
  if (["1", "true", "on", "enabled", "yes"].includes(normalized)) return "force_on";
  if (["0", "false", "off", "disabled", "no"].includes(normalized)) return "force_off";
  return "auto";
}

export function registerPdfRpcRolloutPath(id: PdfRpcRolloutId, mode: PdfRpcRolloutMode) {
  const state = getStateOrThrow(id);
  state.mode = mode;
}

export function getPdfRpcRolloutAvailability(
  id: PdfRpcRolloutId,
): PdfRpcRolloutAvailability {
  return getStateOrThrow(id).availability;
}

export function setPdfRpcRolloutAvailability(
  id: PdfRpcRolloutId,
  availability: PdfRpcRolloutAvailability,
  options?: { errorMessage?: string | null },
) {
  const state = getStateOrThrow(id);
  const now = toIsoNow();
  state.availability = availability;
  state.lastUpdatedAt = now;
  state.lastErrorMessage =
    options?.errorMessage !== undefined ? options.errorMessage : state.lastErrorMessage;
  if (availability === "missing") {
    state.missingSince = state.missingSince || now;
  }
  if (availability !== "missing") {
    state.missingSince = null;
  }
}

export function recordPdfRpcRolloutBranch(
  id: PdfRpcRolloutId,
  params: {
    source: string;
    branchMeta: PdfRpcRolloutBranchMeta;
    errorMessage?: string | null;
  },
) {
  const state = getStateOrThrow(id);
  state.lastSource = params.source;
  state.lastBranchMeta = { ...params.branchMeta };
  state.lastUpdatedAt = toIsoNow();
  if (params.errorMessage !== undefined) {
    state.lastErrorMessage = params.errorMessage;
  }
}

export function resetPdfRpcRolloutSessionState(ids?: PdfRpcRolloutId[]) {
  const targetIds = getDescriptors(ids).map((item) => item.id);

  for (const id of targetIds) {
    const state = getStateOrThrow(id);
    state.availability = "unknown";
    state.lastErrorMessage = null;
    state.missingSince = null;
    state.lastUpdatedAt = toIsoNow();
  }

  return getPdfRpcRolloutSnapshot();
}

export function getPdfRpcRolloutSnapshot(ids?: PdfRpcRolloutId[]) {
  return getDescriptors(ids).map((item) => {
    const state = cloneState(getStateOrThrow(item.id));
    return {
      ...state,
      adoptionState: adoptionStateOf(state),
      nextAction: nextActionOf(state),
    };
  });
}

export function getPdfRpcRolloutMigrationOrder(ids?: PdfRpcRolloutId[]) {
  return getDescriptors(ids).map((item) => ({ ...item }));
}

export function getPdfRpcRolloutApplyPlan(ids?: PdfRpcRolloutId[]) {
  return getDescriptors(ids).map((item, index) => ({
    step: index + 1,
    id: item.id,
    label: item.label,
    migrationFile: item.migrationFile,
    rpcFunction: item.rpcFunction,
    envVar: item.envVar,
    smokeFlow: item.smokeFlow,
    parityFocus: item.parityFocus,
    resetCall: `__RIK_PDF_RPC_ROLLOUT__.resetSessionDisable([\"${item.id}\"])`,
  }));
}

export function printPdfRpcRolloutApplyPlan(ids?: PdfRpcRolloutId[]) {
  const plan = getPdfRpcRolloutApplyPlan(ids);
  // eslint-disable-next-line no-console
  if (typeof console.table === "function") {
    // eslint-disable-next-line no-console
    console.table(plan);
  } else {
    if (__DEV__) console.info("[pdf-rpc-rollout-apply-plan]", plan);
  }
  return plan;
}

export function getPdfRpcRolloutSmokeChecklist(ids?: PdfRpcRolloutId[]) {
  return getDescriptors(ids).map((item) => ({
    id: item.id,
    label: item.label,
    beforeApply: "Call __RIK_PDF_RPC_ROLLOUT__.printSummary() and capture current adoptionState",
    applyStep: `Apply remote migration ${item.migrationFile}`,
    resetStep: `Call __RIK_PDF_RPC_ROLLOUT__.resetSessionDisable([\"${item.id}\"]) after apply if the path was auto-disabled`,
    rpcCheck: `Open ${item.smokeFlow} and confirm summary switches to rpc_active`,
    forcedFallbackCheck: `Set ${item.envVar}=0 and confirm forced legacy fallback still works`,
    parityFocus: item.parityFocus,
  }));
}

export function printPdfRpcRolloutSmokeChecklist(ids?: PdfRpcRolloutId[]) {
  const checklist = getPdfRpcRolloutSmokeChecklist(ids);
  // eslint-disable-next-line no-console
  if (typeof console.table === "function") {
    // eslint-disable-next-line no-console
    console.table(checklist);
  } else {
    if (__DEV__) console.info("[pdf-rpc-rollout-smoke-checklist]", checklist);
  }
  return checklist;
}

export function printPdfRpcRolloutSummary(ids?: PdfRpcRolloutId[]) {
  const snapshot = getPdfRpcRolloutSnapshot(ids).map((item) => ({
    id: item.id,
    label: item.label,
    adoptionState: item.adoptionState,
    mode: item.mode,
    availability: item.availability,
    sourceBranch: item.lastBranchMeta?.sourceBranch ?? null,
    fallbackReason: item.lastBranchMeta?.fallbackReason ?? null,
    rpcFunction: item.rpcFunction,
    migrationFile: item.migrationFile,
    envVar: item.envVar,
    smokeFlow: item.smokeFlow,
    missingSince: item.missingSince,
    lastErrorMessage: item.lastErrorMessage,
    nextAction: item.nextAction,
    lastUpdatedAt: item.lastUpdatedAt,
  }));

  // eslint-disable-next-line no-console
  if (typeof console.table === "function") {
    // eslint-disable-next-line no-console
    console.table(snapshot);
  } else {
    if (__DEV__) console.info("[pdf-rpc-rollout]", snapshot);
  }

  return snapshot;
}

const rolloutGlobal = globalThis as typeof globalThis & {
  __RIK_PDF_RPC_ROLLOUT__?: {
    getSnapshot: typeof getPdfRpcRolloutSnapshot;
    printSummary: typeof printPdfRpcRolloutSummary;
    resetSessionDisable: typeof resetPdfRpcRolloutSessionState;
    getApplyPlan: typeof getPdfRpcRolloutApplyPlan;
    printApplyPlan: typeof printPdfRpcRolloutApplyPlan;
    getSmokeChecklist: typeof getPdfRpcRolloutSmokeChecklist;
    printSmokeChecklist: typeof printPdfRpcRolloutSmokeChecklist;
    migrationOrder: ReturnType<typeof getPdfRpcRolloutMigrationOrder>;
  };
};

if (__DEV__ && !rolloutGlobal.__RIK_PDF_RPC_ROLLOUT__) {
  rolloutGlobal.__RIK_PDF_RPC_ROLLOUT__ = {
    getSnapshot: getPdfRpcRolloutSnapshot,
    printSummary: printPdfRpcRolloutSummary,
    resetSessionDisable: resetPdfRpcRolloutSessionState,
    getApplyPlan: getPdfRpcRolloutApplyPlan,
    printApplyPlan: printPdfRpcRolloutApplyPlan,
    getSmokeChecklist: getPdfRpcRolloutSmokeChecklist,
    printSmokeChecklist: printPdfRpcRolloutSmokeChecklist,
    migrationOrder: getPdfRpcRolloutMigrationOrder(),
  };
}
