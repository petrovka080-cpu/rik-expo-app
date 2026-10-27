import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import IconSquareButton from "../../../ui/IconSquareButton";
import { UI, s } from "../warehouse.styles";
import { uomLabelRu } from "../warehouse.uom";
import type { ReqPickLine } from "../warehouse.types";

const COPY = {
  close: "\u0417\u0430\u043a\u0440\u044b\u0442\u044c",
  object: "\u041e\u0431\u044a\u0435\u043a\u0442",
  level: "\u042d\u0442\u0430\u0436/\u0443\u0440\u043e\u0432\u0435\u043d\u044c",
  system: "\u0421\u0438\u0441\u0442\u0435\u043c\u0430",
  zone: "\u0417\u043e\u043d\u0430",
  contractor: "\u041f\u043e\u0434\u0440\u044f\u0434\u0447\u0438\u043a",
  phone: "\u0422\u0435\u043b\u0435\u0444\u043e\u043d",
  volume: "\u041e\u0431\u044a\u0451\u043c",
  cartCount: "\u0412 \u043a\u043e\u0440\u0437\u0438\u043d\u0435",
  itemFallback: "\u041f\u043e\u0437\u0438\u0446\u0438\u044f",
  removeFromCart: "\u0423\u0431\u0440\u0430\u0442\u044c \u0438\u0437 \u043a\u043e\u0440\u0437\u0438\u043d\u044b",
  submitSelected: "\u0412\u044b\u0434\u0430\u0442\u044c \u0432\u044b\u0431\u0440\u0430\u043d\u043d\u043e\u0435",
} as const;

export function CloseSquare({
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
      accessibilityLabel={accessibilityLabel || COPY.close}
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

export const ReqIssueHeadCard = React.memo(function ReqIssueHeadCard({
  headObj,
  headLevel,
  headSystem,
  headZone,
  headContractor,
  headPhone,
  headVolume,
  headAccentColor,
}: {
  headObj: string;
  headLevel: string;
  headSystem: string;
  headZone: string;
  headContractor: string;
  headPhone: string;
  headVolume: string;
  headAccentColor: string;
}) {
  return (
    <View style={[reqIssueModalStyles.headCard, { borderLeftColor: headAccentColor }]}>
      {!!headObj ? (
        <Text style={reqIssueModalStyles.headText}>
          {`${COPY.object}: ${headObj}`}
        </Text>
      ) : null}
      {!!headLevel ? (
        <Text style={reqIssueModalStyles.headText}>
          {`${COPY.level}: ${headLevel}`}
        </Text>
      ) : null}
      {!!headSystem ? (
        <Text style={reqIssueModalStyles.headText}>
          {`${COPY.system}: ${headSystem}`}
        </Text>
      ) : null}
      {!!headZone ? (
        <Text style={reqIssueModalStyles.headTextLast}>
          {`${COPY.zone}: ${headZone}`}
        </Text>
      ) : null}
      {!!headContractor ? (
        <Text style={reqIssueModalStyles.headText}>
          {`${COPY.contractor}: ${headContractor}`}
        </Text>
      ) : null}
      {!!headPhone ? (
        <Text style={reqIssueModalStyles.headText}>
          {`${COPY.phone}: ${headPhone}`}
        </Text>
      ) : null}
      {!!headVolume ? (
        <Text style={reqIssueModalStyles.headTextLast}>
          {`${COPY.volume}: ${headVolume}`}
        </Text>
      ) : null}
    </View>
  );
});

export const ReqIssueCartFooter = React.memo(function ReqIssueCartFooter({
  reqPickLines,
  reqPickCount,
  recipientText,
  issueBusy,
  removeReqPickLine,
  submitReqPick,
}: {
  reqPickLines: ReqPickLine[];
  reqPickCount: number;
  recipientText: string;
  issueBusy: boolean;
  removeReqPickLine: (requestItemId: string) => void;
  submitReqPick: () => void;
}) {
  const canSubmit = !issueBusy && reqPickCount > 0 && !!recipientText.trim();

  return (
    <View style={reqIssueModalStyles.cartFooter}>
      <Text style={reqIssueModalStyles.cartSummaryText}>
        {COPY.cartCount}: {reqPickCount}
      </Text>

      {reqPickLines.slice(0, 8).map((ln) => (
        <View
          key={ln.request_item_id}
          style={reqIssueModalStyles.cartRow}
        >
          <View style={reqIssueModalStyles.flexContent}>
            <Text style={reqIssueModalStyles.cartItemTitle} numberOfLines={1}>
              {String(ln.name_human || COPY.itemFallback)}
            </Text>
            <Text style={reqIssueModalStyles.cartItemMeta} numberOfLines={1}>
              {`${uomLabelRu(ln.uom)} \u00b7 ${String(ln.qty ?? "0")}`}
            </Text>
          </View>

          <CloseSquare
            onPress={() => removeReqPickLine(ln.request_item_id)}
            accessibilityLabel={COPY.removeFromCart}
            size={44}
            iconSize={20}
          />
        </View>
      ))}

      <View style={reqIssueModalStyles.cartActions}>
        <Pressable
          testID="warehouse-req-submit"
          accessibilityLabel="warehouse-req-submit"
          onPress={() => submitReqPick()}
          disabled={!canSubmit}
          style={[
            s.openBtn,
            {
              borderColor: UI.accent,
              opacity: canSubmit ? 1 : 0.45,
            },
          ]}
        >
          <Text style={s.openBtnText}>{issueBusy ? "..." : COPY.submitSelected}</Text>
        </Pressable>
      </View>
    </View>
  );
});

export const reqIssueModalStyles = StyleSheet.create({
  cartFooter: {
    marginTop: 12,
    paddingBottom: 12,
  },
  cartSummaryText: {
    color: UI.sub,
    fontWeight: "900",
  },
  cartRow: {
    marginTop: 8,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  flexContent: {
    flex: 1,
    minWidth: 0,
  },
  cartItemTitle: {
    color: UI.text,
    fontWeight: "900",
  },
  cartItemMeta: {
    color: UI.sub,
    fontWeight: "800",
  },
  cartActions: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  modal: {
    margin: 0,
    justifyContent: "flex-end",
  },
  sheet: {
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
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginBottom: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  title: {
    flex: 1,
    color: UI.text,
    fontWeight: "900",
    fontSize: 18,
  },
  headCard: {
    marginTop: 8,
    marginBottom: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    borderLeftWidth: 4,
  },
  headText: {
    color: UI.text,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  headTextLast: {
    color: UI.text,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 0,
  },
  loadingText: {
    color: UI.sub,
    fontWeight: "800",
  },
  emptyText: {
    color: UI.sub,
    fontWeight: "800",
    paddingTop: 12,
  },
  messageBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  messageText: {
    color: UI.text,
    fontWeight: "900",
  },
});
