import React from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { UI } from "./director.styles";
import { type ProposalAttachmentRow } from "./director.types";

type Props = {
  files: ProposalAttachmentRow[];
  busyAtt: boolean;
  onRefresh: () => void;
  onOpenUrl: (url: string, fileName: string) => void;
};

export default function DirectorProposalAttachments({
  files,
  busyAtt,
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
            {busyAtt ? "…" : "Обновить"}
          </Text>
        </Pressable>
      </View>

      {busyAtt ? (
        <Text style={{ color: UI.sub, fontWeight: "800", marginTop: 8 }}>
          Загружаю вложения…
        </Text>
      ) : files.length === 0 ? (
        <Text style={{ color: UI.sub, fontWeight: "800", marginTop: 8 }}>
          Нет вложений (либо не прикреплены, либо RLS не пускает).
        </Text>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}>
          {files.map((f, idx) => (
            <Pressable
              key={`${f.id}:${idx}`}
              onPress={() => {
                const url = String(f.url || "").trim();
                if (!url) {
                  Alert.alert("Вложение", "URL пустой");
                  return;
                }
                onOpenUrl(url, String(f.file_name ?? "file"));
              }}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.18)",
                backgroundColor: "rgba(255,255,255,0.06)",
                marginRight: 8,
                marginBottom: 8,
              }}
            >
              <Text style={{ color: UI.text, fontWeight: "900" }} numberOfLines={1}>
                {f.group_key ? `${f.group_key}: ` : ""}{f.file_name}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
