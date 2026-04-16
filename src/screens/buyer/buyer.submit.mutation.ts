import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  ProposalBucketInput,
  CreateProposalsOptions as CatalogCreateProposalsOptions,
  CreateProposalsResult as CatalogCreateProposalsResult,
} from "../../lib/catalog_api";
import type { QueuedProposalAttachment } from "../../lib/api/queuedProposalAttachments";
import { stageProposalAttachmentForQueue } from "../../lib/api/storage";
import { enqueueSubmitJob, JOB_QUEUE_ENABLED } from "../../lib/infra/jobQueue";
import { recordPlatformObservability } from "../../lib/observability/platformObservability";
import {
  classifyProposalActionFailure,
  readbackSubmittedProposalTruth,
  type ProposalActionTerminalClass,
} from "../../lib/api/proposalActionBoundary";
import type { UploadProposalAttachmentFn } from "./buyer.attachments.mutation";
import { uploadSupplierProposalAttachmentsMutation } from "./buyer.attachments.mutation";
import {
  syncSubmittedRequestItemsStatusMutation,
  type SubmitStatusStage,
} from "./buyer.status.mutation";
import {
  type AlertFn,
  type BuyerMutationFailureResult,
  type BuyerMutationResult,
  type FileLike,
  createBuyerMutationTracker,
  errMessage,
  formatBuyerMutationFailure,
  formatBuyerMutationWarnings,
  isBuyerMutationFailure,
  logBuyerActionDebug,
  makeClientRequestId,
  normalizeRuntimeError,
  toPriceString,
} from "./buyer.mutation.shared";
import { SUPP_NONE, normName } from "./buyerUtils";

type CreateProposalsApi = (
  payload: ProposalBucketInput[],
  opts?: CatalogCreateProposalsOptions,
) => Promise<CatalogCreateProposalsResult>;

type CreateProposalPayloadRow = {
  supplier: string | null;
  request_item_ids: string[];
  meta: {
    request_item_id: string;
    price?: string | null;
    supplier?: string | null;
    note?: string | null;
  }[];
};

type CreatedProposalRow = {
  id?: string | null;
  proposal_id?: string | null;
  request_item_ids?: string[] | null;
  supplier?: string | null;
  status?: string | null;
  raw_status?: string | null;
  submitted?: boolean | null;
  submitted_at?: string | null;
  visible_to_director?: boolean | null;
  submit_source?: string | null;
};

type BuyerSubmitIntentPayload = {
  requestId: string | null;
  requestItemIds: string[];
  metaById: Record<
    string,
    { supplier?: string; price?: number | string | null; note?: string | null }
  >;
  buyerId: string | null;
  buyerFio: string;
  attachments: QueuedProposalAttachment[];
};

type BuyerSubmitIntentPayloadRecord = Record<string, unknown>;

type ConfirmSendWithoutAttachments = () => Promise<boolean>;

type SubmitStage =
  | "guard_duplicate_submit"
  | "validate_selection"
  | "confirm_without_attachments"
  | "stage_queue_attachments"
  | "enqueue_submit_job"
  | "create_proposals"
  | "verify_director_visibility"
  | "upload_supplier_attachments"
  | "sync_request_items_status";

type SubmitSuccessData = {
  mode: "queue" | "sync";
  createdProposalIds: string[];
  affectedRequestItemIds: string[];
  terminalClass?: ProposalActionTerminalClass;
  readbackConfirmed?: boolean;
};

const SUBMIT_STAGE_LABELS: Record<SubmitStage, string> = {
  guard_duplicate_submit: "Duplicate submit guard",
  validate_selection: "Проверка выбранных позиций",
  confirm_without_attachments: "Подтверждение отправки без вложений",
  stage_queue_attachments: "Подготовка вложений для очереди",
  enqueue_submit_job: "Постановка submit job в очередь",
  create_proposals: "Создание предложений",
  verify_director_visibility: "Проверка handoff к директору",
  upload_supplier_attachments: "Загрузка supplier-вложений",
  sync_request_items_status: "Синхронизация request_items после submit",
};

