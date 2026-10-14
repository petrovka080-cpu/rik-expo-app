import React from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { ConsumerCanonicalReleaseMigrationPrompt } from "./consumerCanonicalReleaseMigration";

export function ConsumerCanonicalReleaseMigrationConfirmation({
  prompt, onConfirm, onCancel,
}: {
  prompt: ConsumerCanonicalReleaseMigrationPrompt | null;
  onConfirm: () => void;
  onCancel: () => void;
}): React.ReactElement | null {
  const [selected, setSelected] = React.useState<string[]>([]);
  React.useEffect(() => { setSelected([]); }, [prompt]);
  if (!prompt) return null;
  const clear = prompt.recoveredRevisionId ? undefined : prompt.quantityClearPreview;
  const canConfirm = !clear || clear.rows.every(row => selected.includes(row.rowId));
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={styles.card} testID="consumer-estimate-release-migration-confirmation">
          <Text accessibilityRole="header" style={styles.heading}>{prompt.recoveredRevisionId ? "Пересчёт уже сохранён" : "Обновилась версия расчёта"}</Text>
          <Text style={styles.body}>{prompt.titleRu}</Text>
          <Text style={styles.body}>
            {prompt.recoveredRevisionId
              ? `Сервер уже сохранил новую смету${prompt.recoveredMeasureRu ? `: ${prompt.recoveredMeasureRu}` : ""}. Откройте её перед следующей правкой. Новые введённые значения останутся в редакторе; они ещё не применены. Исходная версия останется в истории.`
              : clear
                ? 'Расход скамей и креплений теперь задаётся объёмом работы: N скамей и 4N креплений. Выберите возврат всех перечисленных количеств к расчёту. Ручные цены, заказ и остальные правки сохранятся. Исходная версия останется в истории. Новые значения параметров останутся в редакторе для следующего применения.'
                : prompt.preserveFloorPreparationComposition
                  ? "Каталог обновится с сохранением прежнего состава подготовки. Новые ограждения и обеспыливание автоматически не добавятся. Это выбор состава, а не подтверждение выполненных работ. Исходная версия останется в истории."
                  : "При пересчёте будут использованы актуальные нормы и состав работы. Проверьте количества, материалы и цены в новой смете. Исходная версия останется в истории."}
          </Text>
          {clear ? <ScrollView style={styles.clearRows}>
            {clear.rows.map(row => <Pressable key={row.rowId} accessibilityRole="checkbox"
              accessibilityState={{ checked: selected.includes(row.rowId) }} testID={`consumer-estimate-quantity-clear-${row.rowId}`}
              onPress={() => setSelected(current => current.includes(row.rowId) ? current.filter(id => id !== row.rowId) : [...current, row.rowId])}
              style={styles.clearRow}>
              <Text style={styles.body}>{`${selected.includes(row.rowId) ? '☑' : '☐'} ${row.titleRu}`}</Text>
              <Text style={styles.body}>{`Ручное: ${row.oldQuantity} шт. → по объёму: ${row.calculatedQuantity} шт.${row.excluded ? ' (строка сейчас исключена из сметы)' : ''}`}</Text>
            </Pressable>)}
          </ScrollView> : null}
          <Text style={styles.version}>
            {`Версия состава: ${prompt.fromDefinitionVersion} → ${prompt.toDefinitionVersion}. Версия каталога: ${prompt.fromReleaseId.slice(0, 8)} → ${prompt.toReleaseId.slice(0, 8)}.`}
          </Text>
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: !canConfirm }} disabled={!canConfirm} onPress={onConfirm}
            style={[styles.confirm, !canConfirm && styles.disabled]} testID="consumer-estimate-release-migration-confirm">
            <Text style={styles.confirmText}>{prompt.recoveredRevisionId ? "Открыть сохранённый пересчёт" : clear ? 'Вернуть выбранные количества к расчёту' : prompt.preserveFloorPreparationComposition ? 'Обновить каталог и сохранить прежний состав' : "Пересчитать по актуальной версии"}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onCancel} style={styles.cancel} testID="consumer-estimate-release-migration-cancel">
            <Text style={styles.cancelText}>Оставить исходную смету</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export function useConsumerCanonicalReleaseMigrationConfirmation(workspaceIdentity: string) {
  const [prompt, setPrompt] = React.useState<ConsumerCanonicalReleaseMigrationPrompt | null>(null);
  const pending = React.useRef<{
    workspaceIdentity: string;
    resolve: (confirmed: boolean) => void;
  } | null>(null);
  const currentWorkspace = React.useRef(workspaceIdentity);
  currentWorkspace.current = workspaceIdentity;
  const finish = React.useCallback((confirmed: boolean) => {
    const current = pending.current;
    pending.current = null;
    setPrompt(null);
    current?.resolve(confirmed && current.workspaceIdentity === currentWorkspace.current);
  }, []);
  React.useEffect(() => {
    setPrompt(null);
    return () => {
      const current = pending.current;
      pending.current = null;
      current?.resolve(false);
    };
  }, [workspaceIdentity]);
  const confirmReleaseMigration = React.useCallback((next: ConsumerCanonicalReleaseMigrationPrompt) => {
    // Another action cannot inherit or replace consent for the first action.
    if (pending.current || currentWorkspace.current !== workspaceIdentity) return Promise.resolve(false);
    return new Promise<boolean>((resolve) => {
      pending.current = { workspaceIdentity, resolve };
      setPrompt(next);
    });
  }, [workspaceIdentity]);
  return { prompt, confirmReleaseMigration, confirm: () => finish(true), cancel: () => finish(false) };
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: "rgba(15,23,42,0.45)" },
  card: { width: "100%", maxWidth: 520, borderRadius: 16, padding: 20, gap: 14, backgroundColor: "#FFFFFF" },
  heading: { fontSize: 20, fontWeight: "800", color: "#0F172A" },
  body: { fontSize: 15, lineHeight: 22, color: "#334155" },
  version: { fontSize: 12, lineHeight: 18, color: "#64748B" },
  clearRows: { maxHeight: 220 },
  clearRow: { paddingVertical: 8, gap: 4 },
  disabled: { opacity: 0.45 },
  confirm: { borderRadius: 9, padding: 13, backgroundColor: "#0F766E" },
  confirmText: { textAlign: "center", color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
  cancel: { borderRadius: 9, padding: 13, borderWidth: 1, borderColor: "#CBD5E1" },
  cancelText: { textAlign: "center", color: "#334155", fontWeight: "700", fontSize: 15 },
});
