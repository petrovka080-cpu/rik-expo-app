export type PdfRenderRolloutId = "director_render_v1";

export type PdfRenderRolloutMode = "force_on" | "force_off" | "auto";
export type PdfRenderRolloutAvailability = "unknown" | "available" | "missing";
export type PdfRenderRolloutFallbackReason =
  | "disabled"
  | "missing_env"
  | "function_missing"
  | "invoke_error"
  | "invalid_response";

export type PdfRenderRolloutBranchMeta = {
  renderBranch: "edge_render_v1" | "client_legacy_render";
  fallbackReason?: PdfRenderRolloutFallbackReason;
  renderVersion?: "v1";
  renderer?: "browserless_puppeteer" | "local_browser_puppeteer";
};

type PdfRenderRolloutDescriptor = {
  id: PdfRenderRolloutId;
  label: string;
  functionName: string;
  envVar: string;
  servicePath: string;
  smokeFlow: string;
};

type PdfRenderRolloutRuntimeState = PdfRenderRolloutDescriptor & {
  mode: PdfRenderRolloutMode;
  availability: PdfRenderRolloutAvailability;
  lastDocumentKind: string | null;
  lastBranchMeta: PdfRenderRolloutBranchMeta | null;
  lastErrorMessage: string | null;
  lastUpdatedAt: string | null;
  missingSince: string | null;
};

const PDF_RENDER_ROLLOUT_ORDER: PdfRenderRolloutDescriptor[] = [
  {
    id: "director_render_v1",
    label: "Director PDF render offload",
    functionName: "director-pdf-render",
    envVar: "EXPO_PUBLIC_DIRECTOR_PDF_RENDER_OFFLOAD_V1",
    servicePath: "src/lib/api/directorPdfRender.service.ts",
    smokeFlow: "Director finance/supplier/production/subcontract preview-export",
  },
];

const rolloutState = new Map<PdfRenderRolloutId, PdfRenderRolloutRuntimeState>(
  PDF_RENDER_ROLLOUT_ORDER.map((item) => [
    item.id,
    {
      ...item,
      mode: "auto",
      availability: "unknown",
      lastDocumentKind: null,
      lastBranchMeta: null,
      lastErrorMessage: null,
      lastUpdatedAt: null,
      missingSince: null,
    },
  ]),
);

const toIsoNow = () => new Date().toISOString();

const getStateOrThrow = (id: PdfRenderRolloutId): PdfRenderRolloutRuntimeState => {
  const state = rolloutState.get(id);
  if (!state) {
    throw new Error(`Unknown pdf render rollout id: ${id}`);
  }
  return state;
};

const cloneState = (state: PdfRenderRolloutRuntimeState): PdfRenderRolloutRuntimeState => ({
  ...state,
  lastBranchMeta: state.lastBranchMeta ? { ...state.lastBranchMeta } : null,
});

const adoptionStateOf = (state: PdfRenderRolloutRuntimeState) => {
  if (state.mode === "force_off") return "forced_client_legacy";
  if (state.mode === "auto" && state.availability === "missing") return "auto_disabled";
  if (state.lastBranchMeta?.renderBranch === "edge_render_v1") return "edge_active";
  if (state.lastBranchMeta?.renderBranch === "client_legacy_render") return "client_fallback";
  return "idle";
};

const nextActionOf = (state: PdfRenderRolloutRuntimeState) => {
  if (state.mode === "force_off") {
    return `Unset ${state.envVar} or switch it on before verifying edge render`;
  }
  if (state.mode === "auto" && state.availability === "missing") {
    return `Deploy ${state.functionName} and reset session disable for ${state.id}`;
  }
  if (state.lastBranchMeta?.renderBranch === "edge_render_v1") {
    return `Run forced fallback checks for ${state.label}`;
  }
  if (state.lastBranchMeta?.fallbackReason === "invalid_response") {
    return `Inspect ${state.functionName} response payload before re-testing`;
  }
  if (state.lastBranchMeta?.renderBranch === "client_legacy_render") {
    return `Inspect last error and re-open ${state.smokeFlow}`;
  }
  return `Open ${state.smokeFlow} once to collect runtime render branch state`;
};

