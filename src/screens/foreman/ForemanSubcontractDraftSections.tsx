import React, { useCallback, useMemo } from "react";
import { Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { FlashList } from "@/src/ui/FlashList";
import { Ionicons } from "@expo/vector-icons";
import type { ReqItemRow } from "../../lib/catalog_api";
import DeleteAllButton from "../../ui/DeleteAllButton";
import SendPrimaryButton from "../../ui/SendPrimaryButton";
import CloseIconButton from "../../ui/CloseIconButton";
import ForemanDraftSummaryCard from "./ForemanDraftSummaryCard";
import { buildForemanDraftVisualModel } from "./foremanDraftVisualState";
import ForemanDropdown from "./ForemanDropdown";
import { s } from "./foreman.styles";
import { UI } from "./foreman.ui";
import { fmtAmount, type Subcontract } from "../subcontracts/subcontracts.shared";
import type { DictOption } from "./hooks/foreman.subcontractController.model";

export function SubcontractDetailsModalBody(props: {
  modalHeaderTopPad: number;
  onClose: () => void;
  templateContract: Subcontract | null;
  templateObjectName: string;
  templateLevelName: string;
  templateSystemName: string;
  formLevelCode: string;
  formSystemCode: string;
  formZoneText: string;
  draftItemsCount: number;
  lvlOptions: DictOption[];
  sysOptions: DictOption[];
  onChangeLevelCode: (value: string) => void;
  onChangeSystemCode: (value: string) => void;
  onChangeZoneText: (value: string) => void;
  onOpenCatalog: () => void;
  onOpenCalc: () => void;
  onOpenDraft: () => void;
  displayNo: string;
}) {
  const {
    modalHeaderTopPad,
    onClose,
    templateContract,
    templateObjectName,
    templateLevelName,
    templateSystemName,
    formLevelCode,
    formSystemCode,
    formZoneText,
    draftItemsCount,
    lvlOptions,
    sysOptions,
    onChangeLevelCode,
    onChangeSystemCode,
    onChangeZoneText,
    onOpenCatalog,
    onOpenCalc,
    onOpenDraft,
    displayNo,
  } = props;
  const draftCardModel = useMemo(
    () =>
      buildForemanDraftVisualModel({
        requestLabel: displayNo,
        itemsCount: draftItemsCount,
        syncTone: draftItemsCount > 0 ? "neutral" : "success",
        syncLabel: draftItemsCount > 0 ? "Local draft ready" : "Synced",
      }),
    [displayNo, draftItemsCount],
  );

  return (
    <View style={{ flex: 1, backgroundColor: UI.cardBg }}>
      <View style={{ paddingHorizontal: 16, paddingTop: modalHeaderTopPad, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.10)" }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={{ color: UI.text, fontSize: 20, fontWeight: "900" }}>Детали подряда</Text>
          <Pressable onPress={onClose}>
            <Text style={{ color: UI.sub, fontWeight: "900" }}>Закрыть</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, paddingTop: 10 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      >
        <View style={s.detailsCard}>
          <Text style={s.detailsRow}><Text style={s.detailsLabel}>ПОДРЯДЧИК:</Text> {templateContract?.contractor_org || "—"}</Text>
          <Text style={s.detailsRow}><Text style={s.detailsLabel}>ТЕЛЕФОН:</Text> {templateContract?.contractor_phone || "—"}</Text>
          <View style={{ height: 8 }} />
          <Text style={s.detailsRow}><Text style={s.detailsLabel}>ОБЪЕКТ:</Text> {templateObjectName || "—"}</Text>
          <Text style={s.detailsRow}><Text style={s.detailsLabel}>ЭТАЖ/УРОВЕНЬ:</Text> {templateLevelName || "—"}</Text>
          <Text style={s.detailsRow}><Text style={s.detailsLabel}>ВИД РАБОТ:</Text> {templateSystemName || "—"}</Text>
          <Text style={s.detailsRow}><Text style={s.detailsLabel}>ОБЪЕМ:</Text> {fmtAmount(templateContract?.qty_planned)} {templateContract?.uom || ""}</Text>
          <View style={{ height: 10 }} />
          <Text style={s.detailsRow}>
            <Text style={s.detailsLabel}>ПАРАМЕТРЫ ЗАЯВКИ (REQ):</Text> этаж, вид работ, зона
          </Text>
          <View style={{ marginTop: 8, gap: 8 }}>
            <ForemanDropdown
              label="Этаж / уровень"
              value={formLevelCode}
              options={lvlOptions}
              placeholder={templateLevelName || "Выбери этаж/уровень"}
              onChange={onChangeLevelCode}
              ui={UI}
              styles={s}
            />
            <ForemanDropdown
              label="Вид работ / система"
              value={formSystemCode}
              options={sysOptions}
              placeholder={templateSystemName || "Выбери вид работ"}
              onChange={onChangeSystemCode}
              ui={UI}
              styles={s}
            />
            <TextInput
              value={formZoneText}
              onChangeText={onChangeZoneText}
              placeholder="Зона / участок (например: секция A)"
              placeholderTextColor="rgba(255,255,255,0.45)"
              style={s.input}
            />
          </View>
        </View>

        <View style={s.pickTabsRow}>
          <Pressable style={s.pickTabBtn} onPress={onOpenCatalog}>
            <Ionicons name="list" size={18} color={UI.text} />
            <Text style={s.pickTabText}>Каталог</Text>
          </Pressable>
          <Pressable style={s.pickTabBtn} onPress={onOpenCalc}>
            <Ionicons name="calculator" size={18} color={UI.text} />
            <Text style={s.pickTabText}>Смета</Text>
          </Pressable>
        </View>

        <ForemanDraftSummaryCard
          model={draftCardModel}
          actionIcon="cube"
          onPress={onOpenDraft}
          ui={UI}
          styles={s}
        />

        <Pressable style={[s.draftCard, { display: "none" }]} onPress={onOpenDraft}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.draftTitle}>ЗАЯВКА НА МАТЕРИАЛЫ</Text>
            <Text style={s.draftNo}>{displayNo || "будет создана автоматически"}</Text>
            <Text style={s.draftHint}>{draftItemsCount > 0 ? "Открыть позиции и отправить" : "Добавьте материалы из каталога или сметы"}</Text>
          </View>
          <View style={s.posPill}>
            <Ionicons name="cube" size={18} color={UI.text} />
            <Text style={s.posPillText}>Позиции</Text>
            <View style={s.posCountPill}><Text style={s.posCountText}>{draftItemsCount}</Text></View>
          </View>
        </Pressable>
      </ScrollView>
    </View>
  );
}

export function DraftSheetBody(props: {
  displayNo: string;
  onClose: () => void;
  objectName: string;
  templateObjectName: string;
  levelName: string;
  templateLevelName: string;
  systemName: string;
  templateSystemName: string;
  zoneName: string;
  contractorName: string;
  phoneName: string;
  volumeText: string;
  draftItems: ReqItemRow[];
  saving: boolean;
  sending: boolean;
  requestId: string;
  onRemoveDraftItem: (id: string) => void;
  onClearDraft: () => void;
  onPdf: () => void;
  onExcel: () => void;
  onSendToDirector: () => void;
}) {
  const {
    displayNo,
    onClose,
    objectName,
    templateObjectName,
    levelName,
    templateLevelName,
    systemName,
    templateSystemName,
    zoneName,
    contractorName,
    phoneName,
    volumeText,
    draftItems,
    saving,
    sending,
    requestId,
    onRemoveDraftItem,
    onClearDraft,
    onPdf,
    onExcel,
    onSendToDirector,
  } = props;

  const renderDraftItem = useCallback(({ item }: { item: ReqItemRow }) => (
    <View style={s.draftRowCard}>
      <View style={s.draftRowMain}>
        <Text style={s.draftRowTitle}>{item.name_human}</Text>
        <Text style={s.draftRowMeta}>{`${item.qty} ${item.uom || ""}`.trim()}</Text>
        <Text style={s.draftRowStatus}>Статус: <Text style={s.draftRowStatusStrong}>Черновик</Text></Text>
      </View>
      <Pressable
        style={s.rejectBtn}
        onPress={() => onRemoveDraftItem(item.id)}
        accessibilityLabel="Удалить позицию"
      >
        <Text style={s.rejectIcon}>×</Text>
      </Pressable>
    </View>
  ), [onRemoveDraftItem]);

  return (
    <View style={s.sheet}>
      <View style={s.sheetHandle} />

      <View style={s.sheetTopBar}>
        <Text style={s.sheetTitle} numberOfLines={1}>Черновик {displayNo || ""}</Text>
        <CloseIconButton onPress={onClose} accessibilityLabel="Закрыть черновик" size={24} color={UI.text} />
      </View>

      <View style={s.sheetMetaBox}>
        <Text style={s.sheetMetaLine}>
          Объект: <Text style={s.sheetMetaValue}>{objectName || templateObjectName || "—"}</Text>
        </Text>
        <Text style={s.sheetMetaLine}>
          Этаж/уровень: <Text style={s.sheetMetaValue}>{levelName || templateLevelName || "—"}</Text>
        </Text>
        <Text style={s.sheetMetaLine}>
          Система: <Text style={s.sheetMetaValue}>{systemName || templateSystemName || "—"}</Text>
        </Text>
        <Text style={s.sheetMetaLine}>
          Зона: <Text style={s.sheetMetaValue}>{zoneName || "—"}</Text>
        </Text>
        <Text style={s.sheetMetaLine}>
          Подрядчик: <Text style={s.sheetMetaValue}>{contractorName || "—"}</Text>
        </Text>
        <Text style={s.sheetMetaLine}>
          Телефон: <Text style={s.sheetMetaValue}>{phoneName || "—"}</Text>
        </Text>
        <Text style={s.sheetMetaLine}>
          Объём: <Text style={s.sheetMetaValue}>{volumeText || "—"}</Text>
        </Text>
      </View>

      <View style={{ flex: 1, minHeight: 0 }}>
        {draftItems.length > 0 ? (
          <FlashList
            data={draftItems}
            keyExtractor={(it) => it.id}
            renderItem={renderDraftItem}
            overrideItemLayout={(layout: { size?: number }) => {
              layout.size = 82;
            }}
          />
        ) : (
          <Text style={s.historyModalEmpty}>Позиции не найдены</Text>
        )}
      </View>

      <View style={s.reqActionsBottom}>
        <View style={s.actionBtnSquare}>
          <DeleteAllButton
            disabled={saving || sending}
            loading={false}
            accessibilityLabel="Удалить черновик"
            onPress={onClearDraft}
          />
        </View>

        <View style={s.sp8} />

        <Pressable
          disabled={saving || sending || !requestId}
          onPress={onPdf}
          style={({ pressed }) => [
            s.actionBtnWide,
            { backgroundColor: pressed ? "#31343A" : "#2A2D32", opacity: saving || sending || !requestId ? 0.6 : 1 },
          ]}
        >
          <Text style={s.actionText}>PDF</Text>
        </Pressable>

        <View style={s.sp8} />

        <Pressable
          disabled={saving || sending}
          onPress={onExcel}
          style={({ pressed }) => [
            s.actionBtnWide,
            { backgroundColor: pressed ? "#31343A" : "#2A2D32", opacity: saving || sending ? 0.6 : 1 },
          ]}
        >
          <Text style={s.actionText}>Excel</Text>
        </Pressable>

        <View style={s.sp8} />

        <View style={s.actionBtnSquare}>
          <SendPrimaryButton
            variant="green"
            disabled={saving || sending || !requestId || draftItems.length === 0}
            loading={sending}
            onPress={onSendToDirector}
          />
        </View>
      </View>
    </View>
  );
}
