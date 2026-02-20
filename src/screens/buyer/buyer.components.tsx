// src/screens/buyer/buyer.components.tsx
import React, { useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  Alert,
  Platform,
  Animated,
  ActivityIndicator,
  RefreshControl,
  Keyboard,
  ScrollView,
  FlatList,
} from "react-native";
import RNModal from "react-native-modal";

import type { BuyerInboxRow } from "../../lib/catalog_api";
import { splitNote, mergeNote } from "./buyerUtils";
import { UI, P_LIST, P_SHEET } from "./buyerUi";
import { D } from "./buyerUi";
import { normName, SUPP_NONE } from "./buyerUtils";
/* ===================== TYPES ===================== */
export type Attachment = {
  name: string;
  file: any; // File (web) | DocumentPicker asset (native) | Blob
};

export type LineMeta = {
  price?: string;
  supplier?: string;
  note?: string;
};

export type DraftAttachmentMap = Record<string, Attachment | undefined>;

/* ===================== BITS ===================== */
export type SafeViewProps = React.ComponentProps<typeof View> & {
  children?: React.ReactNode;
};

export function SafeView({ children, ...rest }: SafeViewProps) {
  const kids = React.Children.toArray(children).map((c, i) => {
    if (typeof c === "string") {
      const t = c.trim();
      return t ? <Text key={`t${i}`}>{t}</Text> : null;
    }
    return c as any;
  });
  return <View {...rest}>{kids}</View>;
}

export const statusColors = (s?: string | null) => {
  const v = (s ?? "").trim();
  if (v === "Утверждено") return { bg: "#DCFCE7", fg: "#166534" };
  if (v === "На утверждении") return { bg: "#DBEAFE", fg: "#1E3A8A" };
  if (v === "На доработке" || v.startsWith("На доработке")) return { bg: "#FEE2E2", fg: "#991B1B" };
  return { bg: "#E5E7EB", fg: "#111827" };
};

export const Chip = React.memo(function Chip({
  label,
  bg,
  fg,
}: {
  label: string;
  bg: string;
  fg: string;
}) {
  const st = useMemo(
    () => ({ backgroundColor: bg, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 }),
    [bg]
  );
  const tx = useMemo(() => ({ color: fg, fontWeight: "600" as const, fontSize: 12 }), [fg]);

  return (
    <View style={st}>
      <Text style={tx}>{label}</Text>
    </View>
  );
});

export const TabCount = React.memo(function TabCount({
  n,
  active,
  s,
}: {
  n: number;
  active: boolean;
  s: any; // styles from buyer.tsx
}) {
  if (!n) return null;
  if (!s) return null;

  return (
    <View style={[s.tabBadge, active && s.tabBadgeActive]}>
      <Text style={[s.tabBadgeText, active && s.tabBadgeTextActive]}>{n}</Text>
    </View>
  );
});

/* ===================== BUTTONS ===================== */
export const WideActionButton = ({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = "neutral", // "neutral" | "blue" | "green"
}: {
  label: string;
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  variant?: "neutral" | "blue" | "green";
}) => {
  const isDisabled = disabled || loading;

  const tone =
    variant === "green"
      ? { bg: "#22C55E", border: "#22C55E", text: "#0B0F14" }
      : variant === "blue"
        ? { bg: "#3B82F6", border: "#2563EB", text: "#FFFFFF" }
        : { bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.18)", text: "#F8FAFC" };

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        {
          width: "100%",
          height: 52,
          borderRadius: 16,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          backgroundColor: tone.bg,
          borderColor: tone.border,
          opacity: isDisabled ? 0.6 : pressed ? 0.92 : 1,
        },
      ]}
    >
      <Text style={{ color: tone.text, fontWeight: "900", fontSize: 14 }}>
        {loading ? "…" : label}
      </Text>
    </Pressable>
  );
};

