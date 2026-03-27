import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { Animated, Pressable, Text, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";

import ForemanDraftSummaryCard from "./ForemanDraftSummaryCard";
import { FOREMAN_DROPDOWN_FIELD_KEYS } from "./foreman.dropdown.constants";
import { debugForemanLogLazy } from "./foreman.debug";
import ForemanDropdown from "./ForemanDropdown";
import type { ContextResolutionResult } from "./foreman.context";
import type { ForemanHeaderAttentionState } from "./foreman.headerRequirements";
import type { FormContextUiModel } from "./foreman.locator.adapter";
import type { RefOption } from "./foreman.types";

type Props = {
  contentTopPad: number;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  foreman: string;
  onZoneChange: (v: string) => void;
  onOpenFioModal: () => void;
  objectType: string;
  objectDisplayName: string;
  level: string;
  system: string;
  zone: string;
  contextResult?: ContextResolutionResult;
  formUi: FormContextUiModel;
  objOptions: RefOption[];
  sysOptions: RefOption[];
  onObjectChange: (v: string) => void;
  onLevelChange: (v: string) => void;
  onSystemChange: (v: string) => void;
  ensureHeaderReady: () => boolean;
  isDraftActive: boolean;
  canStartDraftFlow: boolean;
  showHint: (title: string, text: string) => void;
  setCatalogVisible: (v: boolean) => void;
  busy: boolean;
  onCalcPress: () => void;
  onAiQuickPress: () => void;
  setDraftOpen: (v: boolean) => void;
  currentDisplayLabel: string;
  itemsCount: number;
  draftSyncStatusLabel: string;
  draftSyncStatusDetail: string | null;
  draftSyncStatusTone: "neutral" | "info" | "success" | "warning" | "danger";
  headerAttention: ForemanHeaderAttentionState | null;
  ui: { text: string; sub: string };
  styles: typeof import("./foreman.styles").s;
};

export default function ForemanEditorSection(p: Props) {
  const isLowConfidence = p.contextResult?.confidence !== "high";
  const scrollRef = useRef<any>(null);
  const missingKeys = new Set(p.headerAttention?.missingKeys ?? []);

  debugForemanLogLazy("[FOREMAN_EDITOR_4_FIELDS]", () => ({
    objectType: p.objectType,

    field1_object: {
      label: "Объект / Блок",
      value: p.objectType,
      options: p.objOptions.map((o) => ({ code: o.code, name: o.name })),
    },

    field2_locator: {
      label: p.formUi.locator.label,
      value: p.level,
      options: p.formUi.locator.options.map((o) => ({ code: o.code, name: o.name })),
    },

    field3_system: {
      label: "Раздел / Вид работ",
      value: p.system,
      options: p.sysOptions.map((o) => ({ code: o.code, name: o.name })),
    },

    field4_zone: {
      label: p.formUi.zone.label,
      value: p.zone,
      options: p.formUi.zone.options.map((o) => ({ code: o.code, name: o.name })),
    },
  }));

  useEffect(() => {
    if (!p.headerAttention?.version) return;
    scrollRef.current?.scrollTo?.({ y: 0, animated: true });
  }, [p.headerAttention?.version]);

  return (
    <Animated.ScrollView
      ref={scrollRef}
      contentContainerStyle={[p.styles.pagePad, { paddingTop: p.contentTopPad }]}
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={16}
      onScroll={p.onScroll}
    >
      {p.headerAttention ? (
        <View style={p.styles.headerAttentionCard}>
          <Text style={p.styles.headerAttentionTitle}>Заполните шапку перед AI-заявкой</Text>
          <Text style={p.styles.headerAttentionText}>{p.headerAttention.message}</Text>
        </View>
      ) : null}

      <View style={{ marginTop: 10, gap: 6 }}>
        <ForemanDropdown
          label="Объект / Блок"
          required
          showLabel
          fieldKey={FOREMAN_DROPDOWN_FIELD_KEYS.object}
          options={p.objOptions}
          value={p.objectType}
          valueLabelOverride={p.objectDisplayName}
          onChange={p.onObjectChange}
          placeholder="Выбрать объект..."
          width={360}
          attentionActive={missingKeys.has("object")}
          attentionHint={missingKeys.has("object") ? "Сначала выберите объект / блок." : null}
          attentionToken={p.headerAttention?.focusKey === FOREMAN_DROPDOWN_FIELD_KEYS.object ? p.headerAttention.version : 0}
          autoOpenOnAttention={p.headerAttention?.focusKey === FOREMAN_DROPDOWN_FIELD_KEYS.object}
          ui={p.ui}
          styles={p.styles}
        />

        {isLowConfidence && p.objectType ? (
          <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginLeft: 4, fontStyle: "italic" }}>
            Контекст: {p.contextResult?.config.objectClass}. Проверьте {p.formUi.locator.label?.toLowerCase()}.
          </Text>
        ) : null}

        {!p.formUi.locator.isHidden ? (
          <ForemanDropdown
            key={`loc:${p.objectType}:${p.formUi.locator.label}`}
            label={p.formUi.locator.label}
            required
            showLabel
            fieldKey={FOREMAN_DROPDOWN_FIELD_KEYS.locator}
            options={p.formUi.locator.options}
            value={p.level}
            onChange={p.onLevelChange}
            placeholder={p.formUi.locator.placeholder}
            width={360}
            attentionActive={missingKeys.has("locator")}
            attentionHint={missingKeys.has("locator") ? `Сначала выберите ${p.formUi.locator.label.toLowerCase()}.` : null}
            attentionToken={p.headerAttention?.focusKey === FOREMAN_DROPDOWN_FIELD_KEYS.locator ? p.headerAttention.version : 0}
            autoOpenOnAttention={p.headerAttention?.focusKey === FOREMAN_DROPDOWN_FIELD_KEYS.locator}
            ui={p.ui}
            styles={p.styles}
          />
        ) : null}

        <ForemanDropdown
          label="Раздел / Вид работ"
          showLabel
          fieldKey={FOREMAN_DROPDOWN_FIELD_KEYS.system}
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
          showLabel
          fieldKey={FOREMAN_DROPDOWN_FIELD_KEYS.zone}
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
              if (!p.canStartDraftFlow) {
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

        <Pressable
          onPress={p.onAiQuickPress}
          disabled={p.busy}
          style={[
            p.styles.pickTabBtn,
            p.styles.pickTabSoft,
            {
              marginTop: 10,
              borderColor: "rgba(34,197,94,0.32)",
              backgroundColor: "rgba(34,197,94,0.10)",
            },
            p.busy && { opacity: 0.5 },
          ]}
        >
          <Ionicons name="sparkles-outline" size={18} color={p.ui.text} />
          <Text style={p.styles.pickTabText}>AI заявка</Text>
        </Pressable>
      </View>

      <ForemanDraftSummaryCard
        requestLabel={p.currentDisplayLabel}
        itemsCount={p.itemsCount}
        syncLabel={p.draftSyncStatusLabel}
        syncDetail={p.draftSyncStatusDetail}
        syncTone={p.draftSyncStatusTone}
        onPress={() => p.setDraftOpen(true)}
        ui={p.ui}
        styles={p.styles}
      />
    </Animated.ScrollView>
  );
}
