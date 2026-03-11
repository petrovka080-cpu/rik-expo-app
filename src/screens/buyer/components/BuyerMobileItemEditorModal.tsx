import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { View, Text, Pressable, TextInput, FlatList, Modal, SafeAreaView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { BuyerInboxRow } from "../../../lib/catalog_api";
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

export function BuyerMobileItemEditorModal(props: BuyerMobileItemEditorModalProps) {
  const {
    it, m, s,
    counterpartyLabel,
    supplierSuggestions, hasAnyCounterpartyOptions, counterpartyHardFailure,
    onSetPrice, onSetSupplier, onSetNote, onPickSupplier,
    onClose,
  } = props;

  const P = P_SHEET;
  const { user: noteUser, auto: noteAuto } = splitNote(m.note);
  
  const [priceDraft, setPriceDraft] = useState(String(m.price ?? ""));
  const [noteDraft, setNoteDraft] = useState(String(noteUser ?? ""));
  const [selectedSupplierLabel, setSelectedSupplierLabel] = useState(String(m.supplier ?? ""));
  
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [supplierQueryDraft, setSupplierQueryDraft] = useState("");

  const makeSupplierId = useCallback((label: string) => String(label || "").trim().toLowerCase().replace(/\s+/g, " "), []);

  const commitSelectedSupplier = useCallback((rawName: string) => {
    const selectedLabel = String(rawName || "").trim();
    if (!selectedLabel) return;
    onSetSupplier(selectedLabel);
    onPickSupplier(selectedLabel);
    setSelectedSupplierLabel(selectedLabel);
    setSupplierQueryDraft("");
    setIsSupplierModalOpen(false);
  }, [onPickSupplier, onSetSupplier]);

  const filteredSuppliers = useMemo(() => {
    const all = Array.from(new Set((supplierSuggestions || []).map((name) => String(name || "").trim()).filter(Boolean)));
    const needle = String(supplierQueryDraft || "").trim().toLowerCase();
    if (!needle) return all;
    return all.filter((name) => String(name).toLowerCase().includes(needle));
  }, [supplierSuggestions, supplierQueryDraft]);

  return (
    <Modal
      visible
      transparent={false}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: "#0B1220" }}>
        
        {/* Header */}
        <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <Text style={{ color: "#fff", fontWeight: "900", fontSize: 18 }}>
              Редактирование позиции
            </Text>
            <Pressable
              onPress={onClose}
              style={{
                width: 36, height: 36, borderRadius: 18,
                backgroundColor: "rgba(255,255,255,0.1)",
                alignItems: "center", justifyContent: "center"
              }}
            >
              <Ionicons name="close" size={20} color="#fff" />
            </Pressable>
          </View>

          <Text style={{ color: P.text, fontSize: 16, fontWeight: "700", marginBottom: 4 }}>
            {it.name_human}
          </Text>
          <Text style={{ color: P.sub, fontSize: 14, fontWeight: "500", marginBottom: 8 }}>
            {`${it.qty} ${it.uom || ""}`.trim()}
          </Text>

          {/* Meta chips */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {(it as any).object_name ? (
               <View style={{ backgroundColor: "rgba(255,255,255,0.06)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                  <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: "700" }}>Объект: {(it as any).object_name}</Text>
               </View>
            ) : null}
            {(it as any).level_code ? (
               <View style={{ backgroundColor: "rgba(255,255,255,0.06)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                  <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: "700" }}>Уровень: {(it as any).level_code}</Text>
               </View>
            ) : null}
            {(it as any).system_code ? (
               <View style={{ backgroundColor: "rgba(255,255,255,0.06)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                  <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: "700" }}>Система: {(it as any).system_code}</Text>
               </View>
            ) : null}
            {(it as any).zone_code ? (
               <View style={{ backgroundColor: "rgba(255,255,255,0.06)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                  <Text style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: "700" }}>Зона: {(it as any).zone_code}</Text>
               </View>
            ) : null}
          </View>
        </View>

        {/* Body Fields */}
        <FlatList
          keyboardShouldPersistTaps="handled"
          data={[]} // using ListHeaderComponent for content
          renderItem={() => null}
          ListHeaderComponent={
            <View style={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 24, gap: 16 }}>
              {/* Цена */}
              <View>
                 <Text style={{ color: P.text, fontWeight: "700", marginBottom: 6 }}>Цена *</Text>
                 <TextInput
                   value={priceDraft}
                   onChangeText={(v) => { setPriceDraft(v); onSetPrice(v); }}
                   keyboardType={Platform.OS === "web" ? "default" : "decimal-pad"}
                   returnKeyType="done"
                   placeholder="Введите цену"
                   placeholderTextColor={P.sub}
                   style={[s.fieldInput, { backgroundColor: P.inputBg, borderColor: P.inputBorder, color: P.text, minHeight: 48 }]}
                 />
              </View>

              {/* Supplier */}
              <View>
                 <Text style={{ color: P.text, fontWeight: "700", marginBottom: 6 }}>{counterpartyLabel} *</Text>
                 <Pressable
                    onPress={() => {
                      if (hasAnyCounterpartyOptions) setIsSupplierModalOpen(true);
                    }}
                    disabled={!hasAnyCounterpartyOptions}
                    style={[
                      s.fieldInput,
                      {
                        minHeight: 48,
                        backgroundColor: P.inputBg,
                        borderColor: P.inputBorder,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        opacity: hasAnyCounterpartyOptions ? 1 : 0.6,
                      },
                    ]}
                  >
                    <Text style={{ color: selectedSupplierLabel ? P.text : P.sub, fontWeight: "700", flex: 1 }} numberOfLines={1}>
                      {selectedSupplierLabel || `Выберите ${counterpartyLabel.toLowerCase()}`}
                    </Text>
                    <Ionicons name="chevron-down" size={20} color={P.sub} />
                  </Pressable>
                  {counterpartyHardFailure ? (
                    <Text style={{ color: "#fca5a5", marginTop: 6, fontSize: 12, fontWeight: "700" }}>
                      Справочник недоступен.
                    </Text>
                  ) : null}
              </View>

              {/* Note */}
              <View>
                 <Text style={{ color: P.text, fontWeight: "700", marginBottom: 6 }}>Примечание</Text>
                 <TextInput
                   value={noteDraft}
                   onChangeText={(v) => { setNoteDraft(v); onSetNote(mergeNote(v, noteAuto)); }}
                   placeholder="Ваше примечание"
                   placeholderTextColor={P.sub}
                   multiline
                   style={[
                     s.fieldInput,
                     {
                       minHeight: 80,
                       backgroundColor: P.inputBg,
                       borderColor: P.inputBorder,
                       color: P.text,
                       textAlignVertical: "top",
                       paddingTop: 12
                     },
                   ]}
                 />
              </View>

              {/* Supplier Auto Note */}
              {noteAuto ? (
                <View
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: P.inputBorder,
                    backgroundColor: "rgba(255,255,255,0.04)",
                  }}
                >
                  <Text style={{ color: P.sub, fontWeight: "800", marginBottom: 6, fontSize: 13 }}>
                    Реквизиты поставщика
                  </Text>
                  <Text style={{ color: P.text, fontWeight: "800", lineHeight: 20 }} numberOfLines={6}>
                    {noteAuto.replace(/\n+/g, " • ")}
                  </Text>
                </View>
              ) : null}
            </View>
          }
        />

        {/* Footer */}
        <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" }}>
           <Pressable
             onPress={onClose}
             style={{
               backgroundColor: "#2563eb",
               height: 52,
               borderRadius: 16,
               alignItems: "center",
               justifyContent: "center"
             }}
           >
             <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>Готово</Text>
           </Pressable>
        </View>
      </SafeAreaView>

      {/* Supplier Modal */}
      {isSupplierModalOpen ? (
        <Modal
          visible
          transparent={false}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => setIsSupplierModalOpen(false)}
        >
          <SafeAreaView style={{ flex: 1, backgroundColor: "#0B1220" }}>
            <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <Text style={{ color: P.text, fontWeight: "900", fontSize: 20 }}>
                  Выберите {counterpartyLabel.toLowerCase()}
                </Text>
                <Pressable
                  onPress={() => setIsSupplierModalOpen(false)}
                  style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.08)" }}
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
                style={[s.fieldInput, { backgroundColor: P.inputBg, borderColor: P.inputBorder, color: P.text, marginBottom: 12, minHeight: 48 }]}
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
                      minHeight: 56, justifyContent: "center", paddingHorizontal: 16, paddingVertical: 12,
                      borderRadius: 16, backgroundColor: "rgba(255,255,255,0.04)", marginBottom: 8,
                      borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
                    }}
                  >
                    <Text style={{ color: P.text, fontWeight: "800", fontSize: 15 }}>{item}</Text>
                  </Pressable>
                )}
                ListEmptyComponent={<Text style={{ color: P.sub, fontWeight: "700", paddingVertical: 12, textAlign: "center" }}>Ничего не найдено</Text>}
              />
            </View>
          </SafeAreaView>
        </Modal>
      ) : null}
    </Modal>
  );
}
