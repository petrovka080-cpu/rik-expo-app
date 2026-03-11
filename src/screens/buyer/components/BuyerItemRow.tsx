import React from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  FlatList,
  Platform,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { BuyerInboxRow } from "../../../lib/catalog_api";
import StatusBadge from "../../../ui/StatusBadge";
import type { LineMeta } from "../buyer.types";
import { splitNote, mergeNote } from "../buyerUtils";
import { P_LIST, P_SHEET } from "../buyerUi";
import type { StylesBag } from "./component.types";

export const BuyerItemRow = React.memo(function BuyerItemRow(props: {
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

  onFocusField?: () => void;
}) {
  const {
    it, selected, inSheet, m, sum, prettyText, rejectedByDirector,
    onTogglePick, onSetPrice, onSetSupplier, onSetNote,
    counterpartyLabel,
    supplierSuggestions, hasAnyCounterpartyOptions, counterpartyHardFailure, onPickSupplier,
    onFocusField,
    s,
  } = props;

  const P = inSheet ? P_SHEET : P_LIST;
  const isMobileRuntime = Platform.OS !== "web";
  const { user: noteUser, auto: noteAuto } = splitNote(m.note);
  const [priceDraft, setPriceDraft] = React.useState(String(m.price ?? ""));
  const [priceFocused, setPriceFocused] = React.useState(false);
  const [supplierQueryDraft, setSupplierQueryDraft] = React.useState("");
  const [selectedSupplierLabel, setSelectedSupplierLabel] = React.useState(String(m.supplier ?? ""));
  const [selectedSupplierId, setSelectedSupplierId] = React.useState("");
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = React.useState(false);
  const [mobileEditorKind, setMobileEditorKind] = React.useState<null | "price" | "note">(null);
  const [mobileEditorDraft, setMobileEditorDraft] = React.useState("");
  const [supplierInputHeight, setSupplierInputHeight] = React.useState(46);
  const blurCloseTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const selectingOptionRef = React.useRef(false);
  const makeSupplierId = React.useCallback(
    (label: string) => String(label || "").trim().toLowerCase().replace(/\s+/g, " "),
    [],
  );
  const commitSelectedSupplier = React.useCallback(
    (rawName: string) => {
      if (blurCloseTimerRef.current) {
        clearTimeout(blurCloseTimerRef.current);
        blurCloseTimerRef.current = null;
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
      // Let blur pass after commit is applied to parent meta.
      setTimeout(() => {
        selectingOptionRef.current = false;
      }, 0);
    },
    [blurCloseTimerRef, makeSupplierId, onPickSupplier, onSetSupplier],
  );

  const filteredSuppliers = React.useMemo(() => {
    // Force ultimate rendering uniqueness here to collapse equal names from distinct sources (e.g. `supplier` vs `contractor`)
    const all = Array.from(new Set((supplierSuggestions || []).map((name) => String(name || "").trim()).filter(Boolean)));
    const needle = String(supplierQueryDraft || "").trim().toLowerCase();
    if (!needle) return isMobileRuntime ? all : [];
    if (!isMobileRuntime && needle.length < 2) return [];
    // Filter across the full source list; UI height limits visible rows, not filtering scope.
    return all.filter((name) => String(name).toLowerCase().includes(needle));
  }, [supplierSuggestions, supplierQueryDraft, isMobileRuntime]);

  React.useEffect(() => {
    if (priceFocused) return;
    const next = String(m.price ?? "");
    if (next !== priceDraft) setPriceDraft(next);
    // Keep draft in sync only when input is not focused to avoid caret/focus jumps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m.price, priceFocused]);

  React.useEffect(() => {
    if (isDropdownOpen) return;
    const next = String(m.supplier ?? "");
    if (next !== selectedSupplierLabel) setSelectedSupplierLabel(next);
    const nextId = makeSupplierId(next);
    if (nextId !== selectedSupplierId) setSelectedSupplierId(nextId);
  }, [m.supplier, isDropdownOpen, selectedSupplierLabel, selectedSupplierId, makeSupplierId]);

  const rejectReason = String(
    (it as any)?.director_reject_reason ??
    (it as any)?.director_reject_note ??
    "",
  ).trim();
  const lastOfferSupplier = String((it as any)?.last_offer_supplier ?? "").trim();
  const lastOfferPriceRaw = (it as any)?.last_offer_price;
  const lastOfferPrice =
    typeof lastOfferPriceRaw === "number" && Number.isFinite(lastOfferPriceRaw)
      ? lastOfferPriceRaw
      : null;

  const openPicker = React.useCallback(() => {
    if (!hasAnyCounterpartyOptions) return;
    if (blurCloseTimerRef.current) {
      clearTimeout(blurCloseTimerRef.current);
      blurCloseTimerRef.current = null;
    }
    onFocusField?.();
    setSupplierQueryDraft(selectedSupplierLabel);
    if (isMobileRuntime) {
      setIsSupplierModalOpen(true);
      return;
    }
    setIsDropdownOpen(true);
  }, [onFocusField, selectedSupplierLabel, hasAnyCounterpartyOptions, isMobileRuntime]);

  const openMobileEditor = React.useCallback(
    (kind: "price" | "note") => {
      onFocusField?.();
      setMobileEditorKind(kind);
      setMobileEditorDraft(kind === "price" ? String(priceDraft ?? "") : String(noteUser ?? ""));
    },
    [noteUser, onFocusField, priceDraft],
  );

  const closeMobileEditor = React.useCallback(() => {
    setMobileEditorKind(null);
    setMobileEditorDraft("");
  }, []);

  const commitMobileEditor = React.useCallback(() => {
    if (mobileEditorKind === "price") {
      setPriceDraft(String(mobileEditorDraft ?? ""));
      onSetPrice(String(mobileEditorDraft ?? ""));
    } else if (mobileEditorKind === "note") {
      onSetNote(mergeNote(String(mobileEditorDraft ?? ""), noteAuto));
    }
    closeMobileEditor();
  }, [closeMobileEditor, mobileEditorDraft, mobileEditorKind, noteAuto, onSetNote, onSetPrice]);

  return (
    <View
      style={[
        inSheet ? s.buyerMobCard : s.card,
        inSheet ? null : { backgroundColor: P.cardBg, borderColor: P.border },
        selected && (inSheet ? s.buyerMobCardPicked : s.cardPicked),
        selected
          ? { position: "relative", overflow: "visible", zIndex: 500, elevation: 30 }
          : { position: "relative", overflow: "visible", zIndex: 1, elevation: 1 },
      ]}
      pointerEvents="box-none"
    >
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Text style={[s.cardTitle, { color: P.text }]}>{it.name_human}</Text>

              {it.app_code ? (
                <View style={{ backgroundColor: P.chipGrayBg, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8 }}>
                  <Text style={{ color: P.chipGrayText, fontWeight: "700", fontSize: 12 }}>
                    {it.app_code}
                  </Text>
                </View>
              ) : null}

              {rejectedByDirector ? (
                <View
                  style={{
                    backgroundColor: inSheet ? "rgba(239,68,68,0.18)" : "#FEE2E2",
                    borderRadius: 999,
                    paddingVertical: 3,
                    paddingHorizontal: 8,
                    borderWidth: 1,
                    borderColor: inSheet ? "rgba(239,68,68,0.45)" : "#FCA5A5",
                  }}
                >
                  <Text style={{ color: inSheet ? "#FCA5A5" : "#991B1B", fontWeight: "900", fontSize: 12 }}>
                    ОТКЛОНЕНА
                  </Text>
                </View>
              ) : null}
            </View>

            <Text style={[s.cardMeta, { color: P.sub }]}>{prettyText}</Text>
          </View>

          <View style={{ alignItems: "flex-end", gap: 8 }}>
            <Pressable
              onPress={onTogglePick}
              style={[
                s.smallBtn,
                {
                  borderColor: selected ? "#2563eb" : P.btnBorder,
                  backgroundColor: selected ? "#2563eb" : P.btnBg,
                  minWidth: 86,
                  alignItems: "center",
                },
              ]}
            >
              <Text style={[s.smallBtnText, { color: selected ? "#fff" : P.text }]}>
                {selected ? "Снять" : "Выбрать"}
              </Text>
            </Pressable>
            <Ionicons name="chevron-forward" size={16} color={P.sub} />
          </View>
        </View>

        <View style={{ gap: 2 }}>
          <Text style={{ color: P.sub }}>
            Цена: <Text style={{ color: P.text, fontWeight: "800" }}>{m.price || "—"}</Text>{" "}
            • {counterpartyLabel}: <Text style={{ color: P.text, fontWeight: "800" }}>{m.supplier || "—"}</Text>{" "}
            • Прим.: <Text style={{ color: P.text, fontWeight: "800" }}>{noteUser || "—"}</Text>
          </Text>

          <Text style={{ color: P.sub }}>
            Сумма по позиции:{" "}
            <Text style={{ color: P.text, fontWeight: "800" }}>
              {sum ? sum.toLocaleString() : "0"}
            </Text>{" "}
            сом
          </Text>

          {rejectedByDirector ? (
            <View
              style={{
                marginTop: 6,
                padding: 10,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: inSheet ? "rgba(239,68,68,0.45)" : "#FCA5A5",
                backgroundColor: inSheet ? "rgba(239,68,68,0.12)" : "#FEF2F2",
              }}
            >
              <Text style={{ color: inSheet ? "#FCA5A5" : "#991B1B", fontWeight: "900", fontSize: 12 }}>
                Причина отклонения:{" "}
                <Text style={{ color: inSheet ? "#FECACA" : "#7F1D1D", fontWeight: "800" }}>
                  {rejectReason || "Отклонено директором"}
                </Text>
              </Text>
              <Text style={{ color: inSheet ? "#FECACA" : "#7F1D1D", fontWeight: "800", marginTop: 4, fontSize: 12 }}>
                Предыдущее предложение: {lastOfferSupplier || "—"} • {lastOfferPrice != null ? `${lastOfferPrice}` : "—"} сом
              </Text>
            </View>
          ) : null}
        </View>

        <View style={{ flexDirection: "row", marginTop: 6 }}>
          <View style={{ marginLeft: "auto" }}>
            {selected ? (
              <StatusBadge label="Выбрано" tone="info" compact />
            ) : (
              <StatusBadge label="Заполни и выбери" tone="neutral" compact />
            )}
          </View>
        </View>
      </View>

      {selected && (
        <View style={{ marginTop: 10, gap: 8, position: "relative", overflow: "visible" }}>
          <View
            style={{
              flexDirection: "row",
              gap: 8,
              position: "relative",
              overflow: "visible",
              zIndex: isDropdownOpen ? 1200 : 10,
              elevation: isDropdownOpen ? 80 : 1,
            }}
          >
            <View style={{ flex: 1 }}>
              {isMobileRuntime ? (
                <Pressable
                  onPress={() => openMobileEditor("price")}
                  style={[
                    s.fieldInput,
                    {
                      minHeight: 46,
                      backgroundColor: P.inputBg,
                      borderColor: P.inputBorder,
                      justifyContent: "center",
                    },
                  ]}
                >
                  <Text style={{ color: priceDraft ? P.text : P.sub, fontWeight: "700" }} numberOfLines={1}>
                    {priceDraft || "Цена *"}
                  </Text>
                </Pressable>
              ) : (
                <TextInput
                  value={priceDraft}
                  onChangeText={(v) => setPriceDraft(v)}
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
              )}
            </View>

            <View style={{ flex: 1, position: "relative", zIndex: isDropdownOpen ? 2600 : 700, elevation: isDropdownOpen ? 120 : 40 }}>
              {isMobileRuntime ? (
                <Pressable
                  onPress={openPicker}
                  disabled={!hasAnyCounterpartyOptions}
                  style={[
                    s.fieldInput,
                    {
                      minHeight: 46,
                      backgroundColor: P.inputBg,
                      borderColor: P.inputBorder,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      opacity: hasAnyCounterpartyOptions ? 1 : 0.6,
                    },
                  ]}
                >
                  <Text
                    style={{ color: selectedSupplierLabel ? P.text : P.sub, fontWeight: "700", flex: 1 }}
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
                      blurCloseTimerRef.current = setTimeout(() => {
                        setIsDropdownOpen(false);
                        setSupplierQueryDraft("");
                      }, 120);
                    }}
                    style={[s.fieldInput, { backgroundColor: P.inputBg, borderColor: P.inputBorder, color: P.text }]}
                  />
                </View>
              )}

              {isDropdownOpen && filteredSuppliers.length > 0 ? (
                <View
                  style={[
                    s.suggestBoxInline,
                    {
                      borderColor: P.inputBorder,
                      backgroundColor: "#1E2A38", // Solid UI.cardBg equivalent
                      top: supplierInputHeight + 6,
                      zIndex: 3000,
                      elevation: 160,
                      maxHeight: 220,
                    },
                  ]}
                  pointerEvents="auto"
                >
                  <FlatList
                    data={filteredSuppliers}
                    keyExtractor={(item, idx) => `${item}:${idx}`}
                    keyboardShouldPersistTaps="always"
                    style={{ maxHeight: 220 }}
                    renderItem={({ item }) => (
                      <Pressable
                        android_ripple={{ color: "rgba(255,255,255,0.08)" }}
                        hitSlop={{ top: 2, bottom: 2, left: 2, right: 2 }}
                        onPressIn={() => {
                          selectingOptionRef.current = true;
                          if (blurCloseTimerRef.current) {
                            clearTimeout(blurCloseTimerRef.current);
                            blurCloseTimerRef.current = null;
                          }
                        }}
                        style={({ pressed }) => [
                          s.suggestItem,
                          {
                            borderColor: P.inputBorder,
                            backgroundColor: pressed ? "rgba(255,255,255,0.08)" : "#1E2A38", // Solid UI.cardBg equivalent instead of transparent P.cardBg
                            minHeight: 44,
                            justifyContent: "center",
                          },
                        ]}
                        onPress={() => commitSelectedSupplier(item)}
                      >
                        <Text style={{ color: P.text, fontWeight: "800" }} numberOfLines={1}>
                          {item}
                        </Text>
                      </Pressable>
                    )}
                  />
                </View>
              ) : null}
              {counterpartyHardFailure ? (
                <Text style={{ color: "#fca5a5", marginTop: 6, fontSize: 12, fontWeight: "700" }}>
                  Справочник контрагентов недоступен. Проверьте источники `suppliers/contractors/subcontracts`.
                </Text>
              ) : null}
            </View>
          </View>

          <View
            pointerEvents={isDropdownOpen ? "none" : "auto"}
            style={{
              position: "relative",
              zIndex: 1,
              elevation: 0,
            }}
          >
            {isMobileRuntime ? (
              <Pressable
                onPress={() => openMobileEditor("note")}
                style={[
                  s.fieldInput,
                  {
                    minHeight: 44,
                    backgroundColor: P.inputBg,
                    borderColor: P.inputBorder,
                    justifyContent: "center",
                  },
                ]}
              >
                <Text style={{ color: noteUser ? P.text : P.sub, fontWeight: "700" }} numberOfLines={2}>
                  {noteUser || "Примечание"}
                </Text>
              </Pressable>
            ) : (
              <TextInput
                value={noteUser}
                onChangeText={(v) => onSetNote(mergeNote(v, noteAuto))}
                placeholder="Примечание"
                placeholderTextColor={P.sub}
                multiline
                blurOnSubmit={false}
                onFocus={onFocusField}
                style={[
                  s.fieldInput,
                  { minHeight: 44, backgroundColor: P.inputBg, borderColor: P.inputBorder, color: P.text },
                ]}
              />
            )}
          </View>

          {noteAuto ? (
            <View
              style={{
                marginTop: 8,
                padding: 10,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: P.inputBorder,
                backgroundColor: "rgba(255,255,255,0.04)",
              }}
            >
              <Text style={{ color: P.sub, fontWeight: "900", marginBottom: 4 }}>
                Реквизиты поставщика
              </Text>
              <Text style={{ color: P.text, fontWeight: "800" }} numberOfLines={3}>
                {noteAuto.replace(/\n+/g, " • ")}
              </Text>
            </View>
          ) : null}
        </View>
      )}

      {isMobileRuntime ? (
        <Modal
          visible={isSupplierModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsSupplierModalOpen(false)}
        >
          <Pressable
            onPress={() => setIsSupplierModalOpen(false)}
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.55)",
              justifyContent: "center",
              paddingHorizontal: 16,
            }}
          >
            <Pressable
              onPress={() => undefined}
              style={{
                borderRadius: 20,
                backgroundColor: "#101826",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.12)",
                padding: 14,
                maxHeight: "70%",
              }}
            >
              <Text style={{ color: P.text, fontWeight: "900", fontSize: 16, marginBottom: 12 }}>
                Выбери {counterpartyLabel.toLowerCase()}
              </Text>

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
                  {
                    backgroundColor: P.inputBg,
                    borderColor: P.inputBorder,
                    color: P.text,
                    marginBottom: 12,
                  },
                ]}
              />

              <FlatList
                data={filteredSuppliers}
                keyExtractor={(item, idx) => `${item}:${idx}`}
                keyboardShouldPersistTaps="always"
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => commitSelectedSupplier(item)}
                    style={{
                      minHeight: 48,
                      justifyContent: "center",
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderRadius: 12,
                      backgroundColor:
                        makeSupplierId(item) === selectedSupplierId
                          ? "rgba(34,197,94,0.16)"
                          : "rgba(255,255,255,0.04)",
                      marginBottom: 8,
                    }}
                  >
                    <Text style={{ color: P.text, fontWeight: "800" }} numberOfLines={1}>
                      {item}
                    </Text>
                  </Pressable>
                )}
                ListEmptyComponent={
                  <Text style={{ color: P.sub, fontWeight: "700", paddingVertical: 12 }}>
                    Ничего не найдено
                  </Text>
                }
              />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}

      {isMobileRuntime && mobileEditorKind ? (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={closeMobileEditor}
        >
          <Pressable
            onPress={closeMobileEditor}
            style={{
              flex: 1,
              backgroundColor: "rgba(0,0,0,0.55)",
              justifyContent: "center",
              paddingHorizontal: 16,
            }}
          >
            <Pressable
              onPress={() => undefined}
              style={{
                borderRadius: 20,
                backgroundColor: "#101826",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.12)",
                padding: 14,
                gap: 12,
              }}
            >
              <Text style={{ color: P.text, fontWeight: "900", fontSize: 16 }}>
                {mobileEditorKind === "price" ? "Введи цену" : "Введи примечание"}
              </Text>

              <TextInput
                value={mobileEditorDraft}
                onChangeText={setMobileEditorDraft}
                autoFocus
                keyboardType={mobileEditorKind === "price" ? "decimal-pad" : "default"}
                returnKeyType="done"
                blurOnSubmit={false}
                multiline={mobileEditorKind === "note"}
                placeholder={mobileEditorKind === "price" ? "Цена *" : "Примечание"}
                placeholderTextColor={P.sub}
                style={[
                  s.fieldInput,
                  {
                    backgroundColor: P.inputBg,
                    borderColor: P.inputBorder,
                    color: P.text,
                    minHeight: mobileEditorKind === "note" ? 104 : 46,
                    textAlignVertical: mobileEditorKind === "note" ? "top" : "center",
                  },
                ]}
              />

              <View style={{ flexDirection: "row", gap: 10 }}>
                <Pressable
                  onPress={closeMobileEditor}
                  style={{
                    flex: 1,
                    minHeight: 46,
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(255,255,255,0.08)",
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.12)",
                  }}
                >
                  <Text style={{ color: P.text, fontWeight: "800" }}>Отмена</Text>
                </Pressable>

                <Pressable
                  onPress={commitMobileEditor}
                  style={{
                    flex: 1,
                    minHeight: 46,
                    borderRadius: 14,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#2563eb",
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "900" }}>Сохранить</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}

    </View>
  );
});