/* ===================== CARDS ===================== */
export function AttachmentUploaderAny({
  label,
  onPick,
  current,
  disabled,
  accept = ".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx",
  s,
}: {
  label: string;
  onPick: (att: Attachment | null) => void; // null = очистить
  current?: Attachment;
  disabled?: boolean;
  accept?: string;
  s: any; // styles from buyer.tsx
}) {
  const pick = async () => {
    if (disabled) return;

    try {
      // WEB
      if (Platform.OS === "web") {
        const f = await new Promise<File | null>((resolve) => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = accept;
          input.onchange = () => {
            const file = (input.files && input.files[0]) || null;
            try { input.remove(); } catch {}
            resolve(file);
          };
          input.click();
        });

        if (!f) return;
        onPick({ name: f.name, file: f });
        return;
      }

      // NATIVE (iOS/Android)
      // @ts-ignore
      const DocPicker = await import("expo-document-picker");
      const res = await (DocPicker as any).getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: "*/*",
      });

      if (res?.canceled) return;
      const f = res?.assets?.[0] ?? res;
      if (!f) return;

      const name = String(f?.name ?? `file_${Date.now()}`).trim();
      onPick({ name, file: f });
    } catch (e: any) {
      Alert.alert("Вложение", e?.message ?? "Не удалось выбрать файл");
    }
  };

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Pressable
        onPress={pick}
        disabled={disabled}
        style={[
          s.smallBtn,
          { flex: 1, borderColor: "rgba(255,255,255,0.22)", opacity: disabled ? 0.6 : 1 },
        ]}
      >
        <Text style={[s.smallBtnText, { color: UI.text }]} numberOfLines={1}>
          {current?.name ? `${label}: ${current.name}` : `Вложение: ${label}`}
        </Text>
      </Pressable>

      {!!current?.name ? (
        <Pressable
          onPress={() => onPick(null)}
          disabled={disabled}
          style={[
            s.smallBtn,
            { paddingHorizontal: 12, borderColor: "rgba(255,255,255,0.22)", opacity: disabled ? 0.6 : 1 },
          ]}
        >
          <Text style={[s.smallBtnText, { color: UI.text }]}>✕</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export const BuyerItemRow = React.memo(function BuyerItemRow(props: {
  it: BuyerInboxRow;
  selected: boolean;
  inSheet?: boolean;
  m: LineMeta;
  sum: number;
  prettyText: string;
  rejectedByDirector: boolean;

  s: any; // styles from buyer.tsx

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
              <Text style={[s.cardTitle, { color: P.text }]}>{(it as any).name_human}</Text>

              {(it as any).app_code ? (
                <View style={{ backgroundColor: P.chipGrayBg, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 8 }}>
                  <Text style={{ color: P.chipGrayText, fontWeight: "700", fontSize: 12 }}>
                    {(it as any).app_code}
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
              <Text style={[s.fieldLabel, { color: P.sub }]}>Цена</Text>
              <TextInput
                value={String(m.price ?? "")}
                onChangeText={onSetPrice}
                keyboardType="decimal-pad"
                placeholder="Цена"
                placeholderTextColor={P.sub}
                onFocus={onFocusField}
                style={[s.fieldInput, { backgroundColor: P.inputBg, borderColor: P.inputBorder, color: P.text }]}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[s.fieldLabel, { color: P.sub }]}>Поставщик</Text>
              <TextInput
                value={String(m.supplier ?? "")}
                onChangeText={onSetSupplier}
                placeholder="Поставщик"
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
            <Text style={[s.fieldLabel, { color: P.sub }]}>Примечание</Text>
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

export const BuyerGroupBlock = React.memo(function BuyerGroupBlock(props: {
  g: { request_id: string; items: BuyerInboxRow[] };
  index?: number;               // ✅ совместимость с buyer.tsx
  gsum?: number;                // ✅ совместимость с buyer.tsx
  isWeb?: boolean;              // ✅ совместимость с buyer.tsx
  supplierGroups?: string[];    // ✅ совместимость с buyer.tsx
  attachments?: DraftAttachmentMap; // ✅ совместимость с buyer.tsx
  onPickAttachment?: (key: string, att: Attachment | null) => void; // ✅ совместимость

  isOpen: boolean;
  headerTitle: string;
  headerMeta: string;

  s: any;

  onToggle: () => void;
  renderItemRow: (it: BuyerInboxRow, idx2: number) => React.ReactNode;
}) {
  const {
    g,
    isOpen,
    headerTitle,
    headerMeta,
    onToggle,
    renderItemRow,
    s,
  } = props;

  const isRejectedHeader =
    String(headerMeta || "").startsWith("❌ ОТКЛОНЕНА") ||
    String(headerMeta || "").includes("❌ отклонено");

  return (
    <View style={s.group}>
      <Pressable onPress={onToggle} style={s.groupHeader}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.groupTitle} numberOfLines={1}>{headerTitle}</Text>

          <Text
            style={[s.groupMeta, isRejectedHeader && { color: "#DC2626", fontWeight: "900" }]}
            numberOfLines={1}
          >
            {headerMeta}
          </Text>
        </View>

        <Pressable onPress={onToggle} style={s.openBtn}>
          <Text style={s.openBtnText}>{isOpen ? "Свернуть" : "Открыть"}</Text>
        </Pressable>
      </Pressable>

      {isOpen ? (
        <View style={s.openBody}>
          <View style={s.itemsPanel}>
            <View style={s.itemsBox}>
              {g.items.map((item, idx2) => (
                <React.Fragment
                  key={(item as any)?.request_item_id ? `ri:${(item as any).request_item_id}` : `f:${g.request_id}:${idx2}`}
                >
                  {renderItemRow(item, idx2)}
                </React.Fragment>
              ))}
              <View style={{ height: 12 }} />
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
});
export const BuyerProposalCard = React.memo(function BuyerProposalCard(props: {
  head: any;
  title?: string;
  s: any;

  attCount?: number | null;

  onOpenPdf: (pidStr: string) => void;
  onOpenAccounting: (pidStr: string) => void;
  onOpenRework: (pidStr: string) => void;

  onOpenDetails: (pidStr: string) => void;       // ✅ Открыть (позиции)
  onOpenAttachments: (pidStr: string) => void;   // ✅ Вложения (вкладка вложений)
}) {
  const { head, s, onOpenPdf, onOpenAccounting, onOpenRework, onOpenDetails, onOpenAttachments } = props;

  const pidStr = String(head.id);
  const sc = statusColors(head.status);
  const headerText = props.title || `Предложение #${pidStr.slice(0, 8)}`;

  return (
    <View style={s.proposalCard}>
      {/* HEADER */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <Text style={[s.cardTitle, { color: UI.text }]}>{headerText}</Text>
        <Chip label={String(head.status || "—")} bg={sc.bg} fg={sc.fg} />

        <View
          style={{
            backgroundColor: "rgba(255,255,255,0.06)",
            borderRadius: 999,
            paddingVertical: 4,
            paddingHorizontal: 10,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.12)",
          }}
        >
          <Text style={s.sumPillText}>
            Сумма: {Number(head.total_sum ?? 0).toLocaleString()} сом
          </Text>
        </View>

        <Text style={[s.cardMeta, { color: "rgba(255,255,255,0.78)" }]}>
          {head.submitted_at ? new Date(head.submitted_at).toLocaleString() : "—"}
        </Text>
      </View>

      {/* FOOTER (единственный ряд кнопок — PROD) */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 12 }}>
        <Pressable
          onPress={() => onOpenDetails(pidStr)}
          style={[s.openBtn, { minWidth: 120 }]}
          hitSlop={10}
        >
          <Text style={s.openBtnText}>Открыть</Text>
        </Pressable>

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            onPress={() => onOpenPdf(pidStr)}
            style={[s.openBtn, { minWidth: 82 }]}
            hitSlop={10}
          >
            <Text style={s.openBtnText}>PDF</Text>
          </Pressable>

          <Pressable
            onPress={() => onOpenAttachments(pidStr)}
            style={[s.openBtn, { minWidth: 150 }]}
            hitSlop={10}
          >
            <Text style={s.openBtnText}>
              Вложения{typeof props.attCount === "number" ? ` (${props.attCount})` : ""}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* STATUS ACTIONS */}
      {head.status === "Утверждено" && !head.sent_to_accountant_at ? (
        <View style={{ marginTop: 10 }}>
          <Pressable
            onPress={() => onOpenAccounting(pidStr)}
            style={[s.smallBtn, { backgroundColor: "#2563eb", borderColor: "#2563eb" }]}
            hitSlop={10}
          >
            <Text style={[s.smallBtnText, { color: "#fff" }]}>В бухгалтерию</Text>
          </Pressable>
        </View>
      ) : null}

      {String(head.status).startsWith("На доработке") ? (
        <View style={{ marginTop: 10 }}>
          <Pressable
            onPress={() => onOpenRework(pidStr)}
            style={[s.smallBtn, { backgroundColor: "#f97316", borderColor: "#f97316" }]}
            hitSlop={10}
          >
            <Text style={[s.smallBtnText, { color: "#fff" }]}>Доработать</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
});
/* ===================== SCREEN HEADER (UI only) ===================== */
export const BuyerScreenHeader = React.memo(function BuyerScreenHeader(props: {
  s: any;
  tab: "inbox" | "pending" | "approved" | "rejected";
  setTab: (t: any) => void;

  buyerFio: string;
  setBuyerFio: (v: string) => void;

  titleSize: any;
  subOpacity: any;

  inboxCount: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;

  tabsScrollRef?: any;
  scrollTabsToStart: (animated?: boolean) => void;


}) {
  const {
    s, tab, setTab,
    buyerFio, setBuyerFio,
    titleSize, subOpacity,
    inboxCount, pendingCount, approvedCount, rejectedCount,
    tabsScrollRef, scrollTabsToStart, 
  } = props;

  return (
    <SafeView style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6 }}>
      <SafeView style={{ flexDirection: "row", alignItems: "center" }}>
        <Animated.Text style={{ fontSize: titleSize as any, fontWeight: "900", color: UI.text }}>
          Снабженец
        </Animated.Text>
      </SafeView>

      <SafeView style={{ height: 10 }} />

      <ScrollView
        ref={tabsScrollRef as any}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.tabsRow}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={() => { scrollTabsToStart(true); setTab("inbox"); }}
          style={[s.tabPill, tab === "inbox" && s.tabPillActive]}
        >
          <View style={s.tabLabelRow}>
            <Text style={[s.tabPillText, tab === "inbox" && s.tabPillTextActive]}>Вход</Text>
            <TabCount n={inboxCount} active={tab === "inbox"} s={s} />
          </View>
        </Pressable>

        <Pressable
          onPress={() => { scrollTabsToStart(true); setTab("pending"); }}
          style={[s.tabPill, tab === "pending" && s.tabPillActive]}
        >
          <View style={s.tabLabelRow}>
            <Text style={[s.tabPillText, tab === "pending" && s.tabPillTextActive]}>Контроль</Text>
            <TabCount n={pendingCount} active={tab === "pending"} s={s} />
          </View>
        </Pressable>

        <Pressable
          onPress={() => { scrollTabsToStart(true); setTab("approved"); }}
          style={[s.tabPill, tab === "approved" && s.tabPillActive]}
        >
          <View style={s.tabLabelRow}>
            <Text style={[s.tabPillText, tab === "approved" && s.tabPillTextActive]}>Готово</Text>
            <TabCount n={approvedCount} active={tab === "approved"} s={s} />
          </View>
        </Pressable>

        <Pressable
          onPress={() => { scrollTabsToStart(true); setTab("rejected"); }}
          style={[s.tabPill, tab === "rejected" && s.tabPillActive]}
        >
          <View style={s.tabLabelRow}>
            <Text style={[s.tabPillText, tab === "rejected" && s.tabPillTextActive]}>Правки</Text>
            <TabCount n={rejectedCount} active={tab === "rejected"} s={s} />
          </View>
        </Pressable>
      </ScrollView>

      <Animated.View style={{ opacity: subOpacity, marginTop: 10 }}>
        <Text style={s.fioLabel}>ФИО</Text>
        <TextInput
          value={buyerFio}
          onChangeText={setBuyerFio}
          placeholder="введите ФИО"
          style={[
            s.fioInput,
            { backgroundColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.12)", color: UI.text },
          ]}
          placeholderTextColor={UI.sub}
        />
      </Animated.View>
    </SafeView>
  );
});

/* ===================== LIST (UI only) ===================== */
export const BuyerMainList = React.memo(function BuyerMainList(props: {
  s: any;
  tab: "inbox" | "pending" | "approved" | "rejected";
  data: any[];

  listRef?: any;

  measuredHeaderMax: number;

  refreshing: boolean;
  onRefresh: () => void;

  loadingInbox: boolean;
  loadingBuckets: boolean;

  scrollY: any;

  renderGroupBlock: (g: any, index: number) => React.ReactNode;
  renderProposalCard: (item: any) => React.ReactNode;
}) {
  const {
    s, tab, data, listRef,
    measuredHeaderMax,
    refreshing, onRefresh,
    loadingInbox, loadingBuckets,
    scrollY,
    renderGroupBlock, renderProposalCard,
  } = props;

  return (
    <Animated.FlatList
      ref={listRef as any}
      data={data}
      keyExtractor={(item: any) =>
        tab === "inbox"
          ? `g:${String(item?.request_id ?? "")}`
          : `p:${String(item?.id ?? "")}`
      }
      renderItem={({ item, index }: any) => (
        <View style={{ marginBottom: 12 }}>
          {tab === "inbox" ? renderGroupBlock(item, index) : renderProposalCard(item)}
        </View>
      )}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={
        loadingInbox || loadingBuckets
          ? (<SafeView style={{ padding: 24, alignItems: "center" }}><ActivityIndicator /></SafeView>)
          : (<SafeView style={{ padding: 24 }}><Text style={{ color: UI.sub }}>Пока пусто</Text></SafeView>)
      }
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
      scrollEventThrottle={16}
      contentInsetAdjustmentBehavior="never"
      automaticallyAdjustContentInsets={false as any}
      contentContainerStyle={{
        paddingTop: measuredHeaderMax + 16,
        paddingHorizontal: 12,
        paddingBottom: 24,
      }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      onScrollBeginDrag={() => { Keyboard.dismiss(); }}
      removeClippedSubviews={Platform.OS === "web" ? false : true}
      onScrollToIndexFailed={(info: any) => {
        setTimeout(() => {
          try {
            (listRef as any)?.current?.scrollToOffset?.({
              offset: info.averageItemLength * info.index,
              animated: true,
            });
          } catch {}
        }, 50);
      }}
    />
  );
});

export const BuyerSheetShell = React.memo(function BuyerSheetShell(props: {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  s: any;
  children: React.ReactNode;
}) {
  const { isOpen, title, onClose, s, children } = props;

  return (
    <RNModal
      isVisible={isOpen}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      backdropOpacity={0.55}
      propagateSwipe
      useNativeDriver={Platform.OS !== "web"}
      useNativeDriverForBackdrop={Platform.OS !== "web"}
      hideModalContentWhileAnimating={Platform.OS !== "web"}
      style={{ margin: 0, justifyContent: "flex-end", alignItems: "stretch" }}
    >
      <View style={s.dirSheet}>
        <View style={s.dirSheetHandle} />

        <View style={s.dirSheetTopBar}>
          <Text style={s.dirSheetTitle} numberOfLines={1}>
            {title}
          </Text>

          <Pressable onPress={onClose} style={s.dirSheetCloseBtn} hitSlop={10}>
            <Text style={s.dirSheetCloseText}>Свернуть</Text>
          </Pressable>
        </View>

        {children}
      </View>
    </RNModal>
  );
});
export function BuyerAccountingSheetBody({
  s,
  isWeb,

  acctProposalId,
  propDocBusy,
  propDocAttached,

  acctSupp,

  invNumber,
  setInvNumber,
  invDate,
  setInvDate,
  invAmount,
  setInvAmount,
  invCurrency,
  setInvCurrency,

  invoiceUploadedName,
  openInvoicePickerWeb,
  invFile,
  pickInvoiceFile,
  setInvFile,

  acctBusy,
  sendToAccounting,
  closeSheet,
}: {
  s: any;
  isWeb: boolean;

  acctProposalId: string | number | null;
  propDocBusy: boolean;
  propDocAttached: { name: string; url?: string } | null;

  acctSupp: {
    name: string;
    inn?: string | null;
    bank?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;

  invNumber: string;
  setInvNumber: (v: string) => void;
  invDate: string;
  setInvDate: (v: string) => void;
  invAmount: string;
  setInvAmount: (v: string) => void;
  invCurrency: string;
  setInvCurrency: (v: string) => void;

  invoiceUploadedName: string;
  openInvoicePickerWeb: () => void;

  invFile: any | null;
  pickInvoiceFile: () => Promise<any | null>;
  setInvFile: (v: any | null) => void;

  acctBusy: boolean;
  sendToAccounting: () => void | Promise<void>;
  closeSheet: () => void;
}) {
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 24 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={{ fontSize: 12, color: D.sub, fontWeight: "800" }}>
        {acctProposalId ? `Документ: #${String(acctProposalId).slice(0, 8)}` : "Документ не выбран"}
      </Text>

      <Text style={{ fontSize: 12, color: D.sub, marginTop: 8, fontWeight: "800" }}>
        {propDocBusy
          ? "Готовим файл предложения…"
          : propDocAttached
            ? `Файл предложения: ${propDocAttached.name}`
            : "Файл предложения будет прикреплён"}
      </Text>

      {acctSupp ? (
        <View
          style={{
            marginTop: 10,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.12)",
            borderRadius: 14,
            padding: 12,
            backgroundColor: "rgba(255,255,255,0.06)",
          }}
        >
          <Text style={{ fontWeight: "900", color: D.text }}>{acctSupp.name}</Text>
          <Text style={{ color: D.sub, marginTop: 6, fontWeight: "700" }}>
            {acctSupp.inn ? `ИНН: ${acctSupp.inn} · ` : ""}
            {acctSupp.bank ? `Счёт: ${acctSupp.bank} · ` : ""}
            {acctSupp.phone ? `Тел.: ${acctSupp.phone} · ` : ""}
            {acctSupp.email ? `Email: ${acctSupp.email}` : ""}
          </Text>
        </View>
      ) : null}

      <Text style={{ fontSize: 12, color: D.sub, marginTop: 14, fontWeight: "800" }}>Номер счёта</Text>
      <TextInput
        value={invNumber}
        onChangeText={setInvNumber}
        style={[
          s.input,
          { backgroundColor: "rgba(255,255,255,0.06)", color: D.text, borderColor: "rgba(255,255,255,0.12)" },
        ]}
      />

      <Text style={{ fontSize: 12, color: D.sub, marginTop: 10, fontWeight: "800" }}>Дата (YYYY-MM-DD)</Text>
      <TextInput
        value={invDate}
        onChangeText={setInvDate}
        style={[
          s.input,
          { backgroundColor: "rgba(255,255,255,0.06)", color: D.text, borderColor: "rgba(255,255,255,0.12)" },
        ]}
      />

      <Text style={{ fontSize: 12, color: D.sub, marginTop: 10, fontWeight: "800" }}>Сумма</Text>
      <TextInput
        value={invAmount}
        onChangeText={setInvAmount}
        keyboardType="decimal-pad"
        style={[
          s.input,
          { backgroundColor: "rgba(255,255,255,0.06)", color: D.text, borderColor: "rgba(255,255,255,0.12)" },
        ]}
      />

      <Text style={{ fontSize: 12, color: D.sub, marginTop: 10, fontWeight: "800" }}>Валюта</Text>
      <TextInput
        value={invCurrency}
        onChangeText={setInvCurrency}
        style={[
          s.input,
          { backgroundColor: "rgba(255,255,255,0.06)", color: D.text, borderColor: "rgba(255,255,255,0.12)" },
        ]}
      />

      {isWeb ? (
        <Pressable
          onPress={openInvoicePickerWeb}
          style={[
            s.smallBtn,
            { marginTop: 12, borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.06)" },
          ]}
        >
          <Text style={{ color: D.text, fontWeight: "900" }}>
            {invoiceUploadedName ? `Счёт прикреплён: ${invoiceUploadedName}` : "Прикрепить счёт (PDF/JPG/PNG)"}
          </Text>
        </Pressable>
      ) : (
        <Pressable
          onPress={async () => {
            const f = await pickInvoiceFile();
            if (f) setInvFile(f);
          }}
          style={[
            s.smallBtn,
            { marginTop: 12, borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.06)" },
          ]}
        >
          <Text style={{ color: D.text, fontWeight: "900" }}>
            {invFile?.name ? `Счёт прикреплён: ${invFile.name}` : "Прикрепить счёт (PDF/JPG/PNG)"}
          </Text>
        </Pressable>
      )}

      <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
        <WideActionButton
          label={acctBusy ? "Отправляем…" : "Отправить"}
          variant="green"
          disabled={acctBusy}
          loading={acctBusy}
          onPress={sendToAccounting}
        />

        <WideActionButton
          label="Отмена"
          variant="neutral"
          disabled={acctBusy}
          onPress={closeSheet}
        />
      </View>
    </ScrollView>
  );
}


export function BuyerRfqSheetBody({
  s,

  rfqBusy,
  closeSheet,

  pickedIdsLen,
  rfqShowItems,
  setRfqShowItems,
  rfqPickedPreview,

  fmtLocal,
  rfqDeadlineIso,
  setDeadlineHours,
  isDeadlineHoursActive,

  rfqDeliveryDays,
  setRfqDeliveryDays,

  rfqDeliveryType,
  setRfqDeliveryType,

  rfqCity,
  setRfqCity,
  rfqCountryCodeTouchedRef,
  inferCountryCode,
  setRfqCountryCode,

  rfqAddressText,
  setRfqAddressText,

  rfqDeliveryWindow,
  setRfqDeliveryWindow,

  rfqCountryCode,
  setRfqCountryCodeTouched, // optional helper (можно не использовать)
  rfqPhone,
  setRfqPhone,

  rfqEmail,
  setRfqEmail,

  rfqRememberContacts,
  setRfqRememberContacts,

  rfqVisibility,
  setRfqVisibility,

  rfqPaymentTerms,
  setRfqPaymentTerms,

  rfqNeedInvoice,
  setRfqNeedInvoice,
  rfqNeedWaybill,
  setRfqNeedWaybill,
  rfqNeedCert,
  setRfqNeedCert,

  rfqNote,
  setRfqNote,

  publishRfq,
}: {
  s: any;

  rfqBusy: boolean;
  closeSheet: () => void;

  pickedIdsLen: number;
  rfqShowItems: boolean;
  setRfqShowItems: (v: any) => void;
  rfqPickedPreview: { id: string; title: string; qty: number; uom: string }[];

  fmtLocal: (iso: string) => string;
  rfqDeadlineIso: string;
  setDeadlineHours: (h: number) => void;
  isDeadlineHoursActive: (h: number) => boolean;

  rfqDeliveryDays: string;
  setRfqDeliveryDays: (v: string) => void;

  rfqDeliveryType: "delivery" | "pickup" | "on_site";
  setRfqDeliveryType: (v: any) => void;

  rfqCity: string;
  setRfqCity: (v: string) => void;
  rfqCountryCodeTouchedRef: any; // useRef<boolean>
  inferCountryCode: (cityRaw?: string, phoneRaw?: string) => string;
  setRfqCountryCode: (v: any) => void;

  rfqAddressText: string;
  setRfqAddressText: (v: string) => void;

  rfqDeliveryWindow: string;
  setRfqDeliveryWindow: (v: string) => void;

  rfqCountryCode: string;
  setRfqCountryCodeTouched?: (v: boolean) => void; // не обязателен
  rfqPhone: string;
  setRfqPhone: (v: string) => void;

  rfqEmail: string;
  setRfqEmail: (v: string) => void;

  rfqRememberContacts: boolean;
  setRfqRememberContacts: (v: any) => void;

  rfqVisibility: "open" | "company_only";
  setRfqVisibility: (v: any) => void;

  rfqPaymentTerms: "cash" | "bank" | "after" | "deferred";
  setRfqPaymentTerms: (v: any) => void;

  rfqNeedInvoice: boolean;
  setRfqNeedInvoice: (v: any) => void;
  rfqNeedWaybill: boolean;
  setRfqNeedWaybill: (v: any) => void;
  rfqNeedCert: boolean;
  setRfqNeedCert: (v: any) => void;

  rfqNote: string;
  setRfqNote: (v: string) => void;

  publishRfq: () => Promise<void> | void;
}) {
  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      {/* HEADER */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Text style={[s.modalTitle, { flex: 1, color: D.text }]}>Торги (RFQ)</Text>

        <Pressable
          onPress={closeSheet}
          style={[
            s.smallBtn,
            { borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.06)" },
          ]}
          disabled={rfqBusy}
        >
          <Text style={{ fontWeight: "900", color: D.text }}>Закрыть</Text>
        </Pressable>
      </View>

      {/* POSITIONS */}
      <View
        style={{
          marginTop: 10,
          padding: 10,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.12)",
          borderRadius: 12,
          backgroundColor: "rgba(255,255,255,0.06)",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={{ fontWeight: "900", color: D.text, flex: 1 }}>
            Позиции: {pickedIdsLen}
          </Text>

          <Pressable
            onPress={() => setRfqShowItems((v: any) => !v)}
            style={[
              s.smallBtn,
              { borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.06)" },
            ]}
          >
            <Text style={{ fontWeight: "900", color: D.text }}>
              {rfqShowItems ? "Скрыть" : "Показать"}
            </Text>
          </Pressable>
        </View>

        {rfqShowItems ? (
          <View style={{ marginTop: 8, gap: 6 }}>
            {rfqPickedPreview.map((x) => (
              <Text key={x.id} numberOfLines={1} style={{ color: D.text, fontWeight: "700" }}>
                • {x.title} — {x.qty} {x.uom}
              </Text>
            ))}
            {pickedIdsLen > rfqPickedPreview.length ? (
              <Text style={{ color: D.sub, marginTop: 4, fontWeight: "800" }}>
                + ещё {pickedIdsLen - rfqPickedPreview.length}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>

      {/* SCROLL CONTENT */}
      <ScrollView
        style={{ flex: 1, marginTop: 10 }}
        contentContainerStyle={{ paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* SECTION: СРОКИ */}
        <Text style={[s.modalHelp, { marginTop: 2, color: D.sub, fontWeight: "800" }]}>Сроки</Text>
        <Text style={{ fontWeight: "900", marginBottom: 6, color: D.text }}>
          {fmtLocal(rfqDeadlineIso)}
        </Text>

        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {[6, 12, 24, 48, 72].map((h) => (
            <Pressable
              key={h}
              onPress={() => setDeadlineHours(h)}
              style={[
                s.smallBtn,
                { borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.06)" },
                isDeadlineHoursActive(h) && {
                  backgroundColor: "rgba(34,197,94,0.18)",
                  borderColor: "rgba(34,197,94,0.55)",
                },
              ]}
            >
              <Text style={{ fontWeight: "900", color: D.text }}>{h} ч</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[s.modalHelp, { marginTop: 10, color: D.sub, fontWeight: "800" }]}>
          Срок поставки/исполнения (дней)
        </Text>
        <TextInput
          value={rfqDeliveryDays}
          onChangeText={setRfqDeliveryDays}
          keyboardType="numeric"
          style={[
            s.input,
            { backgroundColor: "rgba(255,255,255,0.06)", color: D.text, borderColor: "rgba(255,255,255,0.12)" },
          ]}
          placeholderTextColor={D.sub}
        />

        {/* SECTION: ДОСТАВКА */}
        <Text style={[s.modalHelp, { marginTop: 14, color: D.sub, fontWeight: "800" }]}>Доставка</Text>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {[
            { k: "delivery", t: "Доставка" },
            { k: "pickup", t: "Самовывоз" },
            { k: "on_site", t: "На объект" },
          ].map((x) => (
            <Pressable
              key={x.k}
              onPress={() => setRfqDeliveryType(x.k)}
              style={[
                s.smallBtn,
                { borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.06)" },
                rfqDeliveryType === (x.k as any) && {
                  backgroundColor: "rgba(34,197,94,0.18)",
                  borderColor: "rgba(34,197,94,0.55)",
                },
              ]}
            >
              <Text style={{ fontWeight: "900", color: D.text }}>{x.t}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[s.modalHelp, { marginTop: 10, color: D.sub, fontWeight: "800" }]}>Город</Text>
        <TextInput
          value={rfqCity}
          onChangeText={(t) => {
            setRfqCity(t);
            if (!rfqCountryCodeTouchedRef?.current) setRfqCountryCode(inferCountryCode(t));
          }}
          placeholder="Бишкек"
          placeholderTextColor={D.sub}
          style={[
            s.input,
            { backgroundColor: "rgba(255,255,255,0.06)", color: D.text, borderColor: "rgba(255,255,255,0.12)" },
          ]}
        />

        <Text style={[s.modalHelp, { color: D.sub, fontWeight: "800" }]}>Адрес поставки</Text>
        <TextInput
          value={rfqAddressText}
          onChangeText={setRfqAddressText}
          placeholder="ул..., дом..., объект..."
          placeholderTextColor={D.sub}
          style={[
            s.input,
            { backgroundColor: "rgba(255,255,255,0.06)", color: D.text, borderColor: "rgba(255,255,255,0.12)" },
          ]}
        />

        <Text style={[s.modalHelp, { color: D.sub, fontWeight: "800" }]}>Окно приёма (пример: 9:00–18:00)</Text>
        <TextInput
          value={rfqDeliveryWindow}
          onChangeText={setRfqDeliveryWindow}
          placeholderTextColor={D.sub}
          style={[
            s.input,
            { backgroundColor: "rgba(255,255,255,0.06)", color: D.text, borderColor: "rgba(255,255,255,0.12)" },
          ]}
        />

        {/* CONTACTS */}
        <Text style={[s.modalHelp, { marginTop: 14, color: D.sub, fontWeight: "800" }]}>Контакты</Text>

        <Text style={[s.modalHelp, { color: D.sub, fontWeight: "800" }]}>Телефон</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={() => {
              if (rfqCountryCodeTouchedRef) rfqCountryCodeTouchedRef.current = true;
              setRfqCountryCode((prev: any) => (prev === "+996" ? "+7" : "+996"));
            }}
            style={[
              s.input,
              {
                minWidth: 92,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(255,255,255,0.06)",
                borderColor: "rgba(255,255,255,0.12)",
              },
            ]}
          >
            <Text style={{ fontWeight: "900", color: D.text }}>{rfqCountryCode}</Text>
          </Pressable>

          <TextInput
            value={rfqPhone}
            onChangeText={(t) => setRfqPhone(String(t).replace(/[^\d]/g, ""))}
            placeholder="номер"
            placeholderTextColor={D.sub}
            keyboardType="phone-pad"
            style={[
              s.input,
              { flex: 1, minWidth: 0, backgroundColor: "rgba(255,255,255,0.06)", color: D.text, borderColor: "rgba(255,255,255,0.12)" },
            ]}
          />
        </View>

        <Text style={{ fontSize: 11, color: D.sub, fontWeight: "800", marginTop: 6 }}>
          Пример: {rfqCountryCode}xxx xxx xxx
        </Text>

        <Text style={[s.modalHelp, { marginTop: 10, color: D.sub, fontWeight: "800" }]}>Email</Text>
        <TextInput
          value={rfqEmail}
          onChangeText={setRfqEmail}
          placeholder="mail@example.com"
          placeholderTextColor={D.sub}
          autoCapitalize="none"
          keyboardType="email-address"
          style={[
            s.input,
            { backgroundColor: "rgba(255,255,255,0.06)", color: D.text, borderColor: "rgba(255,255,255,0.12)" },
          ]}
        />

        <Pressable
          onPress={() => setRfqRememberContacts((v: any) => !v)}
          style={[
            s.smallBtn,
            { marginTop: 10, borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.06)" },
          ]}
        >
          <Text style={{ fontWeight: "900", color: D.text }}>
            {rfqRememberContacts ? "✓ Запомнить контакты" : "Запомнить контакты"}
          </Text>
        </Pressable>

        {/* PARAMETERS */}
        <Text style={[s.modalHelp, { marginTop: 14, color: D.sub, fontWeight: "800" }]}>Параметры</Text>

        <Text style={[s.modalHelp, { color: D.sub, fontWeight: "800" }]}>Видимость</Text>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {[
            { k: "open", t: "Всем" },
            { k: "company_only", t: "Только свои" },
          ].map((x) => (
            <Pressable
              key={x.k}
              onPress={() => setRfqVisibility(x.k)}
              style={[
                s.smallBtn,
                { borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.06)" },
                rfqVisibility === (x.k as any) && {
                  backgroundColor: "rgba(34,197,94,0.18)",
                  borderColor: "rgba(34,197,94,0.55)",
                },
              ]}
            >
              <Text style={{ fontWeight: "900", color: D.text }}>{x.t}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[s.modalHelp, { marginTop: 10, color: D.sub, fontWeight: "800" }]}>Условия оплаты</Text>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {(["cash", "bank", "after", "deferred"] as const).map((k) => (
            <Pressable
              key={k}
              onPress={() => setRfqPaymentTerms(k)}
              style={[
                s.smallBtn,
                { borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.06)" },
                rfqPaymentTerms === k && {
                  backgroundColor: "rgba(34,197,94,0.18)",
                  borderColor: "rgba(34,197,94,0.55)",
                },
              ]}
            >
              <Text style={{ fontWeight: "900", color: D.text }}>
                {k === "cash" ? "Нал" : k === "bank" ? "Безнал" : k === "after" ? "По факту" : "Отсрочка"}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={[s.modalHelp, { marginTop: 10, color: D.sub, fontWeight: "800" }]}>Документы</Text>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <Pressable
            onPress={() => setRfqNeedInvoice((v: any) => !v)}
            style={[
              s.smallBtn,
              { borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.06)" },
              rfqNeedInvoice && { backgroundColor: "rgba(34,197,94,0.18)", borderColor: "rgba(34,197,94,0.55)" },
            ]}
          >
            <Text style={{ fontWeight: "900", color: D.text }}>{rfqNeedInvoice ? "✓ Счёт" : "Счёт"}</Text>
          </Pressable>

          <Pressable
            onPress={() => setRfqNeedWaybill((v: any) => !v)}
            style={[
              s.smallBtn,
              { borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.06)" },
              rfqNeedWaybill && { backgroundColor: "rgba(34,197,94,0.18)", borderColor: "rgba(34,197,94,0.55)" },
            ]}
          >
            <Text style={{ fontWeight: "900", color: D.text }}>{rfqNeedWaybill ? "✓ Накладная" : "Накладная"}</Text>
          </Pressable>

          <Pressable
            onPress={() => setRfqNeedCert((v: any) => !v)}
            style={[
              s.smallBtn,
              { borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.06)" },
              rfqNeedCert && { backgroundColor: "rgba(34,197,94,0.18)", borderColor: "rgba(34,197,94,0.55)" },
            ]}
          >
            <Text style={{ fontWeight: "900", color: D.text }}>{rfqNeedCert ? "✓ Сертификат" : "Сертификат"}</Text>
          </Pressable>
        </View>

        <Text style={[s.modalHelp, { marginTop: 10, color: D.sub, fontWeight: "800" }]}>Комментарий</Text>
        <TextInput
          value={rfqNote}
          onChangeText={setRfqNote}
          multiline
          placeholderTextColor={D.sub}
          style={[
            s.input,
            { minHeight: 90, backgroundColor: "rgba(255,255,255,0.06)", color: D.text, borderColor: "rgba(255,255,255,0.12)" },
          ]}
        />
      </ScrollView>

      {/* FOOTER */}
      <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
        <Pressable
          onPress={closeSheet}
          style={[
            s.smallBtn,
            { flex: 1, alignItems: "center", borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.06)" },
          ]}
          disabled={rfqBusy}
        >
          <Text style={{ fontWeight: "900", color: D.text }}>Отмена</Text>
        </Pressable>

        <Pressable
          disabled={rfqBusy}
          onPress={async () => { await publishRfq(); }}
          style={[
            s.smallBtn,
            { flex: 1, alignItems: "center", backgroundColor: "#22C55E", borderColor: "#22C55E", opacity: rfqBusy ? 0.6 : 1 },
          ]}
        >
          <Text style={{ color: "#0B0F14", fontWeight: "900" }}>
            {rfqBusy ? "Публикуем…" : "Опубликовать"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
export function BuyerReworkSheetBody({
  s,

  rwBusy,
  rwPid,
  rwReason,

  rwItems,
  setRwItems,

  rwInvNumber,
  setRwInvNumber,
  rwInvDate,
  setRwInvDate,
  rwInvAmount,
  setRwInvAmount,
  rwInvCurrency,
  setRwInvCurrency,

  rwInvFile,
  setRwInvFile,
  rwInvUploadedName,
  pickInvoiceFile,

  rwSaveItems,
  rwSendToDirector,
  rwSendToAccounting,
  closeSheet,
}: {
  s: any;

  rwBusy: boolean;
  rwPid: string | null;
  rwReason: string;

  rwItems: any[];
  setRwItems: (up: any) => void;

  rwInvNumber: string;
  setRwInvNumber: (v: string) => void;
  rwInvDate: string;
  setRwInvDate: (v: string) => void;
  rwInvAmount: string;
  setRwInvAmount: (v: string) => void;
  rwInvCurrency: string;
  setRwInvCurrency: (v: string) => void;

  rwInvFile: any | null;
  setRwInvFile: (v: any | null) => void;
  rwInvUploadedName: string;
  pickInvoiceFile: () => Promise<any | null>;

  rwSaveItems: () => Promise<void> | void;
  rwSendToDirector: () => Promise<void> | void;
  rwSendToAccounting: () => Promise<void> | void;
  closeSheet: () => void;
}) {
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 24 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={{ fontSize: 12, color: D.sub, fontWeight: "800" }}>
        {rwPid ? `Документ: #${rwPid.slice(0, 8)}` : "Документ не выбран"}
      </Text>

      {!!rwReason && (
        <View
          style={{
            marginTop: 10,
            padding: 12,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.12)",
            borderRadius: 14,
            backgroundColor: "rgba(255,255,255,0.06)",
          }}
        >
          <Text style={{ fontWeight: "900", color: "#F59E0B" }}>Причина возврата</Text>
          <Text style={{ color: D.text, marginTop: 6, fontWeight: "700" }}>
            {rwReason || "—"}
          </Text>
        </View>
      )}

      <View style={{ marginTop: 10 }}>
        {rwItems.length === 0 ? (
          <Text style={{ color: D.sub, fontWeight: "800" }}>
            {rwBusy ? "Загрузка…" : "Нет строк в предложении"}
          </Text>
        ) : (
          rwItems.map((it: any, idx: number) => (
            <View
              key={`${it.request_item_id}-${idx}`}
              style={{
                marginTop: 10,
                padding: 12,
                borderRadius: 18,
                backgroundColor: "rgba(16,24,38,0.92)",
                borderWidth: 1.25,
                borderColor: "rgba(255,255,255,0.16)",
              }}
            >
              <Text style={{ fontWeight: "900", color: D.text }}>
                {it.name_human || `Позиция ${it.request_item_id}`}
              </Text>

              <Text style={{ color: D.sub, fontWeight: "800", marginTop: 6 }}>
                {`${it.qty ?? "—"} ${it.uom ?? ""}`}
              </Text>

              <TextInput
                placeholder="Цена"
                keyboardType="decimal-pad"
                value={it.price ?? ""}
                onChangeText={(v) =>
                  setRwItems((prev: any[]) =>
                    prev.map((x, i) => (i === idx ? { ...x, price: v } : x))
                  )
                }
                style={[s.input, { marginTop: 10 }]}
              />

              <TextInput
                placeholder="Поставщик"
                value={it.supplier ?? ""}
                onChangeText={(v) =>
                  setRwItems((prev: any[]) =>
                    prev.map((x, i) => (i === idx ? { ...x, supplier: v } : x))
                  )
                }
                style={[s.input, { marginTop: 10 }]}
              />

              <TextInput
                placeholder="Примечание"
                value={it.note ?? ""}
                onChangeText={(v) =>
                  setRwItems((prev: any[]) =>
                    prev.map((x, i) => (i === idx ? { ...x, note: v } : x))
                  )
                }
                multiline
                style={[s.input, { marginTop: 10, minHeight: 70 }]}
              />
            </View>
          ))
        )}
      </View>

      {/* INVOICE (если возврат от бухгалтера) */}
      <View style={{ marginTop: 14 }}>
        <Text style={{ fontSize: 12, color: D.sub, fontWeight: "800" }}>Счёт</Text>

        <TextInput
          placeholder="Номер счёта"
          value={rwInvNumber}
          onChangeText={setRwInvNumber}
          style={[s.input, { marginTop: 6 }]}
        />

        <TextInput
          placeholder="Дата (YYYY-MM-DD)"
          value={rwInvDate}
          onChangeText={setRwInvDate}
          style={[s.input, { marginTop: 6 }]}
        />

        <TextInput
          placeholder="Сумма"
          keyboardType="decimal-pad"
          value={rwInvAmount}
          onChangeText={setRwInvAmount}
          style={[s.input, { marginTop: 6 }]}
        />

        <TextInput
          placeholder="Валюта"
          value={rwInvCurrency}
          onChangeText={setRwInvCurrency}
          style={[s.input, { marginTop: 6 }]}
        />

        <Pressable
          onPress={async () => {
            const f = await pickInvoiceFile();
            if (f) setRwInvFile(f);
          }}
          style={[s.smallBtn, { marginTop: 10 }]}
        >
          <Text style={{ color: D.text, fontWeight: "900" }}>
            {rwInvUploadedName
              ? `Счёт прикреплён: ${rwInvUploadedName}`
              : "Прикрепить счёт"}
          </Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
        <WideActionButton
          label="Сохранить"
          variant="blue"
          disabled={rwBusy}
          onPress={rwSaveItems}
        />

        <WideActionButton
          label="Директору"
          variant="green"
          disabled={rwBusy}
          onPress={rwSendToDirector}
        />
      </View>

      <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
        <WideActionButton
          label="Бухгалтеру"
          variant="green"
          disabled={rwBusy}
          onPress={rwSendToAccounting}
        />

        <WideActionButton
          label="Закрыть"
          variant="neutral"
          disabled={rwBusy}
          onPress={closeSheet}
        />
      </View>
    </ScrollView>
  );
}
export function SheetFooterActions({
  s,
  left,
  center,
  right,
}: {
  s: any;
  left?: React.ReactNode;
  center?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <View style={s.reqActionsBottom}>
      <View style={{ width: 52, height: 52 }}>{left ?? null}</View>

      <View style={{ width: 8 }} />

      <View style={{ flex: 1, minWidth: 0 }}>{center ?? null}</View>

      <View style={{ width: 8 }} />

      <View style={{ width: 52, height: 52 }}>{right ?? null}</View>
    </View>
  );
}

export function BuyerAttachmentsSticky({
  s,
  creating,
  kbOpen,

  needAttachWarn,
  showAttachBlock,
  setShowAttachBlock,

  requiredSuppliers,
  missingAttachSuppliers,
  attachMissingCount,
  attachFilledCount,
  attachSlotsTotal,

  pickedIdsLen,

  attachments,
  setAttachments,
}: {
  s: any;
  creating: boolean;
  kbOpen: boolean;

  needAttachWarn: boolean;
  showAttachBlock: boolean;
  setShowAttachBlock: (v: boolean | ((prev: boolean) => boolean)) => void;

  requiredSuppliers: string[];
  missingAttachSuppliers: string[];
  attachMissingCount: number;
  attachFilledCount: number;
  attachSlotsTotal: number;

  pickedIdsLen: number;

  attachments: DraftAttachmentMap;
  setAttachments: (updater: any) => void;
}) {
  const warn = needAttachWarn;

  return (
    <View style={{ backgroundColor: D.cardBg, paddingTop: 6, paddingBottom: 8 }}>
      <Pressable
        onPress={() => {
          if (kbOpen) return;
          if (warn) setShowAttachBlock(true);
          else setShowAttachBlock((v) => !v);
        }}
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 14,
            backgroundColor: "rgba(255,255,255,0.04)",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.10)",
          },
          warn && {
            borderColor: "rgba(239,68,68,0.55)",
            backgroundColor: "rgba(239,68,68,0.08)",
          },
        ]}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
          <Text style={{ fontWeight: "900", color: UI.text }} numberOfLines={1}>
            Вложения (для директора)
          </Text>

          {warn ? (
            <View style={s.warnPill}>
              <View style={s.warnDot} />
              <Text style={s.warnPillText}>нет: {attachMissingCount}</Text>
            </View>
          ) : null}
        </View>

        <Text style={{ fontWeight: "900", color: warn ? "#FCA5A5" : UI.sub }}>
          {attachFilledCount}/{attachSlotsTotal} {showAttachBlock ? "▲" : "▼"}
        </Text>
      </Pressable>

      {showAttachBlock && !kbOpen ? (
        <View style={{ marginTop: 10, gap: 8 }}>
          {requiredSuppliers.map((label) => {
            const k = normName(label) || SUPP_NONE;
            const rowWarn = pickedIdsLen > 0 && !attachments?.[k]?.file;

            return (
              <View
                key={k}
                style={[
                  { borderRadius: 14, padding: 2 },
                  rowWarn && {
                    borderWidth: 1,
                    borderColor: "rgba(239,68,68,0.55)",
                    backgroundColor: "rgba(239,68,68,0.06)",
                  },
                ]}
              >
                <AttachmentUploaderAny
                  s={s}
                  label={label}
                  disabled={creating}
                  current={attachments?.[k]}
                  onPick={(att) => {
                    setAttachments((prev: any) => {
                      const next = { ...prev };
                      if (att) next[k] = att;
                      else delete next[k];
                      return next;
                    });
                  }}
                />
              </View>
            );
          })}

          {warn ? (
            <Text style={{ marginTop: 6, color: "#FCA5A5", fontWeight: "900" }} numberOfLines={2}>
              Нет вложений для: {missingAttachSuppliers.slice(0, 3).join(", ")}
              {missingAttachSuppliers.length > 3 ? " …" : ""}
            </Text>
          ) : (
            <Text style={{ marginTop: 6, color: UI.sub, fontWeight: "800" }} numberOfLines={2}>
              Файлы прикрепятся к предложениям соответствующих поставщиков.
            </Text>
          )}
        </View>
      ) : null}
    </View>
  );
}
export function BuyerPropDetailsSheetBody({
  s,
  propViewBusy,
  propViewLines,
  isReqContextNote,
  extractReqContextLines,

  // ✅ attachments
  propAttBusy,
  propAttErr,
  attachments,
  onReloadAttachments,
  onAttachFile,
  onOpenAttachment,
}: {
  s: any;
  propViewBusy: boolean;
  propViewLines: any[];
  isReqContextNote: (raw: string) => boolean;
  extractReqContextLines: (raw: string, limit?: number) => string[];

  propAttBusy: boolean;
  propAttErr: string;
  attachments: any[];
  onReloadAttachments: () => void;
  onAttachFile: () => void;
  onOpenAttachment: (att: any) => void;
}) {
  if (propViewBusy) {
    return (
      <View style={{ padding: 18 }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!propViewLines?.length) {
    return (
      <Text style={{ color: D.sub, padding: 16, fontWeight: "800" }}>
        Позиции не найдены
      </Text>
    );
  }

  return (
    <View style={{ flex: 1, minHeight: 0 }}>
      {/* контекст */}
      {(() => {
        const anyLine = (propViewLines || []).find((x: any) => !!x?.note) as any;
        const raw = String(anyLine?.note ?? "").trim();

        const ctxLines = raw && isReqContextNote(raw) ? extractReqContextLines(raw, 5) : [];
        const supplier = String((propViewLines || []).find((x: any) => x?.supplier)?.supplier ?? "").trim();

        if (!ctxLines.length && !supplier) return null;

        return (
          <View style={[s.reqNoteBox, { marginTop: 6, marginBottom: 12 }]}>
            {ctxLines.map((t, idx) => (
              <Text key={idx} style={s.reqNoteLine} numberOfLines={1}>
                {t}
              </Text>
            ))}

            {supplier ? (
              <Text style={[s.reqNoteLine, { fontWeight: "900" }]} numberOfLines={1}>
                Поставщик: {supplier}
              </Text>
            ) : null}
          </View>
        );
      })()}

      {/* ✅ Вложения */}
      <View style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={{ fontWeight: "900", color: D.text, flex: 1 }}>
            Вложения
          </Text>

          <Pressable
            onPress={onReloadAttachments}
            disabled={propAttBusy}
            style={[
              s.smallBtn,
              { borderColor: "rgba(255,255,255,0.18)", backgroundColor: "rgba(255,255,255,0.06)" },
            ]}
          >
            <Text style={{ color: D.text, fontWeight: "900" }}>
              {propAttBusy ? "…" : "Обновить"}
            </Text>
          </Pressable>

          <Pressable
            onPress={onAttachFile}
            disabled={propAttBusy}
            style={[s.smallBtn, { backgroundColor: "#2563eb", borderColor: "#2563eb" }]}
          >
            <Text style={{ color: "#fff", fontWeight: "900" }}>+ Файл</Text>
          </Pressable>
        </View>

        {!!propAttErr ? (
          <Text style={{ marginTop: 6, color: "#FCA5A5", fontWeight: "900" }} numberOfLines={2}>
            {propAttErr}
          </Text>
        ) : null}

        {attachments?.length ? (
          <View style={{ marginTop: 8, gap: 6 }}>
            {attachments.slice(0, 10).map((a: any, idx: number) => (
              <Pressable
                key={a?.id ?? `${a?.file_name ?? "f"}:${idx}`}
                onPress={() => onOpenAttachment(a)}
                style={{
                  padding: 10,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.12)",
                  backgroundColor: "rgba(255,255,255,0.06)",
                }}
              >
                <Text style={{ color: D.text, fontWeight: "900" }} numberOfLines={1}>
                  {String(a?.file_name ?? "Файл")}
                </Text>

                <Text style={{ color: D.sub, fontWeight: "800", marginTop: 4 }} numberOfLines={1}>
                  {a?.created_at ? new Date(a.created_at).toLocaleString() : ""}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={{ marginTop: 8, color: D.sub, fontWeight: "800" }}>
            Пока нет вложений
          </Text>
        )}
      </View>

      {/* позиции */}
      <FlatList
        data={propViewLines}
        keyExtractor={(ln, idx) => `${String(ln?.request_item_id ?? "x")}:${idx}`}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 16 }}
        renderItem={({ item: ln }) => {
          const noteRaw = String(ln?.note ?? "").trim();
          const hideNote = isReqContextNote(noteRaw);

          return (
            <View style={s.dirMobCard}>
              <View style={s.dirMobMain}>
                <Text style={[s.dirMobTitle, { color: D.text }]} numberOfLines={3}>
                  {ln?.name_human ||
                    ln?.rik_code ||
                    `Позиция ${String(ln?.request_item_id || "").slice(0, 6)}`}
                </Text>

                <Text style={[s.dirMobMeta, { color: D.sub }]} numberOfLines={2}>
                  {`${Number(ln?.qty ?? 0)} ${ln?.uom ?? ""}`.trim()}
                  {` · Цена: ${ln?.price ?? "—"}`}
                </Text>

                {!hideNote && noteRaw ? (
                  <Text style={[s.dirMobNote, { color: D.text }]} numberOfLines={3}>
                    Прим.: {noteRaw}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}
export function BuyerInboxSheetBody({
  s,

  sheetGroup,
  sheetData,

  kbOpen,
  creating,

  // attachments block state
  needAttachWarn,
  showAttachBlock,
  setShowAttachBlock,
  requiredSuppliers,
  missingAttachSuppliers,
  attachMissingCount,
  attachFilledCount,
  attachSlotsTotal,
  pickedIdsLen,
  attachments,
  setAttachments,

  // row renderer
  renderItemRow,

  // footer
  footer,
}: {
  s: any;

  sheetGroup: any; // Group
  sheetData: any[];

  kbOpen: boolean;
  creating: boolean;

  needAttachWarn: boolean;
  showAttachBlock: boolean;
  setShowAttachBlock: (v: boolean | ((p: boolean) => boolean)) => void;

  requiredSuppliers: string[];
  missingAttachSuppliers: string[];
  attachMissingCount: number;
  attachFilledCount: number;
  attachSlotsTotal: number;

  pickedIdsLen: number;
  attachments: any;
  setAttachments: (up: any) => void;

  renderItemRow: (it: any, idx2: number) => React.ReactNode;

  footer?: React.ReactNode;
}) {
  return (
    <View style={s.sheetSection}>
      <FlatList
        data={sheetData as any[]}
        stickyHeaderIndices={[1]} // 0 = ListHeaderComponent, 1 = first data item ("attachments")
        keyExtractor={(item: any, idx: number) => {
          if (item?.__kind === "attachments") return "hdr:attachments";
          return item?.request_item_id
            ? `ri:${item.request_item_id}`
            : `f:${String(sheetGroup?.request_id ?? "x")}:${idx}`;
        }}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 12 + 86 }}
        ListHeaderComponent={
          <View>
            {!kbOpen ? (
              (() => {
                const headerNote = String((sheetGroup?.items || []).find((x: any) => x?.note)?.note || "").trim();

                if (headerNote) {
                  const lines = headerNote
                    .split(";")
                    .map((x) => x.trim())
                    .filter(Boolean)
                    .slice(0, 5);

                  if (!lines.length) return null;

                  return (
                    <View style={s.reqNoteBox}>
                      {lines.map((t, i) => (
                        <Text key={i} style={s.reqNoteLine} numberOfLines={1}>
                          {t}
                        </Text>
                      ))}
                    </View>
                  );
                }

                const any0 = (sheetGroup?.items || [])[0] as any;
                const metaLines = [
                  any0?.object_name ? `Объект: ${any0.object_name}` : null,
                  any0?.level_code ? `Этаж/уровень: ${any0.level_code}` : null,
                  any0?.system_code ? `Система: ${any0.system_code}` : null,
                  any0?.zone_code ? `Зона: ${any0.zone_code}` : null,
                ].filter(Boolean) as string[];

                if (!metaLines.length) return null;

                return (
                  <View style={s.reqNoteBox}>
                    {metaLines.map((t, i) => (
                      <Text key={i} style={s.reqNoteLine} numberOfLines={1}>
                        {t}
                      </Text>
                    ))}
                  </View>
                );
              })()
            ) : null}
          </View>
        }
        renderItem={({ item, index }: any) => {
          // ✅ STICKY “Вложения”
          if (item?.__kind === "attachments") {
            return (
              <BuyerAttachmentsSticky
                s={s}
                creating={creating}
                kbOpen={kbOpen}
                needAttachWarn={needAttachWarn}
                showAttachBlock={showAttachBlock}
                setShowAttachBlock={setShowAttachBlock}
                requiredSuppliers={requiredSuppliers}
                missingAttachSuppliers={missingAttachSuppliers}
                attachMissingCount={attachMissingCount}
                attachFilledCount={attachFilledCount}
                attachSlotsTotal={attachSlotsTotal}
                pickedIdsLen={pickedIdsLen}
                attachments={attachments}
                setAttachments={setAttachments}
              />
            );
          }

          // ✅ обычные позиции
          const realIndex = index - 1; // index=0 attachments, дальше позиции
          return <View style={{ marginBottom: 10 }}>{renderItemRow(item, realIndex)}</View>;
        }}
      />

      {/* footer */}
      {footer ?? null}
    </View>
  );
}
