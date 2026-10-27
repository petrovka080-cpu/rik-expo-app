import React from "react";
import { InteractionManager, Platform, useWindowDimensions } from "react-native";

import type { LineMeta } from "../buyer.types";
import { buyerStyles as styles } from "../buyer.styles";
import { P_LIST, P_SHEET } from "../buyerUi";
import { mergeNote, splitNote } from "../buyerUtils";
import type { StylesBag } from "../components/component.types";

type BuyerItemEditorModelParams = {
  m: LineMeta;
  s: StylesBag;
  inSheet?: boolean;
  supplierSuggestions: string[];
  hasAnyCounterpartyOptions: boolean;
  onSetPrice: (v: string) => void;
  onSetSupplier: (v: string) => void;
  onSetNote: (v: string) => void;
  onPickSupplier: (name: string) => void;
  onFocusField?: () => void;
};

type SupplierLayoutEvent = {
  nativeEvent?: {
    layout?: {
      height?: number;
    };
  };
};

export function useBuyerItemEditorModel({
  m,
  s,
  inSheet,
  supplierSuggestions,
  hasAnyCounterpartyOptions,
  onSetPrice,
  onSetSupplier,
  onSetNote,
  onPickSupplier,
  onFocusField,
}: BuyerItemEditorModelParams) {
  const P = inSheet ? P_SHEET : P_LIST;
  const isMobileRuntime = Platform.OS !== "web";
  const { width: viewportWidth } = useWindowDimensions();
  const { user: noteUser, auto: noteAuto } = splitNote(m.note);
  const [priceDraft, setPriceDraft] = React.useState(String(m.price ?? ""));
  const [priceFocused, setPriceFocused] = React.useState(false);
  const [noteDraft, setNoteDraft] = React.useState(String(noteUser ?? ""));
  const [noteFocused, setNoteFocused] = React.useState(false);
  const [supplierQueryDraft, setSupplierQueryDraft] = React.useState("");
  const [selectedSupplierLabel, setSelectedSupplierLabel] = React.useState(String(m.supplier ?? ""));
  const [selectedSupplierId, setSelectedSupplierId] = React.useState("");
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = React.useState(false);
  const [supplierInputHeight, setSupplierInputHeight] = React.useState(46);
  const blurCloseFrameRef = React.useRef<number | null>(null);
  const resetSelectionTaskRef = React.useRef<{ cancel?: () => void } | null>(null);
  const selectingOptionRef = React.useRef(false);
  const makeSupplierId = React.useCallback(
    (label: string) => String(label || "").trim().toLowerCase().replace(/\s+/g, " "),
    [],
  );

  React.useEffect(() => {
    if (priceFocused) return;
    const next = String(m.price ?? "");
    if (next !== priceDraft) setPriceDraft(next);
  }, [m.price, priceDraft, priceFocused]);

  React.useEffect(() => {
    if (noteFocused) return;
    const next = String(noteUser ?? "");
    if (next !== noteDraft) setNoteDraft(next);
  }, [noteDraft, noteFocused, noteUser]);

  React.useEffect(() => {
    if (isDropdownOpen) return;
    const next = String(m.supplier ?? "");
    if (next !== selectedSupplierLabel) setSelectedSupplierLabel(next);
    const nextId = makeSupplierId(next);
    if (nextId !== selectedSupplierId) setSelectedSupplierId(nextId);
  }, [m.supplier, isDropdownOpen, makeSupplierId, selectedSupplierId, selectedSupplierLabel]);

  const filteredSuppliers = React.useMemo(() => {
    const all = Array.from(new Set((supplierSuggestions || []).map((name) => String(name || "").trim()).filter(Boolean)));
    const needle = String(supplierQueryDraft || "").trim().toLowerCase();
    if (!needle) return isMobileRuntime ? all : [];
    if (!isMobileRuntime && needle.length < 2) return [];
    return all.filter((name) => String(name).toLowerCase().includes(needle));
  }, [supplierSuggestions, supplierQueryDraft, isMobileRuntime]);

  const shouldStackPrimaryFields = isMobileRuntime && viewportWidth < 420;
  const editorCardStyle = isMobileRuntime
    ? styles.editorCardMobile
    : styles.editorCardDesktop;
  const fieldInputStyle = React.useMemo(
    () => [s.fieldInput, { backgroundColor: P.inputBg, borderColor: P.inputBorder, color: P.text }],
    [P.inputBg, P.inputBorder, P.text, s.fieldInput],
  );
  const mobileSupplierTriggerStyle = React.useMemo(
    () => [
      s.fieldInput,
      styles.mobileSupplierTrigger,
      hasAnyCounterpartyOptions
        ? styles.mobileSupplierTriggerEnabled
        : styles.mobileSupplierTriggerDisabled,
      { backgroundColor: P.inputBg, borderColor: P.inputBorder },
    ],
    [P.inputBg, P.inputBorder, hasAnyCounterpartyOptions, s.fieldInput],
  );
  const mobileSupplierLabelStyle = React.useMemo(
    () => [styles.mobileSupplierLabel, { color: selectedSupplierLabel ? P.text : P.sub }],
    [P.sub, P.text, selectedSupplierLabel],
  );
  const noteInputStyle = React.useMemo(
    () => [
      s.fieldInput,
      {
        minHeight: isMobileRuntime ? 42 : 44,
        backgroundColor: P.inputBg,
        borderColor: P.inputBorder,
        color: P.text,
        textAlignVertical: "top" as const,
      },
    ],
    [P.inputBg, P.inputBorder, P.text, isMobileRuntime, s.fieldInput],
  );
  const noteAutoCardStyle = React.useMemo(
    () => [styles.noteAutoCard, { borderColor: P.inputBorder }],
    [P.inputBorder],
  );
  const noteAutoLabelStyle = React.useMemo(
    () => [styles.noteAutoLabel, { color: P.sub }],
    [P.sub],
  );
  const noteAutoValueStyle = React.useMemo(
    () => [styles.noteAutoValue, { color: P.text }],
    [P.text],
  );
  const modalSearchInputStyle = React.useMemo(
    () => [
      s.fieldInput,
      styles.modalSearchInput,
      { backgroundColor: P.inputBg, borderColor: P.inputBorder, color: P.text },
    ],
    [P.inputBg, P.inputBorder, P.text, s.fieldInput],
  );
  const modalEmptyTextStyle = React.useMemo(
    () => [styles.modalEmptyText, { color: P.sub }],
    [P.sub],
  );
  const inlineSuggestBoxStyle = React.useMemo(
    () => [
      s.suggestBoxInline,
      styles.inlineSuggestBox,
      { borderColor: P.inputBorder, top: supplierInputHeight + 6 },
    ],
    [P.inputBorder, s.suggestBoxInline, supplierInputHeight],
  );
  const inlineSuggestItemTextStyle = React.useMemo(
    () => [styles.inlineSuggestItemText, { color: P.text }],
    [P.text],
  );
  const modalSupplierRowTextStyle = React.useMemo(
    () => [styles.modalSupplierRowText, { color: P.text }],
    [P.text],
  );

  const commitSelectedSupplier = React.useCallback(
    (rawName: string) => {
      if (blurCloseFrameRef.current != null) {
        cancelAnimationFrame(blurCloseFrameRef.current);
        blurCloseFrameRef.current = null;
      }
      const selectedLabel = String(rawName || "").trim();
      if (!selectedLabel) return;
      const selectedId = makeSupplierId(selectedLabel);
      onSetSupplier(selectedLabel);
      onPickSupplier(selectedLabel);
      setSelectedSupplierLabel(selectedLabel);
      setSelectedSupplierId(selectedId);
      setSupplierQueryDraft("");
      setIsDropdownOpen(false);
      setIsSupplierModalOpen(false);
      resetSelectionTaskRef.current?.cancel?.();
      resetSelectionTaskRef.current = InteractionManager.runAfterInteractions(() => {
        selectingOptionRef.current = false;
      });
    },
    [makeSupplierId, onPickSupplier, onSetSupplier],
  );

  React.useEffect(() => {
    return () => {
      if (blurCloseFrameRef.current != null) cancelAnimationFrame(blurCloseFrameRef.current);
      resetSelectionTaskRef.current?.cancel?.();
      resetSelectionTaskRef.current = null;
    };
  }, []);

  const openPicker = React.useCallback(() => {
    if (!hasAnyCounterpartyOptions) return;
    if (blurCloseFrameRef.current != null) {
      cancelAnimationFrame(blurCloseFrameRef.current);
      blurCloseFrameRef.current = null;
    }
    onFocusField?.();
    setSupplierQueryDraft(selectedSupplierLabel);
    if (isMobileRuntime) {
      setIsSupplierModalOpen(true);
      return;
    }
    setIsDropdownOpen(true);
  }, [hasAnyCounterpartyOptions, isMobileRuntime, onFocusField, selectedSupplierLabel]);

  const handlePriceFocus = React.useCallback(() => {
    setPriceFocused(true);
    onFocusField?.();
  }, [onFocusField]);

  const commitPriceDraft = React.useCallback(() => {
    onSetPrice(String(priceDraft ?? ""));
  }, [onSetPrice, priceDraft]);

  const handlePriceBlur = React.useCallback(() => {
    setPriceFocused(false);
    commitPriceDraft();
  }, [commitPriceDraft]);

  const handleSupplierLayout = React.useCallback((e: SupplierLayoutEvent) => {
    const h = Number(e?.nativeEvent?.layout?.height ?? 0);
    if (Number.isFinite(h) && h > 0) setSupplierInputHeight(h);
  }, []);

  const handleSupplierTextChange = React.useCallback((v: string) => {
    setSupplierQueryDraft(v);
    if (!isDropdownOpen) setIsDropdownOpen(true);
  }, [isDropdownOpen]);

  const handleSupplierBlur = React.useCallback(() => {
    if (selectingOptionRef.current) return;
    blurCloseFrameRef.current = requestAnimationFrame(() => {
      blurCloseFrameRef.current = requestAnimationFrame(() => {
        if (selectingOptionRef.current) return;
        setIsDropdownOpen(false);
        setSupplierQueryDraft("");
        blurCloseFrameRef.current = null;
      });
    });
  }, []);

  const handleNoteFocus = React.useCallback(() => {
    setNoteFocused(true);
    onFocusField?.();
  }, [onFocusField]);

  const handleNoteBlur = React.useCallback(() => {
    setNoteFocused(false);
    onSetNote(mergeNote(String(noteDraft ?? ""), noteAuto));
  }, [noteAuto, noteDraft, onSetNote]);

  const closeSupplierModal = React.useCallback(() => {
    setIsSupplierModalOpen(false);
  }, []);

  const handleInlineSupplierPressIn = React.useCallback(() => {
    selectingOptionRef.current = true;
    if (blurCloseFrameRef.current != null) {
      cancelAnimationFrame(blurCloseFrameRef.current);
      blurCloseFrameRef.current = null;
    }
  }, []);

  const isSupplierItemSelected = React.useCallback(
    (item: string) => makeSupplierId(item) === selectedSupplierId,
    [makeSupplierId, selectedSupplierId],
  );

  return {
    P,
    isMobileRuntime,
    shouldStackPrimaryFields,
    editorCardStyle,
    noteAuto,
    priceDraft,
    setPriceDraft,
    noteDraft,
    setNoteDraft,
    supplierQueryDraft,
    setSupplierQueryDraft,
    selectedSupplierLabel,
    isDropdownOpen,
    isSupplierModalOpen,
    filteredSuppliers,
    fieldInputStyle,
    mobileSupplierTriggerStyle,
    mobileSupplierLabelStyle,
    noteInputStyle,
    noteAutoCardStyle,
    noteAutoLabelStyle,
    noteAutoValueStyle,
    modalSearchInputStyle,
    modalEmptyTextStyle,
    inlineSuggestBoxStyle,
    inlineSuggestItemTextStyle,
    modalSupplierRowTextStyle,
    commitSelectedSupplier,
    openPicker,
    handlePriceFocus,
    commitPriceDraft,
    handlePriceBlur,
    handleSupplierLayout,
    handleSupplierTextChange,
    handleSupplierBlur,
    handleNoteFocus,
    handleNoteBlur,
    closeSupplierModal,
    handleInlineSupplierPressIn,
    isSupplierItemSelected,
  };
}
