import { useCallback, useMemo, useState } from "react";
import { Alert } from "react-native";

import type { RequestDetails } from "../../../lib/catalog_api";
import { recordPlatformObservability } from "../../../lib/observability/platformObservability";
import {
  buildForemanAiQuickAppliedItems,
  buildForemanAiQuickReviewGroups,
  canApplyForemanAiQuickReview,
  type ForemanAiQuickMode,
  type ForemanAiQuickSelectionMap,
} from "../foreman.aiQuickReview";
import { ridStr, toErrorText } from "../foreman.helpers";
import type { ForemanHeaderRequirementResult } from "../foreman.headerRequirements";
import type { ForemanDraftAppendInput, ForemanLocalDraftSnapshot } from "../foreman.localDraft";
import { resolveForemanQuickLocalAssist, resolveForemanQuickRequest } from "../foreman.ai";
import { useForemanUiStore } from "../foremanUi.store";
import { FOREMAN_TEXT } from "../foreman.ui";

type SyncLocalDraftResult = {
  requestId?: string | null;
  submitted?: unknown | null;
} | undefined;

type Props = {
  headerRequirements: ForemanHeaderRequirementResult;
  activateHeaderAttention: (messageOverride?: string) => boolean;
  clearHeaderAttention: () => void;
  showHint: (title: string, message: string) => void;
  requestDetails: RequestDetails | null;
  isDraftActive: boolean;
  scopeNote: string;
  itemsCount: number;
  appendLocalDraftRows: (rows: ForemanDraftAppendInput[]) => ForemanLocalDraftSnapshot | null;
  syncLocalDraftNow: (options?: {
    submit?: boolean;
    context?: string;
    overrideSnapshot?: ForemanLocalDraftSnapshot | null;
    mutationKind?:
      | "catalog_add"
      | "calc_add"
      | "ai_local_add"
      | "qty_update"
      | "row_remove"
      | "whole_cancel"
      | "submit"
      | "background_sync";
    localBeforeCount?: number | null;
    localAfterCount?: number | null;
  }) => Promise<SyncLocalDraftResult>;
  requestId: string;
  labelForRequest: (rid?: string | number | null) => string;
  currentDisplayLabel: string;
  openDraft: () => void;
  networkOnline: boolean | null;
};

const recordForemanAiQuickFallback = (
  event: string,
  error: unknown,
  extra?: Record<string, unknown>,
) =>
  recordPlatformObservability({
    screen: "foreman",
    surface: "ai_quick_flow",
    category: "ui",
    event,
    result: "error",
    fallbackUsed: true,
    errorClass: error instanceof Error ? error.name : undefined,
    errorMessage: error instanceof Error ? error.message : String(error ?? "foreman_ai_quick_failed"),
    extra: {
      module: "foreman.useForemanAiQuickFlow",
      route: "/foreman",
      role: "foreman",
      owner: "ai_quick_flow",
      severity: "error",
      ...extra,
    },
  });

const buildAiQuickSessionHint = (
  sessionHistory: { prompt: string; items: { name: string; qty: number; unit: string }[] }[],
): string => {
  const latestTurn = sessionHistory[sessionHistory.length - 1] ?? null;
  if (!latestTurn || !Array.isArray(latestTurn.items) || latestTurn.items.length === 0) return "";
  if (latestTurn.items.length === 1) {
    const latestItem = latestTurn.items[0];
    return `Последняя подтверждённая позиция: ${latestItem.name}, ${latestItem.qty} ${latestItem.unit}.`;
  }
  return `Последний подтверждённый набор: ${latestTurn.items.length} позиций.`;
};

const buildDraftAppendRows = (params: {
  scopeNote: string;
  items: {
    rik_code: string;
    qty: number;
    kind: string;
    name: string;
    unit: string;
    specs?: string | null;
  }[];
}): ForemanDraftAppendInput[] =>
  params.items.map((item) => ({
    rik_code: item.rik_code,
    qty: item.qty,
    meta: {
      note: [params.scopeNote, item.specs].filter(Boolean).join(" | ") || params.scopeNote || item.specs || null,
      app_code: null,
      kind: item.kind,
      name_human: item.name,
      uom: item.unit,
    },
  }));

