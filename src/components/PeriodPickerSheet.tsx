import React, { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function ymd(d: Date) {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}
function parseYmd(s: string): Date | null {
  const v = String(s || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(v + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  return startOfDay(d);
}
function clampRange(a: Date, b: Date) {
  const aa = startOfDay(a);
  const bb = startOfDay(b);
  return aa.getTime() <= bb.getTime() ? { from: aa, to: bb } : { from: bb, to: aa };
}

type Props = {
  visible: boolean;
  onClose: () => void;
  onApply: (from: string, to: string) => void;
  initialFrom?: string;
  initialTo?: string;
  onClear?: () => void;
  ui?: {
    cardBg?: string;
    text?: string;
    sub?: string;
    border?: string;
    accentBlue?: string;
    approve?: string;
  };
};

export default function PeriodPickerSheet({
  visible,
  onClose,
  onApply,
  initialFrom = "",
  initialTo = "",
  onClear,
  ui,
}: Props) {
  const UI = useMemo(
    () => ({
      cardBg: ui?.cardBg ?? "#101826",
      text: ui?.text ?? "#F8FAFC",
      sub: ui?.sub ?? "#9CA3AF",
      border: ui?.border ?? "rgba(255,255,255,0.14)",
      accentBlue: ui?.accentBlue ?? "#3B82F6",
      approve: ui?.approve ?? "#22C55E",
    }),
    [ui]
  );

  const [mode, setMode] = useState<"menu" | "picker">("menu");

  const [tmpFrom, setTmpFrom] = useState<Date>(() => startOfDay(new Date()));
  const [tmpTo, setTmpTo] = useState<Date>(() => startOfDay(new Date()));
  const [androidPick, setAndroidPick] = useState<null | "from" | "to">(null);

  const [webFrom, setWebFrom] = useState("");
  const [webTo, setWebTo] = useState("");

  const sheetOptions = [
    { key: "today", label: "Сегодня" },
    { key: "week", label: "Последняя неделя" },
    { key: "month", label: "Последний месяц" },
    { key: "pick", label: "Выбрать период" },
  ] as const;
  const openPicker = () => {
    const today = startOfDay(new Date());

    const f = parseYmd(initialFrom) ?? today;
    const t = parseYmd(initialTo) ?? today;
    const rr = clampRange(f, t);

    setTmpFrom(rr.from);
    setTmpTo(rr.to);

    setWebFrom(initialFrom || ymd(today));
    setWebTo(initialTo || ymd(today));

    setMode("picker");
  };

  const applyPreset = (kind: "today" | "week" | "month") => {
    const now = startOfDay(new Date());

    if (kind === "today") {
      onApply(ymd(now), ymd(now));
      setMode("menu");
      onClose();
      return;
    }
    if (kind === "week") {
      const from = addDays(now, -6);
      onApply(ymd(from), ymd(now));
      setMode("menu");
      onClose();
      return;
    }
    const from = addDays(now, -29);
    onApply(ymd(from), ymd(now));
    setMode("menu");
    onClose();
  };

  const webFromOk = !webFrom.trim() || !!parseYmd(webFrom);
  const webToOk = !webTo.trim() || !!parseYmd(webTo);
  const webCanApply = webFromOk && webToOk;

  const themedStyles = useMemo(
    () =>
      StyleSheet.create({
        backdrop: {
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.45)",
        },
        clearText: {
          color: UI.sub,
          fontWeight: "900",
          fontSize: 16,
        },
        dateValueText: {
          color: UI.text,
          fontWeight: "900",
        },
        iosDatePicker: {
          backgroundColor: UI.cardBg,
        },
        labelText: {
          color: UI.sub,
          fontWeight: "900",
        },
        menuOptionText: {
          color: UI.accentBlue,
          fontWeight: "900",
          fontSize: 18,
        },
        primaryButton: {
          marginTop: 14,
          marginHorizontal: 16,
          paddingVertical: 14,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: UI.approve,
        },
        primaryButtonText: {
          color: "#fff",
          fontWeight: "900",
          fontSize: 16,
        },
        secondaryButton: {
          marginTop: 10,
          marginHorizontal: 16,
          paddingVertical: 12,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(255,255,255,0.06)",
          borderWidth: 1,
          borderColor: UI.border,
        },
        secondaryButtonText: {
          color: UI.text,
          fontWeight: "900",
        },
        sheet: {
          backgroundColor: UI.cardBg,
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          borderWidth: 1,
          borderColor: UI.border,
          overflow: "hidden",
          paddingBottom: 10,
          width: "100%",
        },
        webInput: {
          borderWidth: 1,
          borderColor: UI.border,
          borderRadius: 12,
          padding: 10,
          backgroundColor: "rgba(255,255,255,0.06)",
          color: UI.text,
          fontWeight: "700",
        },
        webInputInvalid: {
          borderColor: "#EF4444",
        },
        webPrimaryButtonDisabled: {
          opacity: 0.45,
        },
      }),
    [UI]
  );

  const closeAll = () => {
    setMode("menu");
    onClose();
  };

  if (!visible) return null;

  return (
    <View
      pointerEvents="auto"
      style={styles.root}
    >
      <Pressable
        onPress={closeAll}
        style={themedStyles.backdrop}
      />

      <Pressable
        onPress={() => {}}
        style={themedStyles.sheet}
      >
        {mode === "menu" ? (
          <>
            {sheetOptions.map((it, idx) => (
              <Pressable
                key={it.key}
                onPress={() => {
                  if (it.key === "pick") return openPicker();
                  if (it.key === "today") return applyPreset("today");
                  if (it.key === "week") return applyPreset("week");
                  return applyPreset("month");
                }}
                style={[styles.menuOption, idx === 0 ? styles.noBorderTop : null]}
              >
                <Text style={themedStyles.menuOptionText}>{it.label}</Text>
              </Pressable>
            ))}

            {onClear ? (
              <Pressable
                onPress={() => {
                  onClear();
                  closeAll();
                }}
                style={styles.clearOption}
              >
                <Text style={themedStyles.clearText}>Сбросить период</Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={closeAll}
              style={styles.cancelOption}
            >
              <Text style={themedStyles.menuOptionText}>Отмена</Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.pickerBody}>
            <View style={styles.handleWrap}>
              <View style={styles.handle} />
            </View>

            {Platform.OS === "web" ? (
              <>
                <View style={styles.labelWrap}>
                  <Text style={themedStyles.labelText}>Начало (YYYY-MM-DD)</Text>
                </View>
                <View style={styles.inputWrap}>
                  <TextInput
                    value={webFrom}
                    onChangeText={setWebFrom}
                    placeholder={`${new Date().getFullYear()}-MM-DD`}
                    placeholderTextColor={UI.sub}
                    style={[themedStyles.webInput, webFromOk ? null : themedStyles.webInputInvalid]}
                  />
                </View>

                <View style={styles.spacer10} />

                <View style={styles.labelWrap}>
                  <Text style={themedStyles.labelText}>Конец (YYYY-MM-DD)</Text>
                </View>
                <View style={styles.inputWrap}>
                  <TextInput
                    value={webTo}
                    onChangeText={setWebTo}
                    placeholder={`${new Date().getFullYear()}-MM-DD`}
                    placeholderTextColor={UI.sub}
                    style={[themedStyles.webInput, webToOk ? null : themedStyles.webInputInvalid]}
                  />
                </View>

                <Pressable
                  disabled={!webCanApply}
                  onPress={() => {
                    const now = startOfDay(new Date());
                    const f = parseYmd(webFrom) ?? now;
                    const t = parseYmd(webTo) ?? now;
                    const rr = clampRange(f, t);
                    onApply(ymd(rr.from), ymd(rr.to));
                    closeAll();
                  }}
                  style={[themedStyles.primaryButton, webCanApply ? null : themedStyles.webPrimaryButtonDisabled]}
                >
                  <Text style={themedStyles.primaryButtonText}>Готово</Text>
                </Pressable>

                <Pressable
                  onPress={() => setMode("menu")}
                  style={themedStyles.secondaryButton}
                >
                  <Text style={themedStyles.secondaryButtonText}>Назад</Text>
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.labelWrap}>
                  <Text style={themedStyles.labelText}>Начало:</Text>
                </View>

                {Platform.OS === "ios" ? (
                  <DateTimePicker
                    value={tmpFrom}
                    mode="date"
                    display="spinner"
                    onChange={(_, d) => {
                      if (d) setTmpFrom(startOfDay(d));
                    }}
                    style={themedStyles.iosDatePicker}
                  />
                ) : (
                  <Pressable onPress={() => setAndroidPick("from")} style={styles.androidDateButton}>
                    <Text style={themedStyles.dateValueText}>{ymd(tmpFrom)}</Text>
                  </Pressable>
                )}

                <View style={styles.spacer10} />

                <View style={styles.labelWrap}>
                  <Text style={themedStyles.labelText}>Конец:</Text>
                </View>

                {Platform.OS === "ios" ? (
                  <DateTimePicker
                    value={tmpTo}
                    mode="date"
                    display="spinner"
                    onChange={(_, d) => {
                      if (d) setTmpTo(startOfDay(d));
                    }}
                    style={themedStyles.iosDatePicker}
                  />
                ) : (
                  <Pressable onPress={() => setAndroidPick("to")} style={styles.androidDateButton}>
                    <Text style={themedStyles.dateValueText}>{ymd(tmpTo)}</Text>
                  </Pressable>
                )}

                {Platform.OS !== "ios" && androidPick ? (
                  <DateTimePicker
                    value={androidPick === "from" ? tmpFrom : tmpTo}
                    mode="date"
                    display="default"
                    onChange={(_, d) => {
                      const which = androidPick;
                      setAndroidPick(null);
                      if (!d) return;
                      if (which === "from") setTmpFrom(startOfDay(d));
                      else setTmpTo(startOfDay(d));
                    }}
                  />
                ) : null}

                <Pressable
                  onPress={() => {
                    const rr = clampRange(tmpFrom, tmpTo);
                    onApply(ymd(rr.from), ymd(rr.to));
                    closeAll();
                  }}
                  style={themedStyles.primaryButton}
                >
                  <Text style={themedStyles.primaryButtonText}>Готово</Text>
                </Pressable>

                <Pressable
                  onPress={() => setMode("menu")}
                  style={themedStyles.secondaryButton}
                >
                  <Text style={themedStyles.secondaryButtonText}>Назад</Text>
                </Pressable>
              </>
            )}
          </View>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  androidDateButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cancelOption: {
    marginTop: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  clearOption: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  handleWrap: {
    alignItems: "center",
    paddingVertical: 10,
  },
  inputWrap: {
    paddingHorizontal: 16,
  },
  labelWrap: {
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  menuOption: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  noBorderTop: {
    borderTopWidth: 0,
  },
  pickerBody: {
    paddingBottom: 12,
  },
  root: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "flex-end",
    zIndex: 99999999,
    elevation: 99999999,
  },
  spacer10: {
    height: 10,
  },
});
