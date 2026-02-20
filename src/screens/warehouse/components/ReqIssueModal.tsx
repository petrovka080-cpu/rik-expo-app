// src/screens/warehouse/components/ReqIssueModal.tsx
import React, { useMemo } from "react";
import { View, Text, Pressable, TextInput, FlatList, Platform } from "react-native";
import RNModal from "react-native-modal";
import { Ionicons } from "@expo/vector-icons";
import { uomLabelRu } from "../warehouse.uom";

import { UI, s } from "../warehouse.styles";
import { nz } from "../warehouse.utils";
import type { ReqHeadRow, ReqItemUiRow, ReqPickLine } from "../warehouse.types";

import IconSquareButton from "../../../ui/IconSquareButton";

type Props = {
  visible: boolean;
  onClose: () => void;

  title: string;
  head?: (ReqHeadRow | ReqItemUiRow) | null;

  reqItems: ReqItemUiRow[];
  reqItemsLoading: boolean;

  reqQtyInputByItem: Record<string, string>;
  setReqQtyInputByItem: React.Dispatch<React.SetStateAction<Record<string, string>>>;

  recipientText: string;

  issueBusy: boolean;

  addReqPickLine: (item: ReqItemUiRow) => void;
  submitReqPick: () => void;

  reqPick: Record<string, ReqPickLine>;
  removeReqPickLine: (requestItemId: string) => void;

  issueMsg: { kind: "error" | "ok" | null; text: string };
};

function CloseSquare({
  onPress,
  disabled,
  accessibilityLabel,
  size = 44,
  iconSize = 20,
}: {
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  size?: number;
  iconSize?: number;
}) {
  return (
    <IconSquareButton
      onPress={onPress}
      disabled={!!disabled}
      loading={false}
      accessibilityLabel={accessibilityLabel || "Закрыть"}
      width={size}
      height={size}
      radius={16}
      bg="rgba(255,255,255,0.06)"
      bgPressed="rgba(255,255,255,0.10)"
      bgDisabled="rgba(255,255,255,0.04)"
      spinnerColor={UI.text}
    >
      <Ionicons name="close" size={iconSize} color={UI.text} />
    </IconSquareButton>
  );
}

// ✅ дедуп по request_item_id: берём “самую сильную” строку
function dedupeReqItems(rows: ReqItemUiRow[], nzFn: (v: any, d?: number) => number): ReqItemUiRow[] {
  const byId: Record<string, ReqItemUiRow> = {};
  for (const it of rows || []) {
    const id = String((it as any)?.request_item_id ?? "").trim();
    if (!id) continue;

    const prev = byId[id];
    if (!prev) {
      byId[id] = it;
      continue;
    }

    // merge: выбираем максимум по числам, текст — первый непустой
    const merged: any = { ...prev };

    const pickText = (a: any, b: any) => {
      const sa = String(a ?? "").trim();
      if (sa) return sa;
      const sb = String(b ?? "").trim();
      return sb || null;
    };

    merged.name_human = pickText((prev as any).name_human, (it as any).name_human);
    merged.rik_code = pickText((prev as any).rik_code, (it as any).rik_code);
    merged.uom = pickText((prev as any).uom, (it as any).uom);

    merged.qty_limit = Math.max(nzFn((prev as any).qty_limit, 0), nzFn((it as any).qty_limit, 0));
    merged.qty_issued = Math.max(nzFn((prev as any).qty_issued, 0), nzFn((it as any).qty_issued, 0));
    merged.qty_left = Math.max(nzFn((prev as any).qty_left, 0), nzFn((it as any).qty_left, 0));
    merged.qty_available = Math.max(nzFn((prev as any).qty_available, 0), nzFn((it as any).qty_available, 0));
    merged.qty_can_issue_now = Math.max(
      nzFn((prev as any).qty_can_issue_now, 0),
      nzFn((it as any).qty_can_issue_now, 0),
    );

    byId[id] = merged as ReqItemUiRow;
  }
  return Object.values(byId);
}

