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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { BuyerInboxRow } from "../../../lib/catalog_api";
import StatusBadge from "../../../ui/StatusBadge";
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
    m, s, inSheet,
    counterpartyLabel,
    supplierSuggestions, hasAnyCounterpartyOptions, counterpartyHardFailure,
    onSetPrice, onSetSupplier, onSetNote, onPickSupplier, onFocusField,
  } = props;

  const P = inSheet ? P_SHEET : P_LIST;
  const isMobileRuntime = Platform.OS !== "web";
  const { width: viewportWidth } = useWindowDimensions();
  const { user: noteUser } = splitNote(m.note);
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
  const blurCloseTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
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
    ? {
        marginTop: 10,
        gap: 10,
        padding: 12,
        borderRadius: 16,
        borderColor: "rgba(59,130,246,0.24)",
        backgroundColor: "rgba(255,255,255,0.04)",
      }
    : {
        marginTop: 0,
        gap: 8,
        padding: 14,
        borderRadius: 18,
        borderColor: "rgba(34,197,94,0.26)",
        backgroundColor: "rgba(2,132,199,0.06)",
      };

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
      setTimeout(() => {
        selectingOptionRef.current = false;
      }, 0);
    },
    [makeSupplierId, onPickSupplier, onSetSupplier],
  );

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
  }, [hasAnyCounterpartyOptions, isMobileRuntime, onFocusField, selectedSupplierLabel]);

  return (
    <View
      style={[
        {
          position: "relative",
          overflow: "visible",
          borderWidth: 1,
        },
        editorCardStyle,
      ]}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 12,
        }}
      >
        <StatusBadge label="Редактируется" tone="info" compact />
      </View>

      <View
        style={{
          flexDirection: shouldStackPrimaryFields ? "column" : "row",
          gap: 8,
          position: "relative",
          overflow: "visible",
          zIndex: isDropdownOpen ? 1200 : 10,
          elevation: isDropdownOpen ? 80 : 1,
        }}
      >
        <View style={{ flex: 1 }}>
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

        <View style={{ flex: 1, position: "relative", zIndex: isDropdownOpen ? 2600 : 700, elevation: isDropdownOpen ? 120 : 40 }}>
          {isMobileRuntime ? (
            <Pressable
              onPress={openPicker}
              disabled={!hasAnyCounterpartyOptions}
              style={[
                s.fieldInput,
                {
                  minHeight: isMobileRuntime ? 44 : 46,
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
                  backgroundColor: "#1E2A38",
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
                        backgroundColor: pressed ? "rgba(255,255,255,0.08)" : "#1E2A38",
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
          style={{
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

      {isMobileRuntime ? (
        <Modal
          visible={isSupplierModalOpen}
          transparent={false}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setIsSupplierModalOpen(false)}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: "#0B1220" }}>
            <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 12,
                }}
              >
                <Text style={{ color: P.text, fontWeight: "900", fontSize: 20 }}>
                  Выберите {counterpartyLabel.toLowerCase()}
                </Text>
                <Pressable
                  onPress={() => setIsSupplierModalOpen(false)}
                  style={{
                    minHeight: 40,
                    minWidth: 40,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "rgba(255,255,255,0.08)",
                  }}
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
                  {
                    backgroundColor: P.inputBg,
                    borderColor: P.inputBorder,
                    color: P.text,
                    marginBottom: 12,
                    minHeight: 46,
                  },
                ]}
              />

              <FlatList
                data={filteredSuppliers}
                keyExtractor={(item, idx) => `${item}:${idx}`}
                keyboardShouldPersistTaps="always"
                contentContainerStyle={{ paddingBottom: 24 }}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => commitSelectedSupplier(item)}
                    style={{
                      minHeight: 56,
                      justifyContent: "center",
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      borderRadius: 16,
                      backgroundColor:
                        makeSupplierId(item) === selectedSupplierId
                          ? "rgba(34,197,94,0.16)"
                          : "rgba(255,255,255,0.04)",
                      marginBottom: 8,
                      borderWidth: 1,
                      borderColor:
                        makeSupplierId(item) === selectedSupplierId
                          ? "rgba(34,197,94,0.4)"
                          : "rgba(255,255,255,0.08)",
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
}) {
  const {
    it, selected, inSheet, m, sum, prettyText, rejectedByDirector,
    onTogglePick, onSetPrice, onSetSupplier, onSetNote,
    counterpartyLabel,
    supplierSuggestions, hasAnyCounterpartyOptions, counterpartyHardFailure, onPickSupplier,
    showInlineEditor = true,
    onFocusField,
    s,
  } = props;

  const P = inSheet ? P_SHEET : P_LIST;
  const { user: noteUser } = splitNote(m.note);

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
            {!selected ? <Ionicons name="chevron-forward" size={16} color={P.sub} /> : null}
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

      {selected && showInlineEditor ? (
        <BuyerItemEditor
          it={it}
          m={m}
          s={s}
          inSheet={inSheet}
          counterpartyLabel={counterpartyLabel}
          supplierSuggestions={supplierSuggestions}
          hasAnyCounterpartyOptions={hasAnyCounterpartyOptions}
          counterpartyHardFailure={counterpartyHardFailure}
          onSetPrice={onSetPrice}
          onSetSupplier={onSetSupplier}
          onSetNote={onSetNote}
          onPickSupplier={onPickSupplier}
          onFocusField={onFocusField}
        />
      ) : null}

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
