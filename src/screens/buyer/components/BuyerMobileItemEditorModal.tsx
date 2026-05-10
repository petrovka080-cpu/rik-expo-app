import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { BuyerInboxRow } from "../../../lib/api/types";
import type { LineMeta } from "../buyer.types";
import { splitNote, mergeNote } from "../buyerUtils";
import { P_SHEET } from "../buyerUi";
import type { StylesBag } from "./component.types";

type BuyerMobileItemEditorModalProps = {
  it: BuyerInboxRow;
  m: LineMeta;
  s: StylesBag;
  counterpartyLabel: string;
  supplierSuggestions: string[];
  hasAnyCounterpartyOptions: boolean;
  counterpartyHardFailure: boolean;
  onSetPrice: (v: string) => void;
  onSetSupplier: (v: string) => void;
  onSetNote: (v: string) => void;
  onPickSupplier: (name: string) => void;
  onClose: () => void;
};

const EMPTY_FORM_ROWS: never[] = [];
const supplierKeyExtractor = (item: string, idx: number) => `${item}:${idx}`;
const emptyFormKeyExtractor = (_item: never, idx: number) => `form:${idx}`;
const renderEmptyFormRow = () => null;
const FORM_FLATLIST_TUNING = {
  initialNumToRender: 1,
  maxToRenderPerBatch: 1,
  updateCellsBatchingPeriod: 64,
  windowSize: 3,
  removeClippedSubviews: false,
} as const;
const SUPPLIER_PICKER_FLATLIST_TUNING = {
  initialNumToRender: 12,
  maxToRenderPerBatch: 12,
  updateCellsBatchingPeriod: 32,
  windowSize: 5,
  removeClippedSubviews: Platform.OS !== "web",
} as const;

