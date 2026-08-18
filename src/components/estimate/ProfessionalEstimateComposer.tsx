import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Linking,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  mapAiEstimateToForemanDraft,
  verifyForemanAiEstimatePayloadParity,
  type ForemanAiEstimateDraftMapping,
  type ForemanDraftEstimateRow,
} from "../../lib/foremanAiEstimate";
import {
  TEXT,
  buildContextText,
  buildRowInputs,
  displayNameOfCatalogItem,
  formatEstimateSection,
  formatEstimateUnit,
  formatMoney,
  parseNumberInput,
  styles,
  type CatalogQuickItem,
  type ProfessionalEstimateComposerProps,
  type RowInputState,
} from "./ProfessionalEstimateComposer.support";
import { DEFAULT_FLATLIST_PERF } from "../../lib/performance/listPerformancePolicy";
import {
  CanonicalEstimateApiError,
  type CanonicalEstimateCatalogItem,
  type CanonicalEstimateCompositeItem,
  type CanonicalEstimateCustomRow,
  type CanonicalEstimateDraftView,
  type CanonicalEstimateJobView,
  type CanonicalEstimateParameterInputValue,
  type CanonicalEstimateRecalculateRequest,
  type CanonicalEstimateRevisionRowView,
  type CanonicalEstimateRevisionView,
  type CanonicalEstimateRowOverride,
  type CanonicalEstimateSearchGroupPage,
  type CanonicalEstimateSearchItem,
  type CanonicalEstimateSearchPage,
  type CanonicalEstimateTypedRelation,
} from "../../lib/estimate/backendPlatform/contracts";
import {
  buildCanonicalEstimateArtifact,
  applyCanonicalEstimateDraftEvent,
  cancelCanonicalEstimateJob,
  compileCanonicalEstimateAndLoad,
  createCanonicalEstimateDraft,
  getAllCanonicalEstimateRevisionRows,
  getCanonicalEstimateCatalogItem,
  getCanonicalEstimateDraft,
  getCanonicalEstimateRevision,
  getCanonicalEstimateRevisionHistory,
  listCanonicalEstimateSearchGroup,
  listCanonicalEstimateTypedRelations,
  recalculateCanonicalEstimateAndLoad,
  searchCanonicalEstimateCatalog,
} from "../../lib/estimate/backendPlatform/canonicalEstimateClient";
import {
  cacheCanonicalEstimateRevision,
  queuePendingCanonicalEstimateAdmission,
  queuePendingCanonicalEstimateRecalculation,
} from "../../lib/estimate/backendPlatform/canonicalEstimateOfflineCache";
import { adaptCanonicalRevisionToStructuredEstimate } from "../../lib/estimate/backendPlatform/canonicalEstimateForemanAdapter";
import { reconcilePendingCanonicalEstimateAdmissions } from "../../lib/estimate/backendPlatform/canonicalEstimateOutboxReconciler";
import { currentUserId } from "../../lib/supabaseClient";
import { validateCanonicalEstimateParameterInputs } from "../../lib/estimate/backendPlatform/canonicalEstimateParameterValidation";
import { canonicalWorkSearchQueryFromPrompt } from "../../lib/estimate/backendPlatform/canonicalEstimateSearchInput";

type CatalogSuggestion = CanonicalEstimateSearchItem;
type RevisionBundle = { revision: CanonicalEstimateRevisionView; rows: CanonicalEstimateRevisionRowView[] };
type PendingMigration = {
  parameters: Record<string, CanonicalEstimateParameterInputValue>;
  rowOverrides: Record<string, CanonicalEstimateRowOverride>;
  customRows: CanonicalEstimateCustomRow[];
};
type ArtifactLink = { signedUrl: string; revisionId: string; releaseId: string };

function estimateRowKeyExtractor(row: ForemanDraftEstimateRow): string {
  return row.rowId;
}

async function authenticatedOwnerUserId(): Promise<string> {
  const userId = await currentUserId();
  if (!userId) throw new CanonicalEstimateApiError("Для локального cache/outbox требуется авторизованная сессия.", {
    code: "AUTH_REQUIRED",
    httpStatus: 401,
  });
  return userId;
}

