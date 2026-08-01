import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  buildGlobalSelectedWorkBinding,
  calculateGlobalConstructionEstimateSync,
  searchGlobalWorkSmartSuggestions,
  type GlobalSelectedWorkBinding,
  type GlobalWorkSmartSearchSuggestion,
} from "../../lib/ai/globalEstimate";
import {
  addForemanAiEstimateCatalogMaterial,
  applyForemanAiEstimateDraftEdits,
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
  shouldUseAutoWorkSuggestion,
  styles,
  type CatalogQuickItem,
  type ProfessionalEstimateComposerProps,
  type RowInputState,
} from "./ProfessionalEstimateComposer.support";

export default function ProfessionalEstimateComposer({
  visible,
  mode,
  context,
  onClose,
  onOpenDraft,
  onDraftCreated,
  rikQuickSearch,
  initialText,
}: ProfessionalEstimateComposerProps) {
  const [text, setText] = useState(initialText ?? "");
  const [mapping, setMapping] = useState<ForemanAiEstimateDraftMapping | null>(null);
  const [rowInputs, setRowInputs] = useState<Record<string, RowInputState>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogRows, setCatalogRows] = useState<CatalogQuickItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [selectedWork, setSelectedWork] = useState<GlobalSelectedWorkBinding | null>(null);

  const contextText = useMemo(() => buildContextText(context), [context]);
  const workSuggestions = useMemo(
    () => (selectedWork ? [] : searchGlobalWorkSmartSuggestions({ query: text, limit: 8 })),
    [selectedWork, text],
  );
  useEffect(() => {
    if (!visible) return;
    setError("");
  }, [visible]);

  useEffect(() => {
    if (!visible || !rikQuickSearch) return;
    const query = catalogQuery.trim();
    if (query.length < 2) {
      setCatalogRows([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setCatalogLoading(true);
      try {
        const rows = await rikQuickSearch(query, 30);
        setCatalogRows(Array.isArray(rows) ? rows : []);
      } catch {
        setCatalogRows([]);
      } finally {
        setCatalogLoading(false);
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, [catalogQuery, rikQuickSearch, visible]);

  const handleTextChange = (value: string) => {
    setText(value);
    const normalizedValue = value.trim();
    if (!normalizedValue) {
      setSelectedWork(null);
      return;
    }
    if (selectedWork && normalizedValue !== selectedWork.selectedTitleRu.trim()) {
      setSelectedWork(null);
    }
  };

  const handleSelectWorkSuggestion = (suggestion: GlobalWorkSmartSearchSuggestion) => {
    const selectedTitle = suggestion.titleRu.trim() || suggestion.visibleText.trim();
    const nextSelectedWork = buildGlobalSelectedWorkBinding({
      selectedWorkKey: suggestion.workKey,
      rawInput: selectedTitle,
    });
    setText(selectedTitle);
    setSelectedWork(nextSelectedWork);
    setError("");
  };

  const handleGenerate = () => {
    const inputText = text.trim();
    if (!inputText) {
      setError(TEXT.emptyInput);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const autoWorkSuggestion = shouldUseAutoWorkSuggestion(workSuggestions[0]) ? workSuggestions[0] : undefined;
      const estimate = calculateGlobalConstructionEstimateSync({
        text: inputText,
        countryCode: "KG",
        city: "Bishkek",
        language: "ru",
        locale: "ru-KG",
        currency: "KGS",
        estimateDetailLevel: "professional_expanded",
        explicitWorkKey: selectedWork?.selectedWorkKey ?? autoWorkSuggestion?.workKey,
      });
      const nextMapping = mapAiEstimateToForemanDraft({
        estimate,
        context,
      });
      const parity = verifyForemanAiEstimatePayloadParity(nextMapping);
      if (!parity.ok) {
        throw new Error(`${TEXT.parityError} ${parity.issues.map((issue) => issue.code).join(", ")}`);
      }
      setMapping(nextMapping);
      setRowInputs(buildRowInputs(nextMapping));
    } catch (nextError) {
      setMapping(null);
      setRowInputs({});
      setError(nextError instanceof Error ? nextError.message : String(nextError));
    } finally {
      setLoading(false);
    }
  };

  const applyRowEdit = (rowId: string, edit: Parameters<typeof applyForemanAiEstimateDraftEdits>[1][number]) => {
    setMapping((prev) => {
      if (!prev) return prev;
      const next = applyForemanAiEstimateDraftEdits(prev, [edit]);
      return next;
    });
  };

  const updateRowInput = (rowId: string, patch: Partial<RowInputState>) => {
    setRowInputs((prev) => ({
      ...prev,
      [rowId]: {
        visibleName: prev[rowId]?.visibleName ?? "",
        quantity: prev[rowId]?.quantity ?? "",
        unitPrice: prev[rowId]?.unitPrice ?? "",
        ...patch,
      },
    }));
  };

  const handleNameChange = (row: ForemanDraftEstimateRow, value: string) => {
    updateRowInput(row.rowId, { visibleName: value });
    applyRowEdit(row.rowId, { rowId: row.rowId, visibleName: value });
  };

  const handleQuantityChange = (row: ForemanDraftEstimateRow, value: string) => {
    updateRowInput(row.rowId, { quantity: value });
    const parsed = parseNumberInput(value);
    if (parsed != null && parsed > 0) {
      applyRowEdit(row.rowId, { rowId: row.rowId, quantity: parsed });
    }
  };

  const handlePriceChange = (row: ForemanDraftEstimateRow, value: string) => {
    updateRowInput(row.rowId, { unitPrice: value });
    const parsed = parseNumberInput(value);
    if (parsed != null && parsed >= 0) {
      applyRowEdit(row.rowId, { rowId: row.rowId, unitPrice: parsed });
    }
  };

  const toggleIncludedInEstimate = (row: ForemanDraftEstimateRow) => {
    applyRowEdit(row.rowId, {
      rowId: row.rowId,
      includedInEstimate: !row.includedInEstimate,
    });
  };

  const toggleIncludedInProcurement = (row: ForemanDraftEstimateRow) => {
    applyRowEdit(row.rowId, {
      rowId: row.rowId,
      includedInProcurement: !row.includedInProcurement,
    });
  };

  const handleAddCatalogItem = (item: CatalogQuickItem) => {
    if (!mapping) {
      setError(TEXT.catalogNeedsEstimate);
      return;
    }
    const next = addForemanAiEstimateCatalogMaterial(mapping, item, {
      quantity: 1,
      unitPrice: 0,
    });
    setMapping(next);
    setRowInputs(buildRowInputs(next));
    setCatalogQuery("");
    setCatalogRows([]);
    setError("");
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

  const handleOpenDraft = () => {
    onClose();
    onOpenDraft?.();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.screen} testID="professional-estimate-composer">
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.headerButton} testID="foreman-ai-estimate-back">
            <Text style={styles.headerButtonText}>{"<"}</Text>
          </Pressable>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.title}>{TEXT.title}</Text>
            <Text style={styles.context} numberOfLines={1}>
              {mode === "foreman" ? contextText : ""}
            </Text>
          </View>
          <Pressable onPress={handleOpenDraft} style={styles.draftButton} testID="foreman-ai-estimate-open-draft">
            <Text style={styles.draftButtonText}>{TEXT.openDraft}</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
          <View style={styles.composePanel}>
            <TextInput
              testID="foreman-ai-estimate-input"
              value={text}
              onChangeText={handleTextChange}
              placeholder={TEXT.inputPlaceholder}
              multiline
              style={styles.input}
              editable={!loading && !saving}
            />
            {workSuggestions.length ? (
              <View style={styles.workSuggestionsPanel} testID="foreman-ai-estimate-work-suggestions">
                <Text style={styles.panelTitle}>{TEXT.workSuggestionTitle}</Text>
                <View style={styles.workSuggestionRows}>
                  {workSuggestions.slice(0, 8).map((suggestion, index) => (
                    <Pressable
                      key={suggestion.workKey}
                      testID={`foreman-ai-estimate-work-suggestion-${index + 1}`}
                      onPress={() => handleSelectWorkSuggestion(suggestion)}
                      style={styles.workSuggestionButton}
                    >
                      <Text style={styles.workSuggestionName} numberOfLines={1}>{suggestion.titleRu}</Text>
                      <Text style={styles.workSuggestionMeta} numberOfLines={1}>
                        {suggestion.categoryTitleRu}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}
            <Pressable
              testID="foreman-ai-estimate-generate"
              onPress={handleGenerate}
              disabled={loading || saving}
              style={[styles.button, styles.secondaryButton, (loading || saving) && styles.disabledButton]}
            >
              {loading ? <ActivityIndicator /> : <Text style={styles.secondaryButtonText}>{TEXT.generate}</Text>}
            </Pressable>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {mapping ? (
            <View style={styles.summary}>
              <Text style={styles.summaryText}>
                {TEXT.rows}: {mapping.requestDraftLines.length}
              </Text>
              <Text style={styles.summaryText}>
                {TEXT.buyer}: {formatMoney(mapping.totals.buyerProcurementTotal, mapping.totals.currency)}
              </Text>
              <Text style={styles.summaryText}>
                {TEXT.total}: {formatMoney(mapping.totals.estimateTotal, mapping.totals.currency)}
              </Text>
            </View>
          ) : null}

          <View style={styles.catalogPanel}>
            <Text style={styles.panelTitle}>{TEXT.catalogTitle}</Text>
            <View style={styles.catalogSearchRow}>
              <TextInput
                testID="foreman-ai-estimate-catalog-search"
                value={catalogQuery}
                onChangeText={setCatalogQuery}
                placeholder={TEXT.catalogPlaceholder}
                style={styles.catalogInput}
              />
              {catalogLoading ? <ActivityIndicator /> : null}
            </View>
            <Text style={styles.catalogHint} testID="foreman-ai-estimate-catalog-hint">
              {TEXT.catalogHint}
            </Text>
            {catalogRows.length ? (
              <View style={styles.catalogRows}>
                {catalogRows.slice(0, 8).map((item) => (
                  <View key={item.rik_code} style={styles.catalogRow}>
                    <View style={styles.catalogRowText}>
                      <Text style={styles.catalogName} numberOfLines={1}>{displayNameOfCatalogItem(item)}</Text>
                      <Text style={styles.catalogMeta}>{item.rik_code} / {formatEstimateUnit(item.uom_code)}</Text>
                    </View>
                    <Pressable
                      testID="foreman-ai-estimate-catalog-add"
                      onPress={() => handleAddCatalogItem(item)}
                      style={styles.smallPrimaryButton}
                    >
                      <Text style={styles.smallPrimaryButtonText}>{TEXT.add}</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          <View style={styles.rowsPanel}>
            {mapping?.rows.map((row) => {
              const inputs = rowInputs[row.rowId] ?? {
                visibleName: row.visibleName,
                quantity: String(row.quantity),
                unitPrice: String(row.unitPrice),
              };
              return (
                <View
                  key={row.rowId}
                  style={[styles.row, !row.includedInEstimate && styles.rowDisabled]}
                  testID="foreman-ai-estimate-row"
                >
                  <View style={styles.rowHeader}>
                    <TextInput
                      testID="foreman-ai-estimate-row-name"
                      value={inputs.visibleName}
                      onChangeText={(value) => handleNameChange(row, value)}
                      style={styles.rowNameInput}
                    />
                    <Text style={styles.rowSection}>{formatEstimateSection(row.section)}</Text>
                  </View>

                  <View style={styles.editGrid}>
                    <View style={styles.editCell}>
                      <Text style={styles.fieldLabel}>{TEXT.qty}</Text>
                      <TextInput
                        testID="foreman-ai-estimate-row-qty"
                        value={inputs.quantity}
                        onChangeText={(value) => handleQuantityChange(row, value)}
                        keyboardType="decimal-pad"
                        style={styles.fieldInput}
                      />
                    </View>
                    <View style={styles.editCell}>
                      <Text style={styles.fieldLabel}>{formatEstimateUnit(row.unit)}</Text>
                      <Text style={styles.readonlyValue}>{formatEstimateUnit(row.unit)}</Text>
                    </View>
                    <View style={styles.editCell}>
                      <Text style={styles.fieldLabel}>{TEXT.price}</Text>
                      <TextInput
                        testID="foreman-ai-estimate-row-price"
                        value={inputs.unitPrice}
                        onChangeText={(value) => handlePriceChange(row, value)}
                        keyboardType="decimal-pad"
                        style={styles.fieldInput}
                      />
                    </View>
                    <View style={styles.editCell}>
                      <Text style={styles.fieldLabel}>{TEXT.total}</Text>
                      <Text style={styles.totalValue}>{row.total == null ? "PRICE_MISSING" : formatMoney(row.total, row.currency)}</Text>
                    </View>
                  </View>

                  <View style={styles.rowActions}>
                    <Pressable
                      onPress={() => toggleIncludedInEstimate(row)}
                      style={[styles.toggleButton, row.includedInEstimate && styles.toggleButtonActive]}
                    >
                      <Text style={[styles.toggleButtonText, row.includedInEstimate && styles.toggleButtonActiveText]}>
                        {TEXT.estimateFlag}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => toggleIncludedInProcurement(row)}
                      style={[styles.toggleButton, row.includedInProcurement && styles.toggleButtonActive]}
                    >
                      <Text style={[styles.toggleButtonText, row.includedInProcurement && styles.toggleButtonActiveText]}>
                        {TEXT.procurementFlag}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => toggleIncludedInEstimate(row)}
                      style={styles.removeButton}
                    >
                      <Text style={styles.removeButtonText}>{row.includedInEstimate ? TEXT.remove : TEXT.restore}</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable onPress={onClose} style={[styles.button, styles.secondaryButton]}>
            <Text style={styles.secondaryButtonText}>{TEXT.backForeman}</Text>
          </Pressable>
          <Pressable
            testID="foreman-ai-estimate-add-draft"
            onPress={handleAddToDraft}
            disabled={!mapping || saving || loading}
            style={[styles.button, styles.primaryButton, (!mapping || saving || loading) && styles.disabledButton]}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{TEXT.addToDraft}</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