function BuyerMobileItemEditorModalInner(props: BuyerMobileItemEditorModalProps) {
  const {
    it,
    m,
    s,
    counterpartyLabel,
    supplierSuggestions,
    hasAnyCounterpartyOptions,
    counterpartyHardFailure,
    onSetPrice,
    onSetSupplier,
    onSetNote,
    onPickSupplier,
    onClose,
  } = props;

  const isWeb = Platform.OS === "web";
  const { user: noteUser, auto: noteAuto } = splitNote(m.note);

  const [priceDraft, setPriceDraft] = useState(String(m.price ?? ""));
  const [noteDraft, setNoteDraft] = useState(String(noteUser ?? ""));
  const [selectedSupplierLabel, setSelectedSupplierLabel] = useState(String(m.supplier ?? ""));
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [supplierQueryDraft, setSupplierQueryDraft] = useState("");

  useEffect(() => {
    setPriceDraft(String(m.price ?? ""));
  }, [m.price, it.request_item_id]);

  useEffect(() => {
    setNoteDraft(String(noteUser ?? ""));
  }, [noteUser, it.request_item_id]);

  useEffect(() => {
    setSelectedSupplierLabel(String(m.supplier ?? ""));
  }, [m.supplier, it.request_item_id]);

  const commitSelectedSupplier = useCallback(
    (rawName: string) => {
      const selectedLabel = String(rawName || "").trim();
      if (!selectedLabel) return;
      onSetSupplier(selectedLabel);
      onPickSupplier(selectedLabel);
      setSelectedSupplierLabel(selectedLabel);
      setSupplierQueryDraft("");
      setIsSupplierModalOpen(false);
    },
    [onPickSupplier, onSetSupplier],
  );

  const filteredSuppliers = useMemo(() => {
    const all = Array.from(
      new Set(
        (supplierSuggestions || [])
          .map((name) => String(name || "").trim())
          .filter(Boolean),
      ),
    );
    const needle = String(supplierQueryDraft || "").trim().toLowerCase();
    if (!needle) return all;
    return all.filter((name) => String(name).toLowerCase().includes(needle));
  }, [supplierSuggestions, supplierQueryDraft]);

  const shellStyle = isWeb ? styles.webShell : styles.nativeShell;
  const cardStyle = isWeb ? styles.webCard : styles.nativeCard;

  const closeSupplierPicker = useCallback(() => {
    setIsSupplierModalOpen(false);
  }, []);

  const openSupplierPicker = useCallback(() => {
    if (hasAnyCounterpartyOptions) setIsSupplierModalOpen(true);
  }, [hasAnyCounterpartyOptions]);

  const renderSupplierItem = useCallback(
    ({ item }: { item: string }) => (
      <Pressable onPress={() => commitSelectedSupplier(item)} style={styles.supplierItem}>
        <Text style={styles.supplierItemText}>{item}</Text>
      </Pressable>
    ),
    [commitSelectedSupplier],
  );

  const renderSupplierListEmpty = useCallback(
    () => <Text style={styles.emptyListText}>Ничего не найдено</Text>,
    [],
  );

  const renderInfoChip = (label: string, value?: string) =>
    value ? (
      <View style={styles.infoChip}>
        <Text style={styles.infoChipText}>
          {label}: {value}
        </Text>
      </View>
    ) : null;

  const renderSupplierPicker = (
    <Modal
      visible={isSupplierModalOpen}
      transparent={isWeb}
      animationType={isWeb ? "fade" : "slide"}
      presentationStyle={isWeb ? "overFullScreen" : "fullScreen"}
      onRequestClose={closeSupplierPicker}
    >
      <SafeAreaView style={shellStyle}>
        <View style={cardStyle}>
          <View style={styles.modalBody}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalHeaderTitle}>
                Выберите {counterpartyLabel.toLowerCase()}
              </Text>
              <Pressable
                onPress={closeSupplierPicker}
                style={styles.roundCloseButton}
              >
                <Ionicons name="close" size={24} color={P.text} />
              </Pressable>
            </View>

            <TextInput
              value={supplierQueryDraft}
              onChangeText={setSupplierQueryDraft}
              autoFocus
              returnKeyType="search"
              placeholder={`Поиск ${counterpartyLabel.toLowerCase()}`}
              placeholderTextColor={P.sub}
              style={[s.fieldInput, styles.sheetInput, styles.searchInput]}
            />

            <FlatList
              data={filteredSuppliers}
              keyExtractor={supplierKeyExtractor}
              keyboardShouldPersistTaps="always"
              contentContainerStyle={styles.supplierListContent}
              renderItem={renderSupplierItem}
              ListEmptyComponent={renderSupplierListEmpty}
              {...SUPPLIER_PICKER_FLATLIST_TUNING}
            />
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );

  return (
    <Modal
      visible
      transparent={isWeb}
      animationType={isWeb ? "fade" : "slide"}
      presentationStyle={isWeb ? "overFullScreen" : "fullScreen"}
      onRequestClose={onClose}
    >
      <SafeAreaView style={shellStyle}>
        <View style={cardStyle}>
          <View style={styles.screenHeader}>
            <View style={styles.screenHeaderRow}>
              <Text style={styles.screenHeaderTitle}>Редактирование позиции</Text>
              <Pressable onPress={onClose} style={styles.smallRoundCloseButton}>
                <Ionicons name="close" size={20} color="#fff" />
              </Pressable>
            </View>

            <Text style={styles.itemTitle}>{it.name_human}</Text>
            <Text style={styles.itemMeta}>{`${it.qty} ${it.uom || ""}`.trim()}</Text>

            <View style={styles.infoChipRow}>
              {renderInfoChip("Объект", (it as { object_name?: string }).object_name)}
              {renderInfoChip("Уровень", (it as { level_code?: string }).level_code)}
              {renderInfoChip("Система", (it as { system_code?: string }).system_code)}
              {renderInfoChip("Зона", (it as { zone_code?: string }).zone_code)}
            </View>
          </View>

          <FlatList
            keyboardShouldPersistTaps="handled"
            data={EMPTY_FORM_ROWS}
            keyExtractor={emptyFormKeyExtractor}
            renderItem={renderEmptyFormRow}
            {...FORM_FLATLIST_TUNING}
            ListHeaderComponent={
              <View style={styles.formContent}>
                <View>
                  <Text style={styles.fieldLabel}>Цена *</Text>
                  <TextInput
                    value={priceDraft}
                    onChangeText={(v) => {
                      setPriceDraft(v);
                      onSetPrice(v);
                    }}
                    keyboardType={Platform.OS === "web" ? "default" : "decimal-pad"}
                    returnKeyType="done"
                    placeholder="Введите цену"
                    placeholderTextColor={P.sub}
                    style={[s.fieldInput, styles.sheetInput, styles.tallInput]}
                  />
                </View>

                <View>
                  <Text style={styles.fieldLabel}>{counterpartyLabel} *</Text>
                  <Pressable
                    onPress={openSupplierPicker}
                    disabled={!hasAnyCounterpartyOptions}
                    style={[
                      s.fieldInput,
                      styles.selectorButton,
                      {
                        opacity: hasAnyCounterpartyOptions ? 1 : 0.6,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.selectorButtonText,
                        { color: selectedSupplierLabel ? P.text : P.sub },
                      ]}
                      numberOfLines={1}
                    >
                      {selectedSupplierLabel || `Выберите ${counterpartyLabel.toLowerCase()}`}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={P.sub} />
                  </Pressable>
                  {counterpartyHardFailure ? (
                    <Text style={styles.hardFailureText}>Справочник недоступен.</Text>
                  ) : null}
                </View>

                <View>
                  <Text style={styles.fieldLabel}>Примечание</Text>
                  <TextInput
                    value={noteDraft}
                    onChangeText={(v) => {
                      setNoteDraft(v);
                      onSetNote(mergeNote(v, noteAuto));
                    }}
                    placeholder="Ваше примечание"
                    placeholderTextColor={P.sub}
                    multiline
                    style={[s.fieldInput, styles.noteInput]}
                  />
                </View>

                {noteAuto ? (
                  <View style={styles.autoNoteBox}>
                    <Text style={styles.autoNoteTitle}>Реквизиты поставщика</Text>
                    <Text style={styles.autoNoteValue} numberOfLines={6}>
                      {noteAuto.replace(/\n+/g, " • ")}
                    </Text>
                  </View>
                ) : null}
              </View>
            }
          />

          <View style={styles.footer}>
            <Pressable onPress={onClose} style={styles.doneButton}>
              <Text style={styles.doneButtonText}>Готово</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      {renderSupplierPicker}
    </Modal>
  );
}

