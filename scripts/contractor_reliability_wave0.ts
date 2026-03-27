import fs from "fs";
import path from "path";

type ContractorWriteSurface = {
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

type ContractorConflictClass = {
  type:
    | "retryable_network_failure"
    | "validation_conflict"
    | "server_terminal_transition"
    | "remote_divergence"
    | "stale_local_modal_snapshot"
    | "server_assigned_log_id_transition"
    | "pdf_side_effect_divergence";
  retryable: boolean;
  attentionNeeded: boolean;
  appliesTo: string[];
  notes: string;
};

const writeSurfaces: ContractorWriteSurface[] = [
  {
    key: "work_progress_submit",
    files: [
      "src/screens/contractor/contractor.workProgressSubmitFlow.ts",
      "src/screens/contractor/contractor.progressService.ts",
      "src/screens/contractor/hooks/useContractorWorkModalOpen.ts",
      "src/screens/contractor/hooks/useContractorScreenState.ts",
    ],
    currentEntry: "submitWorkProgressFlow({ workModalRow, workModalMaterials, workModalStage, workModalComment, workModalLocation })",
    currentMutations: ["insert work_progress_log", "insert work_progress_log_materials"],
    localState: [
      "workModalRow",
      "workModalMaterials",
      "workModalStage",
      "workModalComment",
      "workModalLocation",
      "jobHeader",
    ],
    persistedState: [],
    serverAssignedIdTransition: true,
    queueNeed: "full",
    riskLevel: "high",
    exactRisk:
      "submission depends on server-assigned logId after work_progress_log insert; materials insert cannot replay safely offline without staged command handling or additive atomic backend RPC",
  },
  {
    key: "act_builder_submit",
    files: [
      "src/screens/contractor/contractor.actBuilderSubmitFlow.ts",
      "src/screens/contractor/contractor.actSubmitService.ts",
      "src/screens/contractor/hooks/useContractorActBuilderOpen.ts",
      "src/screens/contractor/contractor.actBuilderReducer.ts",
    ],
    currentEntry: "submitActBuilderFlow({ actBuilderWorks, actBuilderItems, workModalRow, jobHeader })",
    currentMutations: [
      "generate contractor act PDF",
      "insert work_progress_log",
      "insert work_progress_log_materials",
    ],
    localState: [
      "actBuilderState.items",
      "actBuilderState.works",
      "actBuilderLoadState",
      "actBuilderHint",
      "workModalMaterials",
      "workModalRow",
      "jobHeader",
      "issuedItems snapshot",
    ],
    persistedState: [],
    serverAssignedIdTransition: true,
    queueNeed: "full",
    riskLevel: "high",
    exactRisk:
      "act builder mixes validation, PDF side effects and staged DB inserts; offline queue would need durable draft plus explicit separation of PDF generation from persistence before reliability rollout",
  },
  {
    key: "contractor_activation",
    files: [
      "src/screens/contractor/hooks/useContractorActivation.ts",
      "src/screens/contractor/contractor.profileService.ts",
      "src/screens/contractor/contractorUi.store.ts",
    ],
    currentEntry: "activateCode()",
    currentMutations: ["update user_profiles.is_contractor"],
    localState: ["code"],
    persistedState: [],
    serverAssignedIdTransition: false,
    queueNeed: "none",
    riskLevel: "low",
    exactRisk:
      "simple profile toggle is not a field-reliability target and does not justify queue/draft infrastructure",
  },
];

const conflictClasses: ContractorConflictClass[] = [
  {
    type: "retryable_network_failure",
    retryable: true,
    attentionNeeded: false,
    appliesTo: ["work_progress_submit", "act_builder_submit"],
    notes: "transport/session failure before DB confirmation; local draft must survive and remain retryable",
  },
  {
    type: "validation_conflict",
    retryable: false,
    attentionNeeded: true,
    appliesTo: ["work_progress_submit", "act_builder_submit"],
    notes: "invalid materials/work selection, missing object context, or server-side validation rejection should not masquerade as offline retry",
  },
  {
    type: "server_terminal_transition",
    retryable: false,
    attentionNeeded: true,
    appliesTo: ["work_progress_submit", "act_builder_submit"],
    notes: "underlying subcontract/request/progress state may already be closed or no longer writable on server",
  },
  {
    type: "remote_divergence",
    retryable: false,
    attentionNeeded: true,
    appliesTo: ["work_progress_submit", "act_builder_submit"],
    notes: "issued vs consumed quantities or work scope may change while local modal draft sits offline",
  },
  {
    type: "stale_local_modal_snapshot",
    retryable: false,
    attentionNeeded: true,
    appliesTo: ["work_progress_submit", "act_builder_submit"],
    notes: "work modal and act builder currently keep all draft state in-memory; after kill/reopen the user loses unsent edits and context",
  },
  {
    type: "server_assigned_log_id_transition",
    retryable: false,
    attentionNeeded: true,
    appliesTo: ["work_progress_submit", "act_builder_submit"],
    notes: "materials writes depend on logId returned from the initial work_progress_log insert",
  },
  {
    type: "pdf_side_effect_divergence",
    retryable: false,
    attentionNeeded: true,
    appliesTo: ["act_builder_submit"],
    notes: "PDF generation should not be coupled to queued persistence replay; recovery policy must separate document side effect from DB commit",
  },
];

const artifact = {
  status: "passed",
  generatedAt: new Date().toISOString(),
  role: "contractor",
  phase: "reliability_wave_0_assessment",
  currentPersistence: {
    present: [],
    missing: [
      "workModalRow context",
      "workModalMaterials",
      "workModalStage",
      "workModalComment",
      "workModalLocation",
      "jobHeader snapshot",
      "actBuilderState.items",
      "actBuilderState.works",
      "actBuilderLoadState",
      "actBuilderHint",
      "issuedItems snapshot",
    ],
  },
  writeSurfaces,
  conflictClasses,
  recommendation: {
    wave1Target: "work_progress_submit",
    reason:
      "it is the smallest field-critical write surface with clear user value, while act_builder_submit still mixes PDF side effects with staged persistence",
    wave1MinimalArchitecture: [
      "durable local work-progress draft keyed by progressId",
      "persisted work modal materials/stage/comment/location snapshot",
      "explicit retry/conflict state model for progress submission",
      "either staged queue with logId transition handling or additive atomic backend submit command before full offline queue",
      "manual retry / rehydrate / discard controls for work-progress draft only",
    ],
    deferUntilLater: [
      "act_builder_submit should wait until persistence is separated from PDF generation side effects",
      "full contractor-wide queue is premature before work_progress_submit proves the pattern",
      "activation flow does not need reliability infra",
    ],
    foremanReuse: [
      "durable draft persistence",
      "sync status vocabulary",
      "retry/conflict telemetry shape",
      "manual recovery controls",
    ],
    foremanDoNotCopyBlindly: [
      "request-id rekey pattern without adapting it to work_progress_log -> logId transition",
      "full queue/coalescing engine before a single contractor write surface is narrowed",
      "broad conflict UI beyond the work-progress submit path",
    ],
  },
  blockersForWave1: [
    "work progress submit currently relies on server-assigned logId before materials insert",
    "all work modal and act builder draft state is in-memory only",
    "act builder currently mixes persistence with PDF generation side effects",
  ],
};

const summary = {
  status: artifact.status,
  recommendedWave1Target: artifact.recommendation.wave1Target,
  fullQueueNeededForWholeRole: false,
  workProgressQueueNeed: "full",
  actBuilderQueueNeed: "full",
  activationQueueNeed: "none",
  currentDurableStateCount: artifact.currentPersistence.present.length,
  currentMissingDurableStateCount: artifact.currentPersistence.missing.length,
  topBlockers: artifact.blockersForWave1,
};

const artifactsDir = path.join(process.cwd(), "artifacts");
fs.mkdirSync(artifactsDir, { recursive: true });
fs.writeFileSync(
  path.join(artifactsDir, "contractor-reliability-wave0.json"),
  JSON.stringify(artifact, null, 2),
  "utf8",
);
fs.writeFileSync(
  path.join(artifactsDir, "contractor-reliability-wave0.summary.json"),
  JSON.stringify(summary, null, 2),
  "utf8",
);

console.log(JSON.stringify(summary, null, 2));
