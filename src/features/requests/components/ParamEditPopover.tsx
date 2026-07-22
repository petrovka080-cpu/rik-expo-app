import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export type ParamEditPopoverProps = {
  visible: boolean;
  paramKey: string | null;
  label: string;
  initialValue?: string;
  onSave: (rawValue: string) => void;
  onCancel: () => void;
};

export function ParamEditPopover({
  visible,
  paramKey,
  label,
  initialValue = "",
  onSave,
  onCancel,
}: ParamEditPopoverProps): React.ReactElement | null {
  const [value, setValue] = React.useState(initialValue);

  React.useEffect(() => {
    setValue(initialValue);
  }, [initialValue, paramKey]);

  if (!visible || !paramKey) return null;

  return (
    <View style={styles.panel} testID="editable-param-popover">
      <Text style={styles.title}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder={`Введите: ${label.toLocaleLowerCase("ru-RU")}`}
        placeholderTextColor="#94A3B8"
        style={styles.input}
        testID="editable-param-popover-input"
      />
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => onSave(value)}
          style={[styles.button, styles.primary]}
          testID="editable-param-popover-save"
        >
          <Text style={styles.primaryText}>Сохранить</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onCancel}
          style={styles.button}
          testID="editable-param-popover-cancel"
        >
          <Text style={styles.buttonText}>Отмена</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    padding: 10,
    gap: 8,
  },
  title: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "900",
  },
  input: {
    minHeight: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    color: "#0F172A",
    paddingHorizontal: 10,
    fontSize: 13,
    fontWeight: "800",
  },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  button: {
    minHeight: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  primary: {
    borderColor: "#0F766E",
    backgroundColor: "#0F766E",
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  buttonText: {
    color: "#334155",
    fontSize: 12,
    fontWeight: "900",
  },
});
