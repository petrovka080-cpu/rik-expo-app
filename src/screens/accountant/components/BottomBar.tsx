import React from "react";
import { Alert, Platform, Pressable, Text, View } from "react-native";
import DeleteAllButton from "../../../ui/DeleteAllButton";
import SendPrimaryButton from "../../../ui/SendPrimaryButton";
import { UI } from "../ui";

export default function BottomBar({
  visible,
  insetsBottom,
  isReadOnlyTab,
  busyKey,
  canPayUi,
  onReturnToBuyer,
  onOpenPdf,
  onExcel,
  onPay,
  runAction,
}: {
  visible: boolean;
  insetsBottom: number;
  isReadOnlyTab: boolean;
  busyKey: string | null;
  canPayUi: boolean;
  onReturnToBuyer: () => Promise<void>;
  onOpenPdf: () => Promise<void>;
  onExcel: () => void;
  onPay: () => Promise<void>;
  runAction: (key: string, fn: () => Promise<void>) => Promise<void>;
}) {
  if (!visible) return null;

  return (
    <View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 12,
        paddingBottom: Math.max(insetsBottom || 0, 10) + 10,
        paddingTop: 10,
        backgroundColor: UI.bg,
        borderTopWidth: 1,
        borderColor: "rgba(255,255,255,0.10)",
      }}
    >
      <View
        style={{
          marginTop: 12,
          flexDirection: "row",
          alignItems: "center",
          padding: 10,
          borderRadius: 18,
          backgroundColor: "rgba(255,255,255,0.04)",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.10)",
          opacity: isReadOnlyTab ? 0.85 : 1,
        }}
      >
        <View style={{ width: 52, height: 52, opacity: (isReadOnlyTab || !!busyKey) ? 0.55 : 1 }}>
          <DeleteAllButton
            disabled={isReadOnlyTab || !!busyKey}
            loading={busyKey === "return_to_buyer_bar"}
            accessibilityLabel="Вернуть на доработку"
            onPress={async () => {
              const ok =
                Platform.OS === "web"
                  ? window.confirm("Вернуть на доработку снабженцу?")
                  : await new Promise<boolean>((resolve) => {
                      Alert.alert(
                        "Вернуть на доработку?",
                        "Отправить предложение на доработку снабженцу?",
                        [
                          { text: "Отмена", style: "cancel", onPress: () => resolve(false) },
                          { text: "Вернуть", style: "destructive", onPress: () => resolve(true) },
                        ]
                      );
                    });

              if (!ok) return;

              await runAction("return_to_buyer_bar", async () => {
                await onReturnToBuyer();
              });
            }}
          />
        </View>

        <View style={{ width: 8 }} />

        <Pressable
          disabled={!!busyKey}
          onPress={() => runAction("bar_pdf", async () => { await onOpenPdf(); })}
          style={{
            flex: 1,
            minWidth: 0,
            height: 52,
            borderRadius: 16,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: UI.btnNeutral,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.14)",
            opacity: busyKey ? 0.6 : 1,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "900" }}>PDF</Text>
        </Pressable>

        <View style={{ width: 8 }} />

        <Pressable
          disabled={!!busyKey}
          onPress={onExcel}
          style={{
            flex: 1,
            minWidth: 0,
            height: 52,
            borderRadius: 16,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: UI.btnNeutral,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.14)",
            opacity: busyKey ? 0.6 : 1,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "900" }}>Excel</Text>
        </Pressable>

        <View style={{ width: 8 }} />

        <View style={{ width: 52, height: 52, opacity: (!canPayUi) ? 0.55 : 1 }}>
          <SendPrimaryButton
            variant="green"
            disabled={!canPayUi}
            loading={busyKey === "bar_pay"}
            accessibilityLabel="Провести оплату"
            onPress={() => runAction("bar_pay", async () => { await onPay(); })}
          />
        </View>
      </View>
    </View>
  );
}