export const BuyerMobileItemEditorModal = React.memo(BuyerMobileItemEditorModalInner);

const P = P_SHEET;

const styles = StyleSheet.create({
  webShell: {
    flex: 1,
    backgroundColor: "rgba(3,7,18,0.72)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  nativeShell: {
    flex: 1,
    backgroundColor: "#0B1220",
  },
  webCard: {
    width: "100%",
    maxWidth: 760,
    maxHeight: "92%",
    backgroundColor: "#0B1220",
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  nativeCard: {
    flex: 1,
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalHeaderTitle: {
    color: P.text,
    fontWeight: "900",
    fontSize: 20,
  },
  roundCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  sheetInput: {
    backgroundColor: P.inputBg,
    borderColor: P.inputBorder,
    color: P.text,
  },
  searchInput: {
    marginBottom: 12,
    minHeight: 48,
  },
  supplierListContent: {
    paddingBottom: 24,
  },
  supplierItem: {
    minHeight: 56,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  supplierItemText: {
    color: P.text,
    fontWeight: "800",
    fontSize: 15,
  },
  emptyListText: {
    color: P.sub,
    fontWeight: "700",
    paddingVertical: 12,
    textAlign: "center",
  },
  screenHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  screenHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  screenHeaderTitle: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 18,
  },
  smallRoundCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  itemTitle: {
    color: P.text,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  itemMeta: {
    color: P.sub,
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  infoChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  infoChip: {
    backgroundColor: "rgba(255,255,255,0.06)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  infoChipText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 11,
    fontWeight: "700",
  },
  formContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 24,
    gap: 16,
  },
  fieldLabel: {
    color: P.text,
    fontWeight: "700",
    marginBottom: 6,
  },
  tallInput: {
    minHeight: 48,
  },
  selectorButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectorButtonText: {
    fontWeight: "700",
    flex: 1,
  },
  hardFailureText: {
    color: "#fca5a5",
    marginTop: 6,
    fontSize: 12,
    fontWeight: "700",
  },
  noteInput: {
    minHeight: 80,
    backgroundColor: P.inputBg,
    borderColor: P.inputBorder,
    color: P.text,
    textAlignVertical: "top",
    paddingTop: 12,
  },
  autoNoteBox: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: P.inputBorder,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  autoNoteTitle: {
    color: P.sub,
    fontWeight: "800",
    marginBottom: 6,
    fontSize: 13,
  },
  autoNoteValue: {
    color: P.text,
    fontWeight: "800",
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  doneButton: {
    backgroundColor: "#2563eb",
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  doneButtonText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
  },
});
