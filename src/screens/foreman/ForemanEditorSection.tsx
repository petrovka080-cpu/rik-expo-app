import React from "react";
import { Animated, Pressable, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ForemanDropdown from "./ForemanDropdown";
import type { FormContextUiModel } from "./foreman.locator.adapter";
import type { ContextResolutionResult } from "./foreman.context";
import type { RefOption } from "./foreman.types";
import { debugForemanLog } from "./foreman.debug";

type Props = {
  contentTopPad: number;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  foreman: string;
  onZoneChange: (v: string) => void;
  onOpenFioModal: () => void;
  objectType: string;
  objectDisplayName: string;
  level: string; // Already sanitized in parent
  system: string;
  zone: string; // Already sanitized in parent
  contextResult?: ContextResolutionResult;
  formUi: FormContextUiModel;
  objOptions: RefOption[];
  sysOptions: RefOption[];
  onObjectChange: (v: string) => void;
  onLevelChange: (v: string) => void;
  onSystemChange: (v: string) => void;
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
  const isLowConfidence = p.contextResult?.confidence !== 'high';

  debugForemanLog('[FOREMAN_EDITOR_4_FIELDS]', {
    objectType: p.objectType,

    field1_object: {
      label: 'Объект / Блок',
      value: p.objectType,
      options: p.objOptions.map(o => ({ code: o.code, name: o.name })),
    },

    field2_locator: {
      label: p.formUi.locator.label,
      value: p.level,
      options: p.formUi.locator.options.map(o => ({ code: o.code, name: o.name })),
    },

    field3_system: {
      label: 'Раздел / Вид работ',
      value: p.system,
      options: p.sysOptions.map(o => ({ code: o.code, name: o.name })),
    },

    field4_zone: {
      label: p.formUi.zone.label,
      value: p.zone,
      options: p.formUi.zone.options.map(o => ({ code: o.code, name: o.name })),
    },
  });

  return (
    <>
      <Animated.ScrollView
        contentContainerStyle={[p.styles.pagePad, { paddingTop: p.contentTopPad }]}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={16}
        onScroll={p.onScroll}
      >
        <View style={{ marginTop: 10, gap: 6 }}>
          <ForemanDropdown
            label="Объект / Блок"
            required={true}
            showLabel={true}
            options={p.objOptions}
            value={p.objectType}
            valueLabelOverride={p.objectDisplayName}
            onChange={p.onObjectChange}
            placeholder="Выбрать объект..."
            width={360}
            ui={p.ui}
            styles={p.styles}
          />

          {isLowConfidence && p.objectType ? (
            <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginLeft: 4, fontStyle: 'italic' }}>
              Контекст: {p.contextResult?.config.objectClass}. Проверьте {p.formUi.locator.label?.toLowerCase()}.
            </Text>
          ) : null}

          {!p.formUi.locator.isHidden && (
            <ForemanDropdown
              key={`loc:${p.objectType}:${p.formUi.locator.label}`}
              label={p.formUi.locator.label}
              required={true}
              showLabel={true}
              options={p.formUi.locator.options}
              value={p.level}
              onChange={p.onLevelChange}
              placeholder={p.formUi.locator.placeholder}
              width={360}
              ui={p.ui}
              styles={p.styles}
            />
          )}

          <ForemanDropdown
            label="Раздел / Вид работ"
            showLabel={true}
            options={p.sysOptions}
            value={p.system}
            onChange={p.onSystemChange}
            placeholder="Выбрать раздел..."
            width={360}
            ui={p.ui}
            styles={p.styles}
          />

          <ForemanDropdown
            key={`zone:${p.objectType}:${p.formUi.zone.label}`}
            label={p.formUi.zone.label}
            showLabel={true}
            options={p.formUi.zone.options}
            value={p.zone}
            onChange={p.onZoneChange}
            placeholder={p.formUi.zone.placeholder}
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