function stableInputKey(value: unknown): string {
  const source = JSON.stringify(value);
  let hash = 2_166_136_261;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function amendmentReason(reason: string) {
  return { kind: "manual" as const, reason };
}

function parameterValues(parameter: CanonicalEstimateCatalogItem["parameterSchema"][number]): string[] {
  const raw = parameter.constraints.values ?? parameter.constraints.allowedValues ?? parameter.constraints.enum;
  return Array.isArray(raw) ? raw.map(String) : parameter.valueType === "boolean" ? ["false", "true"] : [];
}

function parameterTruthMissing(
  parameter: CanonicalEstimateCatalogItem["parameterSchema"][number],
): string[] {
  const missing: string[] = [];
  if (!parameter.semanticParameterKey?.trim()) missing.push("semantic_parameter_key");
  if (!parameter.visibilityRole) missing.push("visibility_role");
  if (parameter.visibilityRole === "INTERNAL_ONLY") return missing;
  if (!parameter.valueSourceRole) missing.push("value_source_role");
  if (!parameter.guide?.guideShortRu?.trim()) missing.push("guide_short_ru");
  if (!parameter.guide?.guideKind) missing.push("guide_kind");
  if (!parameter.guide?.guideVersion?.trim()) missing.push("guide_version");
  if (!parameter.guide?.sourceSnapshotHash?.match(/^[0-9a-f]{64}$/u)) missing.push("source_snapshot_hash");
  if (!parameter.guide?.applicability?.trim()) missing.push("guide_applicability");
  const guideCarriesExactNormativeSource = Boolean(
    parameter.guide?.sourceDocument?.trim() && parameter.guide?.sourceLocator?.trim(),
  );
  if (["MANDATORY_NORM_VALUE", "NORMATIVE_RANGE"].includes(parameter.guide?.guideKind ?? "")
    && !parameter.normativeLinks?.length && !guideCarriesExactNormativeSource) {
    missing.push("normative_links");
  }
  if (parameter.valueType === "array_object" && !parameter.compositeItemSchema?.subfields.length) {
    missing.push("composite_item_schema");
  }
  if (!(parameter.formulaConsumers?.length || parameter.resourceBranchConsumers?.length)) {
    missing.push("formula_or_resource_consumer");
  }
  if (!parameter.validationRules?.length) missing.push("validation_rules");
  if (!parameter.provenance || Object.keys(parameter.provenance).length === 0) missing.push("provenance");
  return missing;
}

function sourceRoleRu(value: CanonicalEstimateCatalogItem["parameterSchema"][number]["valueSourceRole"]): string {
  const labels: Record<string, string> = {
    USER_MEASURED: "Обмер пользователя",
    PROJECT_DOCUMENTATION: "Проектная документация",
    ENGINEERING_DESIGN: "Инженерный расчёт/проект",
    SITE_SURVEY: "Обследование объекта",
    MANDATORY_NORM_VALUE: "Нормативное значение",
    NORM_REQUIRED_BUT_PROJECT_SELECTED: "Норма требует проектного выбора",
    MANUFACTURER_CONFIRMED: "Подтверждено изготовителем",
    BACKEND_DERIVED: "Расчёт backend",
    PRICE_INPUT: "Источник цены",
  };
  return labels[value ?? ""] ?? "Источник не подтверждён";
}

function significantSearchLength(value: string): number {
  return (value.match(/[\p{L}\p{N}]/gu) ?? []).length;
}

function parameterValuePresent(value: CanonicalEstimateParameterInputValue | undefined): boolean {
  return Array.isArray(value) ? value.length > 0 : String(value ?? "").trim() !== "";
}

function compositeItems(value: CanonicalEstimateParameterInputValue | undefined): CanonicalEstimateCompositeItem[] {
  return Array.isArray(value) ? value : [];
}

function parameterProgress(
  catalog: CanonicalEstimateCatalogItem,
  inputs: Record<string, CanonicalEstimateParameterInputValue>,
): { filled: number; required: number; remaining: number } {
  const requiredParameters = catalog.parameterSchema.filter((parameter) =>
    parameter.required && (parameter.visibilityRole == null || parameter.visibilityRole === "USER_INPUT"));
  const filled = requiredParameters.filter((parameter) => {
    const value = inputs[parameter.parameterId];
    return Array.isArray(value) ? value.length > 0 : String(value ?? "").trim() !== "";
  }).length;
  return { filled, required: requiredParameters.length, remaining: requiredParameters.length - filled };
}

function normalizeRevisionParameters(parameters: Record<string, unknown>): Record<string, CanonicalEstimateParameterInputValue> {
  return Object.fromEntries(Object.entries(parameters).filter((entry): entry is [string, CanonicalEstimateParameterInputValue] =>
    typeof entry[1] === "string" || typeof entry[1] === "number" || typeof entry[1] === "boolean"
    || (Array.isArray(entry[1]) && entry[1].every((item) => Boolean(item) && typeof item === "object" && !Array.isArray(item)))));
}

export default function ProfessionalEstimateComposer({
  visible,
  mode,
  context,
  onClose,
  onOpenDraft,
  onDraftCreated,
  rikQuickSearch,
  initialText,
  initialRevisionId,
}: ProfessionalEstimateComposerProps) {
  const [text, setText] = useState(initialText ?? "");
  const [mapping, setMapping] = useState<ForemanAiEstimateDraftMapping | null>(null);
  const [bundle, setBundle] = useState<RevisionBundle | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [jobProgress, setJobProgress] = useState<CanonicalEstimateJobView | null>(null);
  const [activeAbort, setActiveAbort] = useState<AbortController | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogSuggestions, setCatalogSuggestions] = useState<CatalogSuggestion[]>([]);
  const [catalogSearchPage, setCatalogSearchPage] = useState<CanonicalEstimateSearchPage | null>(null);
  const [selectedSearchIdentity, setSelectedSearchIdentity] = useState<CatalogSuggestion | null>(null);
  const [backendDraft, setBackendDraft] = useState<CanonicalEstimateDraftView | null>(null);
  const [searchGroupPage, setSearchGroupPage] = useState<CanonicalEstimateSearchGroupPage | null>(null);
  const [typedRelations, setTypedRelations] = useState<CanonicalEstimateTypedRelation[]>([]);
  const [selectedCatalog, setSelectedCatalog] = useState<CanonicalEstimateCatalogItem | null>(null);
  const [parameterInputs, setParameterInputs] = useState<Record<string, CanonicalEstimateParameterInputValue>>(Object.create(null));
  const [focusedParameterId, setFocusedParameterId] = useState<string | null>(null);
  const [rowInputs, setRowInputs] = useState<Record<string, RowInputState>>(Object.create(null));
  const [rowOverrides, setRowOverrides] = useState<Record<string, CanonicalEstimateRowOverride>>(Object.create(null));
  const [customRows, setCustomRows] = useState<CanonicalEstimateCustomRow[]>([]);
  const [pendingMigration, setPendingMigration] = useState<PendingMigration | null>(null);
  const [history, setHistory] = useState<CanonicalEstimateRevisionView[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showAllParameters, setShowAllParameters] = useState(false);
  const [showParameterPanel, setShowParameterPanel] = useState(false);
  const [expandedParameterTruth, setExpandedParameterTruth] = useState<Record<string, boolean>>(Object.create(null));
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogRows, setCatalogRows] = useState<CatalogQuickItem[]>([]);
  const [artifactMessage, setArtifactMessage] = useState("");
  const [artifactLinks, setArtifactLinks] = useState<Partial<Record<"pdf" | "procurement", ArtifactLink>>>({});
  const catalogRequestSequence = useRef(0);
  const draftSaveSequence = useRef(0);
  const lastSavedDraftInputHash = useRef("");

  const contextText = useMemo(() => buildContextText(context), [context]);
  useEffect(() => {
    if (!visible) return;
    setError("");
    setText(initialText ?? "");
  }, [initialText, visible]);

  useEffect(() => {
    if (!visible) return;
    const reconcile = () => {
      void authenticatedOwnerUserId().then(reconcilePendingCanonicalEstimateAdmissions).then((result) => {
        if (result.admittedRevisionIds.length) {
          setError(`Offline outbox принят сервером: ${result.admittedRevisionIds.length} revision.`);
          if (selectedCatalog) void loadHistory(selectedCatalog.catalogId);
        }
        if (result.conflictLocalAdmissionIds.length) {
          setError(`Offline-команда требует разрешения конфликта: ${result.conflictLocalAdmissionIds.join(", ")}.`);
        }
      }).catch((nextError) => setError(nextError instanceof Error ? nextError.message : String(nextError)));
    };
    reconcile();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") reconcile();
    });
    return () => subscription.remove();
  }, [selectedCatalog, visible]);

  useEffect(() => {
    if (!visible || !backendDraft || !selectedCatalog) return;
    const inputHash = stableInputKey(parameterInputs);
    if (inputHash === lastSavedDraftInputHash.current) return;
    const sequence = ++draftSaveSequence.current;
    const timeout = setTimeout(() => {
      const unresolved = selectedCatalog.parameterSchema
        .filter((parameter) => parameter.required && parameter.visibilityRole !== "INTERNAL_ONLY"
          && parameter.visibilityRole !== "USER_DERIVED_READONLY" && !parameterValuePresent(parameterInputs[parameter.parameterId]))
        .map((parameter) => parameter.parameterId);
      void applyCanonicalEstimateDraftEvent({
        draftId: backendDraft.draftId,
        idempotencyKey: `draft-params-${backendDraft.draftId}-${backendDraft.optimisticVersion}-${inputHash}`,
        baseOptimisticVersion: backendDraft.optimisticVersion,
        eventKind: "PARAMETERS_AUTOSAVE",
        patch: {
          status: unresolved.length ? "DRAFT_INPUT_REQUIRED" : "READY_TO_COMPILE",
          typed_inputs: { [selectedCatalog.catalogId]: parameterInputs },
          parameter_schema_versions: { [selectedCatalog.catalogId]: selectedCatalog.definitionVersion },
          unresolved_required_parameters: unresolved,
          conflicts: [],
        },
      }).then((saved) => {
        if (sequence !== draftSaveSequence.current) return;
        lastSavedDraftInputHash.current = inputHash;
        setBackendDraft(saved);
      }).catch(async (nextError) => {
        if (sequence !== draftSaveSequence.current) return;
        if (nextError instanceof CanonicalEstimateApiError && nextError.code === "DRAFT_VERSION_CONFLICT") {
          try {
            const latest = await getCanonicalEstimateDraft(backendDraft.draftId);
            setBackendDraft(latest);
            setError("Черновик изменён на другом устройстве. Загружена новая версия; проверьте различия перед повторным сохранением.");
          } catch (reloadError) {
            setError(reloadError instanceof Error ? reloadError.message : String(reloadError));
          }
          return;
        }
        setError(nextError instanceof Error ? nextError.message : String(nextError));
      });
    }, 400);
    return () => clearTimeout(timeout);
  }, [backendDraft, parameterInputs, selectedCatalog, visible]);

  useEffect(() => {
    if (!visible || selectedCatalog || selectedSearchIdentity) return;
    const query = canonicalWorkSearchQueryFromPrompt(text);
    if (significantSearchLength(query) < 2) {
      setCatalogSuggestions([]);
      setCatalogSearchPage(null);
      return;
    }
    const controller = new AbortController();
    const sequence = ++catalogRequestSequence.current;
    const timeout = setTimeout(async () => {
      setCatalogLoading(true);
      try {
        const result = await searchCanonicalEstimateCatalog({ query, pageSize: 50, signal: controller.signal });
        if (!controller.signal.aborted && sequence === catalogRequestSequence.current) {
          setCatalogSuggestions(result.items);
          setCatalogSearchPage(result);
        }
      } catch (nextError) {
        if (!controller.signal.aborted && sequence === catalogRequestSequence.current) {
          setCatalogSuggestions([]);
          setCatalogSearchPage(null);
          setError(nextError instanceof Error ? nextError.message : String(nextError));
        }
      } finally {
        if (!controller.signal.aborted && sequence === catalogRequestSequence.current) setCatalogLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [selectedCatalog, selectedSearchIdentity, text, visible]);

  const installRevision = async (catalog: CanonicalEstimateCatalogItem, next: RevisionBundle, inputText: string) => {
    await cacheCanonicalEstimateRevision({ ownerUserId: await authenticatedOwnerUserId(), ...next });
    const estimate = adaptCanonicalRevisionToStructuredEstimate({ catalog, ...next, inputText });
    const nextMapping = mapAiEstimateToForemanDraft({
      estimate,
      context,
      estimateRevisionId: next.revision.revisionId,
      estimateReleaseId: next.revision.releaseId,
    });
    const parity = verifyForemanAiEstimatePayloadParity(nextMapping);
    if (!parity.ok) throw new Error(`${TEXT.parityError} ${parity.issues.map((issue) => issue.code).join(", ")}`);
    setBundle(next);
    setMapping(nextMapping);
    setRowInputs(buildRowInputs(nextMapping));
    setRowOverrides(next.revision.amendmentContract.rowOverrides);
    setCustomRows(next.revision.amendmentContract.customRows);
    setParameterInputs(normalizeRevisionParameters(next.revision.parameters));
    setPendingMigration(null);
    setArtifactMessage("");
    setArtifactLinks({});
  };

  const loadHistory = async (catalogId: string) => {
    setHistoryLoading(true);
    try {
      const result = await getCanonicalEstimateRevisionHistory({ catalogId, limit: 30 });
      setHistory(result.revisions);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (!visible || !initialRevisionId?.trim()) return;
    const controller = new AbortController();
    const revisionId = initialRevisionId.trim();
    setLoading(true);
    setError("");
    void (async () => {
      const revision = await getCanonicalEstimateRevision(revisionId, controller.signal);
      const [catalog, rows] = await Promise.all([
        getCanonicalEstimateCatalogItem(revision.catalogId, controller.signal),
        getAllCanonicalEstimateRevisionRows({ revisionId, signal: controller.signal }),
      ]);
      if (controller.signal.aborted) return;
      setText(initialText?.trim() || catalog.titleRu);
      setSelectedCatalog(catalog);
      setCatalogSuggestions([]);
      await installRevision(catalog, { revision, rows }, initialText?.trim() || catalog.titleRu);
      if (!controller.signal.aborted) await loadHistory(catalog.catalogId);
    })().catch((nextError: unknown) => {
      if (!controller.signal.aborted) {
        setError(nextError instanceof Error ? nextError.message : String(nextError));
      }
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [initialRevisionId, visible]);

  const handleTextChange = (value: string) => {
    setText(value);
    const normalizedValue = value.trim();
    const selectedTitle = selectedCatalog?.titleRu.trim() ?? selectedSearchIdentity?.canonicalNameRu.trim() ?? "";
    if (!normalizedValue || (selectedTitle && normalizedValue !== selectedTitle)) {
      setSelectedCatalog(null);
      setSelectedSearchIdentity(null);
      setBackendDraft(null);
      setSearchGroupPage(null);
      setTypedRelations([]);
      setParameterInputs(Object.create(null));
      setMapping(null);
      setBundle(null);
      setHistory([]);
      setShowAllParameters(false);
      setShowParameterPanel(false);
      setExpandedParameterTruth(Object.create(null));
    }
  };

  const handleLoadMoreWorkSuggestions = async () => {
    if (!catalogSearchPage?.nextCursor || catalogLoading) return;
    const query = canonicalWorkSearchQueryFromPrompt(text);
    const sequence = ++catalogRequestSequence.current;
    setCatalogLoading(true);
    try {
      const result = await searchCanonicalEstimateCatalog({
        query,
        cursor: catalogSearchPage.nextCursor,
        pageSize: 50,
      });
      if (sequence !== catalogRequestSequence.current) return;
      setCatalogSuggestions((previous) => [
        ...previous,
        ...result.items.filter((item) => !previous.some((existing) => existing.catalogId === item.catalogId)),
      ]);
      setCatalogSearchPage(result);
    } catch (nextError) {
      if (sequence === catalogRequestSequence.current) {
        setError(nextError instanceof Error ? nextError.message : String(nextError));
      }
    } finally {
      if (sequence === catalogRequestSequence.current) setCatalogLoading(false);
    }
  };

  const handleLoadMoreSearchGroup = async () => {
    if (!searchGroupPage?.nextCursor || catalogLoading) return;
    setCatalogLoading(true);
    try {
      const result = await listCanonicalEstimateSearchGroup({
        groupId: searchGroupPage.groupId,
        cursor: searchGroupPage.nextCursor,
        pageSize: 50,
      });
      setSearchGroupPage((previous) => previous ? {
        ...result,
        items: [
          ...previous.items,
          ...result.items.filter((item) => !previous.items.some((existing) => existing.catalogId === item.catalogId)),
        ],
      } : result);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setCatalogLoading(false);
    }
  };

  const handleSelectWorkSuggestion = async (suggestion: CatalogSuggestion) => {
    setCatalogLoading(true);
    setError("");
    try {
      const selectedFromSearchPage = catalogSearchPage;
      if (!selectedFromSearchPage) throw new Error("SEARCH_RESULT_SET_CONTEXT_MISSING");
      setSelectedSearchIdentity(suggestion);
      setText(suggestion.canonicalNameRu);
      setCatalogSuggestions([]);
      setCatalogSearchPage(null);
      setShowAllParameters(false);
      setShowParameterPanel(false);
      setExpandedParameterTruth(Object.create(null));
      const [group, relations, draft] = await Promise.all([
        listCanonicalEstimateSearchGroup({ groupId: suggestion.groupId, pageSize: 50 }),
        listCanonicalEstimateTypedRelations(suggestion.catalogId),
        createCanonicalEstimateDraft({
          originalQuery: text.trim(),
          title: suggestion.canonicalNameRu,
          searchIndexReleaseId: selectedFromSearchPage.searchIndexReleaseId,
          searchResultSetHash: selectedFromSearchPage.resultSetSha256,
          searchFilters: selectedFromSearchPage.filters,
          selectedCatalogIds: [suggestion.catalogId],
        }),
      ]);
      setSearchGroupPage(group);
      setTypedRelations(relations.items);
      setBackendDraft(draft);
      lastSavedDraftInputHash.current = "";
      if (suggestion.selectableMode !== "PROFESSIONAL") {
        setSelectedCatalog(null);
        setParameterInputs(Object.create(null));
        setMapping(null);
        setBundle(null);
        setError(suggestion.selectableMode === "PRELIMINARY"
          ? "Работа пока PRELIMINARY_NOT_CANONICAL: профессиональный итог и вымышленные цены запрещены."
          : suggestion.nonselectableReasonRu || "Эта работа недоступна для расчёта.");
        return;
      }
      const catalog = await getCanonicalEstimateCatalogItem(suggestion.catalogId);
      setSelectedCatalog(catalog);
      setParameterInputs(Object.fromEntries(catalog.parameterSchema.map((parameter) => [
        parameter.parameterId,
        parameter.defaultValue == null
          ? (parameter.valueType === "array_object" ? [] : "")
          : (parameter.valueType === "array_object" && Array.isArray(parameter.defaultValue)
            ? parameter.defaultValue
            : String(parameter.defaultValue)),
      ])));
      setMapping(null);
      setBundle(null);
      await loadHistory(catalog.catalogId);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setCatalogLoading(false);
    }
  };

  const readParameters = (): Record<string, CanonicalEstimateParameterInputValue> => {
    if (!selectedCatalog) throw new Error(TEXT.selectCanonicalWork);
    const incompleteTruth = selectedCatalog.parameterSchema
      .map((parameter) => ({ parameter, missing: parameterTruthMissing(parameter) }))
      .filter((entry) => entry.missing.length > 0);
    if (incompleteTruth.length > 0) {
      const preview = incompleteTruth.slice(0, 3)
        .map(({ parameter, missing }) => `${parameter.titleRu}: ${missing.join("/")}`)
        .join(", ");
      throw new Error(
        `ТРЕБУЕТСЯ УТОЧНИТЬ нормативную и формульную связь параметров: ${preview}` +
        (incompleteTruth.length > 3 ? ` (+${incompleteTruth.length - 3})` : ""),
      );
    }
    const validation = validateCanonicalEstimateParameterInputs({
      schema: selectedCatalog.parameterSchema,
      rawInputs: parameterInputs,
    });
    if (!validation.ok) {
      const titleById = new Map(selectedCatalog.parameterSchema.map((parameter) => [parameter.parameterId, parameter.titleRu]));
      const labels = validation.issues.slice(0, 5).map((issue) => {
        const label = titleById.get(issue.parameterId) ?? issue.parameterId;
        const related = issue.relatedParameterId ? ` / ${titleById.get(issue.relatedParameterId) ?? issue.relatedParameterId}` : "";
        return `${label}${related} [${issue.code}]`;
      });
      throw new Error(`${TEXT.invalidParameter}: ${labels.join(", ")}${validation.issues.length > 5 ? ` (+${validation.issues.length - 5})` : ""}`);
    }
    return validation.parameters;
  };

  const runRecalculate = async (next: PendingMigration, acknowledgeReleaseMigration = false) => {
    if (!selectedCatalog || !bundle) return;
    if (bundle.revision.releaseId !== selectedCatalog.releaseId && !acknowledgeReleaseMigration) {
      setPendingMigration(next);
      setError(`Revision ${bundle.revision.revisionId} закреплена за release ${bundle.revision.releaseId}. Для R2 нужен явный migration contract.`);
      return;
    }
    const controller = new AbortController();
    setActiveAbort(controller);
    setLoading(true);
    setError("");
    setJobProgress(null);
    try {
      const releaseMigration: CanonicalEstimateRecalculateRequest["releaseMigration"] =
        bundle.revision.releaseId === selectedCatalog.releaseId ? undefined : {
          contractVersion: "canonical_revision_release_migration.r2",
          acknowledged: true,
          fromReleaseId: bundle.revision.releaseId,
          toReleaseId: selectedCatalog.releaseId,
        };
      const request: CanonicalEstimateRecalculateRequest = {
        idempotencyKey: `composer-recalc-${bundle.revision.revisionId}-${stableInputKey(next)}`.slice(0, 200),
        catalogId: selectedCatalog.catalogId,
        parentRevisionId: bundle.revision.revisionId,
        parameters: next.parameters,
        currencyCode: bundle.revision.currencyCode,
        rowOverrides: next.rowOverrides,
        customRows: next.customRows,
        ...(releaseMigration ? { releaseMigration } : {}),
      };
      const result = await recalculateCanonicalEstimateAndLoad({
        request,
        signal: controller.signal,
        onProgress: setJobProgress,
      });
      await installRevision(selectedCatalog, result, text.trim());
      await loadHistory(selectedCatalog.catalogId);
    } catch (nextError) {
      if (!controller.signal.aborted) {
        const retryable = nextError instanceof CanonicalEstimateApiError ? nextError.retryable : nextError instanceof TypeError;
        if (retryable) {
          const releaseMigration: CanonicalEstimateRecalculateRequest["releaseMigration"] =
            bundle.revision.releaseId === selectedCatalog.releaseId ? undefined : {
              contractVersion: "canonical_revision_release_migration.r2",
              acknowledged: true,
              fromReleaseId: bundle.revision.releaseId,
              toReleaseId: selectedCatalog.releaseId,
            };
          const request: CanonicalEstimateRecalculateRequest = {
            idempotencyKey: `composer-recalc-${bundle.revision.revisionId}-${stableInputKey(next)}`.slice(0, 200),
            catalogId: selectedCatalog.catalogId,
            parentRevisionId: bundle.revision.revisionId,
            parameters: next.parameters,
            currencyCode: bundle.revision.currencyCode,
            rowOverrides: next.rowOverrides,
            customRows: next.customRows,
            ...(releaseMigration ? { releaseMigration } : {}),
          };
          const pending = await queuePendingCanonicalEstimateRecalculation({
            ownerUserId: await authenticatedOwnerUserId(),
            expectedReleaseId: selectedCatalog.releaseId,
            baseRevisionChecksumSha256: bundle.revision.checksumSha256,
            request,
          });
          setError(`${TEXT.pendingServerAdmission} (${pending.localAdmissionId})`);
        } else setError(nextError instanceof Error ? nextError.message : String(nextError));
      }
    } finally {
      setActiveAbort(null);
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!text.trim()) {
      setError(TEXT.emptyInput);
      return;
    }
    if (!selectedCatalog) {
      setError(TEXT.selectCanonicalWork);
      return;
    }
    let parameters: Record<string, CanonicalEstimateParameterInputValue>;
    try {
      parameters = readParameters();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
      return;
    }
    if (bundle) {
      await runRecalculate({ parameters, rowOverrides, customRows });
      return;
    }
    const controller = new AbortController();
    setActiveAbort(controller);
    setLoading(true);
    setError("");
    setJobProgress(null);
    try {
      const request = {
        idempotencyKey: `composer-${selectedCatalog.releaseId}-${selectedCatalog.catalogId}-${stableInputKey(parameters)}`.slice(0, 200),
        catalogId: selectedCatalog.catalogId,
        parameters,
        currencyCode: "KGS",
      };
      const compiled = await compileCanonicalEstimateAndLoad({ request, signal: controller.signal, onProgress: setJobProgress });
      await installRevision(selectedCatalog, compiled, text.trim());
      await loadHistory(selectedCatalog.catalogId);
    } catch (nextError) {
      if (controller.signal.aborted) return;
      const retryable = nextError instanceof CanonicalEstimateApiError ? nextError.retryable : nextError instanceof TypeError;
      if (retryable) {
        const pending = await queuePendingCanonicalEstimateAdmission({
          ownerUserId: await authenticatedOwnerUserId(),
          expectedReleaseId: selectedCatalog.releaseId,
          request: {
            idempotencyKey: `composer-${selectedCatalog.releaseId}-${selectedCatalog.catalogId}-${stableInputKey(parameters)}`.slice(0, 200),
            catalogId: selectedCatalog.catalogId,
            parameters,
            currencyCode: "KGS",
          },
        });
        setError(`${TEXT.pendingServerAdmission} (${pending.localAdmissionId})`);
      } else setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setActiveAbort(null);
      setLoading(false);
    }
  };

  const handleOpenHistoryRevision = async (revision: CanonicalEstimateRevisionView) => {
    if (!selectedCatalog) return;
    setLoading(true);
    setError("");
    try {
      const rows = await getAllCanonicalEstimateRevisionRows({ revisionId: revision.revisionId });
      await installRevision(selectedCatalog, { revision, rows }, selectedCatalog.titleRu);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setLoading(false);
    }
  };

  const commitRow = async (row: ForemanDraftEstimateRow, inclusion?: { estimate: boolean; procurement: boolean }) => {
    if (!bundle) return;
    const input = rowInputs[row.rowId] ?? { visibleName: row.visibleName, quantity: String(row.quantity), unitPrice: row.unitPrice == null ? "" : String(row.unitPrice) };
    const quantity = parseNumberInput(input.quantity);
    const unitPrice = input.unitPrice.trim() ? parseNumberInput(input.unitPrice) : null;
    if (!input.visibleName.trim() || quantity == null || quantity < 0 || (unitPrice != null && unitPrice < 0)) {
      setError("Проверьте название, количество и цену строки.");
      return;
    }
    const includedInEstimate = inclusion?.estimate ?? row.includedInEstimate;
    const includedInProcurement = includedInEstimate && row.buyerProcurementEligible && (inclusion?.procurement ?? row.includedInProcurement);
    let nextOverrides = rowOverrides;
    let nextCustomRows = customRows;
    if (row.rowId.startsWith("manual:")) {
      const clientRowId = row.rowId.slice("manual:".length);
      nextCustomRows = customRows.map((custom) => custom.clientRowId === clientRowId ? {
        ...custom,
        titleRu: input.visibleName.trim(), quantity, unitPrice, includedInEstimate, includedInProcurement,
      } : custom);
    } else {
      nextOverrides = {
        ...rowOverrides,
        [row.rowId]: {
          titleRu: input.visibleName.trim(), quantity, unitPrice,
          includedInEstimate, includedInProcurement,
          provenance: amendmentReason("professional_estimate_composer"),
        },
      };
    }
    await runRecalculate({
      parameters: normalizeRevisionParameters(bundle.revision.parameters),
      rowOverrides: nextOverrides,
      customRows: nextCustomRows,
    });
  };

  const handleCatalogSearch = async () => {
    if (!rikQuickSearch || catalogQuery.trim().length < 2) return;
    setCatalogLoading(true);
    setError("");
    try {
      setCatalogRows(await rikQuickSearch(catalogQuery.trim(), 12));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setCatalogLoading(false);
    }
  };

  const handleAddCatalogRow = async (item: CatalogQuickItem) => {
    if (!bundle) {
      setError(TEXT.catalogNeedsEstimate);
      return;
    }
    const clientRowId = `rik-${item.rik_code}-${stableInputKey([item.rik_code, customRows.length])}`;
    const nextCustomRows = [...customRows, {
      clientRowId,
      section: "materials",
      category: "materials",
      titleRu: displayNameOfCatalogItem(item),
      unitId: String(item.uom_code ?? "unit"),
      quantity: 1,
      unitPrice: null,
      includedInEstimate: true,
      includedInProcurement: true,
      provenance: amendmentReason(`rik_catalog:${item.rik_code}`),
    }];
    await runRecalculate({
      parameters: normalizeRevisionParameters(bundle.revision.parameters), rowOverrides, customRows: nextCustomRows,
    });
  };

  const handleArtifact = async (kind: "pdf" | "procurement") => {
    if (!bundle) return;
    setSaving(true);
    setError("");
    try {
      const artifact = await buildCanonicalEstimateArtifact({
        revisionId: bundle.revision.revisionId,
        kind,
        idempotencyKey: `composer-${kind}-${bundle.revision.revisionId}`,
      });
      if (artifact.releaseId !== bundle.revision.releaseId) throw new Error("Artifact release_id не совпадает с revision.");
      setArtifactMessage(`${kind.toUpperCase()}: release ${artifact.releaseId} · sha256 ${artifact.sha256 ?? "pending"}`);
      if (artifact.signedUrl) setArtifactLinks((previous) => ({
        ...previous,
        [kind]: {
          signedUrl: artifact.signedUrl,
          revisionId: bundle.revision.revisionId,
          releaseId: artifact.releaseId,
        },
      }));
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setSaving(false);
    }
  };

  const handleOpenArtifact = async (kind: "pdf" | "procurement") => {
    const artifact = artifactLinks[kind];
    if (!artifact || !bundle) return;
    if (artifact.revisionId !== bundle.revision.revisionId || artifact.releaseId !== bundle.revision.releaseId) {
      setError("Artifact link belongs to another immutable revision.");
      return;
    }
    try {
      await Linking.openURL(artifact.signedUrl);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    }
  };

  const handleCancelJob = async () => {
    const jobId = jobProgress?.jobId;
    activeAbort?.abort();
    if (!jobId || jobProgress?.status === "succeeded" || jobProgress?.status === "failed" || jobProgress?.status === "cancelled") return;
    try {
      await cancelCanonicalEstimateJob(jobId);
      setJobProgress((previous) => previous ? { ...previous, status: "cancelled", stage: "cancelled" } : previous);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    }
  };

  const handleAddToDraft = async () => {
    if (!mapping || saving) return;
    const parity = verifyForemanAiEstimatePayloadParity(mapping);
    if (!parity.ok) {
      setError(`${TEXT.parityError} ${parity.issues.map((issue) => issue.code).join(", ")}`);
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onDraftCreated(mapping);
      onClose();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setSaving(false);
    }
  };

  const renderEstimateRow = (row: ForemanDraftEstimateRow) => {
    const input = rowInputs[row.rowId] ?? { visibleName: row.visibleName, quantity: String(row.quantity), unitPrice: row.unitPrice == null ? "" : String(row.unitPrice) };
    const editable = row.structuredRow.editable !== false;
    const setInput = (field: keyof RowInputState, value: string) => setRowInputs((previous) => ({
      ...previous, [row.rowId]: { ...input, [field]: value },
    }));
    return (
      <View style={[styles.row, !row.includedInEstimate && styles.rowDisabled]} testID="foreman-ai-estimate-row" accessibilityLabel={`estimate-row-${row.rowId}`}>
        <View style={styles.rowHeader}>
          <TextInput testID="foreman-ai-estimate-row-name" value={input.visibleName} onChangeText={(value) => setInput("visibleName", value)} editable={editable && !loading} style={styles.rowNameInput} />
          <Text style={styles.rowSection}>{formatEstimateSection(row.section)}</Text>
        </View>
        <View style={styles.editGrid}>
          <View style={styles.editCell}><Text style={styles.fieldLabel}>{TEXT.qty}</Text><TextInput testID="foreman-ai-estimate-row-qty" value={input.quantity} onChangeText={(value) => setInput("quantity", value)} editable={editable && !loading} keyboardType="decimal-pad" style={styles.fieldInput} /></View>
          <View style={styles.editCell}><Text style={styles.fieldLabel}>{formatEstimateUnit(row.unit)}</Text><Text style={styles.readonlyValue}>{formatEstimateUnit(row.unit)}</Text></View>
          <View style={styles.editCell}><Text style={styles.fieldLabel}>{TEXT.price}</Text><TextInput testID="foreman-ai-estimate-row-price" value={input.unitPrice} onChangeText={(value) => setInput("unitPrice", value)} editable={editable && !loading} keyboardType="decimal-pad" style={styles.fieldInput} /></View>
          <View style={styles.editCell}><Text style={styles.fieldLabel}>{TEXT.total}</Text><Text style={styles.totalValue}>{row.total == null ? "PRICE_MISSING" : formatMoney(row.total, row.currency)}</Text></View>
        </View>
        {editable ? <View style={styles.rowActions}>
          <Pressable testID="canonical-row-apply" disabled={loading} onPress={() => commitRow(row)} style={styles.smallPrimaryButton}><Text style={styles.smallPrimaryButtonText}>Создать child revision</Text></Pressable>
          <Pressable disabled={loading} onPress={() => commitRow(row, { estimate: !row.includedInEstimate, procurement: row.includedInProcurement })} style={[styles.toggleButton, row.includedInEstimate && styles.toggleButtonActive]}><Text style={styles.toggleButtonText}>{row.includedInEstimate ? TEXT.remove : TEXT.restore}</Text></Pressable>
          {row.buyerProcurementEligible ? <Pressable disabled={loading || !row.includedInEstimate} onPress={() => commitRow(row, { estimate: row.includedInEstimate, procurement: !row.includedInProcurement })} style={[styles.toggleButton, row.includedInProcurement && styles.toggleButtonActive]}><Text style={styles.toggleButtonText}>{TEXT.procurementFlag}</Text></Pressable> : null}
        </View> : <Text style={styles.catalogHint}>Legacy unmatched row сохранена, но исключена из totals и недоступна для тихого редактирования.</Text>}
      </View>
    );
  };

  const addCompositeItem = (parameter: CanonicalEstimateCatalogItem["parameterSchema"][number]) => {
    const schema = parameter.compositeItemSchema;
    if (!schema) return;
    setParameterInputs((previous) => {
      const current = compositeItems(previous[parameter.parameterId]);
      if (schema.maximumItems != null && current.length >= schema.maximumItems) return previous;
      const item: CanonicalEstimateCompositeItem = {
        itemId: `item-${stableInputKey([parameter.parameterId, Date.now(), current.length, Math.random()])}`,
        position: current.length,
        version: 1,
        values: Object.fromEntries(schema.subfields.map((subfield) => [subfield.subfieldId, ""])),
      };
      return { ...previous, [parameter.parameterId]: [...current, item] };
    });
  };

  const updateCompositeSubfield = (parameterId: string, itemId: string, subfieldId: string, value: string) => {
    setParameterInputs((previous) => ({
      ...previous,
      [parameterId]: compositeItems(previous[parameterId]).map((item) => item.itemId === itemId
        ? { ...item, version: item.version + 1, values: { ...item.values, [subfieldId]: value } }
        : item),
    }));
  };

  const deleteCompositeItem = (parameterId: string, itemId: string) => {
    setParameterInputs((previous) => ({
      ...previous,
      [parameterId]: compositeItems(previous[parameterId])
        .filter((item) => item.itemId !== itemId)
        .map((item, position) => ({ ...item, position, version: item.version + 1 })),
    }));
  };

  const moveCompositeItem = (parameterId: string, itemId: string, direction: -1 | 1) => {
    setParameterInputs((previous) => {
      const items = [...compositeItems(previous[parameterId])];
      const from = items.findIndex((item) => item.itemId === itemId);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= items.length) return previous;
      [items[from], items[to]] = [items[to], items[from]];
      return {
        ...previous,
        [parameterId]: items.map((item, position) => ({ ...item, position, version: item.version + 1 })),
      };
    });
  };

  const visibleParameters = selectedCatalog?.parameterSchema.filter((parameter) => parameter.visibilityRole !== "INTERNAL_ONLY") ?? [];
  const currentParameterValidation = selectedCatalog
    ? validateCanonicalEstimateParameterInputs({ schema: selectedCatalog.parameterSchema, rawInputs: parameterInputs })
    : null;
  const parameterIssues = new Map<string, string[]>();
  for (const issue of currentParameterValidation?.issues ?? []) {
    parameterIssues.set(issue.parameterId, [...(parameterIssues.get(issue.parameterId) ?? []), issue.code]);
  }
  const selectedParameterProgress = selectedCatalog
    ? parameterProgress(selectedCatalog, parameterInputs)
    : null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.screen} testID="professional-estimate-composer">
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.headerButton} testID="foreman-ai-estimate-back"><Text style={styles.headerButtonText}>{"<"}</Text></Pressable>
          <View style={styles.headerTitleWrap}><Text style={styles.title}>{TEXT.title}</Text><Text style={styles.context} numberOfLines={1}>{mode === "foreman" ? contextText : ""}</Text></View>
          <Pressable onPress={() => { onClose(); onOpenDraft?.(); }} style={styles.draftButton} testID="foreman-ai-estimate-open-draft"><Text style={styles.draftButtonText}>{TEXT.openDraft}</Text></Pressable>
        </View>

        <FlatList
          testID="foreman-ai-estimate-list"
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          data={mapping?.rows ?? []}
          keyExtractor={estimateRowKeyExtractor}
          renderItem={({ item }) => renderEstimateRow(item)}
          initialNumToRender={DEFAULT_FLATLIST_PERF.initialNumToRender}
          maxToRenderPerBatch={DEFAULT_FLATLIST_PERF.maxToRenderPerBatch}
          windowSize={DEFAULT_FLATLIST_PERF.windowSize}
          onEndReachedThreshold={DEFAULT_FLATLIST_PERF.onEndReachedThreshold}
          ListHeaderComponent={<>
            <View style={styles.composePanel}>
              <TextInput testID="foreman-ai-estimate-input" value={text} onChangeText={handleTextChange} placeholder={TEXT.inputPlaceholder} multiline style={styles.input} editable={!loading && !saving} />
              {significantSearchLength(text) === 1 && !selectedSearchIdentity
                ? <Text style={styles.catalogHint}>Введите ещё один символ для полного backend-поиска.</Text>
                : null}
              {catalogLoading ? <ActivityIndicator /> : null}
              {catalogSearchPage ? <View style={styles.workSuggestionsPanel} testID="foreman-ai-estimate-work-suggestions">
                <Text style={styles.panelTitle}>{catalogSearchPage.resultLevel === "FUZZY" ? "Другие названия (fuzzy)" : TEXT.workSuggestionTitle}</Text>
                <Text style={styles.catalogHint} testID="canonical-estimate-search-total">
                  Найдено буквально: {catalogSearchPage.literalTotalCount}. Показано: {catalogSuggestions.length}. Подсказок: {catalogSearchPage.suggestionTotalCount}.
                </Text>
                <Text style={styles.catalogHint} testID="canonical-estimate-search-mode">
                  Режим {catalogSearchPage.searchMode} · tokens: {catalogSearchPage.searchTokens.join(" · ")}
                  {catalogSearchPage.parsedQuantity == null ? "" : ` · объём ${catalogSearchPage.parsedQuantity} ${catalogSearchPage.parsedUnit ?? ""}`}
                </Text>
                <Text style={styles.catalogHint}>Групп: {catalogSearchPage.groupTotalCount} · fuzzy: {catalogSearchPage.fuzzyTotalCount}</Text>
                <Text style={styles.catalogHint}>Индекс {catalogSearchPage.searchIndexReleaseId} · taxonomy {catalogSearchPage.taxonomyVersion}</Text>
                <View style={styles.workSuggestionRows}>{catalogSuggestions.map((suggestion, index) => <Pressable
                  key={suggestion.catalogId}
                  testID={`foreman-ai-estimate-work-suggestion-${index + 1}`}
                  onPress={() => handleSelectWorkSuggestion(suggestion)}
                  style={styles.workSuggestionButton}
                >
                  <Text style={styles.workSuggestionName}>{suggestion.canonicalNameRu}</Text>
                  <Text style={styles.workSuggestionMeta}>{suggestion.groupNameRu} · {suggestion.operationKind} · {suggestion.publicationState}</Text>
                  <Text style={styles.workSuggestionMeta}>{suggestion.matchType}: «{suggestion.matchedTerm}» · {suggestion.rankingReasonRu}</Text>
                  <Text style={styles.workSuggestionMeta} numberOfLines={1}>{suggestion.catalogId}</Text>
                </Pressable>)}</View>
                {catalogSearchPage.nextCursor ? <Pressable
                  accessibilityRole="button"
                  testID="canonical-estimate-search-load-more"
                  onPress={handleLoadMoreWorkSuggestions}
                  style={styles.toggleButton}
                ><Text style={styles.toggleButtonText}>Показать следующие результаты</Text></Pressable> : null}
              </View> : null}
              {selectedSearchIdentity && searchGroupPage ? <View style={styles.catalogPanel} testID="canonical-estimate-selected-search-context">
                <Text style={styles.panelTitle}>Выбрано: {selectedSearchIdentity.canonicalNameRu}</Text>
                {backendDraft ? <Text style={styles.catalogHint} testID="canonical-estimate-backend-draft-status">Backend draft {backendDraft.draftId} · {backendDraft.status} · версия {backendDraft.optimisticVersion}</Text> : null}
                <Text style={styles.catalogHint}>{selectedSearchIdentity.domainId} → {selectedSearchIdentity.systemId} → {selectedSearchIdentity.workFamilyId} → {selectedSearchIdentity.operationKind}</Text>
                <Text style={styles.catalogHint}>Все работы группы «{searchGroupPage.groupNameRu}»: {searchGroupPage.totalCount}. Показано {searchGroupPage.items.length}.</Text>
                <View style={styles.workSuggestionRows}>{searchGroupPage.items.map((item) => <View key={item.catalogId} style={styles.workSuggestionButton}>
                  <Text style={styles.workSuggestionName}>{item.canonicalNameRu}</Text>
                  <Text style={styles.workSuggestionMeta}>{item.operationKind} · {item.technologyVariant} · {item.publicationState}</Text>
                </View>)}</View>
                {searchGroupPage.nextCursor ? <Pressable testID="canonical-estimate-group-load-more" onPress={handleLoadMoreSearchGroup} style={styles.toggleButton}><Text style={styles.toggleButtonText}>Показать все {searchGroupPage.totalCount}</Text></Pressable> : null}
                <Text style={styles.panelTitle}>Связанные работы</Text>
                {typedRelations.length ? typedRelations.map((relation) => <View key={`${relation.relationshipType}:${relation.targetCatalogId}`} style={styles.workSuggestionButton}>
                  <Text style={styles.workSuggestionName}>{relation.targetCanonicalNameRu}</Text>
                  <Text style={styles.workSuggestionMeta}>{relation.relationshipType} · {relation.explanationRu}</Text>
                  <Text style={styles.workSuggestionMeta}>Основание: {relation.sourceLocator}</Text>
                </View>) : <Text style={styles.catalogHint}>Применимых связанных работ по активному relation ledger нет.</Text>}
              </View> : null}
              {history[0] ? <Pressable testID={`canonical-estimate-open-latest-revision-${history[0].revisionId}`} disabled={loading} onPress={() => handleOpenHistoryRevision(history[0])} style={styles.smallPrimaryButton}><Text style={styles.smallPrimaryButtonText}>Latest backend revision · {history[0].revisionId}</Text></Pressable> : null}
              {bundle ? <View testID="canonical-estimate-native-quick-actions" style={styles.catalogPanel}>
                <Text testID="canonical-estimate-release-id-top" style={styles.catalogHint}>release: {bundle.revision.releaseId}</Text>
                <Text testID="canonical-estimate-row-count-top" style={styles.catalogHint}>{TEXT.rows}: {mapping?.requestDraftLines.length ?? 0}</Text>
                <View style={styles.rowActions}>
                  <Pressable testID="canonical-estimate-recalculate-top" disabled={loading || saving} onPress={handleGenerate} style={styles.toggleButton}><Text style={styles.toggleButtonText}>Recalculate</Text></Pressable>
                  <Pressable testID="canonical-estimate-artifact-pdf-top" disabled={saving} onPress={() => handleArtifact("pdf")} style={styles.toggleButton}><Text style={styles.toggleButtonText}>PDF</Text></Pressable>
                  <Pressable testID="canonical-estimate-artifact-procurement-top" disabled={saving} onPress={() => handleArtifact("procurement")} style={styles.toggleButton}><Text style={styles.toggleButtonText}>Закупка</Text></Pressable>
                  {artifactLinks.pdf ? <Pressable testID="canonical-estimate-open-artifact-pdf-top" disabled={saving} onPress={() => handleOpenArtifact("pdf")} style={styles.toggleButton}><Text style={styles.toggleButtonText}>Open PDF</Text></Pressable> : null}
                  {artifactLinks.procurement ? <Pressable testID="canonical-estimate-open-artifact-procurement-top" disabled={saving} onPress={() => handleOpenArtifact("procurement")} style={styles.toggleButton}><Text style={styles.toggleButtonText}>Open procurement</Text></Pressable> : null}
                </View>
              </View> : null}
              {selectedCatalog ? <View style={styles.catalogPanel} testID="canonical-estimate-parameter-form">
                <Text style={styles.panelTitle}>{TEXT.parametersTitle}</Text>
                <Text style={styles.catalogHint}>{selectedCatalog.titleRu} · active release {selectedCatalog.releaseId} · definition v{selectedCatalog.definitionVersion}</Text>
                <Text style={styles.catalogHint} testID="canonical-estimate-required-parameter-progress">Заполнено {selectedParameterProgress?.filled ?? 0} из {selectedParameterProgress?.required ?? 0}. Обязательно осталось {selectedParameterProgress?.remaining ?? 0}. Конфликтов 0.</Text>
                <Pressable testID="canonical-estimate-refine-parameters" onPress={() => setShowParameterPanel((current) => !current)} style={styles.smallPrimaryButton}><Text style={styles.smallPrimaryButtonText}>{showParameterPanel ? "Скрыть параметры" : "Уточнить параметры"}</Text></Pressable>
                {showParameterPanel ? visibleParameters.slice(0, showAllParameters ? undefined : 8).map((parameter) => {
                  const values = parameterValues(parameter);
                  const truthMissing = parameterTruthMissing(parameter);
                  const truthExpanded = expandedParameterTruth[parameter.parameterId] === true;
                  const inputValue = parameterInputs[parameter.parameterId];
                  const inputText = Array.isArray(inputValue) ? "" : String(inputValue ?? "");
                  const guideText = parameter.guide?.guideShortRu ?? "ТРЕБУЕТСЯ УТОЧНИТЬ: путеводитель не подтверждён";
                  const guideAsCaption = focusedParameterId === parameter.parameterId
                    || parameterValuePresent(inputValue) || values.length > 0 || parameter.valueType === "array_object";
                  const hasIssue = parameterIssues.has(parameter.parameterId);
                  const composite = parameter.compositeItemSchema;
                  const items = compositeItems(inputValue);
                  return <View key={parameter.parameterId} style={styles.parameterCard}>
                    <Text style={styles.fieldLabel}>{parameter.titleRu}{parameter.required ? " *" : ""}{parameter.unitId ? ` · ${parameter.unitId}` : ""}</Text>
                    {parameter.sharedInputBindingPolicy ? <Text style={styles.sharedInputChip}>Общий ввод · применяется к связанным работам</Text> : null}
                    {parameter.visibilityRole === "USER_DERIVED_READONLY" ? <Text style={styles.readonlyValue} accessibilityLabel={parameter.titleRu}>{parameter.valueType === "array_object" ? `${items.length} элементов` : inputText || "Рассчитывается backend"}</Text>
                      : parameter.valueType === "array_object" && composite ? <View style={styles.compositeEditor}>
                        <Text style={styles.derivedCount} testID={`canonical-estimate-composite-count-${parameter.ordinal}`}>Количество: {items.length} · вычисляется из элементов</Text>
                        {items.map((item, itemIndex) => <View key={item.itemId} style={styles.compositeItem} testID={`canonical-estimate-composite-item-${parameter.ordinal}-${item.itemId}`}>
                          <View style={styles.compositeHeader}>
                            <Text style={styles.workSuggestionName}>{composite.itemLabelRu} {itemIndex + 1}</Text>
                            <View style={styles.rowActions}>
                              {composite.reorderable ? <><Pressable accessibilityLabel={`Поднять ${composite.itemLabelRu} ${itemIndex + 1}`} disabled={itemIndex === 0} onPress={() => moveCompositeItem(parameter.parameterId, item.itemId, -1)} style={styles.compactIconButton}><Text>↑</Text></Pressable><Pressable accessibilityLabel={`Опустить ${composite.itemLabelRu} ${itemIndex + 1}`} disabled={itemIndex === items.length - 1} onPress={() => moveCompositeItem(parameter.parameterId, item.itemId, 1)} style={styles.compactIconButton}><Text>↓</Text></Pressable></> : null}
                              <Pressable accessibilityLabel={`Удалить ${composite.itemLabelRu} ${itemIndex + 1}`} onPress={() => deleteCompositeItem(parameter.parameterId, item.itemId)} style={styles.removeButton}><Text style={styles.removeButtonText}>Удалить</Text></Pressable>
                            </View>
                          </View>
                          {composite.subfields.map((subfield) => {
                            const focusKey = `${parameter.parameterId}:${item.itemId}:${subfield.subfieldId}`;
                            const rawSubfieldValue = item.values[subfield.subfieldId];
                            const subfieldValue = String(rawSubfieldValue ?? "");
                            const subfieldGuide = subfield.guide?.guideShortRu ?? "ТРЕБУЕТСЯ УТОЧНИТЬ: путеводитель не подтверждён";
                            const showSubfieldCaption = focusedParameterId === focusKey || subfieldValue.trim().length > 0;
                            return <View key={subfield.subfieldId} style={styles.compositeSubfield}>
                              <Text style={styles.fieldLabel}>{subfield.labelRu}{subfield.required ? " *" : ""}{subfield.unitId ? ` · ${subfield.unitId}` : ""}</Text>
                              <TextInput
                                testID={`canonical-estimate-composite-${parameter.ordinal}-${itemIndex}-${subfield.subfieldId}`}
                                value={subfieldValue}
                                onChangeText={(value) => updateCompositeSubfield(parameter.parameterId, item.itemId, subfield.subfieldId, value)}
                                onFocus={() => setFocusedParameterId(focusKey)}
                                onBlur={() => setFocusedParameterId((current) => current === focusKey ? null : current)}
                                placeholder={showSubfieldCaption ? undefined : subfieldGuide}
                                placeholderTextColor="#64748b"
                                accessibilityLabel={subfield.labelRu}
                                accessibilityHint={`${subfieldGuide}${subfield.unitId ? `, ${subfield.unitId}` : ""}`}
                                keyboardType={subfield.valueType === "decimal" || subfield.valueType === "integer" ? "decimal-pad" : "default"}
                                editable={!loading && !saving}
                                style={styles.fieldInput}
                              />
                              {showSubfieldCaption ? <Text style={styles.parameterGuideChip}>{subfieldGuide}</Text> : null}
                            </View>;
                          })}
                        </View>)}
                      </View> : values.length > 0 && values.length <= 12 ? <View style={styles.rowActions}>{values.map((value) => <Pressable key={value} testID={`canonical-estimate-parameter-${parameter.ordinal}-${value}`} onPress={() => setParameterInputs((previous) => ({ ...previous, [parameter.parameterId]: value }))} style={[styles.toggleButton, parameterInputs[parameter.parameterId] === value && styles.toggleButtonActive]}><Text style={styles.toggleButtonText}>{value}</Text></Pressable>)}</View> : <TextInput
                        testID={`canonical-estimate-parameter-${parameter.ordinal}`}
                        value={inputText}
                        onChangeText={(value) => setParameterInputs((previous) => ({ ...previous, [parameter.parameterId]: value }))}
                        onFocus={() => setFocusedParameterId(parameter.parameterId)}
                        onBlur={() => setFocusedParameterId((current) => current === parameter.parameterId ? null : current)}
                        placeholder={guideAsCaption ? undefined : guideText}
                        placeholderTextColor="#64748b"
                        accessibilityLabel={parameter.titleRu}
                        accessibilityHint={`${guideText}${parameter.unitId ? `, ${parameter.unitId}` : ""}`}
                        keyboardType={parameter.valueType === "decimal" || parameter.valueType === "integer" ? "decimal-pad" : "default"}
                        editable={!loading && !saving}
                        style={[styles.fieldInput, hasIssue && styles.fieldInputInvalid]}
                      />}
                    {guideAsCaption ? <Text style={[styles.parameterGuideChip, hasIssue && styles.parameterGuideError]} testID={`canonical-estimate-parameter-guide-${parameter.ordinal}`}>{guideText}</Text> : null}
                    {parameter.valueType === "array_object" && composite ? <Pressable testID={`canonical-estimate-composite-add-${parameter.ordinal}`} onPress={() => addCompositeItem(parameter)} style={styles.toggleButton}><Text style={styles.toggleButtonText}>Добавить: {composite.itemLabelRu}</Text></Pressable> : null}
                    {hasIssue ? <Text style={styles.parameterTruthError}>Проверьте ввод: {(parameterIssues.get(parameter.parameterId) ?? []).join(", ")}</Text> : null}
                    <Pressable
                      accessibilityRole="button"
                      testID={`canonical-estimate-parameter-truth-toggle-${parameter.ordinal}`}
                      onPress={() => setExpandedParameterTruth((previous) => ({
                        ...previous,
                        [parameter.parameterId]: !previous[parameter.parameterId],
                      }))}
                      style={styles.parameterTruthToggle}
                    >
                      <Text style={styles.parameterTruthToggleText}>
                        {truthMissing.length === 0
                          ? "Подробнее о норме"
                          : "ТРЕБУЕТСЯ УТОЧНИТЬ нормативную связь"}
                      </Text>
                    </Pressable>
                    {truthExpanded ? <View
                      testID={`canonical-estimate-parameter-truth-${parameter.ordinal}`}
                      style={styles.parameterTruthPanel}
                    >
                      <Text style={styles.parameterTruthLine}>Почему нужен параметр: {parameter.descriptionRu || "сохранённый immutable Asphalt-паспорт"}</Text>
                      <Text style={styles.parameterTruthLine}>Источник значения: {sourceRoleRu(parameter.valueSourceRole)}</Text>
                      <Text style={styles.parameterTruthLine}>Когда обязателен: {parameter.requiredWhen || (parameter.required ? "всегда для применимой работы" : "по применимости")}</Text>
                      <Text style={styles.parameterTruthLine}>Путеводитель: {guideText}</Text>
                      <Text style={styles.parameterTruthLine}>Тип: {parameter.guide?.guideKind ?? "не подтверждён"} · правило проверки: {parameter.guide?.guideValidationPolicy ?? "не подтверждено"}</Text>
                      <Text style={styles.parameterTruthLine}>Документ: {parameter.guide?.sourceDocument ?? "неприменимо по source role"} · {parameter.guide?.sourceEditionStatus ?? "статус не подтверждён"}</Text>
                      <Text style={styles.parameterTruthLine}>Точный пункт/таблица/формула: {parameter.guide?.sourceLocator ?? "неприменимо по source role"}</Text>
                      <Text style={styles.parameterTruthLine}>Применимость: {parameter.guide?.applicability ?? "не подтверждена"}</Text>
                      <Text style={styles.parameterTruthLine}>Исключения: {(parameter.guide?.exclusions ?? []).join(", ") || "нет"}</Text>
                      <Text style={styles.parameterTruthLine}>Версия guide: {parameter.guide?.guideVersion ?? "не подтверждена"} · source SHA-256: {parameter.guide?.sourceSnapshotHash ?? "не подтверждён"}</Text>
                      <Text style={styles.parameterTruthLine}>Проверено: {parameter.guide?.verifiedAt ?? "не подтверждено"}</Text>
                      {(parameter.normativeLinks ?? []).map((link, index) => <View key={`${link.sourceId}:${link.locator}:${index}`}>
                        <Text style={styles.parameterTruthLine}>Нормативный документ: {link.documentTitleRu} · {link.editionStatus}</Text>
                        <Text style={styles.parameterTruthLine}>Пункт/таблица/формула: {link.locator}</Text>
                        <Text style={styles.parameterTruthLine}>Применимость: {link.applicabilityRu}</Text>
                        <Text style={styles.parameterTruthLine}>Проверено: {link.verifiedAt} · {link.verifiedSource}</Text>
                      </View>)}
                      <Text style={styles.parameterTruthLine}>Формулы: {(parameter.formulaConsumers ?? []).join(", ") || "нет"}</Text>
                      <Text style={styles.parameterTruthLine}>Ветви ресурсов: {(parameter.resourceBranchConsumers ?? []).join(", ") || "нет"}</Text>
                      {truthMissing.length > 0 ? <Text style={styles.parameterTruthError}>Не подтверждено: {truthMissing.join(", ")}</Text> : null}
                    </View> : null}
                  </View>;
                }) : null}
                {showParameterPanel && visibleParameters.length > 8 ? <Pressable testID="canonical-estimate-expand-parameters" onPress={() => setShowAllParameters((current) => !current)} style={styles.toggleButton}><Text style={styles.toggleButtonText}>{showAllParameters ? "Свернуть параметры" : `Показать все ${visibleParameters.length}`}</Text></Pressable> : null}
              </View> : null}
              <Pressable testID="foreman-ai-estimate-generate" onPress={handleGenerate} disabled={loading || saving || !selectedCatalog} style={[styles.button, styles.secondaryButton, (loading || saving || !selectedCatalog) && styles.disabledButton]}>{loading ? <ActivityIndicator /> : <Text style={styles.secondaryButtonText}>{bundle ? "Пересчитать child revision" : TEXT.generate}</Text>}</Pressable>
              {activeAbort ? <Pressable testID="canonical-estimate-cancel" onPress={handleCancelJob} style={styles.removeButton}><Text style={styles.removeButtonText}>Отменить server job</Text></Pressable> : null}
              {jobProgress ? <Text style={styles.catalogHint}>Server job: {jobProgress.stage} · {jobProgress.progress}% · release-bound revision</Text> : null}
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {pendingMigration ? <Pressable testID="canonical-estimate-explicit-release-migration" disabled={loading} onPress={() => runRecalculate(pendingMigration, true)} style={[styles.button, styles.primaryButton]}><Text style={styles.primaryButtonText}>Явно мигрировать R1 revision в child R2</Text></Pressable> : null}
            {bundle ? <View style={styles.summary}>
              <Text style={styles.summaryText} testID="canonical-estimate-release-id">release: {bundle.revision.releaseId}</Text>
              <Text style={styles.summaryText}>revision: {bundle.revision.revisionId}</Text>
              <Text style={styles.summaryText} testID="foreman-ai-estimate-row-count">{TEXT.rows}: {mapping?.requestDraftLines.length ?? 0}</Text>
              <Text style={styles.summaryText}>{TEXT.buyer}: {formatMoney(mapping?.totals.buyerProcurementTotal ?? 0, mapping?.totals.currency ?? bundle.revision.currencyCode)}</Text>
              <Text style={styles.summaryText}>{TEXT.total}: {formatMoney(mapping?.totals.estimateTotal ?? 0, mapping?.totals.currency ?? bundle.revision.currencyCode)}</Text>
            </View> : null}
            {bundle && rikQuickSearch ? <View style={styles.catalogPanel} testID="canonical-estimate-manual-catalog">
              <Text style={styles.panelTitle}>{TEXT.catalogTitle}</Text><Text style={styles.catalogHint}>{TEXT.catalogHint}</Text>
              <View style={styles.catalogSearchRow}><TextInput value={catalogQuery} onChangeText={setCatalogQuery} placeholder={TEXT.catalogPlaceholder} style={styles.catalogInput} /><Pressable onPress={handleCatalogSearch} style={styles.smallPrimaryButton}><Text style={styles.smallPrimaryButtonText}>Найти</Text></Pressable></View>
              <View style={styles.catalogRows}>{catalogRows.map((item) => <View key={item.rik_code} style={styles.catalogRow}><View style={styles.catalogRowText}><Text style={styles.catalogName}>{displayNameOfCatalogItem(item)}</Text><Text style={styles.catalogMeta}>{item.rik_code} · {item.uom_code ?? "unit"}</Text></View><Pressable onPress={() => handleAddCatalogRow(item)} style={styles.smallPrimaryButton}><Text style={styles.smallPrimaryButtonText}>{TEXT.add}</Text></Pressable></View>)}</View>
            </View> : null}
            {bundle ? <View style={styles.rowActions} testID="canonical-estimate-artifact-actions"><Pressable testID="canonical-estimate-artifact-pdf" disabled={saving} onPress={() => handleArtifact("pdf")} style={styles.toggleButton}><Text style={styles.toggleButtonText}>PDF</Text></Pressable><Pressable testID="canonical-estimate-artifact-procurement" disabled={saving} onPress={() => handleArtifact("procurement")} style={styles.toggleButton}><Text style={styles.toggleButtonText}>Закупка</Text></Pressable>{artifactMessage ? <Text style={styles.catalogHint}>{artifactMessage}</Text> : null}</View> : null}
            {selectedCatalog ? <View style={styles.catalogPanel} testID="canonical-estimate-history"><Text style={styles.panelTitle}>История backend revisions</Text>{historyLoading ? <ActivityIndicator /> : history.map((revision) => <Pressable key={revision.revisionId} testID={`canonical-estimate-history-revision-${revision.revisionNumber}-${revision.revisionId}`} onPress={() => handleOpenHistoryRevision(revision)} style={styles.workSuggestionButton}><Text style={styles.workSuggestionName}>Revision {revision.revisionNumber} · release {revision.releaseId}</Text><Text style={styles.workSuggestionMeta}>{revision.revisionId} · {revision.createdAt}</Text></Pressable>)}</View> : null}
          </>}
        />

        <View style={styles.footer}>
          <Pressable onPress={onClose} style={[styles.button, styles.secondaryButton]}><Text style={styles.secondaryButtonText}>{TEXT.backForeman}</Text></Pressable>
          <Pressable testID="foreman-ai-estimate-add-draft" onPress={handleAddToDraft} disabled={!mapping || saving || loading} style={[styles.button, styles.primaryButton, (!mapping || saving || loading) && styles.disabledButton]}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{TEXT.addToDraft}</Text>}</Pressable>
        </View>
      </View>
    </Modal>
  );
}
