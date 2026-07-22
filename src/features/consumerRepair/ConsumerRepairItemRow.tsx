import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { formatEstimateMoney } from "../../lib/ai/globalEstimate/formatEstimateMoney";
import { formatEstimateUnitLabel } from "../../lib/ai/globalEstimate/formatEstimateUnitLabel";
import type { ConsumerRepairRequestItem } from "../../lib/consumerRequests";
import { priceTraceVisibleLabel } from "../estimates/pricing/priceResolutionEngine";
import { hasConsumerRepairCalculationTrace } from "./consumerRepairCalculationTraceState";
import {
  asphaltProfessionalCategoryFromSourceParametersV4,
  asphaltProfessionalCategoryPresentationV4,
} from "../../lib/estimate/v4/asphalt/asphaltProfessionalPresentationV4";
import {
  createConsumerRepairQuantityEditOperationId,
  recordConsumerRepairQuantityEditStage,
  type ConsumerRepairQuantityChangeMeta,
  type ConsumerRepairQuantityEditSource,
} from "./consumerRepairQuantityEditTrace";
import { sanitizeRequestEstimatePublicText } from "./requestEstimateViewModel";

type Props = {
  item: ConsumerRepairRequestItem;
  onDecrease: (itemId: string) => void;
  onIncrease: (itemId: string) => void;
  onQuantityChange: (itemId: string, value: string, meta?: ConsumerRepairQuantityChangeMeta) => void;
  onUnitPriceChange: (itemId: string, value: string) => void;
  onRemove: (itemId: string) => void;
  onOpenCatalog?: (itemId: string) => void;
  onOpenPhoto?: (itemId: string) => void;
  showPhotoButton?: boolean;
};

type CalculationTraceProvenance = {
  formula_id: string | null;
  template_version: string | null;
  source_parameters: Record<string, unknown> | null;
};

function itemTypeLabel(item: ConsumerRepairRequestItem): string {
  const asphaltCategory = asphaltProfessionalCategoryFromSourceParametersV4(item.sourceParameters);
  if (asphaltCategory) return asphaltProfessionalCategoryPresentationV4(asphaltCategory).itemLabelRu;
  if (item.itemType === "work") return "\u0420\u0430\u0431\u043e\u0442\u0430";
  if (item.itemType === "material") return "\u041c\u0430\u0442\u0435\u0440\u0438\u0430\u043b";
  if (item.itemType === "service") return "\u041e\u0431\u043e\u0440\u0443\u0434\u043e\u0432\u0430\u043d\u0438\u0435 / \u0434\u043e\u0441\u0442\u0430\u0432\u043a\u0430";
  return "\u041f\u043e\u0437\u0438\u0446\u0438\u044f";
}

function bindingLabel(item: ConsumerRepairRequestItem): string | null {
  if (item.itemType !== "material") return null;
  if (item.selectedCatalogItemId || item.catalogItemId) return "\u041a\u0430\u0442\u0430\u043b\u043e\u0433: \u0432\u044b\u0431\u0440\u0430\u043d";
  if (item.catalogBindingStatus === "multiple_candidates") return "\u041a\u0430\u0442\u0430\u043b\u043e\u0433: \u0435\u0441\u0442\u044c \u0432\u0430\u0440\u0438\u0430\u043d\u0442\u044b";
  if (item.catalogBindingStatus === "matched") return "\u041a\u0430\u0442\u0430\u043b\u043e\u0433: \u043d\u0430\u0439\u0434\u0435\u043d";
  if (item.catalogBindingStatus === "no_catalog_match") return "\u041a\u0430\u0442\u0430\u043b\u043e\u0433: \u043f\u043e\u0434\u043e\u0431\u0440\u0430\u0442\u044c";
  return "\u041a\u0430\u0442\u0430\u043b\u043e\u0433";
}

function formatInputNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  return String(value);
}

function parseInputNumber(value: string, fallback: number): number {
  const parsed = Number(value.replace(",", ".").replace(/[^\d.]/g, "").trim());
  return Number.isFinite(parsed) ? parsed : fallback;
}

