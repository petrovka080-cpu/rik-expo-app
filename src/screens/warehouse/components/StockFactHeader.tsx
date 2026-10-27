// src/screens/warehouse/components/StockFactHeader.tsx
import React from "react";
import { View, Text, Pressable, TextInput } from "react-native";
import { UI, s } from "../warehouse.styles";
import type { Option, StockPickLine } from "../warehouse.types";

export default React.memo(function StockFactHeader(props: {
  // ✅ как у прораба
  objectOpt: Option | null;
  levelOpt: Option | null;
  systemOpt: Option | null;
  zoneOpt: Option | null;

  onPickObject: () => void;
  onPickLevel: () => void;
  onPickSystem: () => void;
  onPickZone: () => void;
  onOpenRecipientModal: () => void;

  recipientText: string;

  stockSearch: string;
  onStockSearch: (t: string) => void;

  stockPick: Record<string, StockPickLine>;
  onRemovePick: (pickKey: string) => void;

  issueBusy: boolean;
  onClear: () => void;
  onSubmit: () => void;

  issueMsg: { kind: "error" | "ok" | null; text: string };
}) {
  const pickLines = Object.values(props.stockPick || {});
  const pickCount = pickLines.length;

  // ✅ обязательные поля: объект + этаж + получатель
  const canSubmit =
    pickCount > 0 &&
    !props.issueBusy &&
    !!props.objectOpt?.id &&
    !!props.levelOpt?.id &&
    !!props.recipientText.trim();

  return (
    <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
      <View style={s.sectionBox}>
        <View style={{ marginTop: 8, gap: 8 }}>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            <Pressable onPress={props.onPickObject} style={s.openBtn} accessibilityRole="button">
              <Text style={s.openBtnText} numberOfLines={1}>
                {props.objectOpt?.label
                  ? props.objectOpt.label
                  : "Объект строительства *"}
              </Text>
            </Pressable>

            <Pressable onPress={props.onPickLevel} style={s.openBtn} accessibilityRole="button">
              <Text style={s.openBtnText} numberOfLines={1}>
                {props.levelOpt?.label
                  ? props.levelOpt.label
                  : "Этаж / уровень *"}
              </Text>
            </Pressable>
          </View>

          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            <Pressable onPress={props.onPickSystem} style={s.openBtn} accessibilityRole="button">
              <Text style={s.openBtnText} numberOfLines={1}>
                {props.systemOpt?.label
                  ? props.systemOpt.label
                  : "Система / вид работ"}
              </Text>
            </Pressable>

            <Pressable onPress={props.onPickZone} style={s.openBtn} accessibilityRole="button">
              <Text style={s.openBtnText} numberOfLines={1}>
                {props.zoneOpt?.label
                  ? props.zoneOpt.label
                  : "Зона / участок"}
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={{ marginTop: 12 }}>
          <Text style={{ color: UI.sub, fontWeight: "800", marginBottom: 6 }}>
            Эту партию получает
          </Text>
          <Pressable
            onPress={props.onOpenRecipientModal}
            accessibilityRole="button"
            style={[
              s.input,
              { justifyContent: "center", minHeight: 48 },
              !props.recipientText.trim() && { borderColor: UI.accent }
            ]}
          >
            <Text style={{
              color: props.recipientText ? UI.text : UI.sub,
              fontWeight: "800"
            }}>
              {props.recipientText ? `👤 ${props.recipientText}` : "Выбрать получателя *"}
            </Text>
          </Pressable>
        </View>

        <View style={{ marginTop: 12 }}>
          <TextInput
            value={props.stockSearch}
            onChangeText={props.onStockSearch}
            placeholder="Поиск по складу"
            placeholderTextColor={UI.sub}
            style={s.input}
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>

        {/* выбранные позиции */}
        {pickCount > 0 ? (
          <View style={{ marginTop: 12 }}>
            <Text style={{ color: UI.sub, fontWeight: "900", marginBottom: 8 }}>
              Выбрано позиций: {pickCount}
            </Text>

            {pickLines.slice(0, 6).map((ln) => (
              <View
                key={ln.pick_key || `${ln.code}:${ln.uom_id || "-"}`}
                style={{
                  padding: 10,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.10)",
                  backgroundColor: "rgba(255,255,255,0.04)",
                  marginBottom: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: UI.text, fontWeight: "900" }} numberOfLines={1}>
                    {ln.name}
                  </Text>
                  <Text style={{ color: UI.sub, fontWeight: "800" }} numberOfLines={1}>
                    {ln.code} · {ln.uom_id || "—"} · {ln.qty}
                  </Text>
                </View>

                <Pressable
                  onPress={() => props.onRemovePick(ln.pick_key || `${ln.code}:${ln.uom_id || "-"}`)}
                  style={s.openBtn}
                  accessibilityRole="button"
                  accessibilityLabel={`Убрать ${ln.name} из выдачи`}
                >
                  <Text style={s.openBtnText}>Убрать</Text>
                </Pressable>
              </View>
            ))}

            {pickLines.length > 6 ? (
              <Text style={{ color: UI.sub, fontWeight: "800" }}>
                …и ещё {pickLines.length - 6}
              </Text>
            ) : null}
          </View>
        ) : null}

        {/* действия */}
        <View style={{ marginTop: 12, flexDirection: "row", gap: 10, justifyContent: "flex-end" }}>
          <Pressable
            onPress={props.onClear}
            disabled={pickCount === 0 || props.issueBusy}
            accessibilityRole="button"
            accessibilityState={{ disabled: pickCount === 0 || props.issueBusy }}
            style={[s.openBtn, (pickCount === 0 || props.issueBusy) && { opacity: 0.55 }]}
          >
            <Text style={s.openBtnText}>Очистить ({pickCount})</Text>
          </Pressable>

          <Pressable
            onPress={props.onSubmit}
            disabled={!canSubmit}
            accessibilityRole="button"
            accessibilityHint="Проводит выдачу выбранных позиций"
            accessibilityState={{ disabled: !canSubmit }}
            style={[s.openBtn, { borderColor: UI.accent, opacity: !canSubmit ? 0.45 : 1 }]}
          >
            <Text style={s.openBtnText}>{props.issueBusy ? "..." : "Выдать выбранное"}</Text>
          </Pressable>
        </View>

        {props.issueMsg.kind ? (
          <View
            style={{
              marginTop: 12,
              padding: 12,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.10)",
              backgroundColor: "rgba(255,255,255,0.04)",
            }}
          >
            <Text style={{ color: UI.text, fontWeight: "900" }}>{props.issueMsg.text}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
});
