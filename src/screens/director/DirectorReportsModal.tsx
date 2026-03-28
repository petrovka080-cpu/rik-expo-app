import React from "react";
import { Alert, Modal, Pressable, Text, View } from "react-native";
import { FlashList } from "@/src/ui/FlashList";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PeriodPickerSheet from "../../components/PeriodPickerSheet";
import DirectorFinanceCardModal from "./DirectorFinanceCardModal";
import { useDirectorReportsModalState } from "./hooks/useDirectorReportsModalState";
import { UI, s } from "./director.styles";
import {
  type RepDisciplineLevel,
  type RepDisciplinePayload,
  type RepDisciplineWork,
  type RepPayload,
  type RepRow,
  type RepTab,
} from "./director.types";

type Props = {
  visible: boolean;
  onClose: () => void;
  repData: RepPayload | null;
  repDiscipline: RepDisciplinePayload | null;
  repPeriodShort: string;
  repLoading: boolean;
  repDisciplinePriceLoading: boolean;
  repPeriodOpen: boolean;
  onOpenPeriod: () => void;
  onClosePeriod: () => void;
  repFrom: string | null;
  repTo: string | null;
  onApplyPeriod: (from: string, to: string) => void;
  onClearPeriod: () => void;
  repObjOpen: boolean;
  onCloseRepObj: () => void;
  repOptObjects: string[];
  applyObjectFilter: (name: string | null) => Promise<void>;
  repObjectName: string | null;
  onOpenRepObj: () => void;
  repOptLoading: boolean;
  repTab: RepTab;
  setRepTab: (t: RepTab) => void;
  onRefresh: () => Promise<void>;
  onExportProductionPdf?: () => Promise<void> | void;
  onExportSubcontractPdf?: () => Promise<void> | void;
};

const money = (v: number) => `${Math.round(Number(v || 0)).toLocaleString("ru-RU")} KGS`;