function setNativeQuantityInputText(
  input: React.RefObject<React.ElementRef<typeof TextInput> | null>,
  value: string,
): boolean {
  const target = input.current as {
    setNativeProps?: (props: Record<string, unknown>) => void;
    getNode?: () => unknown;
    _node?: unknown;
    _inputRef?: unknown;
  } | null;
  if (typeof target?.setNativeProps === "function") {
    target.setNativeProps({ text: value, value });
    return true;
  }
  const candidates = [
    target,
    typeof target?.getNode === "function" ? target.getNode() : null,
    target?._node,
    target?._inputRef,
  ];
  for (const candidate of candidates) {
    const node = candidate as { value?: unknown; setAttribute?: (name: string, nextValue: string) => void } | null;
    if (node && typeof node.value === "string") {
      node.value = value;
      if (typeof node.setAttribute === "function") node.setAttribute("value", value);
      return true;
    }
  }
  return false;
}

function runAfterQuantityInputPaint(onVisible: () => void, task: () => void, visibleAlreadyRecorded = false): void {
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => {
      if (!visibleAlreadyRecorded) onVisible();
      setTimeout(task, 0);
    });
    return;
  }
  setTimeout(() => {
    if (!visibleAlreadyRecorded) onVisible();
    task();
  }, 0);
}

function priceStatusLabel(item: ConsumerRepairRequestItem): string {
  if (item.priceStatus === "USER_PRICE_OVERRIDE") return "\u0446\u0435\u043d\u0430 \u0432\u0440\u0443\u0447\u043d\u0443\u044e";
  if (item.priceStatus === "USER_ENTERED_PRICE") return "\u0446\u0435\u043d\u0430 \u0432\u0432\u0435\u0434\u0435\u043d\u0430";
  if (item.priceStatus === "USER_CONFIRMED_MARKET_PRICE") return "\u0446\u0435\u043d\u0430 \u043f\u043e \u0444\u043e\u0442\u043e, \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0430";
  if (item.priceStatus === "CATALOG_PRICE_VERIFIED") return "\u0446\u0435\u043d\u0430 \u0438\u0437 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0430";
  if (item.priceStatus === "REFERENCE_PRICE_ESTIMATE" || item.priceStatus === "PRICEBOOK_VERIFIED") {
    return "\u0446\u0435\u043d\u0430 \u0438\u0437 \u0440\u0430\u0441\u0447\u0435\u0442\u0430";
  }
  return "\u0446\u0435\u043d\u0430 \u043d\u0443\u0436\u043d\u0430";
}

function priceTraceText(item: ConsumerRepairRequestItem): string {
  const trace = item.priceTrace;
  if (!trace || trace.price_status === "missing") {
    return "\u0426\u0435\u043d\u0430 \u043d\u0435 \u0437\u0430\u043f\u043e\u043b\u043d\u0435\u043d\u0430. \u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a \u0446\u0435\u043d\u044b \u043d\u0435 \u0432\u044b\u0431\u0440\u0430\u043d.";
  }
  return sanitizeRequestEstimatePublicText(priceTraceVisibleLabel(trace));
}

function calculationTraceProvenance(item: ConsumerRepairRequestItem): CalculationTraceProvenance {
  return {
    formula_id: item.formulaId ?? null,
    template_version: item.templateVersion ?? null,
    source_parameters: item.sourceParameters ?? null,
  };
}

function hasCalculationTraceProvenance(provenance: CalculationTraceProvenance): boolean {
  return Boolean(provenance.formula_id || provenance.template_version || provenance.source_parameters);
}

