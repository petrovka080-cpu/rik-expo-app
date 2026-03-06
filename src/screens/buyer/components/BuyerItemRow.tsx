import React from "react";
import { View, Text, Pressable, TextInput } from "react-native";

import type { BuyerInboxRow } from "../../../lib/catalog_api";
import type { LineMeta } from "../buyer.types";
import { splitNote, mergeNote } from "../buyerUtils";
import { P_LIST, P_SHEET } from "../buyerUi";
import { Chip } from "./common/Chip";
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

  supplierSuggestions: string[];
  onPickSupplier: (name: string) => void;

  onFocusField?: () => void;
}) {
  const {
    it, selected, inSheet, m, sum, prettyText, rejectedByDirector,
    onTogglePick, onSetPrice, onSetSupplier, onSetNote,
    supplierSuggestions, onPickSupplier,
    onFocusField,
    s,
  } = props;

  const P = inSheet ? P_SHEET : P_LIST;
  const { user: noteUser, auto: noteAuto } = splitNote(m.note);

  return (
    <View
      style={[
        inSheet ? s.buyerMobCard : s.card,
        inSheet ? null : { backgroundColor: P.cardBg, borderColor: P.border },
        selected && (inSheet ? s.buyerMobCardPicked : s.cardPicked),
      ]}
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
        </View>

        <View style={{ gap: 2 }}>
          <Text style={{ color: P.sub }}>
            Цена: <Text style={{ color: P.text, fontWeight: "800" }}>{m.price || "—"}</Text>{" "}
            • Поставщик: <Text style={{ color: P.text, fontWeight: "800" }}>{m.supplier || "—"}</Text>{" "}
            • Прим.: <Text style={{ color: P.text, fontWeight: "800" }}>{noteUser || "—"}</Text>
          </Text>

          <Text style={{ color: P.sub }}>
            Сумма по позиции:{" "}
            <Text style={{ color: P.text, fontWeight: "800" }}>
              {sum ? sum.toLocaleString() : "0"}
            </Text>{" "}
            сом
          </Text>
        </View>

        <View style={{ flexDirection: "row", marginTop: 6 }}>
          <View style={{ marginLeft: "auto" }}>
            {selected ? (
              <Chip
                label="Выбрано"
                bg={inSheet ? "rgba(59,130,246,0.20)" : "#E0F2FE"}
                fg={inSheet ? "#BFDBFE" : "#075985"}
              />
            ) : (
              <Chip
                label="Заполни и выбери"
                bg={inSheet ? "rgba(255,255,255,0.06)" : "#F1F5F9"}
                fg={inSheet ? "#E5E7EB" : "#334155"}
              />
            )}
          </View>
        </View>
      </View>

      {selected && (
        <View style={{ marginTop: 10, gap: 8 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1 }}>
              <TextInput
                value={String(m.price ?? "")}
                onChangeText={onSetPrice}
                keyboardType="decimal-pad"
                placeholder="Цена *"
                placeholderTextColor={P.sub}
                onFocus={onFocusField}
                style={[s.fieldInput, { backgroundColor: P.inputBg, borderColor: P.inputBorder, color: P.text }]}
              />
            </View>

            <View style={{ flex: 1 }}>
              <TextInput
                value={String(m.supplier ?? "")}
                onChangeText={onSetSupplier}
                placeholder="Поставщик *"
                placeholderTextColor={P.sub}
                onFocus={onFocusField}
                style={[s.fieldInput, { backgroundColor: P.inputBg, borderColor: P.inputBorder, color: P.text }]}
              />

              {supplierSuggestions.length > 0 && (
                <View style={[s.suggestBoxInline, { borderColor: P.inputBorder, backgroundColor: P.cardBg }]}>
                  {supplierSuggestions.map((name) => (
                    <Pressable
                      key={name}
                      onPress={() => onPickSupplier(name)}
                      style={[s.suggestItem, { borderColor: P.inputBorder, backgroundColor: P.cardBg }]}
                    >
                      <Text style={{ color: P.text, fontWeight: "800" }}>{name}</Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>

          <View>
            <TextInput
              value={noteUser}
              onChangeText={(v) => onSetNote(mergeNote(v, noteAuto))}
              placeholder="Примечание"
              placeholderTextColor={P.sub}
              multiline
              onFocus={onFocusField}
              style={[
                s.fieldInput,
                { minHeight: 44, backgroundColor: P.inputBg, borderColor: P.inputBorder, color: P.text },
              ]}
            />
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
    </View>
  );
});