export default function DirectorReportsModal({
  visible,
  onClose,
  repData,
  repDiscipline,
  repPeriodShort,
  repLoading,
  repDisciplinePriceLoading,
  repPeriodOpen,
  onOpenPeriod,
  onClosePeriod,
  repFrom,
  repTo,
  onApplyPeriod,
  onClearPeriod,
  repObjOpen,
  onCloseRepObj,
  repOptObjects,
  applyObjectFilter,
  repObjectName,
  onOpenRepObj,
  repOptLoading,
  repTab,
  setRepTab,
  onRefresh,
  onExportProductionPdf,
  onExportSubcontractPdf,
}: Props) {
  const insets = useSafeAreaInsets();
  const {
    rows,
    objectOptions,
    objectCount,
    objectCountLabel,
    issuesTotal,
    issuesNoObj,
    itemsTotal,
    itemsNoReq,
    unresolvedNamesCount,
    noWorkNameCount,
    reportDiagnostics,
    sortedWorks,
    sortedWorkLevels,
    topWorkMaterials,
    sortedLevelMaterials,
    levelModalTitle,
    disSummary,
    ratioTint,
    issueCost,
    purchaseCost,
    hasCostBase,
    ratioText,
    workModal,
    levelModal,
    compactParts,
    WITHOUT_WORK_PREFIX,
    normKey,
    resetDetailOverlays,
    openWorkDetail,
    openLevelDetail,
    backToWorkDetail,
    setWorkModal,
    setLevelModal,
    pct,
  } = useDirectorReportsModalState({
    repData,
    repDiscipline,
    repOptObjects,
    repDisciplinePriceLoading,
  });
  const detailTopInset = Math.max(insets.top || 0, 12) + 8;
  const detailBottomInset = Math.max(insets.bottom || 0, 16) + 12;

  const onTabPress = React.useCallback((tab: RepTab) => {
    resetDetailOverlays();
    setRepTab(tab);
  }, [resetDetailOverlays, setRepTab]);

  const handleCloseAll = React.useCallback(() => {
    resetDetailOverlays();
    onClose();
  }, [onClose, resetDetailOverlays]);

  const renderMaterialRow = React.useCallback(({ item }: { item: RepRow }) => {
    const qAll = Number(item.qty_total || 0);
    const qNoReq = Number(item.qty_free || 0);
    const docs = Number(item.docs_cnt || 0);
    const docsNoReq = Number(item.docs_free || 0);
    return (
      <View style={[s.mobCard, { marginBottom: 10 }]}>
        <View style={s.mobMain}>
          <Text style={s.mobTitle} numberOfLines={2}>{item.name_human_ru || item.rik_code}</Text>
          <Text style={s.mobMeta} numberOfLines={2}>
            {`Выдано: ${qAll} ${item.uom} · Док. ${docs}`}
            {qNoReq > 0 ? ` · Без заявки: ${qNoReq} (${docsNoReq} док.)` : ""}
          </Text>
        </View>
      </View>
    );
  }, []);

  const renderObjectOptionRow = React.useCallback(({ item }: { item: string }) => (
    <Pressable
      onPress={async () => {
        onCloseRepObj();
        await applyObjectFilter(item);
      }}
      style={[s.mobCard, { marginHorizontal: 12, marginBottom: 10 }]}
    >
      <Text style={{ color: UI.text, fontWeight: "900" }} numberOfLines={2}>{item}</Text>
    </Pressable>
  ), [applyObjectFilter, onCloseRepObj]);

  const renderWorkRow = React.useCallback(({ item }: { item: RepDisciplineWork }) => {
    const isMissingWork = normKey(String(item.work_type_name || "")).startsWith(WITHOUT_WORK_PREFIX);
    const locations = Array.isArray(item.levels) ? item.levels : [];
    const preview = locations
      .slice(0, 2)
      .map((level) =>
        String(
          level.location_label ||
          compactParts([level.object_name, level.level_name, level.system_name, level.zone_name]).join(" / ") ||
          level.level_name ||
          "",
        ).trim(),
      )
      .filter(Boolean)
      .join(" | ");

    return (
      <Pressable onPress={() => openWorkDetail(item)} style={[s.mobCard, { marginBottom: 10 }]}>
        <View style={s.mobMain}>
          <Text style={[s.mobTitle, isMissingWork ? { color: "#EF4444" } : null]} numberOfLines={1}>{item.work_type_name}</Text>
          <Text style={s.mobMeta} numberOfLines={1}>{`Позиции: ${item.total_positions} · Локации: ${Number(item.location_count ?? locations.length)}`}</Text>
          <Text style={s.mobMeta} numberOfLines={1}>{`По заявке: ${item.req_positions} · Свободно: ${item.free_positions}`}</Text>
          {preview ? <Text style={s.mobMeta} numberOfLines={2}>{preview}</Text> : null}
          {isMissingWork ? (
            <Text style={[s.mobMeta, { color: "#FCA5A5" }]} numberOfLines={2}>
              Позиции без заполненного work_name в подтверждённых выдачах. Это пробел данных, а не ошибка интерфейса.
            </Text>
          ) : null}
        </View>
      </Pressable>
    );
  }, [WITHOUT_WORK_PREFIX, compactParts, normKey, openWorkDetail]);

  const renderLevelRow = React.useCallback(({ item }: { item: RepDisciplineLevel }) => (
    <Pressable onPress={() => openLevelDetail(item)} style={[s.mobCard, { marginHorizontal: 12, marginBottom: 10 }]}>
      <View style={s.mobMain}>
        <Text style={s.mobTitle} numberOfLines={2}>{item.location_label || item.level_name}</Text>
        <Text style={s.mobMeta} numberOfLines={1}>{compactParts([item.object_name, item.level_name]).join(" / ")}</Text>
        {compactParts([item.system_name, item.zone_name]).length ? (
          <Text style={s.mobMeta} numberOfLines={1}>{compactParts([item.system_name, item.zone_name]).join(" / ")}</Text>
        ) : null}
        <Text style={s.mobMeta} numberOfLines={1}>{`Позиции: ${item.total_positions} · Материалы: ${Array.isArray(item.materials) ? item.materials.length : 0}`}</Text>
        <Text style={s.mobMeta} numberOfLines={1}>{`По заявке: ${item.req_positions} · Свободно: ${item.free_positions}`}</Text>
      </View>
    </Pressable>
  ), [compactParts, openLevelDetail]);

  const renderLevelMaterialRow = React.useCallback(({ item }: { item: RepDisciplineLevel["materials"][number] }) => (
    <View style={[s.mobCard, { marginHorizontal: 12, marginBottom: 10 }]}>
      <View style={s.mobMain}>
        <Text style={s.mobTitle} numberOfLines={2}>{item.material_name}</Text>
        <Text style={s.mobMeta} numberOfLines={1}>{`${item.qty_sum} ${item.uom || ""}`}</Text>
        <Text style={s.mobMeta} numberOfLines={1}>{`Цена: ${money(Number(item.unit_price ?? 0))} · Сумма: ${money(Number(item.amount_sum ?? 0))}`}</Text>
      </View>
    </View>
  ), []);

  const renderWorkTopMaterialRow = React.useCallback(({ item }: { item: typeof topWorkMaterials[number] }) => (
    <View style={[s.mobCard, { marginHorizontal: 12, marginBottom: 10 }]}>
      <View style={s.mobMain}>
        <Text style={s.mobTitle} numberOfLines={2}>{item.material_name}</Text>
        <Text style={s.mobMeta} numberOfLines={1}>{`${item.qty_sum} ${item.uom || ""}`}</Text>
        <Text style={s.mobMeta} numberOfLines={1}>{`Документов: ${item.docs_count}`}</Text>
      </View>
    </View>
  ), []);

  const objectOptionKeyExtractor = React.useCallback((item: string) => item, []);
  const materialRowKeyExtractor = React.useCallback(
    (item: RepRow) => `${String(item.rik_code || "")}:${String(item.uom || "")}:${String(item.name_human_ru || "")}`,
    [],
  );
  const disciplineWorkKeyExtractor = React.useCallback((item: RepDisciplineWork) => item.id, []);
  const levelKeyExtractor = React.useCallback((item: RepDisciplineLevel) => item.id, []);
  const levelMaterialKeyExtractor = React.useCallback(
    (item: RepDisciplineLevel["materials"][number]) =>
      `${String(item.rik_code || "")}:${String(item.uom || "")}:${String(item.material_name || "")}`,
    [],
  );
  const workTopMaterialKeyExtractor = React.useCallback(
    (item: typeof topWorkMaterials[number]) =>
      `${String(item.rik_code || "")}:${String(item.uom || "")}:${String(item.material_name || "")}`,
    [],
  );

  const disciplineListHeader = React.useMemo(() => (
    <View style={[s.mobCard, { marginBottom: 10, borderColor: ratioTint }]}>
      <View style={s.mobMain}>
        <Text style={s.mobTitle}>Расход / Закупки (%)</Text>
        <Text style={[s.mobTitle, { color: ratioTint }]}>{`Расход / Закупки: ${repDisciplinePriceLoading ? "…" : ratioText}`}</Text>
        <Text style={s.mobMeta}>По стоимости за период</Text>
        {!repDisciplinePriceLoading ? (
          <Text style={s.mobMeta}>{`Расход: ${money(issueCost)} · Закупки: ${money(purchaseCost)}`}</Text>
        ) : null}
        {!repDisciplinePriceLoading && Number(disSummary?.unpriced_issue_pct ?? 0) > 0 ? (
          <Text style={s.mobMeta}>{`Неоценено: ${Number(disSummary?.unpriced_issue_pct ?? 0)}%`}</Text>
        ) : null}
        {!repDisciplinePriceLoading && !hasCostBase ? (
          <Text style={s.mobMeta}>Недостаточно цен для расчёта базы закупок.</Text>
        ) : null}
      </View>
    </View>
  ), [disSummary?.unpriced_issue_pct, hasCostBase, issueCost, purchaseCost, ratioText, ratioTint, repDisciplinePriceLoading]);

  const levelModalHeader = React.useMemo(() => {
    if (!levelModal) return null;
    return (
      <View style={[s.mobCard, { marginHorizontal: 12, marginBottom: 10 }]}>
        <View style={s.mobMain}>
          <Text style={s.mobTitle} numberOfLines={2}>{levelModal.level.location_label || levelModal.level.level_name}</Text>
          <Text style={s.mobMeta} numberOfLines={1}>{compactParts([levelModal.level.object_name, levelModal.level.level_name]).join(" / ")}</Text>
          {compactParts([levelModal.level.system_name, levelModal.level.zone_name]).length ? (
            <Text style={s.mobMeta} numberOfLines={1}>{compactParts([levelModal.level.system_name, levelModal.level.zone_name]).join(" / ")}</Text>
          ) : null}
          <Text style={s.mobMeta} numberOfLines={1}>{`Позиции: ${levelModal.level.total_positions} · Материалы: ${sortedLevelMaterials.length}`}</Text>
        </View>
      </View>
    );
  }, [compactParts, levelModal, sortedLevelMaterials.length]);

  const workModalHeader = React.useMemo(() => {
    if (!workModal) return null;
    return (
      <View style={[s.mobCard, { marginHorizontal: 12, marginBottom: 10 }]}>
        <View style={s.mobMain}>
          <Text style={s.mobTitle} numberOfLines={1}>{workModal.work_type_name}</Text>
          <Text style={s.mobMeta} numberOfLines={1}>{`Локации: ${sortedWorkLevels.length}`}</Text>
          <Text style={s.mobMeta} numberOfLines={1}>{`Позиции: ${workModal.total_positions}`}</Text>
          <Text style={s.mobMeta} numberOfLines={1}>{`По заявке: ${workModal.req_positions} · Свободно: ${workModal.free_positions}`}</Text>
          <Text style={s.mobMeta} numberOfLines={1}>{`Документов: ${workModal.total_docs} · Кол-во: ${workModal.total_qty}`}</Text>
        </View>
      </View>
    );
  }, [sortedWorkLevels.length, workModal]);

  const workModalFooter = React.useMemo(() => {
    if (!topWorkMaterials.length) return null;
    return (
      <View>
        {topWorkMaterials.map((item) => (
          <React.Fragment key={workTopMaterialKeyExtractor(item)}>
            {renderWorkTopMaterialRow({ item })}
          </React.Fragment>
        ))}
      </View>
    );
  }, [renderWorkTopMaterialRow, topWorkMaterials, workTopMaterialKeyExtractor]);

  return (
    <DirectorFinanceCardModal
      visible={visible}
      onClose={handleCloseAll}
      title="Весь период (даты)"
      periodShort={repPeriodShort}
      loading={repLoading}
      onOpenPeriod={onOpenPeriod}
      onRefresh={onRefresh}
      onPdf={() => void onExportProductionPdf?.()}
      onPdfSecondary={() => void onExportSubcontractPdf?.()}
      pdfPrimaryLabel={"PDF Производство"}
      pdfSecondaryLabel={"PDF Подряды"}
      overlay={
        repPeriodOpen ? (
          <PeriodPickerSheet
            visible={repPeriodOpen}
            onClose={onClosePeriod}
            initialFrom={repFrom || ""}
            initialTo={repTo || ""}
            onApply={onApplyPeriod}
            onClear={onClearPeriod}
            ui={{
              cardBg: UI.cardBg,
              text: UI.text,
              sub: UI.sub,
              border: "rgba(255,255,255,0.14)",
              accentBlue: "#3B82F6",
              approve: "#22C55E",
            }}
          />
        ) : repObjOpen ? (
          <Modal
            visible={repObjOpen}
            transparent
            animationType="slide"
            onRequestClose={onCloseRepObj}
          >
            <Pressable
              onPress={onCloseRepObj}
              style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.55)" }}
            >
              <Pressable onPress={() => {}} style={s.sheet}>
                <View style={s.sheetHandle} />
                <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 14, paddingBottom: 10 }}>
                  <Text style={{ color: UI.text, fontWeight: "900", fontSize: 16 }}>{`${objectCountLabel} (${objectCount})`}</Text>
                  <Pressable onPress={onCloseRepObj}><Text style={{ color: UI.sub, fontWeight: "900" }}>Закрыть</Text></Pressable>
                </View>
                <FlashList
                  style={{ maxHeight: 420 }}
                  data={objectOptions}
                  renderItem={renderObjectOptionRow}
                  keyExtractor={objectOptionKeyExtractor}
                  contentContainerStyle={{ paddingBottom: 4 }}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                />
              </Pressable>
            </Pressable>
          </Modal>
        ) : levelModal ? (
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: UI.bg }}>
            <View style={{ paddingTop: detailTopInset, paddingHorizontal: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: UI.border, backgroundColor: UI.bg }}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: UI.text, fontWeight: "900", fontSize: 16 }} numberOfLines={2}>{levelModalTitle}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                    <Pressable onPress={backToWorkDetail}><Text style={{ color: UI.sub, fontWeight: "900" }}>Назад</Text></Pressable>
                    <Pressable onPress={() => setLevelModal(null)}><Text style={{ color: UI.sub, fontWeight: "900" }}>Закрыть</Text></Pressable>
                  </View>
                </View>
              </View>
            </View>
            <FlashList
              key={`level:${levelModal.work.id}:${levelModal.level.id}`}
              style={{ flex: 1 }}
              data={sortedLevelMaterials}
              renderItem={renderLevelMaterialRow}
              keyExtractor={levelMaterialKeyExtractor}
              ListHeaderComponent={levelModalHeader}
              contentContainerStyle={{ paddingTop: 12, paddingBottom: detailBottomInset }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            />
          </View>
        ) : workModal ? (
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: UI.bg }}>
            <View style={{ paddingTop: detailTopInset, paddingHorizontal: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: UI.border, backgroundColor: UI.bg }}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: UI.text, fontWeight: "900", fontSize: 16 }} numberOfLines={1}>{`Работа: ${workModal.work_type_name}`}</Text>
                  <Pressable onPress={() => setWorkModal(null)}><Text style={{ color: UI.sub, fontWeight: "900" }}>Закрыть</Text></Pressable>
                </View>
              </View>
            </View>
            <FlashList
              key={`work:${workModal.id}`}
              style={{ flex: 1 }}
              data={sortedWorkLevels}
              renderItem={renderLevelRow}
              keyExtractor={levelKeyExtractor}
              ListHeaderComponent={workModalHeader}
              ListFooterComponent={workModalFooter}
              contentContainerStyle={{ paddingTop: 12, paddingBottom: detailBottomInset }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            />
          </View>
        ) : null
      }
    >
      <View style={{ marginBottom: 10 }}>
        <Text style={{ color: UI.sub, fontWeight: "900", marginBottom: 6 }}>Склад</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          <Pressable onPress={() => void applyObjectFilter(null)} style={[s.tab, !repObjectName && s.tabActive, { marginRight: 8, marginBottom: 8 }]}>
            <Text style={{ color: !repObjectName ? UI.text : UI.sub, fontWeight: "900" }}>Все</Text>
          </Pressable>
          <Pressable onPress={onOpenRepObj} style={[s.tab, repObjectName && s.tabActive, { marginRight: 8, marginBottom: 8 }]}>
            <Text style={{ color: repObjectName ? UI.text : UI.sub, fontWeight: "900" }}>{`${objectCountLabel} · ${objectCount}`}</Text>
          </Pressable>
          {repObjectName ? (
            <Pressable onPress={onOpenRepObj} style={[s.tab, s.tabActive, { marginRight: 8, marginBottom: 8 }]}>
              <Text numberOfLines={1} style={{ color: UI.text, fontWeight: "900", maxWidth: 220 }}>{repObjectName}</Text>
            </Pressable>
          ) : null}
          {repOptLoading ? <Text style={{ color: UI.sub, fontWeight: "800", marginLeft: 4, marginTop: 8 }}>…</Text> : null}
        </View>
        <Text style={[s.mobMeta, { marginTop: 6 }]} numberOfLines={2}>{objectCountLabel}</Text>
        {unresolvedNamesCount > 0 || noWorkNameCount > 0 ? (
          <Text style={[s.mobMeta, { marginTop: 4 }]} numberOfLines={2}>
            {`Неразрешённых кодов: ${unresolvedNamesCount} · Без вида работ: ${noWorkNameCount}`}
          </Text>
        ) : null}
        {reportDiagnostics ? (
          <Text style={[s.mobMeta, { marginTop: 4 }]} numberOfLines={2}>
            {`Naming: v_rik_names_ru ${reportDiagnostics.naming.vrr} · overrides ${reportDiagnostics.naming.overrides} · ledger ${reportDiagnostics.naming.ledger}`}
          </Text>
        ) : null}
      </View>

      {repTab === "materials" ? (
        <View style={{ marginBottom: 10 }}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={[s.kpiPillHalf, { flex: 1 }]}>
              <Text style={s.kpiLabel}>Документов</Text>
              <Text style={s.kpiValue}>{repLoading ? "…" : String(issuesTotal)}</Text>
            </View>
            <View style={[s.kpiPillHalf, { flex: 1 }]}>
              <Text style={s.kpiLabel}>Позиций</Text>
              <Text style={s.kpiValue}>{repLoading ? "…" : String(itemsTotal)}</Text>
            </View>
          </View>
          <View style={{ height: 8 }} />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={[s.kpiPillHalf, { flex: 1 }]}>
              <Text style={s.kpiLabel}>Без объекта</Text>
              <Text style={s.kpiValue}>{repLoading ? "…" : `${issuesNoObj} · ${pct(issuesNoObj, issuesTotal)}%`}</Text>
            </View>
            <View style={[s.kpiPillHalf, { flex: 1 }]}>
              <Text style={s.kpiLabel}>Без заявки</Text>
              <Text style={s.kpiValue}>{repLoading ? "…" : `${itemsNoReq} · ${pct(itemsNoReq, itemsTotal)}%`}</Text>
            </View>
          </View>
        </View>
      ) : null}

      <View style={{ flexDirection: "row", marginBottom: 10 }}>
        {(["materials", "discipline"] as RepTab[]).map((tab) => {
          const active = repTab === tab;
          return (
            <Pressable key={tab} onPress={() => onTabPress(tab)} style={[s.tab, active && s.tabActive, { marginRight: 8 }]}>
              <Text style={{ color: active ? UI.text : UI.sub, fontWeight: "900" }}>
                {tab === "materials" ? "Материалы" : "Работы"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flex: 1, minHeight: 0 }}>
        {repTab === "materials" ? (
          <FlashList
            style={{ flex: 1 }}
            data={rows}
            renderItem={renderMaterialRow}
            keyExtractor={materialRowKeyExtractor}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 4 }}
            ListEmptyComponent={!repLoading && !rows.length ? (
              <Text style={{ opacity: 0.7, color: UI.sub, paddingVertical: 8 }}>Нет выдач за выбранный период.</Text>
            ) : null}
          />
        ) : (
          <FlashList
            style={{ flex: 1 }}
            data={sortedWorks}
            renderItem={renderWorkRow}
            keyExtractor={disciplineWorkKeyExtractor}
            ListHeaderComponent={disciplineListHeader}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 4 }}
            ListEmptyComponent={!repLoading && !sortedWorks.length ? (
              <Text style={{ opacity: 0.7, color: UI.sub, paddingVertical: 8 }}>Нет данных по работам за период.</Text>
            ) : null}
          />
        )}
      </View>

      <View style={{ marginTop: 10, flexDirection: "row", gap: 8 }}>
        <Pressable
          onPress={() => Alert.alert("Excel", "Позже добавим выгрузку Excel.")}
          style={[s.openBtn, { paddingVertical: 10, paddingHorizontal: 14, backgroundColor: UI.btnNeutral }]}
        >
          <Text style={[s.openBtnText, { fontSize: 12 }]}>Excel</Text>
        </Pressable>

        <Pressable
          onPress={() => void applyObjectFilter(null)}
          style={[s.openBtn, { paddingVertical: 10, paddingHorizontal: 14, backgroundColor: "rgba(255,255,255,0.06)" }]}
        >
          <Text style={[s.openBtnText, { fontSize: 12 }]}>{`Все ${objectCountLabel.toLowerCase()}`}</Text>
        </Pressable>
      </View>
    </DirectorFinanceCardModal>
  );
}