export default function ReqIssueModal(props: Props) {
  const {
    visible,
    onClose,
    title,
    head,

    reqItems,
    reqItemsLoading,

    reqQtyInputByItem,
    setReqQtyInputByItem,

    recipientText,
    issueBusy,

    addReqPickLine,
    submitReqPick,

    reqPick,
    removeReqPickLine,

    issueMsg,
  } = props;

  const headObj = String((head as any)?.object_name ?? "").trim();
  const headLevel = String((head as any)?.level_name ?? (head as any)?.level_code ?? "").trim();
  const headSystem = String((head as any)?.system_name ?? (head as any)?.system_code ?? "").trim();
  const headZone = String((head as any)?.zone_name ?? (head as any)?.zone_code ?? "").trim();

  const hasHead = !!(headObj || headLevel || headSystem || headZone);

  // ✅ 1) фильтр по qty_left > 0
  // ✅ 2) дедуп по request_item_id (иначе троит + warning по key)
  const rows = useMemo(() => {
    const base = (reqItems || []).filter((it) => nz((it as any).qty_left, 0) > 0);
    const uniq = dedupeReqItems(base, nz);
    return uniq;
  }, [reqItems]);

  return (
    <RNModal
      isVisible={visible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      backdropOpacity={0.55}
      useNativeDriver={Platform.OS !== "web"}
      useNativeDriverForBackdrop={Platform.OS !== "web"}
      hideModalContentWhileAnimating
      avoidKeyboard={false}
      propagateSwipe={Platform.OS !== "web"}
      style={{ margin: 0, justifyContent: "flex-end" }}
    >
      <View
        style={{
          height: "90%",
          backgroundColor: UI.cardBg,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          paddingTop: 10,
          paddingHorizontal: 16,
          paddingBottom: 16,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.10)",
          flex: 1,
          minHeight: 0,
        }}
      >
        <View
          style={{
            alignSelf: "center",
            width: 44,
            height: 5,
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.18)",
            marginBottom: 10,
          }}
        />

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <Text style={{ flex: 1, color: UI.text, fontWeight: "900", fontSize: 18 }} numberOfLines={1}>
            {title}
          </Text>
          <CloseSquare onPress={onClose} accessibilityLabel="Свернуть" size={46} iconSize={22} />
        </View>

        {hasHead ? (
          <View
            style={{
              marginTop: 8,
              marginBottom: 12,
              padding: 12,
              borderRadius: 14,
              backgroundColor: "#0F172A",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.10)",
              borderLeftWidth: 4,
              borderLeftColor: UI.accent,
            }}
          >
            {!!headObj ? (
              <Text style={{ color: UI.text, fontSize: 14, lineHeight: 20, marginBottom: 4 }}>
                {`Объект: ${headObj}`}
              </Text>
            ) : null}
            {!!headLevel ? (
              <Text style={{ color: UI.text, fontSize: 14, lineHeight: 20, marginBottom: 4 }}>
                {`Этаж/уровень: ${headLevel}`}
              </Text>
            ) : null}
            {!!headSystem ? (
              <Text style={{ color: UI.text, fontSize: 14, lineHeight: 20, marginBottom: 4 }}>
                {`Система: ${headSystem}`}
              </Text>
            ) : null}
            {!!headZone ? (
              <Text style={{ color: UI.text, fontSize: 14, lineHeight: 20, marginBottom: 0 }}>
                {`Зона: ${headZone}`}
              </Text>
            ) : null}
          </View>
        ) : null}

        {reqItemsLoading ? (
          <Text style={{ color: UI.sub, fontWeight: "800" }}>Загрузка позиций…</Text>
        ) : (
          <FlatList
            data={rows}
            // ✅ ключ “на всякий” тоже делаем устойчивый
            keyExtractor={(x, idx) => `${x.request_item_id}:${String((x as any).rik_code ?? "")}:${String((x as any).uom ?? "")}:${idx}`}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const canByStock = nz((item as any).qty_available, 0);
              const left = nz((item as any).qty_left, 0);
              const canByReqNow = nz((item as any).qty_can_issue_now, 0);

              const maxUi = Math.max(0, Math.min(canByStock, left));

              const uom = uomLabelRu((item as any).uom ?? (item as any).uom_id);
              const val = reqQtyInputByItem[item.request_item_id] ?? "";

              const disableByStock = issueBusy || maxUi <= 0;
              const disableAdd = disableByStock || !recipientText.trim();

              return (
                <View style={{ marginBottom: 12 }}>
                  <View style={s.mobCard}>
                    <View style={s.mobMain}>
                      <Text style={s.mobTitle} numberOfLines={2}>
                        {String((item as any).name_human || "Позиция")}
                      </Text>

                      <Text style={s.mobMeta} numberOfLines={3}>
                        {`${uom} · лимит ${(item as any).qty_limit} · выдано ${(item as any).qty_issued} · осталось ${left} · склад ${canByStock} · по заявке можно ${(item as any).qty_can_issue_now}`}
                      </Text>

                      <View style={{ marginTop: 10, flexDirection: "row", gap: 8, alignItems: "center" }}>
                        <TextInput
                          value={val}
                          onChangeText={(t) => {
                            const cleaned = String(t ?? "").replace(",", ".").replace(/\s+/g, "");
                            setReqQtyInputByItem((p) => ({ ...(p || {}), [item.request_item_id]: cleaned }));
                          }}
                          keyboardType={Platform.OS === "web" ? "default" : "numeric"}
                          placeholder={`0 (макс ${maxUi})`}
                          placeholderTextColor={UI.sub}
                          style={[s.input, { flex: 1, paddingVertical: 8 }]}
                        />

                        <Pressable
                          onPress={() => {
                            setReqQtyInputByItem((p) => ({ ...(p || {}), [item.request_item_id]: String(maxUi) }));
                          }}
                          disabled={disableByStock}
                          style={[s.openBtn, { opacity: disableByStock ? 0.45 : 1 }]}
                        >
                          <Text style={s.openBtnText}>Макс</Text>
                        </Pressable>

                        <Pressable
                          onPress={() => addReqPickLine(item)}
                          disabled={disableAdd}
                          style={[s.openBtn, { borderColor: UI.accent, opacity: disableAdd ? 0.45 : 1 }]}
                        >
                          <Text style={s.openBtnText}>{issueBusy ? "..." : "Добавить"}</Text>
                        </Pressable>
                      </View>

                      {maxUi <= 0 ? (
                        <Text style={{ marginTop: 6, color: UI.sub, fontWeight: "800" }}>
                          Нельзя выдать сейчас: по заявке лимит исчерпан или на складе 0
                        </Text>
                      ) : canByReqNow <= 0 ? (
                        <Text style={{ marginTop: 6, color: UI.sub, fontWeight: "800" }}>
                          По заявке можно 0 — перерасход делай через «Свободная выдача»
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </View>
              );
            }}
            ListEmptyComponent={
              <Text style={{ color: UI.sub, fontWeight: "800", paddingTop: 12 }}>
                Нет строк для выдачи (лимиты закрыты).
              </Text>
            }
            ListFooterComponent={
              <View style={{ marginTop: 12, paddingBottom: 12 }}>
                <Text style={{ color: UI.sub, fontWeight: "900" }}>
                  В корзине: {Object.keys(reqPick || {}).length}
                </Text>

                {Object.values(reqPick || {}).slice(0, 8).map((ln) => (
                  <View
                    key={ln.request_item_id}
                    style={{ marginTop: 8, flexDirection: "row", gap: 10, alignItems: "center" }}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ color: UI.text, fontWeight: "900" }} numberOfLines={1}>
                        {String((ln as any).name_human || "Позиция")}
                      </Text>
                      <Text style={{ color: UI.sub, fontWeight: "800" }} numberOfLines={1}>
                        {`${uomLabelRu((ln as any).uom ?? (ln as any).uom_id)} · ${String((ln as any).qty ?? "0")}`}
                      </Text>
                    </View>

                    <CloseSquare
                      onPress={() => removeReqPickLine(ln.request_item_id)}
                      accessibilityLabel="Убрать из корзины"
                      size={44}
                      iconSize={20}
                    />
                  </View>
                ))}

                <View style={{ marginTop: 12, flexDirection: "row", justifyContent: "flex-end" }}>
                  <Pressable
                    onPress={() => submitReqPick()}
                    disabled={issueBusy || Object.keys(reqPick || {}).length === 0 || !recipientText.trim()}
                    style={[
                      s.openBtn,
                      {
                        borderColor: UI.accent,
                        opacity:
                          issueBusy || Object.keys(reqPick || {}).length === 0 || !recipientText.trim()
                            ? 0.45
                            : 1,
                      },
                    ]}
                  >
                    <Text style={s.openBtnText}>{issueBusy ? "..." : "Выдать выбранное"}</Text>
                  </Pressable>
                </View>
              </View>
            }
          />
        )}

        {issueMsg.kind ? (
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
            <Text style={{ color: UI.text, fontWeight: "900" }}>{issueMsg.text}</Text>
          </View>
        ) : null}
      </View>
    </RNModal>
  );
}
