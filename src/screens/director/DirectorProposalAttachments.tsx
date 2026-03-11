import React from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { supabase } from "../../lib/supabaseClient";
import { UI } from "./director.styles";
import { type ProposalAttachmentRow } from "./director.types";

type Props = {
  files: ProposalAttachmentRow[];
  busyAtt: boolean;
  error?: string;
  onRefresh: () => void;
  onOpenUrl: (url: string, fileName: string) => void;
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

async function resolveAttachmentUrl(file: ProposalAttachmentRow) {
  const bucketId = String(file.bucket_id || "").trim();
  const storagePath = String(file.storage_path || "").trim();

  if (!bucketId || !storagePath) {
    throw new Error("Attachment corrupted");
  }

  const signed = await supabase.storage.from(bucketId).createSignedUrl(storagePath, 60 * 60);
  if (!signed.error && signed.data?.signedUrl) {
    return signed.data.signedUrl;
  }

  const publicUrl = supabase.storage.from(bucketId).getPublicUrl(storagePath).data.publicUrl;
  if (publicUrl) return publicUrl;

  throw signed.error ?? new Error("Не удалось получить ссылку на файл");
}

export default function DirectorProposalAttachments({
  files,
  busyAtt,
  error,
  onRefresh,
  onOpenUrl,
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
      ) : error ? (
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
      ) : files.length === 0 ? (
        <Text style={{ color: UI.sub, fontWeight: "800", marginTop: 8 }}>
          Нет вложений.
        </Text>
      ) : (
        <View style={{ marginTop: 8 }}>
          {files.map((file, idx) => {
            const corrupted =
              !String(file.bucket_id || "").trim() ||
              !String(file.storage_path || "").trim();
            const createdAt = formatCreatedAt(file.created_at);

            return (
              <Pressable
                key={`${file.id}:${idx}`}
                disabled={corrupted}
                onPress={async () => {
                  if (corrupted) {
                    Alert.alert("Вложение", "Attachment corrupted");
                    return;
                  }

                  try {
                    const fileUrl = await resolveAttachmentUrl(file);
                    onOpenUrl(fileUrl, String(file.file_name || "file"));
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
                  {createdAt ? ` · ${createdAt}` : ""}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
