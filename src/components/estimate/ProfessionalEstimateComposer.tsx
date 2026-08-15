import React, { useEffect, useMemo, useState } from "react";
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
  type CanonicalEstimateCustomRow,
  type CanonicalEstimateJobView,
  type CanonicalEstimateRecalculateRequest,
  type CanonicalEstimateRevisionRowView,
  type CanonicalEstimateRevisionView,
  type CanonicalEstimateRowOverride,
} from "../../lib/estimate/backendPlatform/contracts";
import {
  buildCanonicalEstimateArtifact,
  cancelCanonicalEstimateJob,
  compileCanonicalEstimateAndLoad,
  getAllCanonicalEstimateRevisionRows,
  getCanonicalEstimateCatalogItem,
  getCanonicalEstimateRevision,
  getCanonicalEstimateRevisionHistory,
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

type CatalogSuggestion = Omit<CanonicalEstimateCatalogItem,
  "releaseId" | "definitionVersion" | "applicability" | "professionalMetadata" | "parameterSchema">;
type RevisionBundle = { revision: CanonicalEstimateRevisionView; rows: CanonicalEstimateRevisionRowView[] };
type PendingMigration = {
  parameters: Record<string, string | number | boolean>;
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

function normalizeRevisionParameters(parameters: Record<string, unknown>): Record<string, string | number | boolean> {
  return Object.fromEntries(Object.entries(parameters).filter((entry): entry is [string, string | number | boolean] =>
    typeof entry[1] === "string" || typeof entry[1] === "number" || typeof entry[1] === "boolean"));
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
  const [selectedCatalog, setSelectedCatalog] = useState<CanonicalEstimateCatalogItem | null>(null);
  const [parameterInputs, setParameterInputs] = useState<Record<string, string>>(Object.create(null));
  const [rowInputs, setRowInputs] = useState<Record<string, RowInputState>>(Object.create(null));
  const [rowOverrides, setRowOverrides] = useState<Record<string, CanonicalEstimateRowOverride>>(Object.create(null));
  const [customRows, setCustomRows] = useState<CanonicalEstimateCustomRow[]>([]);
  const [pendingMigration, setPendingMigration] = useState<PendingMigration | null>(null);
  const [history, setHistory] = useState<CanonicalEstimateRevisionView[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showAllParameters, setShowAllParameters] = useState(false);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogRows, setCatalogRows] = useState<CatalogQuickItem[]>([]);
  const [artifactMessage, setArtifactMessage] = useState("");
  const [artifactLinks, setArtifactLinks] = useState<Partial<Record<"pdf" | "procurement", ArtifactLink>>>({});

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
    if (!visible || selectedCatalog) return;
    const query = text.trim();
    if (query.length < 2) {
      setCatalogSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      setCatalogLoading(true);
      try {
        const result = await searchCanonicalEstimateCatalog({ query, limit: 8, signal: controller.signal });
        setCatalogSuggestions(result.items);
      } catch (nextError) {
        if (!controller.signal.aborted) {
          setCatalogSuggestions([]);
          setError(nextError instanceof Error ? nextError.message : String(nextError));
        }
      } finally {
        if (!controller.signal.aborted) setCatalogLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [selectedCatalog, text, visible]);

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
    setParameterInputs(Object.fromEntries(Object.entries(next.revision.parameters).map(([key, value]) => [key, String(value)])));
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
    if (!normalizedValue || (selectedCatalog && normalizedValue !== selectedCatalog.titleRu.trim())) {
      setSelectedCatalog(null);
      setParameterInputs(Object.create(null));
      setMapping(null);
      setBundle(null);
      setHistory([]);
      setShowAllParameters(false);
    }
  };

  const handleSelectWorkSuggestion = async (suggestion: CatalogSuggestion) => {
    setCatalogLoading(true);
    setError("");
    try {
      const catalog = await getCanonicalEstimateCatalogItem(suggestion.catalogId);
      setText(catalog.titleRu);
      setSelectedCatalog(catalog);
      setCatalogSuggestions([]);
      setShowAllParameters(false);
      setParameterInputs(Object.fromEntries(catalog.parameterSchema.map((parameter) => [
        parameter.parameterId,
        parameter.defaultValue == null ? "" : String(parameter.defaultValue),
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

  const readParameters = (): Record<string, string | number | boolean> => {
    if (!selectedCatalog) throw new Error(TEXT.selectCanonicalWork);
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
    let parameters: Record<string, string | number | boolean>;
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
        idempotencyKey: `composer-${selectedCatalog.catalogId}-${stableInputKey(parameters)}`.slice(0, 200),
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
            idempotencyKey: `composer-${selectedCatalog.catalogId}-${stableInputKey(parameters)}`.slice(0, 200),
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
              {catalogLoading ? <ActivityIndicator /> : null}
              {catalogSuggestions.length ? <View style={styles.workSuggestionsPanel} testID="foreman-ai-estimate-work-suggestions"><Text style={styles.panelTitle}>{TEXT.workSuggestionTitle}</Text><View style={styles.workSuggestionRows}>{catalogSuggestions.map((suggestion, index) => <Pressable key={suggestion.catalogId} testID={`foreman-ai-estimate-work-suggestion-${index + 1}`} onPress={() => handleSelectWorkSuggestion(suggestion)} style={styles.workSuggestionButton}><Text style={styles.workSuggestionName} numberOfLines={1}>{suggestion.titleRu}</Text><Text style={styles.workSuggestionMeta} numberOfLines={1}>{suggestion.domain} · {suggestion.catalogId}</Text></Pressable>)}</View></View> : null}
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
                {selectedCatalog.parameterSchema.slice(0, showAllParameters ? undefined : 8).map((parameter) => {
                  const values = parameterValues(parameter);
                  return <View key={parameter.parameterId} style={styles.editCell}>
                    <Text style={styles.fieldLabel}>{parameter.titleRu}{parameter.required ? " *" : ""}{parameter.unitId ? ` · ${parameter.unitId}` : ""}</Text>
                    {values.length > 0 && values.length <= 12 ? <View style={styles.rowActions}>{values.map((value) => <Pressable key={value} testID={`canonical-estimate-parameter-${parameter.ordinal}-${value}`} onPress={() => setParameterInputs((previous) => ({ ...previous, [parameter.parameterId]: value }))} style={[styles.toggleButton, parameterInputs[parameter.parameterId] === value && styles.toggleButtonActive]}><Text style={styles.toggleButtonText}>{value}</Text></Pressable>)}</View> : <TextInput testID={`canonical-estimate-parameter-${parameter.ordinal}`} value={parameterInputs[parameter.parameterId] ?? ""} onChangeText={(value) => setParameterInputs((previous) => ({ ...previous, [parameter.parameterId]: value }))} placeholder={parameter.parameterId} keyboardType={parameter.valueType === "decimal" || parameter.valueType === "integer" ? "decimal-pad" : "default"} editable={!loading && !saving} style={styles.fieldInput} />}
                  </View>;
                })}
                {selectedCatalog.parameterSchema.length > 8 ? <Pressable testID="canonical-estimate-expand-parameters" onPress={() => setShowAllParameters((current) => !current)} style={styles.toggleButton}><Text style={styles.toggleButtonText}>{showAllParameters ? "Collapse parameters" : `Show all ${selectedCatalog.parameterSchema.length} parameters`}</Text></Pressable> : null}
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
