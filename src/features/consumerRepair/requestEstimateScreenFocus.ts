import type React from "react";
import type { TextInput } from "react-native";

export function focusConsumerRepairProblemInputAtEnd(
  inputRef: React.RefObject<TextInput | null>,
  value: string,
): void {
  const caret = value.length;
  const focus = () => {
    inputRef.current?.focus?.();
    inputRef.current?.setNativeProps?.({ selection: { start: caret, end: caret } });
    if (typeof document !== "undefined") {
      const input = document.querySelector("[data-testid='consumer-repair-problem-input']") as
        | HTMLInputElement
        | HTMLTextAreaElement
        | null;
      input?.focus();
      input?.setSelectionRange?.(caret, caret);
    }
  };
  if (typeof requestAnimationFrame === "function") {
    requestAnimationFrame(focus);
    return;
  }
  focus();
}
