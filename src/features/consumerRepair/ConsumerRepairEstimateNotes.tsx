import React from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import type { ConsumerRepairDraftBundle } from "../../lib/consumerRequests/consumerRequestTypes";
import { consumerRepairCanonicalBackendBinding } from "./consumerRepairBackendOwnership";

export function ConsumerRepairEstimateNotes(props: {
  bundle: ConsumerRepairDraftBundle;
  busy: boolean;
  onSave: (input: { draftId: string; revisionId: string | null; text: string; deleteCommentId?: string }) => Promise<boolean>;
  onClose: () => void;
}) {
  const [text, setText] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const inFlight = React.useRef(false);
  const busy = props.busy || saving;
  const revisionId = consumerRepairCanonicalBackendBinding(props.bundle)?.revisionId ?? null;
  const notes = (props.bundle.estimateComments ?? []).filter(note => !note.deleted
    && note.ownerUserId === props.bundle.draft.consumerUserId && note.estimateId === props.bundle.draft.id
    && note.revisionId === revisionId);
  const save = async (deleteCommentId?: string) => {
    if (inFlight.current || props.busy) return;
    inFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      if (await props.onSave({ draftId: props.bundle.draft.id, revisionId, text, deleteCommentId })) {
        if (!deleteCommentId) setText("");
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Заметка не сохранена."); }
    finally { inFlight.current = false; setSaving(false); }
  };
  return <Modal visible transparent animationType="fade" onRequestClose={props.onClose}>
    <View style={{ flex: 1, justifyContent: "center", padding: 20, backgroundColor: "rgba(0,0,0,0.35)" }}>
      <View style={{ backgroundColor: "white", borderRadius: 12, padding: 20, gap: 14, maxHeight: "85%" }}>
        <Text accessibilityRole="header" style={{ fontSize: 20, fontWeight: "600" }}>Заметки к смете</Text>
        <Text>Заметки сохраняются в этом черновике отдельно от состава и стоимости.</Text>
        <ScrollView style={{ maxHeight: 240 }}>
          {notes.map(note => <View key={note.id} style={{ paddingVertical: 10, gap: 8 }}>
            <Text>{note.text}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`Удалить заметку: ${note.text}`}
              disabled={busy} onPress={() => { void save(note.id); }}><Text>Удалить заметку</Text></Pressable>
          </View>)}
        </ScrollView>
        <TextInput accessibilityLabel="Текст заметки к смете" multiline maxLength={4000} editable={!busy}
          value={text} onChangeText={setText} style={{ minHeight: 90, borderWidth: 1, borderColor: "#64748b", padding: 10 }} />
        {error ? <Text accessibilityRole="alert">{error}</Text> : null}
        <Pressable accessibilityRole="button" accessibilityLabel="Сохранить заметку" disabled={busy || !text.trim()}
          onPress={() => { void save(); }}><Text>{busy ? "Сохраняем…" : "Сохранить заметку"}</Text></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Закрыть заметки" disabled={busy}
          onPress={props.onClose}><Text>Закрыть</Text></Pressable>
      </View>
    </View>
  </Modal>;
}