const logSubmitBackgroundRefresh = (
  results: PromiseSettledResult<unknown>[],
  startedAt?: number,
) => {
  const failures = results.filter(
    (entry): entry is PromiseRejectedResult => entry.status === "rejected",
  );
  if (!failures.length) {
    if (typeof startedAt === "number") {
      logBuyerActionDebug("info", "[buyer.submit] backgroundRefresh.ms=", Date.now() - startedAt);
    }
    return;
  }

  recordPlatformObservability({
    screen: "buyer",
    surface: "buyer_submit_mutation",
    category: "ui",
    event: "background_refresh_warning",
    result: "error",
    sourceKind: "mutation:submit:create_proposals_by_supplier",
    fallbackUsed: true,
    errorStage: "background_refresh",
    errorClass: "BuyerSubmitBackgroundRefreshWarning",
    errorMessage: failures.map((entry) => errMessage(entry.reason)).join("; "),
    extra: {
      failureCount: failures.length,
    },
  });
};

const refreshBuyerBucketsAndInboxInBackground = (
  fetchInbox: () => Promise<void>,
  fetchBuckets: () => Promise<void>,
  startedAt?: number,
) => {
  void Promise.allSettled([fetchInbox(), fetchBuckets()]).then((results) => {
    logSubmitBackgroundRefresh(results, startedAt);
  });
};

const recordProposalSubmitBoundaryEvent = (
  event: string,
  result: "success" | "error",
  extra: Record<string, unknown>,
  error?: unknown,
) => {
  recordPlatformObservability({
    screen: "buyer",
    surface: "buyer_submit_mutation",
    category: "ui",
    event,
    result,
    sourceKind: "mutation:buyer:proposal_submit",
    errorClass: error instanceof Error ? error.name : undefined,
    errorMessage: error ? errMessage(error, "proposal submit failed") : undefined,
    extra,
  });
};

export type CreateProposalsDeps = {
  creating: boolean;
  sendingRef: { current: boolean };
  pickedIds: string[];
  metaNow: Record<
    string,
    { supplier?: string; price?: number | string | null; note?: string | null }
  >;
  attachmentsNow: Record<string, { file?: FileLike; name?: string }>;
  buyerFio: string;
  buyerId?: string | null;
  requestId?: string | null;
  needAttachWarn: boolean;
  kbOpen: boolean;
  validatePicked: () => boolean;
  confirmSendWithoutAttachments: ConfirmSendWithoutAttachments;
  apiCreateProposalsBySupplier: CreateProposalsApi;
  supabase: SupabaseClient;
  uploadProposalAttachment: UploadProposalAttachmentFn;
  setAttachments: (v: Record<string, never>) => void;
  removeFromInboxLocally: (ids: string[]) => void;
  clearPick: () => void;
  fetchInbox: () => Promise<void>;
  fetchBuckets: () => Promise<void>;
  setTab: (t: "pending") => void;
  closeSheet: () => void;
  setShowAttachBlock: (v: boolean) => void;
  showToast: (msg: string) => void;
  alert: AlertFn;
  jobQueueEnabled?: boolean;
  enqueueSubmitJobFn?: typeof enqueueSubmitJob;
  stageProposalAttachmentForQueueFn?: typeof stageProposalAttachmentForQueue;
};

type SubmitRunResult =
  | BuyerMutationFailureResult<SubmitStage>
  | {
      mode: "queue" | "sync";
      createdProposalIds: string[];
      affectedRequestItemIds: string[];
      terminalClass?: ProposalActionTerminalClass;
      readbackConfirmed?: boolean;
    };

const isSubmitFailure = (
  result: SubmitRunResult,
): result is BuyerMutationFailureResult<SubmitStage> =>
  typeof result === "object" && result !== null && "ok" in result && result.ok === false;

