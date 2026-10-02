import React from "react";
import {
  TextInput,
  type NativeSyntheticEvent,
  type TextInputSelectionChangeEventData,
} from "react-native";

import type { ConsumerRepairRequestItem } from "../../lib/consumerRequests/consumerRequestTypes";
import { consumerRepairRowCanonicalRevisionId, consumerRepairRowCode } from "./consumerRepairRowMetadata";
import {
  createConsumerRepairQuantityEditOperationId,
  recordConsumerRepairQuantityEditStage,
  type ConsumerRepairQuantityChangeMeta,
  type ConsumerRepairQuantityEditSource,
} from "./consumerRepairQuantityEditTrace";

type EditableTextSelection = { start: number; end: number };

type Input = {
  item: ConsumerRepairRequestItem;
  onQuantityChange: (
    itemId: string,
    value: string,
    meta?: ConsumerRepairQuantityChangeMeta,
  ) => void;
  onUnitPriceChange: (itemId: string, value: string) => void;
  onSpecificationChange?: (itemId: string, value: string) => void;
};

function formatInputNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  return String(value);
}

function parseInputNumber(value: string, fallback: number): number {
  const parsed = Number(value.replace(",", ".").replace(/[^\d.]/g, "").trim());
  return Number.isFinite(parsed) ? parsed : fallback;
}

function editableNumericTextMatchesConfirmedValue(
  draftText: string,
  confirmedText: string,
): boolean {
  if (draftText.trim() === confirmedText.trim()) return true;
  const parse = (value: string): number | null => {
    const normalized = value.trim().replace(/\s/gu, "").replace(",", ".");
    if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/u.test(normalized)) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const draft = parse(draftText);
  const confirmed = parse(confirmedText);
  return draft != null && confirmed != null && draft === confirmed;
}

export function setNativeQuantityInputText(
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
    const node = candidate as {
      value?: unknown;
      setAttribute?: (name: string, nextValue: string) => void;
    } | null;
    if (node && typeof node.value === "string") {
      node.value = value;
      if (typeof node.setAttribute === "function") node.setAttribute("value", value);
      return true;
    }
  }
  return false;
}

export function runAfterQuantityInputPaint(
  onVisible: () => void,
  task: () => void,
  visibleAlreadyRecorded = false,
): void {
  const scheduleTask = () => {
    if (typeof queueMicrotask === "function") {
      queueMicrotask(task);
      return;
    }
    void Promise.resolve().then(task);
  };
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(() => {
      if (!visibleAlreadyRecorded) onVisible();
      scheduleTask();
    });
    return;
  }
  const runVisibleTask = () => {
    if (!visibleAlreadyRecorded) onVisible();
    task();
  };
  if (typeof queueMicrotask === "function") {
    queueMicrotask(runVisibleTask);
    return;
  }
  void Promise.resolve().then(runVisibleTask);
}