function calculationTraceLines(item: ConsumerRepairRequestItem): string[] {
  const provenance = calculationTraceProvenance(item);
  return [
    item.quantityFormula ? `\u0424\u043e\u0440\u043c\u0443\u043b\u0430: ${sanitizeRequestEstimatePublicText(item.quantityFormula)}` : null,
    item.calculationTrace ? `\u0420\u0430\u0441\u0447\u0435\u0442: ${sanitizeRequestEstimatePublicText(item.calculationTrace, "\u0440\u0430\u0441\u0447\u0435\u0442 \u043f\u043e \u043d\u043e\u0440\u043c\u0435")}` : null,
    item.normSourceTitle
      ? `\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a \u043d\u043e\u0440\u043c\u044b: ${sanitizeRequestEstimatePublicText(item.normSourceTitle)}`
      : item.normId || item.templateId ? "\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a \u043d\u043e\u0440\u043c\u044b: \u043f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u043e\u043d\u0430\u043b\u044c\u043d\u044b\u0439 \u043a\u0430\u0442\u0430\u043b\u043e\u0433" : null,
    hasCalculationTraceProvenance(provenance)
      ? "\u041c\u0435\u0442\u043e\u0434\u0438\u043a\u0430: \u0444\u043e\u0440\u043c\u0443\u043b\u0430, \u0432\u0435\u0440\u0441\u0438\u044f \u0448\u0430\u0431\u043b\u043e\u043d\u0430 \u0438 \u0438\u0441\u0445\u043e\u0434\u043d\u044b\u0435 \u043f\u0430\u0440\u0430\u043c\u0435\u0442\u0440\u044b \u0437\u0430\u0444\u0438\u043a\u0441\u0438\u0440\u043e\u0432\u0430\u043d\u044b \u0432 \u0440\u0435\u0432\u0438\u0437\u0438\u0438."
      : null,
  ].filter((line): line is string => Boolean(line?.trim()));
}