export function useForemanAiQuickFlow({
  headerRequirements,
  activateHeaderAttention,
  clearHeaderAttention,
  showHint,
  requestDetails,
  isDraftActive,
  scopeNote,
  itemsCount,
  appendLocalDraftRows,
  syncLocalDraftNow,
  requestId,
  labelForRequest,
  currentDisplayLabel,
  openDraft,
  networkOnline,
}: Props) {
  const aiQuickVisible = useForemanUiStore((state) => state.aiQuickVisible);
  const setAiQuickVisible = useForemanUiStore((state) => state.setAiQuickVisible);
  const aiQuickText = useForemanUiStore((state) => state.aiQuickText);
  const setAiQuickText = useForemanUiStore((state) => state.setAiQuickText);
  const aiQuickLoading = useForemanUiStore((state) => state.aiQuickLoading);
  const setAiQuickLoading = useForemanUiStore((state) => state.setAiQuickLoading);
  const aiQuickError = useForemanUiStore((state) => state.aiQuickError);
  const setAiQuickError = useForemanUiStore((state) => state.setAiQuickError);
  const aiQuickNotice = useForemanUiStore((state) => state.aiQuickNotice);
  const setAiQuickNotice = useForemanUiStore((state) => state.setAiQuickNotice);
  const aiQuickPreview = useForemanUiStore((state) => state.aiQuickPreview);
  const setAiQuickPreview = useForemanUiStore((state) => state.setAiQuickPreview);
  const aiQuickOutcomeType = useForemanUiStore((state) => state.aiQuickOutcomeType);
  const setAiQuickOutcomeType = useForemanUiStore((state) => state.setAiQuickOutcomeType);
  const aiQuickCandidateGroups = useForemanUiStore((state) => state.aiQuickCandidateGroups);
  const setAiQuickCandidateGroups = useForemanUiStore((state) => state.setAiQuickCandidateGroups);
  const aiQuickQuestions = useForemanUiStore((state) => state.aiQuickQuestions);
  const setAiQuickQuestions = useForemanUiStore((state) => state.setAiQuickQuestions);
  const aiUnavailableReason = useForemanUiStore((state) => state.aiUnavailableReason);
  const setAiUnavailableReason = useForemanUiStore((state) => state.setAiUnavailableReason);
  const aiQuickSessionHistory = useForemanUiStore((state) => state.aiQuickSessionHistory);
  const pushAiQuickSessionTurn = useForemanUiStore((state) => state.pushAiQuickSessionTurn);
  const resetAiQuickUi = useForemanUiStore((state) => state.resetAiQuickUi);

  const [aiQuickMode, setAiQuickMode] = useState<ForemanAiQuickMode>("compose");
  const [aiQuickApplying, setAiQuickApplying] = useState(false);
  const [selectedChoicesByGroupId, setSelectedChoicesByGroupId] =
    useState<ForemanAiQuickSelectionMap>({});

  const aiQuickSessionHint = useMemo(
    () => buildAiQuickSessionHint(aiQuickSessionHistory),
    [aiQuickSessionHistory],
  );
  const aiQuickReviewGroups = useMemo(
    () => buildForemanAiQuickReviewGroups(aiQuickCandidateGroups, selectedChoicesByGroupId),
    [aiQuickCandidateGroups, selectedChoicesByGroupId],
  );
  const aiQuickCanApply = useMemo(
    () =>
      canApplyForemanAiQuickReview({
        outcomeType: aiQuickOutcomeType,
        preview: aiQuickPreview,
        reviewGroups: aiQuickReviewGroups,
        questions: aiQuickQuestions,
      }),
    [aiQuickOutcomeType, aiQuickPreview, aiQuickQuestions, aiQuickReviewGroups],
  );

  const resetReviewState = useCallback(() => {
    setAiQuickMode("compose");
    setAiQuickApplying(false);
    setSelectedChoicesByGroupId({});
  }, []);

  const clearParsedState = useCallback(() => {
    setAiQuickError("");
    setAiQuickNotice("");
    setAiQuickPreview([]);
    setAiQuickOutcomeType("idle");
    setAiQuickCandidateGroups([]);
    setAiQuickQuestions([]);
    setAiUnavailableReason("");
    setSelectedChoicesByGroupId({});
    setAiQuickMode("compose");
  }, [
    setAiQuickCandidateGroups,
    setAiQuickError,
    setAiQuickNotice,
    setAiQuickOutcomeType,
    setAiQuickPreview,
    setAiQuickQuestions,
    setAiUnavailableReason,
  ]);

  const openAiQuick = useCallback(() => {
    resetAiQuickUi();
    resetReviewState();
    setAiQuickVisible(true);
  }, [resetAiQuickUi, resetReviewState, setAiQuickVisible]);

  const closeAiQuick = useCallback(() => {
    if (aiQuickLoading || aiQuickApplying) return;
    resetAiQuickUi();
    resetReviewState();
  }, [aiQuickApplying, aiQuickLoading, resetAiQuickUi, resetReviewState]);

  const handleAiQuickTextChange = useCallback(
    (value: string) => {
      setAiQuickText(value);
      clearParsedState();
    },
    [clearParsedState, setAiQuickText],
  );

  const handleAiQuickBackToCompose = useCallback(() => {
    if (aiQuickLoading || aiQuickApplying) return;
    setAiQuickMode("compose");
  }, [aiQuickApplying, aiQuickLoading]);

  const handleAiQuickSelectCandidate = useCallback((groupId: string, rikCode: string) => {
    const normalizedGroupId = String(groupId || "").trim();
    const normalizedRikCode = String(rikCode || "").trim();
    if (!normalizedGroupId || !normalizedRikCode) return;
    setSelectedChoicesByGroupId((current) => ({
      ...current,
      [normalizedGroupId]: normalizedRikCode,
    }));
  }, []);

  const handleAiQuickParse = useCallback(async () => {
    const promptText = aiQuickText.trim();
    if (!promptText || aiQuickLoading || aiQuickApplying) return;

    if (headerRequirements.missing.length) {
      activateHeaderAttention(`${headerRequirements.message} Я перевёл вас к этим полям.`);
      resetAiQuickUi();
      resetReviewState();
      showHint(
        FOREMAN_TEXT.fillHeaderTitle,
        `${headerRequirements.message} Я перевёл вас к этим полям сверху.`,
      );
      return;
    }
    if (requestDetails && !isDraftActive) {
      Alert.alert(FOREMAN_TEXT.readonlyTitle, FOREMAN_TEXT.readonlyHint);
      return;
    }

    setAiQuickLoading(true);
    setAiQuickError("");
    setAiQuickNotice("");
    setAiQuickOutcomeType("idle");
    setAiQuickPreview([]);
    setAiQuickCandidateGroups([]);
    setAiQuickQuestions([]);
    setAiUnavailableReason("");
    setSelectedChoicesByGroupId({});

    try {
      const localAssistOutcome = resolveForemanQuickLocalAssist({
        prompt: promptText,
        lastResolvedItems: aiQuickSessionHistory[aiQuickSessionHistory.length - 1]?.items ?? [],
        networkOnline,
      });
      const outcome = localAssistOutcome ?? (await resolveForemanQuickRequest(promptText));

      if (outcome.type === "candidate_options") {
        setAiQuickOutcomeType("candidate_options");
        setAiQuickCandidateGroups(outcome.options);
        setAiQuickQuestions(outcome.questions ?? []);
        setAiUnavailableReason("");
        setAiQuickPreview(outcome.resolvedItems ?? []);
        setAiQuickError("");
        setAiQuickNotice(outcome.message || "");
        setAiQuickMode("review");
        return;
      }

      if (outcome.type === "clarify_required") {
        setAiQuickOutcomeType("clarify_required");
        setAiQuickQuestions(outcome.questions);
        setAiQuickCandidateGroups(outcome.options ?? []);
        setAiUnavailableReason("");
        setAiQuickPreview(outcome.resolvedItems ?? []);
        setAiQuickError("");
        setAiQuickNotice(outcome.message || "Нужно уточнить позиции или количество.");
        setAiQuickMode("review");
        return;
      }

      if (outcome.type === "hard_fail_safe") {
        setAiQuickOutcomeType("hard_fail_safe");
        setAiQuickQuestions(outcome.questions ?? []);
        setAiQuickCandidateGroups(outcome.options ?? []);
        setAiUnavailableReason("");
        setAiQuickPreview(outcome.resolvedItems ?? []);
        setAiQuickError("");
        setAiQuickNotice(outcome.message || "Нужно уточнить позиции или добавить их вручную.");
        setAiQuickMode("review");
        return;
      }

      if (outcome.type === "ai_unavailable") {
        setAiQuickOutcomeType("ai_unavailable");
        setAiUnavailableReason(outcome.reason);
        setAiQuickCandidateGroups([]);
        setAiQuickQuestions([]);
        setAiQuickPreview([]);
        setAiQuickError(outcome.message || "AI временно недоступен.");
        setAiQuickMode("compose");
        return;
      }

      setAiQuickOutcomeType("resolved_items");
      setAiQuickPreview(outcome.items);
      setAiQuickCandidateGroups([]);
      setAiQuickQuestions([]);
      setAiUnavailableReason("");
      setAiQuickError("");
      setAiQuickNotice(outcome.message || "");

      if (outcome.items.length === 0) {
        setAiQuickNotice("Нужно уточнить позиции или количество.");
        setAiQuickMode("compose");
        return;
      }

      setAiQuickMode("review");
    } catch (error) {
      setAiQuickError(toErrorText(error, "Не удалось разобрать AI-заявку."));
      setAiQuickMode("compose");
    } finally {
      setAiQuickLoading(false);
    }
  }, [
    activateHeaderAttention,
    aiQuickApplying,
    aiQuickLoading,
    aiQuickSessionHistory,
    aiQuickText,
    headerRequirements,
    isDraftActive,
    networkOnline,
    requestDetails,
    resetAiQuickUi,
    resetReviewState,
    setAiQuickCandidateGroups,
    setAiQuickError,
    setAiQuickLoading,
    setAiQuickNotice,
    setAiQuickOutcomeType,
    setAiQuickPreview,
    setAiQuickQuestions,
    setAiUnavailableReason,
    showHint,
  ]);

  const handleAiQuickApply = useCallback(async () => {
    if (!aiQuickCanApply || aiQuickLoading || aiQuickApplying) return;

    const promptText = aiQuickText.trim();
    const appliedItems = buildForemanAiQuickAppliedItems({
      preview: aiQuickPreview,
      reviewGroups: aiQuickReviewGroups,
    });
    if (!promptText || appliedItems.length === 0) return;

    if (requestDetails && !isDraftActive) {
      Alert.alert(FOREMAN_TEXT.readonlyTitle, FOREMAN_TEXT.readonlyHint);
      return;
    }

    setAiQuickApplying(true);
    setAiQuickError("");

    try {
      const prepared = buildDraftAppendRows({
        scopeNote,
        items: appliedItems,
      });

      const beforeLineCount = itemsCount;
      const nextSnapshot = appendLocalDraftRows(prepared);
      pushAiQuickSessionTurn({
        prompt: promptText,
        items: appliedItems,
        createdAt: new Date().toISOString(),
      });

      let syncedRequestId = ridStr(requestId);
      let localOnly = false;
      try {
        const syncResult = await syncLocalDraftNow({
          context: "applyAiResolutionToDraft",
          overrideSnapshot: nextSnapshot,
          mutationKind: "ai_local_add",
          localBeforeCount: beforeLineCount,
          localAfterCount: nextSnapshot?.items.length ?? 0,
        });
        syncedRequestId = ridStr(syncResult?.requestId) || syncedRequestId;
      } catch (error) {
        recordForemanAiQuickFallback("sync_local_draft_after_ai_apply_failed", error, {
          action: "handleAiQuickApply",
          fallbackAction: "kept_local_only",
          requestId: ridStr(requestId) || null,
        });
        localOnly = true;
      }

      const draftLabel = String(
        (syncedRequestId && labelForRequest(syncedRequestId))
          || currentDisplayLabel
          || syncedRequestId
          || "черновик",
      ).trim() || "черновик";

      clearHeaderAttention();
      resetAiQuickUi();
      resetReviewState();
      openDraft();

      if (localOnly) {
        showHint(
          "Черновик сохранён локально",
          `Позиции добавлены в ${draftLabel}. Когда сеть восстановится, черновик синхронизируется автоматически.`,
        );
        return;
      }

      showHint(
        "Позиции добавлены в черновик",
        `Позиции добавлены в ${draftLabel}. Проверьте черновик перед отправкой.`,
      );
    } catch (error) {
      setAiQuickError(toErrorText(error, "Не удалось добавить позиции в черновик."));
    } finally {
      setAiQuickApplying(false);
    }
  }, [
    aiQuickApplying,
    aiQuickCanApply,
    aiQuickLoading,
    aiQuickPreview,
    aiQuickReviewGroups,
    aiQuickText,
    appendLocalDraftRows,
    clearHeaderAttention,
    currentDisplayLabel,
    isDraftActive,
    itemsCount,
    labelForRequest,
    openDraft,
    pushAiQuickSessionTurn,
    requestDetails,
    requestId,
    resetAiQuickUi,
    resetReviewState,
    scopeNote,
    setAiQuickError,
    showHint,
    syncLocalDraftNow,
  ]);

  return {
    aiQuickVisible,
    aiQuickMode,
    aiQuickText,
    aiQuickLoading,
    aiQuickApplying,
    aiQuickError,
    aiQuickNotice,
    aiQuickPreview,
    aiQuickOutcomeType,
    aiQuickCandidateGroups,
    aiQuickQuestions,
    aiQuickSessionHint,
    aiUnavailableReason,
    aiQuickDegradedMode: networkOnline === false,
    aiQuickReviewGroups,
    aiQuickSelectedChoicesByGroupId: selectedChoicesByGroupId,
    aiQuickCanApply,
    openAiQuick,
    closeAiQuick,
    handleAiQuickTextChange,
    handleAiQuickBackToCompose,
    handleAiQuickSelectCandidate,
    handleAiQuickParse,
    handleAiQuickApply,
  };
}