export function useConsumerRepairItemRowEditing({
  item,
  onQuantityChange,
  onUnitPriceChange,
  onSpecificationChange,
}: Input) {
  const itemQuantityText = formatInputNumber(item.quantity);
  const itemPriceText = formatInputNumber(item.unitPrice);
  const itemSpecificationText = item.titleRu;
  const quantityInputRef = React.useRef<React.ElementRef<typeof TextInput> | null>(null);
  const quantityEditingRef = React.useRef(false);
  const quantityCommittedValueRef = React.useRef<string | null>(null);
  const priceEditingRef = React.useRef(false);
  const priceCommittedValueRef = React.useRef<string | null>(null);
  const specificationEditCommittedRef = React.useRef(false);
  const [quantityText, setQuantityText] = React.useState(itemQuantityText);
  const [priceText, setPriceText] = React.useState(itemPriceText);
  const [quantityEditing, setQuantityEditing] = React.useState(false);
  const [priceEditing, setPriceEditing] = React.useState(false);
  const [quantitySelection, setQuantitySelection] = React.useState<EditableTextSelection>({
    start: itemQuantityText.length,
    end: itemQuantityText.length,
  });
  const [priceSelection, setPriceSelection] = React.useState<EditableTextSelection>({
    start: itemPriceText.length,
    end: itemPriceText.length,
  });
  const [specificationText, setSpecificationText] = React.useState(itemSpecificationText);
  const [specificationEditing, setSpecificationEditing] = React.useState(false);
  const [professionalEvidenceOpen, setProfessionalEvidenceOpen] = React.useState(false);

  React.useEffect(() => {
    if (!quantityEditingRef.current) {
      const committedValue = quantityCommittedValueRef.current;
      if (
        committedValue != null
        && !editableNumericTextMatchesConfirmedValue(committedValue, itemQuantityText)
      ) return;
      setQuantityText(itemQuantityText);
      quantityCommittedValueRef.current = null;
      setQuantitySelection({ start: itemQuantityText.length, end: itemQuantityText.length });
    }
  }, [item.id, itemQuantityText]);

  React.useEffect(() => {
    if (!priceEditingRef.current) {
      const committedValue = priceCommittedValueRef.current;
      if (
        committedValue != null
        && !editableNumericTextMatchesConfirmedValue(committedValue, itemPriceText)
      ) return;
      setPriceText(itemPriceText);
      priceCommittedValueRef.current = null;
      setPriceSelection({ start: itemPriceText.length, end: itemPriceText.length });
    }
  }, [item.id, itemPriceText]);

  React.useEffect(() => {
    setSpecificationText(itemSpecificationText);
    setSpecificationEditing(false);
    specificationEditCommittedRef.current = false;
  }, [item.id, itemSpecificationText]);

  React.useEffect(() => {
    setProfessionalEvidenceOpen(false);
  }, [item.id]);

  const beginSpecificationEdit = React.useCallback(() => {
    specificationEditCommittedRef.current = false;
    setSpecificationText(item.titleRu);
    setSpecificationEditing(true);
  }, [item.titleRu]);

  const finishSpecificationEdit = React.useCallback(() => {
    if (specificationEditCommittedRef.current) return;
    specificationEditCommittedRef.current = true;
    const nextTitle = specificationText.trim();
    setSpecificationEditing(false);
    if (!nextTitle) {
      setSpecificationText(item.titleRu);
      return;
    }
    if (nextTitle !== item.titleRu) onSpecificationChange?.(item.id, nextTitle);
  }, [item.id, item.titleRu, onSpecificationChange, specificationText]);

  const commitQuantityText = React.useCallback((
    nextValue: string,
    source: ConsumerRepairQuantityEditSource = "direct_input",
  ) => {
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
    setQuantityText(nextValue);
    if (source === "direct_input") {
      recordConsumerRepairQuantityEditStage({
        ...meta,
        stage: "VISIBLE_INPUT_UPDATED",
        itemId: item.id,
      });
      onQuantityChange(item.id, nextValue, meta);
      return;
    }
    const nativeVisible = setNativeQuantityInputText(quantityInputRef, nextValue);
    if (nativeVisible) {
      recordConsumerRepairQuantityEditStage({
        ...meta,
        stage: "VISIBLE_INPUT_UPDATED",
        itemId: item.id,
      });
    }
    if (consumerRepairRowCanonicalRevisionId(item) && consumerRepairRowCode(item)) {
      // Canonical edits only stage the visible draft and provenance; there is
      // no durable transaction until explicit Apply. Waiting for a later frame
      // here leaves the new input labelled as the old automatic quantity.
      onQuantityChange(item.id, nextValue, meta);
      return;
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
  }, [item, onQuantityChange]);

  const beginQuantityEdit = React.useCallback(() => {
    quantityEditingRef.current = true;
    quantityCommittedValueRef.current = null;
    setQuantityEditing(true);
  }, []);

  const finishQuantityEdit = React.useCallback(() => {
    quantityEditingRef.current = false;
    setQuantityEditing(false);
    const nextValue = quantityText.trim();
    if (
      nextValue === itemQuantityText
      || quantityCommittedValueRef.current === nextValue
    ) return;
    quantityCommittedValueRef.current = nextValue;
    commitQuantityText(nextValue, "direct_input");
  }, [commitQuantityText, itemQuantityText, quantityText]);

  const beginPriceEdit = React.useCallback(() => {
    priceEditingRef.current = true;
    priceCommittedValueRef.current = null;
    setPriceEditing(true);
  }, []);

  const finishPriceEdit = React.useCallback(() => {
    priceEditingRef.current = false;
    setPriceEditing(false);
    const nextValue = priceText.trim();
    if (
      nextValue === itemPriceText
      || priceCommittedValueRef.current === nextValue
    ) return;
    priceCommittedValueRef.current = nextValue;
    onUnitPriceChange(item.id, nextValue);
  }, [item.id, itemPriceText, onUnitPriceChange, priceText]);

  const stepQuantity = React.useCallback((delta: number) => {
    quantityEditingRef.current = false;
    setQuantityEditing(false);
    quantityCommittedValueRef.current = null;
    const baseQuantity = parseInputNumber(quantityText, item.quantity ?? 0);
    commitQuantityText(formatInputNumber(Math.max(0, baseQuantity + delta)), "stepper");
  }, [commitQuantityText, item.quantity, quantityText]);

  const restoreCalculatedQuantity = React.useCallback((calculatedQuantity: number) => {
    quantityEditingRef.current = false;
    setQuantityEditing(false);
    const nextValue = formatInputNumber(calculatedQuantity);
    quantityCommittedValueRef.current = nextValue;
    setQuantityText(nextValue);
    onQuantityChange(item.id, "");
  }, [item.id, onQuantityChange]);

  const rememberQuantitySelection = React.useCallback((
    event: NativeSyntheticEvent<TextInputSelectionChangeEventData>,
  ) => {
    const next = event.nativeEvent.selection;
    setQuantitySelection((current) => current.start === next.start && current.end === next.end
      ? current
      : next);
  }, []);

  const rememberPriceSelection = React.useCallback((
    event: NativeSyntheticEvent<TextInputSelectionChangeEventData>,
  ) => {
    const next = event.nativeEvent.selection;
    setPriceSelection((current) => current.start === next.start && current.end === next.end
      ? current
      : next);
  }, []);

  return {
    quantityInputRef,
    quantityText,
    setQuantityText,
    priceText,
    setPriceText,
    quantityEditing,
    priceEditing,
    quantitySelection,
    priceSelection,
    specificationText,
    setSpecificationText,
    specificationEditing,
    professionalEvidenceOpen,
    setProfessionalEvidenceOpen,
    beginSpecificationEdit,
    finishSpecificationEdit,
    beginQuantityEdit,
    finishQuantityEdit,
    beginPriceEdit,
    finishPriceEdit,
    stepQuantity,
    restoreCalculatedQuantity,
    rememberQuantitySelection,
    rememberPriceSelection,
  };
}
