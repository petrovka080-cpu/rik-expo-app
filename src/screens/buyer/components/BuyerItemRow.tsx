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
  StyleSheet,
  useWindowDimensions,
  InteractionManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { BuyerInboxRow } from "../../../lib/api/types";
import { StatusBadge } from "../../../ui/StatusBadge";
import type { LineMeta } from "../buyer.types";
import { splitNote, mergeNote } from "../buyerUtils";
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
            onFocus={() => {
              setPriceFocused(true);
              onFocusField?.();
            }}
            onBlur={() => {
              setPriceFocused(false);
              onSetPrice(String(priceDraft ?? ""));
            }}
            onEndEditing={() => onSetPrice(String(priceDraft ?? ""))}
            style={[s.fieldInput, { backgroundColor: P.inputBg, borderColor: P.inputBorder, color: P.text }]}
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
              style={[
                s.fieldInput,
                styles.mobileSupplierTrigger,
                hasAnyCounterpartyOptions
                  ? styles.mobileSupplierTriggerEnabled
                  : styles.mobileSupplierTriggerDisabled,
                { backgroundColor: P.inputBg, borderColor: P.inputBorder },
              ]}
            >
              <Text
                style={[
                  styles.mobileSupplierLabel,
                  { color: selectedSupplierLabel ? P.text : P.sub },
                ]}
                numberOfLines={1}
              >
                {selectedSupplierLabel || `${counterpartyLabel} *`}
              </Text>
              <Ionicons name="chevron-down" size={18} color={P.sub} />
            </Pressable>
          ) : (
            <View
              onLayout={(e) => {
                const h = Number(e?.nativeEvent?.layout?.height ?? 0);
                if (Number.isFinite(h) && h > 0) setSupplierInputHeight(h);
              }}
            >
              <TextInput
                value={isDropdownOpen ? supplierQueryDraft : selectedSupplierLabel}
                onChangeText={(v) => {
                  setSupplierQueryDraft(v);
                  if (!isDropdownOpen) setIsDropdownOpen(true);
                }}
                returnKeyType="done"
                blurOnSubmit={false}
                placeholder={`${counterpartyLabel} *`}
                placeholderTextColor={P.sub}
                editable={hasAnyCounterpartyOptions}
                onFocus={openPicker}
                onBlur={() => {
                  if (selectingOptionRef.current) return;
                  blurCloseFrameRef.current = requestAnimationFrame(() => {
                    blurCloseFrameRef.current = requestAnimationFrame(() => {
                      if (selectingOptionRef.current) return;
                      setIsDropdownOpen(false);
                      setSupplierQueryDraft("");
                      blurCloseFrameRef.current = null;
                    });
                  });
                }}
                style={[s.fieldInput, { backgroundColor: P.inputBg, borderColor: P.inputBorder, color: P.text }]}
              />
            </View>
          )}

          {isDropdownOpen && filteredSuppliers.length > 0 ? (
            <View
              style={[
                s.suggestBoxInline,
                styles.inlineSuggestBox,
                { borderColor: P.inputBorder, top: supplierInputHeight + 6 },
              ]}
              pointerEvents="auto"
            >
              <FlatList
                data={filteredSuppliers}
                keyExtractor={(item, idx) => `${item}:${idx}`}
                keyboardShouldPersistTaps="always"
                style={styles.inlineSupplierList}
                renderItem={({ item }) => (
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
                    <Text style={[styles.inlineSuggestItemText, { color: P.text }]} numberOfLines={1}>
                      {item}
                    </Text>
                  </Pressable>
                )}
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
        onFocus={() => {
          setNoteFocused(true);
          onFocusField?.();
        }}
        onBlur={() => {
          setNoteFocused(false);
          onSetNote(mergeNote(String(noteDraft ?? ""), noteAuto));
        }}
        style={[
          s.fieldInput,
          {
            minHeight: isMobileRuntime ? 42 : 44,
            backgroundColor: P.inputBg,
            borderColor: P.inputBorder,
            color: P.text,
            textAlignVertical: "top",
          },
        ]}
      />

      {noteAuto ? (
        <View
          style={[styles.noteAutoCard, { borderColor: P.inputBorder }]}
        >
          <Text style={[styles.noteAutoLabel, { color: P.sub }]}>
            Реквизиты поставщика
          </Text>
          <Text style={[styles.noteAutoValue, { color: P.text }]} numberOfLines={3}>
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
          onRequestClose={() => setIsSupplierModalOpen(false)}
        >
          <SafeAreaView style={styles.supplierModalSafeArea}>
            <View style={styles.supplierModalContent}>
              <View style={styles.supplierModalHeader}>
                <Text style={[styles.supplierModalTitle, { color: P.text }]}>
                  Выберите {counterpartyLabel.toLowerCase()}
                </Text>
                <Pressable
                  onPress={() => setIsSupplierModalOpen(false)}
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
                style={[
                  s.fieldInput,
                  styles.modalSearchInput,
                  { backgroundColor: P.inputBg, borderColor: P.inputBorder, color: P.text },
                ]}
              />

              <FlatList
                data={filteredSuppliers}
                keyExtractor={(item, idx) => `${item}:${idx}`}
                keyboardShouldPersistTaps="always"
                contentContainerStyle={styles.modalSupplierListContent}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => commitSelectedSupplier(item)}
                    style={[
                      styles.modalSupplierRow,
                      makeSupplierId(item) === selectedSupplierId
                        ? styles.modalSupplierRowSelected
                        : styles.modalSupplierRowDefault,
                    ]}
                  >
                    <Text style={[styles.modalSupplierRowText, { color: P.text }]} numberOfLines={1}>
                      {item}
                    </Text>
                  </Pressable>
                )}
                ListEmptyComponent={
                  <Text style={[styles.modalEmptyText, { color: P.sub }]}>
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
    (it as { director_reject_reason?: unknown }).director_reject_reason ??
    (it as { director_reject_note?: unknown }).director_reject_note ??
    "",
  ).trim();
  const lastOfferSupplier = String((it as { last_offer_supplier?: unknown }).last_offer_supplier ?? "").trim();
  const lastOfferPriceRaw = (it as { last_offer_price?: unknown }).last_offer_price;
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

const styles = StyleSheet.create({
  appCodeChip: {
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  appCodeChipText: {
    fontWeight: "700",
    fontSize: 12,
  },
  counterpartyFailureText: {
    color: "#fca5a5",
    marginTop: 6,
    fontSize: 12,
    fontWeight: "700",
  },
  editorCardBase: {
    position: "relative",
    overflow: "visible",
    borderWidth: 1,
  },
  editorCardDesktop: {
    marginTop: 0,
    gap: 8,
    padding: 14,
    borderRadius: 18,
    borderColor: "rgba(34,197,94,0.26)",
    backgroundColor: "rgba(2,132,199,0.06)",
  },
  editorCardMobile: {
    marginTop: 10,
    gap: 10,
    padding: 12,
    borderRadius: 16,
    borderColor: "rgba(59,130,246,0.24)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  editorStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 12,
  },
  flexOne: {
    flex: 1,
  },
  inlineSuggestBox: {
    backgroundColor: "#1E2A38",
    zIndex: 3000,
    elevation: 160,
    maxHeight: 220,
  },
  inlineSuggestItem: {
    minHeight: 44,
    justifyContent: "center",
  },
  inlineSuggestItemText: {
    fontWeight: "800",
  },
  inlineSupplierList: {
    maxHeight: 220,
  },
  mobileEditButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(59,130,246,0.15)",
    borderColor: "rgba(59,130,246,0.4)",
    borderWidth: 1,
    borderRadius: 10,
  },
  mobileEditButtonText: {
    color: "#60A5FA",
    fontWeight: "700",
    fontSize: 13,
  },
  mobileSupplierLabel: {
    fontWeight: "700",
    flex: 1,
  },
  mobileSupplierTrigger: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mobileSupplierTriggerDisabled: {
    opacity: 0.6,
  },
  mobileSupplierTriggerEnabled: {
    opacity: 1,
  },
  modalEmptyText: {
    fontWeight: "700",
    paddingVertical: 12,
  },
  modalSearchInput: {
    marginBottom: 12,
    minHeight: 46,
  },
  modalSupplierListContent: {
    paddingBottom: 24,
  },
  modalSupplierRow: {
    minHeight: 56,
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    marginBottom: 8,
    borderWidth: 1,
  },
  modalSupplierRowDefault: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.08)",
  },
  modalSupplierRowSelected: {
    backgroundColor: "rgba(34,197,94,0.16)",
    borderColor: "rgba(34,197,94,0.4)",
  },
  modalSupplierRowText: {
    fontWeight: "800",
  },
  noteAutoCard: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  noteAutoLabel: {
    fontWeight: "900",
    marginBottom: 4,
  },
  noteAutoValue: {
    fontWeight: "800",
  },
  primaryFieldsBase: {
    gap: 8,
    position: "relative",
    overflow: "visible",
  },
  primaryFieldsClosed: {
    zIndex: 10,
    elevation: 1,
  },
  primaryFieldsInline: {
    flexDirection: "row",
  },
  primaryFieldsOpen: {
    zIndex: 1200,
    elevation: 80,
  },
  primaryFieldsStack: {
    flexDirection: "column",
  },
  rejectReasonCard: {
    marginTop: 6,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  rejectReasonStrong: {
    fontWeight: "800",
  },
  rejectReasonSubline: {
    fontWeight: "800",
    marginTop: 4,
    fontSize: 12,
  },
  rejectReasonText: {
    fontWeight: "900",
    fontSize: 12,
  },
  rejectedBadge: {
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderWidth: 1,
  },
  rejectedBadgeText: {
    fontWeight: "900",
    fontSize: 12,
  },
  rowContent: {
    gap: 8,
  },
  rowFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  rowHeaderActions: {
    alignItems: "flex-end",
    gap: 8,
  },
  rowHeaderMain: {
    flex: 1,
    minWidth: 0,
  },
  rowHeaderTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  rowMetaBlock: {
    gap: 4,
  },
  rowMetaStrong: {
    fontWeight: "800",
  },
  rowMetaText: {},
  rowShellBase: {
    position: "relative",
    overflow: "visible",
  },
  rowShellDefault: {
    zIndex: 1,
    elevation: 1,
  },
  rowShellSelected: {
    zIndex: 500,
    elevation: 30,
  },
  statusBadgeWrap: {
    marginLeft: "auto",
  },
  supplierFieldWrap: {
    flex: 1,
    position: "relative",
  },
  supplierFieldWrapClosed: {
    zIndex: 700,
    elevation: 40,
  },
  supplierFieldWrapOpen: {
    zIndex: 2600,
    elevation: 120,
  },
  supplierModalCloseButton: {
    minHeight: 40,
    minWidth: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  supplierModalContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  supplierModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  supplierModalSafeArea: {
    flex: 1,
    backgroundColor: "#0B1220",
  },
  supplierModalTitle: {
    fontWeight: "900",
    fontSize: 20,
  },
  toggleButton: {
    minWidth: 86,
    alignItems: "center",
  },
});
