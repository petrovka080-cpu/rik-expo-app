import React from "react";
import { View, Text, Pressable, Alert, Platform } from "react-native";
import { UI } from "../buyerUi";
import type { Attachment } from "../buyer.types";
import type { StylesBag } from "./component.types";
import { normalizeNativePickedFile } from "../../../lib/filePick";

function normalizeErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message) return message;
  }

  if (typeof error === "string") {
    const message = error.trim();
    if (message) return message;
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    for (const key of ["message", "error", "details", "hint", "code"] as const) {
      const value = String(record[key] ?? "").trim();
      if (value) return value;
    }
    try {
      const json = JSON.stringify(error);
      if (json && json !== "{}") return json;
    } catch {}
  }

  return fallback;
}

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
            try {
              input.remove();
            } catch {}
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
      const file = normalizeNativePickedFile(res);
      if (!file) {
        throw new Error("Не удалось получить данные выбранного файла");
      }

      onPick({ name: file.name, file });
    } catch (e: unknown) {
      Alert.alert("Вложение", normalizeErrorMessage(e, "Не удалось выбрать файл"));
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