const buildSupplierPayload = (params: {
  ids: string[];
  metaNow: CreateProposalsDeps["metaNow"];
}): CreateProposalPayloadRow[] => {
  const bySupp = new Map<string, { ids: string[]; display: string }>();
  for (const id of params.ids) {
    const raw = (params.metaNow?.[id]?.supplier || "").trim();
    const key = normName(raw) || SUPP_NONE;
    const display = raw || SUPP_NONE;
    if (!bySupp.has(key)) bySupp.set(key, { ids: [], display });
    bySupp.get(key)?.ids.push(id);
  }

  return Array.from(bySupp.values()).map((bucket) => {
    const supplierForProposal = bucket.display === SUPP_NONE ? null : bucket.display;
    return {
      supplier: supplierForProposal,
      request_item_ids: bucket.ids,
      meta: bucket.ids.map((id) => ({
        request_item_id: id,
        price: toPriceString(params.metaNow?.[id]?.price),
        supplier: supplierForProposal,
        note: params.metaNow?.[id]?.note ?? null,
      })),
    };
  });
};

async function runQueueSubmitMutation(
  p: CreateProposalsDeps,
  tracker: ReturnType<typeof createBuyerMutationTracker<SubmitStage>>,
  ids: string[],
): Promise<SubmitRunResult> {
  const enqueueJob = p.enqueueSubmitJobFn ?? enqueueSubmitJob;
  const stageAttachment = p.stageProposalAttachmentForQueueFn ?? stageProposalAttachmentForQueue;
  const clientRequestId = makeClientRequestId();
  const attachmentEntries = Object.entries(p.attachmentsNow || {});
  const attachmentInputCount = attachmentEntries.filter(([, value]) => !!value?.file).length;
  const stagedAttachments: QueuedProposalAttachment[] = [];

  tracker.markStarted("stage_queue_attachments", {
    attachmentInputCount,
  });
  try {
    for (const [key, value] of attachmentEntries) {
      const fileName = String(value?.name || "").trim();
      if (!fileName || !value?.file) continue;
      stagedAttachments.push(
        await stageAttachment(value.file, fileName, key, "supplier_quote"),
      );
    }
  } catch (error) {
    return tracker.asFailure(
      "stage_queue_attachments",
      error,
      "Не удалось подготовить вложения для очереди",
    );
  }
  tracker.markCompleted("stage_queue_attachments", {
    attachmentInputCount,
    stagedCount: stagedAttachments.length,
  });

  const intentPayload: BuyerSubmitIntentPayload = {
    requestId: p.requestId ? String(p.requestId).trim() || null : null,
    requestItemIds: ids,
    metaById: p.metaNow || {},
    buyerId: p.buyerId ? String(p.buyerId).trim() || null : null,
    buyerFio: (p.buyerFio || "").trim(),
    attachments: stagedAttachments,
  };
  const queuePayload: BuyerSubmitIntentPayloadRecord = {
    requestId: intentPayload.requestId,
    requestItemIds: intentPayload.requestItemIds,
    metaById: intentPayload.metaById,
    buyerId: intentPayload.buyerId,
    buyerFio: intentPayload.buyerFio,
    attachments: intentPayload.attachments,
  };

  tracker.markStarted("enqueue_submit_job", {
    clientRequestId,
    stagedAttachmentCount: stagedAttachments.length,
  });
  try {
    await enqueueJob({
      jobType: "buyer_submit_proposal",
      entityType: "request_items",
      entityId: ids[0] || null,
      entityKey: p.requestId ? String(p.requestId).trim() || null : ids[0] || null,
      payload: queuePayload,
      clientRequestId,
    });
  } catch (error) {
    logBuyerActionDebug("warn", "[buyer.submit] queue.enqueue.failed", {
      clientRequestId,
      requestItemIds: ids,
      attachmentCount: stagedAttachments.length,
      error: errMessage(error, "Не удалось поставить заявку в очередь."),
      raw: error,
    });
    return tracker.asFailure(
      "enqueue_submit_job",
      normalizeRuntimeError(error, "Не удалось поставить заявку в очередь."),
      "Не удалось поставить заявку в очередь.",
    );
  }
  tracker.markCompleted("enqueue_submit_job", {
    clientRequestId,
    stagedAttachmentCount: stagedAttachments.length,
  });

  return {
    mode: "queue",
    createdProposalIds: [],
    affectedRequestItemIds: ids,
  };
}

