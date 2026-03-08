import React, { useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  FlatList,
  KeyboardAvoidingView,
} from "react-native";
import { BlurView } from "expo-blur";

interface Props {
  visible: boolean;
  onConfirm: (name: string) => void;
  onClose: () => void;
  suggestions: string[];
  initialValue?: string;
}

export default function WarehouseRecipientModal({
  visible,
  onConfirm,
  onClose,
  suggestions,
  initialValue = "",
}: Props) {
  const [search, setSearch] = useState(initialValue);

  // Divide suggestions into Recent and Profiles
  // We'll assume the first few (e.g. up to 12) are recent if they come from useWarehouseRecipient
  // But wait, useWarehouseRecipient already merges them. 
  // Let's just use the current suggestions but make sure they feel premium.

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return suggestions;
    return suggestions.filter((s) => s.toLowerCase().includes(q));
  }, [search, suggestions]);

  const handlePick = (name: string) => {
    onConfirm(name);
    setSearch("");
  };

  const handleCustomSubmit = () => {
    if (search.trim()) {
      handlePick(search.trim());
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={() => { }} // Force selection
    >
      <View style={st.overlay}>
        {Platform.OS !== "web" ? (
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.8)" }]} />
        )}

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={st.keyboardView}
        >
          <View style={st.modalView}>
            <View style={st.header}>
              <Text style={st.title}>Кто получает?</Text>
              {/* REMOVED CLOSE BUTTON PER PROD-TZ */}
            </View>

            <TextInput
              style={st.searchInput}
              placeholder="Поиск или новый ФИО..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={search}
              onChangeText={setSearch}
              autoFocus
              onSubmitEditing={handleCustomSubmit}
            />

            <View style={st.listContainer}>
              <FlatList
                data={filtered}
                keyExtractor={(item, idx) => `${item}-${idx}`}
                renderItem={({ item }) => (
                  <Pressable
                    style={({ pressed }) => [st.item, pressed && st.itemPressed]}
                    onPress={() => handlePick(item)}
                  >
                    <Text style={st.itemText}>{item}</Text>
                  </Pressable>
                )}
                contentContainerStyle={{ paddingBottom: 20 }}
                ListHeaderComponent={
                  !search.trim() && filtered.length > 0 ? (
                    <Text style={st.listHeader}>ВЫБЕРИТЕ ИЗ СПИСКА ИЛИ ВВЕДИТЕ НОВОЕ</Text>
                  ) : null
                }
                ListEmptyComponent={
                  search.trim() ? (
                    <Pressable style={st.item} onPress={handleCustomSubmit}>
                      <Text style={[st.itemText, { color: "#22C55E" }]}>
                        {"Добавить: \""}
                        {search.trim()}
                        {"\""}
                      </Text>
                    </Pressable>
                  ) : (
                    <Text style={st.emptyText}>Никого не найдено. Начните вводить текст выше.</Text>
                  )
                }
              />
            </View>

            {/* Added a safeguard: button to confirm if search is filled */}
            {search.trim().length > 3 && (
              <Pressable
                onPress={handleCustomSubmit}
                style={[st.confirmBtn]}
              >
                <Text style={st.confirmBtnText}>Подтвердить ввод</Text>
              </Pressable>
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}


const st = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  keyboardView: {
    width: "100%",
    maxWidth: 500,
    height: "75%",
  },
  modalView: {
    backgroundColor: "#101826",
    borderRadius: 32,
    padding: 24,
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#F8FAFC",
  },
  listHeader: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 12,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  confirmBtn: {
    backgroundColor: "#22C55E",
    height: 54,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  confirmBtnText: {
    color: "#0B0F14",
    fontSize: 17,
    fontWeight: "900",
  },
  searchInput: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "700",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    marginBottom: 20,
  },
  listContainer: {
    flex: 1,
  },
  item: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  itemPressed: {
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  itemText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#F8FAFC",
  },
  emptyText: {
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 40,
    fontSize: 15,
  },
});