export function resolvePdfRenderRolloutMode(rawValue: string): PdfRenderRolloutMode {
  const normalized = String(rawValue ?? "").trim().toLowerCase();
  if (["1", "true", "on", "enabled", "yes"].includes(normalized)) return "force_on";
  if (["0", "false", "off", "disabled", "no"].includes(normalized)) return "force_off";
  return "auto";
}

export function registerPdfRenderRolloutPath(
  id: PdfRenderRolloutId,
  mode: PdfRenderRolloutMode,
) {
  const state = getStateOrThrow(id);
  state.mode = mode;
}

export function getPdfRenderRolloutAvailability(
  id: PdfRenderRolloutId,
): PdfRenderRolloutAvailability {
  return getStateOrThrow(id).availability;
}

export function setPdfRenderRolloutAvailability(
  id: PdfRenderRolloutId,
  availability: PdfRenderRolloutAvailability,
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

export function recordPdfRenderRolloutBranch(
  id: PdfRenderRolloutId,
  params: {
    documentKind: string;
    branchMeta: PdfRenderRolloutBranchMeta;
    errorMessage?: string | null;
  },
) {
  const state = getStateOrThrow(id);
  state.lastDocumentKind = params.documentKind;
  state.lastBranchMeta = { ...params.branchMeta };
  state.lastUpdatedAt = toIsoNow();
  if (params.errorMessage !== undefined) {
    state.lastErrorMessage = params.errorMessage;
  }
}

export function resetPdfRenderRolloutSessionState(ids?: PdfRenderRolloutId[]) {
  const targetIds = ids?.length ? ids : PDF_RENDER_ROLLOUT_ORDER.map((item) => item.id);
  for (const id of targetIds) {
    const state = getStateOrThrow(id);
    state.availability = "unknown";
    state.lastErrorMessage = null;
    state.missingSince = null;
    state.lastUpdatedAt = toIsoNow();
  }
  return getPdfRenderRolloutSnapshot(ids);
}

export function getPdfRenderRolloutSnapshot(ids?: PdfRenderRolloutId[]) {
  const targetIds = ids?.length ? ids : PDF_RENDER_ROLLOUT_ORDER.map((item) => item.id);
  return targetIds.map((id) => {
    const state = cloneState(getStateOrThrow(id));
    return {
      ...state,
      adoptionState: adoptionStateOf(state),
      nextAction: nextActionOf(state),
    };
  });
}

export function printPdfRenderRolloutSummary(ids?: PdfRenderRolloutId[]) {
  const snapshot = getPdfRenderRolloutSnapshot(ids).map((item) => ({
    id: item.id,
    label: item.label,
    adoptionState: item.adoptionState,
    mode: item.mode,
    availability: item.availability,
    renderBranch: item.lastBranchMeta?.renderBranch ?? null,
    fallbackReason: item.lastBranchMeta?.fallbackReason ?? null,
    renderer: item.lastBranchMeta?.renderer ?? null,
    functionName: item.functionName,
    envVar: item.envVar,
    smokeFlow: item.smokeFlow,
    lastDocumentKind: item.lastDocumentKind,
    missingSince: item.missingSince,
    lastErrorMessage: item.lastErrorMessage,
    nextAction: item.nextAction,
    lastUpdatedAt: item.lastUpdatedAt,
  }));

  if (typeof console.table === "function") {
    console.table(snapshot);
  } else {
    if (__DEV__) console.info("[pdf-render-rollout]", snapshot);
  }

  return snapshot;
}

const rolloutGlobal = globalThis as typeof globalThis & {
  __RIK_PDF_RENDER_ROLLOUT__?: {
    getSnapshot: typeof getPdfRenderRolloutSnapshot;
    printSummary: typeof printPdfRenderRolloutSummary;
    resetSessionDisable: typeof resetPdfRenderRolloutSessionState;
  };
};

if (__DEV__ && !rolloutGlobal.__RIK_PDF_RENDER_ROLLOUT__) {
  rolloutGlobal.__RIK_PDF_RENDER_ROLLOUT__ = {
    getSnapshot: getPdfRenderRolloutSnapshot,
    printSummary: printPdfRenderRolloutSummary,
    resetSessionDisable: resetPdfRenderRolloutSessionState,
  };
}