async function runSyncSubmitMutation(
  p: CreateProposalsDeps,
  tracker: ReturnType<typeof createBuyerMutationTracker<SubmitStage>>,
  ids: string[],
): Promise<SubmitRunResult> {
  const payload = buildSupplierPayload({ ids, metaNow: p.metaNow });
  const clientRequestId =
    makeClientRequestId() ||
    `buyer-submit:${String(p.requestId ?? "request").trim() || "request"}:${Date.now().toString(36)}`;

  tracker.markStarted("create_proposals", {
    payloadBuckets: payload.length,
    pickedCount: ids.length,
    clientRequestId,
  });
  recordProposalSubmitBoundaryEvent("proposal_submit_rpc_invoked", "success", {
    payloadBuckets: payload.length,
    pickedCount: ids.length,
    clientRequestId,
  });
  let result: CatalogCreateProposalsResult;
  try {
    result = await p.apiCreateProposalsBySupplier(payload, {
      buyerFio: (p.buyerFio || "").trim(),
      requestId: p.requestId ? String(p.requestId).trim() || null : null,
      clientMutationId: clientRequestId,
    });
  } catch (error) {
    logBuyerActionDebug("warn", "[buyer.submit] createProposalsBySupplier.failed", {
      error: errMessage(error),
      pickedIds: ids,
      payloadBuckets: payload.length,
      clientRequestId,
    });
    recordProposalSubmitBoundaryEvent("proposal_submit_terminal_failure", "error", {
      stage: "create_proposals",
      terminalClass: classifyProposalActionFailure(error),
      clientRequestId,
    }, error);
    return tracker.asFailure(
      "create_proposals",
      normalizeRuntimeError(error, "Не удалось создать предложения."),
      "Не удалось создать предложения.",
    );
  }
  tracker.markCompleted("create_proposals", {
    payloadBuckets: payload.length,
    clientRequestId,
  });
  recordProposalSubmitBoundaryEvent("proposal_submit_result_received", "success", {
    payloadBuckets: payload.length,
    clientRequestId,
  });

  const created: CreatedProposalRow[] = Array.isArray(result?.proposals) ? result.proposals : [];
  if (!created.length) {
    return tracker.asFailure(
      "create_proposals",
      new Error("Не удалось сформировать предложения"),
      "Не удалось сформировать предложения",
    );
  }

  const createdProposalIds = Array.from(
    new Set(
      created
        .map((row) => String(row?.proposal_id ?? row?.id ?? "").trim())
        .filter(Boolean),
    ),
  );

  tracker.markStarted("verify_director_visibility", {
    createdCount: created.length,
  });
  const invisibleForDirector = created.filter(
    (row) => row?.submitted !== true || row?.visible_to_director !== true,
  );
  if (invisibleForDirector.length) {
    logBuyerActionDebug("warn", "[buyer.submit] director.visibility.mismatch", {
      invisibleCount: invisibleForDirector.length,
      proposals: invisibleForDirector.map((row) => ({
        proposalId: String(row?.proposal_id ?? row?.id ?? "").trim() || null,
        status: row?.status ?? null,
        rawStatus: row?.raw_status ?? null,
        submitted: row?.submitted ?? null,
        visibleToDirector: row?.visible_to_director ?? null,
        submitSource: row?.submit_source ?? null,
      })),
    });
    return tracker.asFailure(
      "verify_director_visibility",
      new Error("Предложение не дошло до директора после отправки"),
      "Предложение не дошло до директора после отправки",
    );
  }
  recordProposalSubmitBoundaryEvent("proposal_submit_readback_started", "success", {
    proposalCount: createdProposalIds.length,
    clientRequestId,
  });
  try {
    await readbackSubmittedProposalTruth(p.supabase, createdProposalIds);
  } catch (error) {
    recordProposalSubmitBoundaryEvent("proposal_submit_terminal_failure", "error", {
      stage: "verify_director_visibility",
      terminalClass: classifyProposalActionFailure(error),
      clientRequestId,
    }, error);
    return tracker.asFailure(
      "verify_director_visibility",
      error,
      "РџСЂРµРґР»РѕР¶РµРЅРёРµ РЅРµ РїРѕРґС‚РІРµСЂР¶РґРµРЅРѕ СЃРµСЂРІРµСЂРѕРј",
    );
  }
  recordProposalSubmitBoundaryEvent("proposal_submit_readback_completed", "success", {
    proposalCount: createdProposalIds.length,
    clientRequestId,
  });
  recordProposalSubmitBoundaryEvent("proposal_submit_terminal_success", "success", {
    proposalCount: createdProposalIds.length,
    clientRequestId,
    terminalClass: "success",
  });
  tracker.markCompleted("verify_director_visibility", {
    createdCount: created.length,
  });
  tracker.markStarted("upload_supplier_attachments", {
    proposalCount: created.length,
  });
  const attachmentResult = await uploadSupplierProposalAttachmentsMutation({
    createdProposals: created,
    attachmentsNow: p.attachmentsNow,
    uploadProposalAttachment: p.uploadProposalAttachment,
  });
  if (isBuyerMutationFailure(attachmentResult)) {
    tracker.warnings.push({
      stage: "upload_supplier_attachments",
      message: attachmentResult.message,
      degraded: true,
    });
  } else {
    for (const warning of attachmentResult.warnings) {
      tracker.warnings.push({
        stage: "upload_supplier_attachments",
        message: warning.message,
        degraded: true,
      });
    }
  }
  tracker.markCompleted("upload_supplier_attachments", {
    warningCount: attachmentResult.warnings.length,
  });

  const affectedIds = created.flatMap((row) =>
    Array.isArray(row?.request_item_ids) ? row.request_item_ids : [],
  );
  tracker.markStarted("sync_request_items_status", {
    affectedCount: affectedIds.length,
  });
  const statusResult = await syncSubmittedRequestItemsStatusMutation({
    supabase: p.supabase,
    affectedIds,
  });
  if (!isBuyerMutationFailure(statusResult)) {
    for (const warning of statusResult.warnings) {
      tracker.warnings.push({
        stage: "sync_request_items_status",
        message: warning.message,
        degraded: true,
      });
    }
  } else {
    tracker.warnings.push({
      stage: "sync_request_items_status",
      message: statusResult.message,
      degraded: true,
    });
  }
  tracker.markCompleted("sync_request_items_status", {
    affectedCount: affectedIds.length,
    warningCount: statusResult.warnings.length,
    mappedFrom: !isBuyerMutationFailure(statusResult)
      ? statusResult.warnings.map((warning) => warning.stage as SubmitStatusStage)
      : statusResult.failedStage,
  });

  return {
    mode: "sync",
    createdProposalIds,
    affectedRequestItemIds: affectedIds,
    terminalClass: "success",
    readbackConfirmed: true,
  };
}

