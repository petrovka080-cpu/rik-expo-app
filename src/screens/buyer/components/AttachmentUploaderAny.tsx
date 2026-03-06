import React from "react";
import { View, Text, Pressable, Alert, Platform } from "react-native";
import { UI } from "../buyerUi";
import type { Attachment } from "../buyer.types";
import type { StylesBag } from "./component.types";

export function AttachmentUploaderAny({
  label,
  onPick,
  current,
  disabled,
  accept = ".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx",
  s,
}: {
  label: string;
  onPick: (att: Attachment | null) => void;
  current?: Attachment;
  disabled?: boolean;
  accept?: string;
  s: StylesBag;
}) {
  const pick = async () => {
    if (disabled) return;

    try {
      if (Platform.OS === "web") {
        const f = await new Promise<File | null>((resolve) => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = accept;
          input.onchange = () => {
            const file = (input.files && input.files[0]) || null;
            try { input.remove(); } catch { }
            resolve(file);
          };
          input.click();
        });

        if (!f) return;
        onPick({ name: f.name, file: f });
        return;
      }

      const DocPicker = await import("expo-document-picker");
      const res = await DocPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: "*/*",
      });

      if (res?.canceled) return;
      const f = res?.assets?.[0] ?? null;
      if (!f) return;

      const name = String(f?.name ?? `file_${Date.now()}`).trim();
      onPick({ name, file: f });
    } catch (e: unknown) {
      Alert.alert("Вложение", (e as { message?: string } | null)?.message ?? "Не удалось выбрать файл");
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
