import React from "react";
import { Animated, Pressable, Text, TextInput, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ForemanDropdown from "./ForemanDropdown";
import type { RefOption } from "./foreman.types";

type Props = {
  contentTopPad: number;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  foreman: string;
  onForemanChange: (v: string) => void;
  foremanFocus: boolean;
  setForemanFocus: (v: boolean) => void;
  blurTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  foremanHistory: string[];
  objectType: string;
  level: string;
  system: string;
  zone: string;
  objOptions: RefOption[];
  lvlOptions: RefOption[];
  sysOptions: RefOption[];
  zoneOptions: RefOption[];
  onObjectChange: (v: string) => void;
  onLevelChange: (v: string) => void;
  onSystemChange: (v: string) => void;
  onZoneChange: (v: string) => void;
  ensureHeaderReady: () => boolean;
  isDraftActive: boolean;
  showHint: (title: string, text: string) => void;
  setCatalogVisible: (v: boolean) => void;
  busy: boolean;
  onCalcPress: () => void;
  setDraftOpen: (v: boolean) => void;
  currentDisplayLabel: string;
  itemsCount: number;
  onOpenHistory: () => void;
  ui: { text: string; sub: string };
  styles: typeof import("./foreman.styles").s;
};

export default function ForemanEditorSection(p: Props) {
  return (
    <>
      <Animated.ScrollView
        contentContainerStyle={[p.styles.pagePad, { paddingTop: p.contentTopPad }]}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={p.onScroll}
      >
        <View style={p.styles.requiredInputWrap}>
          <TextInput
            value={p.foreman}
            onChangeText={p.onForemanChange}
            onFocus={() => {
              if (p.blurTimerRef.current) clearTimeout(p.blurTimerRef.current);
              p.setForemanFocus(true);
            }}
            onBlur={() => {
              p.blurTimerRef.current = setTimeout(() => p.setForemanFocus(false), 180);
            }}
            placeholder="ФИО прораба"
            placeholderTextColor={p.ui.sub}
            style={[p.styles.input, p.styles.requiredInput]}
          />
          <Text style={p.styles.requiredInputAsterisk}>*</Text>
        </View>

        {p.foremanFocus && p.foremanHistory.length > 0 ? (
          <View style={p.styles.foremanSuggestBox}>
            {p.foremanHistory.map((name) => (
              <Pressable
                key={name}
                onPressIn={() => {
                  if (p.blurTimerRef.current) clearTimeout(p.blurTimerRef.current);
                }}
                onPress={() => {
                  p.onForemanChange(name);
                  p.setForemanFocus(false);
                }}
                style={p.styles.foremanSuggestRow}
              >
                <Text style={p.styles.foremanSuggestText} numberOfLines={1}>
                  {name}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={{ marginTop: 10, gap: 6 }}>
          <ForemanDropdown
            label="Объект строительства"
            required={true}
            showLabel={false}
            options={p.objOptions}
            value={p.objectType}
            onChange={p.onObjectChange}
            placeholder="Объект строительства"
            width={360}
            ui={p.ui}
            styles={p.styles}
          />
          <ForemanDropdown
            label="Этаж / уровень"
            required={true}
            showLabel={false}
            options={p.lvlOptions}
            value={p.level}
            onChange={p.onLevelChange}
            placeholder="Этаж / уровень"
            width={360}
            ui={p.ui}
            styles={p.styles}
          />
          <ForemanDropdown
            label="Система / вид работ"
            showLabel={false}
            options={p.sysOptions}
            value={p.system}
            onChange={p.onSystemChange}
            placeholder="Система / вид работ"
            width={360}
            ui={p.ui}
            styles={p.styles}
          />
          <ForemanDropdown
            label="Зона / участок"
            showLabel={false}
            options={p.zoneOptions}
            value={p.zone}
            onChange={p.onZoneChange}
            placeholder="Зона / участок"
            width={360}
            ui={p.ui}
            styles={p.styles}
          />
        </View>

        <View style={p.styles.section}>
          <View style={p.styles.pickTabsRow}>
            <Pressable
              onPress={() => {
                if (!p.ensureHeaderReady()) return;
                if (!p.isDraftActive) {
                  p.showHint("Просмотр заявки", "Редактирование доступно только в текущем черновике.");
                  return;
                }
                p.setCatalogVisible(true);
              }}
              disabled={p.busy}
              style={[p.styles.pickTabBtn, p.styles.pickTabCatalog, p.busy && { opacity: 0.5 }]}
            >
              <Ionicons name="list" size={18} color={p.ui.text} />
              <Text style={p.styles.pickTabText}>Каталог</Text>
            </Pressable>

            <Pressable
              onPress={p.onCalcPress}
              disabled={p.busy}
              style={[p.styles.pickTabBtn, p.styles.pickTabSoft, p.busy && { opacity: 0.5 }]}
            >
              <Ionicons name="calculator-outline" size={18} color={p.ui.text} />
              <Text style={p.styles.pickTabText}>Смета</Text>
            </Pressable>
          </View>
        </View>

        <Pressable
          onPress={() => p.setDraftOpen(true)}
          style={p.styles.draftCard}
          android_ripple={{ color: "rgba(255,255,255,0.06)" }}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={p.styles.draftTitle}>ЧЕРНОВИК</Text>
            <Text style={p.styles.draftNo} numberOfLines={1}>
              {p.currentDisplayLabel}
            </Text>
            <Text style={p.styles.draftHint} numberOfLines={2}>
              {p.itemsCount
                ? "Открыть позиции и действия"
                : "Пока пусто - добавь позиции из Каталога или Сметы."}
            </Text>
          </View>

          <View style={{ alignItems: "flex-end", gap: 10 }}>
            <View style={p.styles.posPill}>
              <Ionicons name="list" size={18} color={p.ui.text} />
              <Text style={p.styles.posPillText}>Позиции</Text>
              <View style={p.styles.posCountPill}>
                <Text style={p.styles.posCountText}>{p.itemsCount}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.55)" />
          </View>
        </Pressable>
      </Animated.ScrollView>

      <View style={p.styles.stickyBar}>
        <View style={p.styles.miniBar}>
          <Pressable onPress={p.onOpenHistory} disabled={p.busy} style={[p.styles.miniBtn, p.busy && { opacity: 0.5 }]}>
            <Ionicons name="time-outline" size={18} color={p.ui.text} />
            <Text style={p.styles.miniText}>История</Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

