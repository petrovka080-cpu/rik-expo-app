import React from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  FlatList,
  Platform,
  Modal,
  SafeAreaView,
  useWindowDimensions,
  InteractionManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { BuyerInboxRow } from "../../../lib/api/types";
import { StatusBadge } from "../../../ui/StatusBadge";
import type { LineMeta } from "../buyer.types";
import { splitNote, mergeNote } from "../buyerUtils";
import { buyerStyles as styles } from "../buyer.styles";
import { P_LIST, P_SHEET } from "../buyerUi";
import type { StylesBag } from "./component.types";

type BuyerItemEditorProps = {
  it: BuyerInboxRow;
  m: LineMeta;
  s: StylesBag;
  inSheet?: boolean;
  counterpartyLabel: string;
  supplierSuggestions: string[];
  hasAnyCounterpartyOptions: boolean;
  counterpartyHardFailure: boolean;
  onSetPrice: (v: string) => void;
  onSetSupplier: (v: string) => void;
  onSetNote: (v: string) => void;
  onPickSupplier: (name: string) => void;
  onFocusField?: () => void;
};

const supplierKeyExtractor = (item: string, idx: number) => `${item}:${idx}`;

export const BuyerItemEditor = React.memo(function BuyerItemEditor(props: BuyerItemEditorProps) {
  const {
    m,
    s,
    inSheet,
    counterpartyLabel,
    supplierSuggestions,
    hasAnyCounterpartyOptions,
    counterpartyHardFailure,
    onSetPrice,
    onSetSupplier,
    onSetNote,
    onPickSupplier,
    onFocusField,
  } = props;

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

  const handleSupplierLayout = React.useCallback((e: { nativeEvent?: { layout?: { height?: number } } }) => {
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

  const renderInlineSupplierItem = React.useCallback(
    ({ item }: { item: string }) => (
      <Pressable
        onPressIn={() => {
          selectingOptionRef.current = true;
          if (blurCloseFrameRef.current != null) {
            cancelAnimationFrame(blurCloseFrameRef.current);
            blurCloseFrameRef.current = null;
          }
        }}
        style={({ pressed }) => [
          s.suggestItem,
          styles.inlineSuggestItem,
          {
            borderColor: P.inputBorder,
            backgroundColor: pressed ? "rgba(255,255,255,0.08)" : "#1E2A38",
          },
        ]}
        onPress={() => commitSelectedSupplier(item)}
      >
        <Text style={inlineSuggestItemTextStyle} numberOfLines={1}>
          {item}
        </Text>
      </Pressable>
    ),
    [P.inputBorder, commitSelectedSupplier, inlineSuggestItemTextStyle, s.suggestItem],
  );

  const renderModalSupplierItem = React.useCallback(
    ({ item }: { item: string }) => (
      <Pressable
        onPress={() => commitSelectedSupplier(item)}
        style={[
          styles.modalSupplierRow,
          makeSupplierId(item) === selectedSupplierId
            ? styles.modalSupplierRowSelected
            : styles.modalSupplierRowDefault,
        ]}
      >
        <Text style={modalSupplierRowTextStyle} numberOfLines={1}>
          {item}
        </Text>
      </Pressable>
    ),
    [commitSelectedSupplier, makeSupplierId, modalSupplierRowTextStyle, selectedSupplierId],
  );

  return (
    <View
      style={[styles.editorCardBase, editorCardStyle]}
    >
      <View style={styles.editorStatusRow}>
        <StatusBadge label="Редактируется" tone="info" compact />
      </View>

      <View
        style={[
          styles.primaryFieldsBase,
          shouldStackPrimaryFields ? styles.primaryFieldsStack : styles.primaryFieldsInline,
          isDropdownOpen ? styles.primaryFieldsOpen : styles.primaryFieldsClosed,
        ]}
      >
        <View style={styles.flexOne}>
          <TextInput
            value={priceDraft}
            onChangeText={setPriceDraft}
            keyboardType={Platform.OS === "web" ? "default" : "decimal-pad"}
            returnKeyType="done"
            blurOnSubmit={false}
            placeholder="Цена *"
            placeholderTextColor={P.sub}
            autoCorrect={false}
            autoCapitalize="none"
            onFocus={handlePriceFocus}
            onBlur={handlePriceBlur}
            onEndEditing={commitPriceDraft}
            style={fieldInputStyle}
          />
        </View>

        <View
          style={[
            styles.supplierFieldWrap,
            isDropdownOpen ? styles.supplierFieldWrapOpen : styles.supplierFieldWrapClosed,
          ]}
        >
          {isMobileRuntime ? (
            <Pressable
              onPress={openPicker}
              disabled={!hasAnyCounterpartyOptions}
              style={mobileSupplierTriggerStyle}
            >
              <Text
                style={mobileSupplierLabelStyle}
                numberOfLines={1}
              >
                {selectedSupplierLabel || `${counterpartyLabel} *`}
              </Text>
              <Ionicons name="chevron-down" size={18} color={P.sub} />
            </Pressable>
          ) : (
            <View
              onLayout={handleSupplierLayout}
            >
              <TextInput
                value={isDropdownOpen ? supplierQueryDraft : selectedSupplierLabel}
                onChangeText={handleSupplierTextChange}
                returnKeyType="done"
                blurOnSubmit={false}
                placeholder={`${counterpartyLabel} *`}
                placeholderTextColor={P.sub}
                editable={hasAnyCounterpartyOptions}
                onFocus={openPicker}
                onBlur={handleSupplierBlur}
                style={fieldInputStyle}
              />
            </View>
          )}

          {isDropdownOpen && filteredSuppliers.length > 0 ? (
            <View
              style={inlineSuggestBoxStyle}
              pointerEvents="auto"
            >
              <FlatList
                data={filteredSuppliers}
                keyExtractor={supplierKeyExtractor}
                keyboardShouldPersistTaps="always"
                style={styles.inlineSupplierList}
                renderItem={renderInlineSupplierItem}
              />
            </View>
          ) : null}
          {counterpartyHardFailure ? (
            <Text style={styles.counterpartyFailureText}>
              Справочник контрагентов недоступен.
            </Text>
          ) : null}
        </View>
      </View>

      <TextInput
        value={noteDraft}
        onChangeText={setNoteDraft}
        placeholder="Примечание"
        placeholderTextColor={P.sub}
        multiline
        blurOnSubmit={false}
        onFocus={handleNoteFocus}
        onBlur={handleNoteBlur}
        style={noteInputStyle}
      />

      {noteAuto ? (
        <View
          style={noteAutoCardStyle}
        >
          <Text style={noteAutoLabelStyle}>
            Реквизиты поставщика
          </Text>
          <Text style={noteAutoValueStyle} numberOfLines={3}>
            {noteAuto.replace(/\n+/g, " • ")}
          </Text>
        </View>
      ) : null}

      {isMobileRuntime ? (
        <Modal
          visible={isSupplierModalOpen}
          transparent={false}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={closeSupplierModal}
        >
          <SafeAreaView style={styles.supplierModalSafeArea}>
            <View style={styles.supplierModalContent}>
              <View style={styles.supplierModalHeader}>
                <Text style={[styles.supplierModalTitle, { color: P.text }]}>
                  Выберите {counterpartyLabel.toLowerCase()}
                </Text>
                <Pressable
                  onPress={closeSupplierModal}
                  style={styles.supplierModalCloseButton}
                >
                  <Ionicons name="close" size={20} color={P.text} />
                </Pressable>
              </View>

              <TextInput
                value={supplierQueryDraft}
                onChangeText={setSupplierQueryDraft}
                autoFocus
                returnKeyType="search"
                blurOnSubmit={false}
                placeholder={`Поиск ${counterpartyLabel.toLowerCase()}`}
                placeholderTextColor={P.sub}
                style={modalSearchInputStyle}
              />

              <FlatList
                data={filteredSuppliers}
                keyExtractor={supplierKeyExtractor}
                keyboardShouldPersistTaps="always"
                contentContainerStyle={styles.modalSupplierListContent}
                renderItem={renderModalSupplierItem}
                ListEmptyComponent={
                  <Text style={modalEmptyTextStyle}>
                    Ничего не найдено
                  </Text>
                }
              />
            </View>
          </SafeAreaView>
        </Modal>
      ) : null}
    </View>
  );
});

function BuyerItemRowInner(props: {
  it: BuyerInboxRow;
  selected: boolean;
  inSheet?: boolean;
  m: LineMeta;
  sum: number;
  prettyText: string;
  rejectedByDirector: boolean;
  s: StylesBag;
  onTogglePick: () => void;
  onSetPrice: (v: string) => void;
  onSetSupplier: (v: string) => void;
  onSetNote: (v: string) => void;
  counterpartyLabel: string;
  supplierSuggestions: string[];
  hasAnyCounterpartyOptions: boolean;
  counterpartyHardFailure: boolean;
  onPickSupplier: (name: string) => void;
  showInlineEditor?: boolean;
  onFocusField?: () => void;
  onEditMobile?: () => void;
  isMobileEditorOpen?: boolean;
}) {
  const {
    it,
    selected,
    inSheet,
    m,
    sum,
    prettyText,
    rejectedByDirector,
    onTogglePick,
    counterpartyLabel,
    showInlineEditor = false,
    onEditMobile,
    isMobileEditorOpen,
    s,
  } = props;

  const P = inSheet ? P_SHEET : P_LIST;
  const { user: noteUser } = splitNote(m.note);

  const rejectReason = String(
    it.director_reject_reason ??
    it.director_reject_note ??
    "",
  ).trim();
  const lastOfferSupplier = String(it.last_offer_supplier ?? "").trim();
  const lastOfferPriceRaw = it.last_offer_price;
  const lastOfferPrice =
    typeof lastOfferPriceRaw === "number" && Number.isFinite(lastOfferPriceRaw)
      ? lastOfferPriceRaw
      : null;

  const isEditing = selected && !showInlineEditor && !!isMobileEditorOpen;
  const statusLabel = isEditing ? "Редактируется" : selected ? "Выбрано" : "Заполни и выбери";
  const statusTone = selected ? "info" : "neutral";

  return (
    <View
      style={[
        inSheet ? s.buyerMobCard : s.card,
        inSheet ? null : { backgroundColor: P.cardBg, borderColor: P.border },
        selected && (inSheet ? s.buyerMobCardPicked : s.cardPicked),
        styles.rowShellBase,
        selected ? styles.rowShellSelected : styles.rowShellDefault,
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.rowContent}>
        <View style={styles.rowHeader}>
          <View style={styles.rowHeaderMain}>
            <View style={styles.rowHeaderTitleRow}>
              <Text style={[s.cardTitle, { color: P.text }]}>{it.name_human}</Text>

              {it.app_code ? (
                <View style={[styles.appCodeChip, { backgroundColor: P.chipGrayBg }]}>
                  <Text style={[styles.appCodeChipText, { color: P.chipGrayText }]}>
                    {it.app_code}
                  </Text>
                </View>
              ) : null}

              {rejectedByDirector ? (
                <View
                  style={[
                    styles.rejectedBadge,
                    {
                      backgroundColor: inSheet ? "rgba(239,68,68,0.18)" : "#FEE2E2",
                      borderColor: inSheet ? "rgba(239,68,68,0.45)" : "#FCA5A5",
                    },
                  ]}
                >
                  <Text style={[styles.rejectedBadgeText, { color: inSheet ? "#FCA5A5" : "#991B1B" }]}>
                    ОТКЛОНЕНА
                  </Text>
                </View>
              ) : null}
            </View>

            <Text style={[s.cardMeta, { color: P.sub }]}>{prettyText}</Text>
          </View>

          <View style={styles.rowHeaderActions}>
            <Pressable
              testID={`buyer-item-toggle-${String(it.request_item_id ?? "")}`}
              accessibilityLabel={`buyer-item-toggle-${String(it.request_item_id ?? "")}`}
              onPress={onTogglePick}
              style={[
                s.smallBtn,
                {
                  borderColor: selected ? "#2563eb" : P.btnBorder,
                  backgroundColor: selected ? "#2563eb" : P.btnBg,
                },
                styles.toggleButton,
              ]}
            >
              <Text style={[s.smallBtnText, { color: selected ? "#fff" : P.text }]}>
                {selected ? "Снять" : "Выбрать"}
              </Text>
            </Pressable>
            {!selected ? <Ionicons name="chevron-forward" size={16} color={P.sub} /> : null}
          </View>
        </View>

        <View style={styles.rowMetaBlock}>
          <Text style={[styles.rowMetaText, { color: P.sub }]}>
            Цена: <Text style={[styles.rowMetaStrong, { color: P.text }]}>{m.price || "?"}</Text>
            {" • "}
            {counterpartyLabel}: <Text style={[styles.rowMetaStrong, { color: P.text }]}>{m.supplier || "?"}</Text>
            {" • "}
            Прим.: <Text style={[styles.rowMetaStrong, { color: P.text }]}>{noteUser || "?"}</Text>
          </Text>

          <Text style={[styles.rowMetaText, { color: P.sub }]}>
            Сумма по позиции:{" "}
            <Text style={[styles.rowMetaStrong, { color: P.text }]}>{sum ? sum.toLocaleString() : "0"}</Text> сом
          </Text>

          {rejectedByDirector ? (
            <View
              style={[
                styles.rejectReasonCard,
                {
                  borderColor: inSheet ? "rgba(239,68,68,0.45)" : "#FCA5A5",
                  backgroundColor: inSheet ? "rgba(239,68,68,0.12)" : "#FEF2F2",
                },
              ]}
            >
              <Text style={[styles.rejectReasonText, { color: inSheet ? "#FCA5A5" : "#991B1B" }]}>
                Причина отклонения:{" "}
                <Text style={[styles.rejectReasonStrong, { color: inSheet ? "#FECACA" : "#7F1D1D" }]}>
                  {rejectReason || "Отклонено директором"}
                </Text>
              </Text>
              <Text style={[styles.rejectReasonSubline, { color: inSheet ? "#FECACA" : "#7F1D1D" }]}>
                Предыдущее предложение: {lastOfferSupplier || "?"} • {lastOfferPrice != null ? `${lastOfferPrice}` : "?"} сом
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.rowFooter}>
          {selected ? (
            <Pressable
              onPress={onEditMobile}
              style={styles.mobileEditButton}
            >
              <Text style={styles.mobileEditButtonText}>Редактировать</Text>
            </Pressable>
          ) : null}

          <View style={styles.statusBadgeWrap}>
            <StatusBadge label={statusLabel} tone={statusTone} compact />
          </View>
        </View>
      </View>
    </View>
  );
}

export const BuyerItemRow = React.memo(BuyerItemRowInner, (prev, next) => {
  return (
    prev.selected === next.selected &&
    prev.inSheet === next.inSheet &&
    prev.sum === next.sum &&
    prev.prettyText === next.prettyText &&
    prev.rejectedByDirector === next.rejectedByDirector &&
    prev.counterpartyLabel === next.counterpartyLabel &&
    prev.hasAnyCounterpartyOptions === next.hasAnyCounterpartyOptions &&
    prev.counterpartyHardFailure === next.counterpartyHardFailure &&
    prev.showInlineEditor === next.showInlineEditor &&
    prev.isMobileEditorOpen === next.isMobileEditorOpen &&
    prev.it?.request_item_id === next.it?.request_item_id &&
    prev.it?.name_human === next.it?.name_human &&
    prev.it?.qty === next.it?.qty &&
    prev.it?.uom === next.it?.uom &&
    prev.it?.app_code === next.it?.app_code &&
    prev.m?.price === next.m?.price &&
    prev.m?.supplier === next.m?.supplier &&
    prev.m?.note === next.m?.note &&
    prev.s === next.s &&
    prev.supplierSuggestions === next.supplierSuggestions
  );
});
