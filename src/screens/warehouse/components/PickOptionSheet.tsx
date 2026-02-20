import React from "react";
import { View, Text, Pressable, TextInput, FlatList, Platform } from "react-native";
import RNModal from "react-native-modal";
import { UI, s } from "../warehouse.styles";
import type { Option } from "../warehouse.types";

type Props = {
  visible: boolean;
  title: string;

  items: Option[];

  filter: string;
  onFilterChange: (v: string) => void;

  onPick: (opt: Option) => void;
  onClose: () => void;
};

export default function PickOptionSheet({
  visible,
  title,
  items,
  filter,
  onFilterChange,
  onPick,
  onClose,
}: Props) {
  return (
    <RNModal
      isVisible={visible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      backdropOpacity={0.55}
      useNativeDriver={Platform.OS !== "web"}
      useNativeDriverForBackdrop={Platform.OS !== "web"}
      hideModalContentWhileAnimating
      avoidKeyboard={false}
      propagateSwipe={Platform.OS !== "web"}
      style={{ margin: 0, justifyContent: "flex-end" }}
    >
      <View
        style={{
          height: "70%",
          backgroundColor: UI.cardBg,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          paddingTop: 10,
          paddingHorizontal: 16,
          paddingBottom: 16,
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.10)",
        }}
      >
        {/* handle */}
        <View
          style={{
            alignSelf: "center",
            width: 44,
            height: 5,
            borderRadius: 999,
            backgroundColor: "rgba(255,255,255,0.18)",
            marginBottom: 10,
          }}
        />

        {/* topbar */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <Text style={{ flex: 1, color: UI.text, fontWeight: "900", fontSize: 18 }} numberOfLines={1}>
            {title}
          </Text>

          <Pressable onPress={onClose} style={s.openBtn}>
            <Text style={s.openBtnText}>Закрыть</Text>
          </Pressable>
        </View>

        <TextInput
          value={filter}
          onChangeText={onFilterChange}
          placeholder="Поиск..."
          placeholderTextColor={UI.sub}
          style={s.input}
          autoCorrect={false}
          autoCapitalize="none"
        />

        <FlatList
          style={{ marginTop: 12 }}
          data={items}
          keyExtractor={(x) => x.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onPick(item)}
              style={[
                s.openBtn,
                {
                  width: "100%",
                  alignItems: "flex-start",
                  marginBottom: 10,
                  paddingVertical: 12,
                },
              ]}
            >
              <Text style={s.openBtnText} numberOfLines={2}>
                {item.label}
              </Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={{ color: UI.sub, fontWeight: "800", paddingTop: 12 }}>
              Ничего не найдено.
            </Text>
          }
        />
      </View>
    </RNModal>
  );
}
