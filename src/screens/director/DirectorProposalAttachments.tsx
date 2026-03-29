import React from "react";
import { Alert, Pressable, Text, View } from "react-native";

import { UI } from "./director.styles";
import { type ProposalAttachmentRow } from "./director.types";

type Props = {
  files: ProposalAttachmentRow[];
  busyAtt: boolean;
  error?: string;
  onRefresh: () => void;
  onOpenAttachment: (file: ProposalAttachmentRow) => void;
};

function formatCreatedAt(value?: string | null) {
  const iso = String(value || "").trim();
  if (!iso) return "";

  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;

  try {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(parsed);
  } catch {
    return parsed.toISOString();
  }
}

export default function DirectorProposalAttachments({
  files,
  busyAtt,
  error,
  onRefresh,
  onOpenAttachment,
}: Props) {
  return (
    <View style={{ marginTop: 6, marginBottom: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ color: UI.text, fontWeight: "900" }}>
          Вложения: {files.length}
        </Text>

        <Pressable
          disabled={busyAtt}
          onPress={onRefresh}
          style={{
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.18)",
            backgroundColor: "rgba(255,255,255,0.06)",
            opacity: busyAtt ? 0.6 : 1,
          }}
        >
          <Text style={{ color: UI.text, fontWeight: "900", fontSize: 12 }}>
            {busyAtt ? "..." : "Обновить"}
          </Text>
        </Pressable>
      </View>

      {busyAtt ? (
        <Text style={{ color: UI.sub, fontWeight: "800", marginTop: 8 }}>
          Загружаю вложения...
        </Text>
      ) : error && files.length === 0 ? (
        <View
          style={{
            marginTop: 8,
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "rgba(255,120,120,0.35)",
            backgroundColor: "rgba(120,0,0,0.18)",
          }}
        >
          <Text style={{ color: "#FFD2D2", fontWeight: "900" }}>
            Не удалось загрузить вложения
          </Text>
          <Text style={{ color: "#FFD2D2", marginTop: 4 }}>
            {error}
          </Text>
        </View>
      ) : error ? (
        <View
          style={{
            marginTop: 8,
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "rgba(253,224,71,0.35)",
            backgroundColor: "rgba(120,90,0,0.16)",
          }}
        >
          <Text style={{ color: "#FDE68A", fontWeight: "900" }}>
            Вложения загружены в degraded mode
          </Text>
          <Text style={{ color: "#FDE68A", marginTop: 4 }}>
            {error}
          </Text>
        </View>
      ) : files.length === 0 ? (
        <Text style={{ color: UI.sub, fontWeight: "800", marginTop: 8 }}>
          Нет вложений.
        </Text>
      ) : (
        <View style={{ marginTop: 8 }}>
          {files.map((file, idx) => {
            const hasDirectUrl = !!String(file.url || "").trim();
            const hasBucket = !!String(file.bucket_id || "").trim();
            const hasStoragePath = !!String(file.storage_path || "").trim();
            const corrupted = !hasDirectUrl && (!hasBucket || !hasStoragePath);
            const createdAt = formatCreatedAt(file.created_at);

            return (
              <Pressable
                key={`${file.id}:${idx}`}
                disabled={corrupted}
                onPress={() => {
                  if (corrupted) {
                    Alert.alert("Вложение", "Attachment corrupted");
                    return;
                  }

                  try {
                    onOpenAttachment(file);
                  } catch (openError: unknown) {
                    const message =
                      openError instanceof Error && openError.message.trim()
                        ? openError.message.trim()
                        : "Не удалось открыть вложение";
                    Alert.alert("Вложение", message);
                  }
                }}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: corrupted ? "rgba(255,120,120,0.35)" : "rgba(255,255,255,0.18)",
                  backgroundColor: corrupted ? "rgba(120,0,0,0.14)" : "rgba(255,255,255,0.06)",
                  marginBottom: 8,
                  opacity: corrupted ? 0.85 : 1,
                }}
              >
                <Text style={{ color: UI.text, fontWeight: "900" }} numberOfLines={1}>
                  {file.group_key ? `${file.group_key}: ` : ""}
                  {file.file_name}
                </Text>
                <Text style={{ color: UI.sub, marginTop: 4 }} numberOfLines={1}>
                  {corrupted ? "Attachment corrupted" : "Открыть / скачать"}
                  {createdAt ? ` В· ${createdAt}` : ""}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
