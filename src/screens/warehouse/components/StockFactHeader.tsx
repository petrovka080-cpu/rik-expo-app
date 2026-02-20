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

  recipientText: string;
  onRecipientChange: (t: string) => void;

  recipientSuggestOpen: boolean;
  setRecipientSuggestOpen: (v: boolean) => void;
  recipientSuggestions: string[];
  onPickRecipient: (name: string) => void;

  stockSearch: string;
  onStockSearch: (t: string) => void;

  stockPick: Record<string, StockPickLine>;
  onRemovePick: (code: string) => void;

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
        <Text style={s.sectionBoxTitle}>СВОБОДНАЯ ВЫДАЧА (СКЛАД ФАКТ)</Text>

        {/* ✅ контекст как у прораба */}
        <View style={{ marginTop: 8, gap: 8 }}>
          {/* 1 ряд: объект + этаж */}
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            <Pressable onPress={props.onPickObject} style={s.openBtn}>
              <Text style={s.openBtnText} numberOfLines={1}>
                {props.objectOpt?.label
                  ? `Объект: ${props.objectOpt.label}`
                  : "Объект строительства *"}
              </Text>
            </Pressable>

            <Pressable onPress={props.onPickLevel} style={s.openBtn}>
              <Text style={s.openBtnText} numberOfLines={1}>
                {props.levelOpt?.label
                  ? `Этаж/уровень: ${props.levelOpt.label}`
                  : "Этаж / уровень *"}
              </Text>
            </Pressable>
          </View>

          {/* 2 ряд: система + зона (опционально) */}
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            <Pressable onPress={props.onPickSystem} style={s.openBtn}>
              <Text style={s.openBtnText} numberOfLines={1}>
                {props.systemOpt?.label
                  ? `Система: ${props.systemOpt.label}`
                  : "Система / вид работ (опц.)"}
              </Text>
            </Pressable>

            <Pressable onPress={props.onPickZone} style={s.openBtn}>
              <Text style={s.openBtnText} numberOfLines={1}>
                {props.zoneOpt?.label
                  ? `Зона: ${props.zoneOpt.label}`
                  : "Зона / участок (опц.)"}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ✅ получатель */}
        <View style={{ marginTop: 12 }}>
          <Text style={{ color: UI.sub, fontWeight: "800", marginBottom: 6 }}>
            Получатель *
          </Text>

          <TextInput
            value={props.recipientText}
            onChangeText={(t) => {
              const v = String(t ?? "");
              props.onRecipientChange(v);
              props.setRecipientSuggestOpen(true);
            }}
            placeholder="Введите ФИО получателя…"
            placeholderTextColor={UI.sub}
            style={s.input}
            autoCorrect={false}
            autoCapitalize="words"
            onFocus={() => props.setRecipientSuggestOpen(true)}
            onBlur={() => {
              // оставляем поведение как было, чтобы успеть нажать по подсказке
              setTimeout(() => props.setRecipientSuggestOpen(false), 120);
            }}
          />

          {props.recipientSuggestOpen && props.recipientSuggestions.length > 0 ? (
            <View style={{ marginTop: 8, gap: 8 }}>
              {props.recipientSuggestions.map((name) => (
                <Pressable
                  key={name}
                  onPress={() => {
                    props.onPickRecipient(name);
                    props.setRecipientSuggestOpen(false);
                  }}
                  style={s.openBtn}
                >
                  <Text style={s.openBtnText} numberOfLines={1}>
                    {name}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        {/* поиск */}
        <View style={{ marginTop: 12 }}>
          <Text style={{ color: UI.sub, fontWeight: "800", marginBottom: 6 }}>
            Поиск по складу
          </Text>
          <TextInput
            value={props.stockSearch}
            onChangeText={props.onStockSearch}
            placeholder="Код или название…"
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
                key={ln.code}
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

                <Pressable onPress={() => props.onRemovePick(ln.code)} style={s.openBtn}>
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
            style={[s.openBtn, (pickCount === 0 || props.issueBusy) && { opacity: 0.55 }]}
          >
            <Text style={s.openBtnText}>Очистить ({pickCount})</Text>
          </Pressable>

          <Pressable
            onPress={props.onSubmit}
            disabled={!canSubmit}
            style={[s.openBtn, { borderColor: UI.accent, opacity: !canSubmit ? 0.45 : 1 }]}
          >
            <Text style={s.openBtnText}>{props.issueBusy ? "..." : "Выдать выбранное"}</Text>
          </Pressable>
        </View>

        {pickCount > 0 && !canSubmit ? (
          <Text style={{ marginTop: 10, color: UI.sub, fontWeight: "800" }}>
            Чтобы выдать: выбери объект, этаж/уровень и получателя.
          </Text>
        ) : null}

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

      <Text style={{ color: UI.sub, fontWeight: "800", marginTop: 10 }}>
        Нажми на материал → введи количество → «Добавить». Потом сверху «Выдать выбранное».
      </Text>
    </View>
  );
});