function ConsumerRepairItemRowComponent({
  item,
  onQuantityChange,
  onUnitPriceChange,
  onRemove,
  onOpenCatalog,
  onOpenPhoto,
  showPhotoButton,
}: Props): React.ReactElement {
  const unitLabel = React.useMemo(() => formatEstimateUnitLabel(item.unitLabel || item.unit), [item.unit, item.unitLabel]);
  const catalogBindingLabel = React.useMemo(() => bindingLabel(item), [item]);
  const totalLabel = React.useMemo(
    () => (item.totalPrice != null
      ? formatEstimateMoney(item.totalPrice, item.currency)
      : "\u0438\u0442\u043e\u0433 \u0443\u0442\u043e\u0447\u043d\u0438\u0442\u044c"),
    [item.currency, item.totalPrice],
  );
  const itemKindLabel = React.useMemo(() => itemTypeLabel(item), [item]);
  const itemPriceStatusLabel = React.useMemo(() => priceStatusLabel(item), [item]);
  const itemPriceTraceText = React.useMemo(() => priceTraceText(item), [item]);
  const [traceOpen, setTraceOpen] = React.useState(false);
  const hasCalculationTrace = React.useMemo(() => hasConsumerRepairCalculationTrace(item), [item]);
  const traceLines = React.useMemo(
    () => (traceOpen && hasCalculationTrace ? calculationTraceLines(item) : []),
    [hasCalculationTrace, item, traceOpen],
  );
  const itemQuantityText = formatInputNumber(item.quantity);
  const quantityInputRef = React.useRef<React.ElementRef<typeof TextInput> | null>(null);
  const [quantityText, setQuantityText] = React.useState(itemQuantityText);
  React.useEffect(() => {
    setQuantityText(itemQuantityText);
  }, [item.id, itemQuantityText]);
  const commitQuantityText = React.useCallback((nextValue: string, source: ConsumerRepairQuantityEditSource = "direct_input") => {
    const previousQuantity = item.quantity ?? null;
    const nextQuantity = parseInputNumber(nextValue, item.quantity ?? 0);
    const operationId = createConsumerRepairQuantityEditOperationId({
      itemId: item.id,
      source,
      nextQuantity,
    });
    const meta: ConsumerRepairQuantityChangeMeta = {
      operationId,
      source,
      previousQuantity,
      nextQuantity,
    };
    recordConsumerRepairQuantityEditStage({
      ...meta,
      stage: "QUANTITY_ACTION_RECEIVED",
      itemId: item.id,
    });
    const nativeVisible = setNativeQuantityInputText(quantityInputRef, nextValue);
    setQuantityText(nextValue);
    if (nativeVisible) {
      recordConsumerRepairQuantityEditStage({
        ...meta,
        stage: "VISIBLE_INPUT_UPDATED",
        itemId: item.id,
      });
    }
    runAfterQuantityInputPaint(() => {
      recordConsumerRepairQuantityEditStage({
        ...meta,
        stage: "VISIBLE_INPUT_UPDATED",
        itemId: item.id,
      });
    }, () => {
      onQuantityChange(item.id, nextValue, meta);
    }, nativeVisible);
  }, [item.id, item.quantity, onQuantityChange]);
  const stepQuantity = React.useCallback((delta: number) => {
    const baseQuantity = parseInputNumber(quantityText, item.quantity ?? 0);
    commitQuantityText(formatInputNumber(Math.max(0, baseQuantity + delta)), "stepper");
  }, [commitQuantityText, item.quantity, quantityText]);
  return (
    <View style={styles.row} testID={`consumer-repair-item-${item.id}`}>
      <View style={styles.main}>
        <Text style={styles.title}>{item.titleRu}</Text>
        <Text style={styles.meta}>{itemKindLabel}</Text>
        <View style={styles.fields}>
          <View style={styles.field}>
            <Text style={styles.label}>{"\u041a\u043e\u043b-\u0432\u043e"}</Text>
            <View style={styles.quantityLine}>
              <Pressable
                testID={`consumer-repair-item-minus-${item.id}`}
                accessibilityRole="button"
                accessibilityLabel={`${"\u0423\u043c\u0435\u043d\u044c\u0448\u0438\u0442\u044c"} ${item.titleRu}`}
                onPress={() => stepQuantity(-1)}
                style={styles.stepper}
              >
                <Ionicons name="remove" size={15} color="#0F172A" />
              </Pressable>
              <TextInput
                ref={quantityInputRef}
                value={quantityText}
                onChangeText={(value) => commitQuantityText(value, "direct_input")}
                keyboardType="decimal-pad"
                inputMode="decimal"
                selectTextOnFocus
                style={styles.input}
                testID={`consumer-repair-item-quantity-input-${item.id}`}
                accessibilityLabel={`${"\u041a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e"} ${item.titleRu}`}
              />
              <Pressable
                testID={`consumer-repair-item-plus-${item.id}`}
                accessibilityRole="button"
                accessibilityLabel={`${"\u0423\u0432\u0435\u043b\u0438\u0447\u0438\u0442\u044c"} ${item.titleRu}`}
                onPress={() => stepQuantity(1)}
                style={styles.stepper}
              >
                <Ionicons name="add" size={15} color="#0F172A" />
              </Pressable>
              <Text style={styles.unit} testID={`consumer-repair-item-unit-${item.id}`}>{unitLabel}</Text>
            </View>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>{"\u0426\u0435\u043d\u0430"}</Text>
            <TextInput
              value={formatInputNumber(item.unitPrice)}
              onChangeText={(value) => onUnitPriceChange(item.id, value)}
              keyboardType="decimal-pad"
              inputMode="decimal"
              selectTextOnFocus
              style={styles.priceInput}
              testID={`consumer-repair-item-unit-price-input-${item.id}`}
              accessibilityLabel={`${"\u0426\u0435\u043d\u0430"} ${item.titleRu}`}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>{"\u0418\u0442\u043e\u0433"}</Text>
            <Text style={styles.total} testID={`consumer-repair-item-total-${item.id}`}>{totalLabel}</Text>
          </View>
        </View>
        <Text style={styles.priceStatus} testID={`consumer-repair-item-price-status-${item.id}`}>
          {itemPriceStatusLabel}
        </Text>
        <Text style={styles.priceTrace} testID={`consumer-repair-item-price-trace-${item.id}`}>
          {itemPriceTraceText}
        </Text>
        {item.selectedProductBinding ? (
          <Text style={styles.selectedProduct} testID={`consumer-repair-item-selected-product-${item.id}`}>
            {`${"\u0412\u044b\u0431\u0440\u0430\u043d \u0442\u043e\u0432\u0430\u0440"}: ${item.selectedProductBinding.visibleName}${item.selectedProductBinding.packageLabel ? `, ${item.selectedProductBinding.packageLabel}` : ""}`}
          </Text>
        ) : null}
        {showPhotoButton && item.itemType === "material" ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${"\u0424\u043e\u0442\u043e \u0442\u043e\u0432\u0430\u0440\u0430"} ${item.titleRu}`}
            onPress={() => onOpenPhoto?.(item.id)}
            style={styles.photoButton}
            testID={`estimate-material-row-photo-button-${item.id}`}
          >
            <Ionicons name="camera-outline" size={15} color="#166534" />
            <Text style={styles.photoButtonText}>Фото</Text>
          </Pressable>
        ) : null}
        {catalogBindingLabel ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${"\u041f\u043e\u0434\u043e\u0431\u0440\u0430\u0442\u044c \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b \u0438\u0437 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0430 \u0434\u043b\u044f"} ${item.titleRu}`}
            onPress={() => onOpenCatalog?.(item.id)}
            style={styles.catalogBadge}
            testID={`consumer-repair-item-catalog-${item.id}`}
          >
            <Text style={styles.catalogBadgeText}>{catalogBindingLabel}</Text>
          </Pressable>
        ) : null}
        {hasCalculationTrace ? (
          <View style={styles.traceWrap}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${traceOpen ? "\u0421\u043a\u0440\u044b\u0442\u044c" : "\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c"} ${"\u0440\u0430\u0441\u0447\u0435\u0442"} ${item.titleRu}`}
              onPress={() => setTraceOpen((value) => !value)}
              style={styles.traceButton}
              testID={`consumer-repair-item-calculation-toggle-${item.id}`}
            >
              <Ionicons name={traceOpen ? "chevron-up" : "calculator-outline"} size={14} color="#7C2D12" />
              <Text style={styles.traceButtonText}>{traceOpen ? "\u0421\u043a\u0440\u044b\u0442\u044c \u0440\u0430\u0441\u0447\u0435\u0442" : "\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u0440\u0430\u0441\u0447\u0435\u0442"}</Text>
            </Pressable>
            {traceOpen ? (
              <View style={styles.traceBox} testID={`consumer-repair-item-calculation-trace-${item.id}`}>
                {traceLines.map((line, index) => <Text key={`${line}-${index}`} style={styles.traceLine}>{line}</Text>)}
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
      <Pressable
        testID={`consumer-repair-item-remove-${item.id}`}
        accessibilityRole="button"
        accessibilityLabel={`${"\u0423\u0434\u0430\u043b\u0438\u0442\u044c"} ${item.titleRu}`}
        onPress={() => onRemove(item.id)}
        style={styles.remove}
      >
        <Ionicons name="trash-outline" size={16} color="#DC2626" />
      </Pressable>
    </View>
  );
}

export const ConsumerRepairItemRow = React.memo(ConsumerRepairItemRowComponent);
ConsumerRepairItemRow.displayName = "ConsumerRepairItemRow";

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "900",
  },
  meta: {
    marginTop: 2,
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
  },
  fields: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
    gap: 8,
    marginTop: 8,
  },
  field: {
    gap: 4,
  },
  label: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "900",
  },
  quantityLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  stepper: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  input: {
    width: 70,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "900",
    paddingHorizontal: 8,
    backgroundColor: "#FFFFFF",
  },
  priceInput: {
    width: 106,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "900",
    paddingHorizontal: 8,
    backgroundColor: "#FFFFFF",
  },
  unit: {
    minWidth: 42,
    color: "#334155",
    fontSize: 12,
    fontWeight: "900",
  },
  total: {
    minHeight: 34,
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "900",
    paddingTop: 8,
  },
  priceStatus: {
    marginTop: 6,
    color: "#0F766E",
    fontSize: 12,
    fontWeight: "900",
  },
  selectedProduct: {
    marginTop: 6,
    color: "#334155",
    fontSize: 12,
    fontWeight: "800",
  },
  priceTrace: {
    marginTop: 4,
    color: "#334155",
    fontSize: 10,
    fontWeight: "800",
    lineHeight: 14,
  },
  photoButton: {
    marginTop: 6,
    alignSelf: "flex-start",
    minWidth: 74,
    height: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  photoButtonText: {
    color: "#166534",
    fontSize: 11,
    fontWeight: "900",
  },
  catalogBadge: {
    marginTop: 6,
    alignSelf: "flex-start",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  catalogBadgeText: {
    color: "#1D4ED8",
    fontSize: 11,
    fontWeight: "900",
  },
  traceWrap: {
    marginTop: 7,
    alignSelf: "stretch",
  },
  traceButton: {
    alignSelf: "flex-start",
    minHeight: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FED7AA",
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  traceButtonText: {
    color: "#7C2D12",
    fontSize: 11,
    fontWeight: "900",
  },
  traceBox: {
    marginTop: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FDBA74",
    backgroundColor: "#FFFBEB",
    padding: 8,
    gap: 3,
  },
  traceLine: {
    color: "#431407",
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 14,
  },
  remove: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