export async function handleCreateProposalsBySupplierAction(
  p: CreateProposalsDeps,
): Promise<BuyerMutationResult<SubmitStage, SubmitSuccessData>> {
  const tracker = createBuyerMutationTracker<SubmitStage>({
    family: "submit",
    operation: "create_proposals_by_supplier",
    requestId: p.requestId ? String(p.requestId).trim() || null : null,
  });

  if (p.creating || p.sendingRef.current) {
    return tracker.asFailure(
      "guard_duplicate_submit",
      new Error(p.creating ? "already creating proposal submit" : "proposal submit already in flight"),
      "РћС‚РїСЂР°РІРєР° СѓР¶Рµ РІС‹РїРѕР»РЅСЏРµС‚СЃСЏ",
    );
  }

  const ids = p.pickedIds || [];
  recordProposalSubmitBoundaryEvent("proposal_submit_started", "success", {
    requestId: p.requestId ? String(p.requestId).trim() || null : null,
    pickedCount: ids.length,
    queueEnabled: p.jobQueueEnabled ?? JOB_QUEUE_ENABLED,
  });
  logBuyerActionDebug("info", "[buyer.submit] pressed", {
    pickedIds: ids,
    pickedCount: ids.length,
    attachmentKeys: Object.keys(p.attachmentsNow || {}),
    queueEnabled: p.jobQueueEnabled ?? JOB_QUEUE_ENABLED,
  });

  tracker.markStarted("validate_selection", { pickedCount: ids.length });
  if (ids.length === 0) {
    p.showToast("Выбери позиции");
    p.alert("Пусто", "Выбери позиции");
    return tracker.asFailure(
      "validate_selection",
      new Error("Выбери позиции"),
      "Выбери позиции",
    );
  }

  if (p.needAttachWarn && !p.kbOpen) {
    p.setShowAttachBlock(true);
    p.showToast("Вложения не добавлены, но отправка без них разрешена");
  }

  const validateOk = p.validatePicked();
  if (!validateOk) {
    return tracker.asFailure(
      "validate_selection",
      new Error("Валидация выбранных позиций не пройдена"),
      "Валидация выбранных позиций не пройдена",
    );
  }
  tracker.markCompleted("validate_selection", { pickedCount: ids.length });

  p.sendingRef.current = true;
  try {
    tracker.markStarted("confirm_without_attachments");
    const okNoAtt = await p.confirmSendWithoutAttachments();
    if (!okNoAtt) {
      return tracker.success(
        {
          mode: "sync",
          createdProposalIds: [],
          affectedRequestItemIds: [],
        },
        {
          skipped: true,
          guardReason: "user_cancelled_without_attachments",
        },
      );
    }
    tracker.markCompleted("confirm_without_attachments");

    const runResult =
      p.jobQueueEnabled ?? JOB_QUEUE_ENABLED
        ? await runQueueSubmitMutation(p, tracker, ids)
        : await runSyncSubmitMutation(p, tracker, ids);

    if (isSubmitFailure(runResult)) {
      p.alert(
        "Ошибка",
        formatBuyerMutationFailure(
          runResult,
          SUBMIT_STAGE_LABELS,
          "Не удалось отправить директору",
        ),
      );
      return runResult;
    }

    if (runResult.mode === "queue") {
      p.clearPick();
      p.closeSheet();
      p.alert("Отправлено", "Заявка поставлена в очередь на обработку.");
    } else {
      p.setAttachments({});
      p.removeFromInboxLocally(runResult.affectedRequestItemIds);
      p.clearPick();
      if (tracker.warnings.length > 0) {
        p.alert(
          "Отправлено с предупреждением",
          formatBuyerMutationWarnings(
            tracker.warnings,
            SUBMIT_STAGE_LABELS,
          ) || "Отправлено с предупреждениями.",
        );
      } else {
        p.alert(
          "Отправлено",
          `Создано предложений: ${runResult.createdProposalIds.length}`,
        );
      }
      p.setTab("pending");
      p.closeSheet();
    }

    refreshBuyerBucketsAndInboxInBackground(p.fetchInbox, p.fetchBuckets, Date.now());
    return tracker.success(runResult);
  } catch (error) {
    const failure = tracker.asFailure(
      "create_proposals",
      error,
      "Не удалось отправить директору",
    );
    recordProposalSubmitBoundaryEvent("proposal_submit_terminal_failure", "error", {
      stage: "create_proposals",
      terminalClass: classifyProposalActionFailure(error),
    }, error);
    p.alert(
      "Ошибка",
      formatBuyerMutationFailure(
        failure,
        SUBMIT_STAGE_LABELS,
        "Не удалось отправить директору",
      ),
    );
    return failure;
  } finally {
    p.sendingRef.current = false;
  }
}

export const SUBMIT_MUTATION_STAGE_LABELS = SUBMIT_STAGE_LABELS;
