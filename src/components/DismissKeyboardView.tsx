import React from "react";
import { View, Keyboard, Platform, ViewProps } from "react-native";

type Props = ViewProps & {
  /** если true — на Web ничего не делаем (там клавиатуры нет) */
  disableOnWeb?: boolean;
};

/**
 * Продакшн-вариант:
 * - dismiss keyboard на любой тап внутри контейнера
 * - НЕ перехватывает клики (return false), то есть кнопки/инпуты работают
 */
export default function DismissKeyboardView({
  children,
  disableOnWeb = true,
  ...rest
}: Props) {
  return (
    <View
      {...rest}
      onStartShouldSetResponderCapture={() => {
        if (!(disableOnWeb && Platform.OS === "web")) Keyboard.dismiss();
        return false; // ✅ важно: не ломаем onPress / TextInput
      }}
    >
      {children}
    </View>
  );
}
