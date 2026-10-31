import {canonicalPublicResourceCategoryTitleRuV1} from '../../lib/estimate/backendPlatform/canonicalPublicResourcePresentationV1';
import { canonicalPurchaseItemSupplyWarningV1, canonicalExactPurchaseEditingV1 } from "./canonicalExactPurchaseEditingV1";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { formatEstimateMoney } from "../../lib/ai/globalEstimate/formatEstimateMoney";
import { canonicalPurchaseShortageMessageV1 } from "../../lib/estimate/backendPlatform/canonicalPurchaseBalanceV1";
import { canonicalArtifactPurchaseRequirement } from "../../lib/estimate/backendPlatform/canonicalPersistedPurchaseBalance";
import { formatEstimateQuantityRu } from "../../lib/estimatePresentation/formatEstimateQuantityRu";
import { canonicalPublicEstimatePendingRowTitleRu } from '../../lib/estimate/backendPlatform/canonicalPublicEstimateLanguageRu';
import { formatEstimateUnitLabel } from "../../lib/ai/globalEstimate/formatEstimateUnitLabel";
import type { ConsumerRepairRequestItem } from "../../lib/consumerRequests/consumerRequestTypes";
import type { ConsumerRepairQuantityChangeMeta } from "./consumerRepairQuantityEditTrace";
import { buildRequestEstimateProfessionalRowEvidence } from "./requestEstimateViewModel";
import {
  consumerRepairCanonicalRowNativeId,
  consumerRepairRowCalculatedQuantity,
  consumerRepairRowCode,
  consumerRepairRowCostTreatment,
  consumerRepairRowCostCoverageLabel,
  consumerRepairRowCommercialScopeLabel,
  consumerRepairRowHasManualQuantity,
  consumerRepairRowHasSourceManagedQuantity,
  consumerRepairRowDerivedQuantityEditReason,
  consumerRepairRowIncludedInEstimate,
  consumerRepairRowIsCanonicalPreliminaryNeed,
  consumerRepairRowIsNonPayable,
  consumerRepairRowPriceIsEditable,
  consumerRepairRowRequirementNotice,
  consumerRepairRowApplicationCalculationPending,
  consumerRepairRowPublicResourcePresentation,
} from "./consumerRepairRowMetadata";
import { useConsumerRepairItemRowEditing } from "./useConsumerRepairItemRowEditing";
import { useCanonicalPreliminaryNeedEvidence } from "./useCanonicalPreliminaryNeedEvidence";
import {consumerMachineHourPriceDecision,consumerMachineHourPriceNeedsConfirmation} from '../../lib/consumerRequests/consumerMachineHourPriceCoverage';
import {canonicalMachineHourPriceConfirmationRuV1,canonicalMachineHourPricePromptRuV1} from '../../lib/estimate/backendPlatform/canonicalMachineHourPriceCoverageV1';

type Props = {
  parameterRequirementTables?: import("../../lib/consumerRequests/consumerCanonicalParameterRequirements").CanonicalParameterRequirementTables | null;
  item: ConsumerRepairRequestItem;
  onDecrease: (itemId: string) => void;
  onIncrease: (itemId: string) => void;
  onQuantityChange: (itemId: string, value: string, meta?: ConsumerRepairQuantityChangeMeta) => void;
  onUnitPriceChange: (itemId: string, value: string) => void;
  onConfirmMachineHourPrice?: (itemId:string)=>void;
  numericEditResetKey?: number;
  onSpecificationChange?: (itemId: string, value: string) => void;
  onOptionalChange?: (itemId: string, optional: boolean) => void;
  onRemove: (itemId: string) => void;
  onOpenCatalog?: (itemId: string) => void;
  onOpenPhoto?: (itemId: string) => void;
  showPhotoButton?: boolean;
  photoThumbnailUri?: string | null;
  hasPhotoAttachment?: boolean;
};

function bindingLabel(item: ConsumerRepairRequestItem): string | null {
  if (item.itemType !== "material") return null;
  if (item.selectedCatalogItemId || item.catalogItemId) return "\u041a\u0430\u0442\u0430\u043b\u043e\u0433: \u0432\u044b\u0431\u0440\u0430\u043d";
  if (item.catalogBindingStatus === "multiple_candidates") return "\u041a\u0430\u0442\u0430\u043b\u043e\u0433: \u0435\u0441\u0442\u044c \u0432\u0430\u0440\u0438\u0430\u043d\u0442\u044b";
  if (item.catalogBindingStatus === "matched") return "\u041a\u0430\u0442\u0430\u043b\u043e\u0433: \u043d\u0430\u0439\u0434\u0435\u043d";
  if (item.catalogBindingStatus === "no_catalog_match") return "\u041a\u0430\u0442\u0430\u043b\u043e\u0433: \u043f\u043e\u0434\u043e\u0431\u0440\u0430\u0442\u044c";
  return "\u041a\u0430\u0442\u0430\u043b\u043e\u0433";
}

function priceStatusLabel(item: ConsumerRepairRequestItem): string {
  if (item.priceStatus === "USER_PRICE_OVERRIDE") return "\u0446\u0435\u043d\u0430 \u0432\u0440\u0443\u0447\u043d\u0443\u044e";
  if (item.priceStatus === "USER_ENTERED_PRICE") return "\u0446\u0435\u043d\u0430 \u0432\u0432\u0435\u0434\u0435\u043d\u0430";
  if (item.priceStatus === "USER_CONFIRMED_MARKET_PRICE") return "\u0446\u0435\u043d\u0430 \u043f\u043e \u0444\u043e\u0442\u043e, \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0430";
  if (item.priceStatus === "CATALOG_PRICE_VERIFIED") return "\u0446\u0435\u043d\u0430 \u0438\u0437 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0430";
  if (item.priceStatus === "REFERENCE_PRICE_ESTIMATE" || item.priceStatus === "PRICEBOOK_VERIFIED") {
    return "\u0446\u0435\u043d\u0430 \u0438\u0437 \u0440\u0430\u0441\u0447\u0435\u0442\u0430";
  }
  return "\u0446\u0435\u043d\u0430 \u043d\u0443\u0436\u043d\u0430";
}

function ConsumerRepairItemRowComponent({
  item,
  parameterRequirementTables,
  onQuantityChange,
  onUnitPriceChange,
  onConfirmMachineHourPrice,
  numericEditResetKey,
  onSpecificationChange,
  onOptionalChange,
  onRemove,
  onOpenCatalog,
  onOpenPhoto,
  showPhotoButton,
  photoThumbnailUri,
  hasPhotoAttachment,
}: Props): React.ReactElement {
  const unitLabel = React.useMemo(() => formatEstimateUnitLabel(item.unitLabel || item.unit), [item.unit, item.unitLabel]);
  const catalogBindingLabel = React.useMemo(() => bindingLabel(item), [item]);
  const totalLabel = React.useMemo(
    () => (item.totalPrice != null
      ? formatEstimateMoney(item.totalPrice, item.currency)
      : "\u2014"),
    [item.currency, item.totalPrice],
  );
  const itemPriceStatusLabel = React.useMemo(() => priceStatusLabel(item), [item]);
  const photoRowIdentity = React.useMemo(
    () => consumerRepairRowCode(item) || item.id,
    [item],
  );
  const canonicalRowNativeId = React.useMemo(
    () => consumerRepairCanonicalRowNativeId(item),
    [item],
  );
  const supplyWarning = canonicalPurchaseItemSupplyWarningV1(item);
  const exactQuantity = canonicalExactPurchaseEditingV1(item);
  const itemOptional = !consumerRepairRowIncludedInEstimate(item);
  const sourceManagedNeed = consumerRepairRowHasSourceManagedQuantity(item, parameterRequirementTables);
  const derivedQuantityEditReason = consumerRepairRowDerivedQuantityEditReason(item);
  const nonPayableRow = consumerRepairRowIsNonPayable(item);
  const priceEditable = consumerRepairRowPriceIsEditable(item);
  const [requirementDetailsOpen, setRequirementDetailsOpen] = React.useState(false);
  React.useEffect(() => setRequirementDetailsOpen(false), [item.id]);
  const manualQuantityOverride = consumerRepairRowHasManualQuantity(item);
  const calculatedQuantity = consumerRepairRowCalculatedQuantity(item);
  const preliminaryNeed = consumerRepairRowIsCanonicalPreliminaryNeed(item);
  const applicationPending = consumerRepairRowApplicationCalculationPending(item, parameterRequirementTables);
  const purchaseRequirement = supplyWarning ? null : canonicalArtifactPurchaseRequirement({ row_id: item.sourceParameters?.rowCode ?? item.id, unit_id: item.unit,
    calculation_trace: { purchaseRequirementV1: item.sourceParameters?.canonicalPurchaseRequirement } });
  const purchaseShortage = supplyWarning ?? canonicalPurchaseShortageMessageV1([{ rowId: item.id, titleRu: item.titleRu,
    calculationTrace: { purchaseBalance: item.sourceParameters?.canonicalPurchaseBalance } }]);
  const requirementNotice = supplyWarning ?? consumerRepairRowRequirementNotice(item, parameterRequirementTables);
  const publicResourcePresentation = React.useMemo(() => consumerRepairRowPublicResourcePresentation(item), [item]);
  const resourceCategoryTitle=canonicalPublicResourceCategoryTitleRuV1({
    titleRu:publicResourcePresentation?.sourceTitleRu??item.titleRu,
    descriptor:publicResourcePresentation,category:item.category,
    manualTitleOverride:item.sourceParameters?.canonicalManualTitleOverride===true,
  })??'Категория не определена';
  const {
    quantityInputRef,
    quantityText,
    setQuantityText,
    priceText,
    setPriceText,
    specificationText,
    setSpecificationText,
    specificationEditing,
    professionalEvidenceOpen,
    setProfessionalEvidenceOpen,
    beginSpecificationEdit,
    finishSpecificationEdit,
    beginQuantityEdit,
    finishQuantityEdit,
    beginPriceEdit,
    finishPriceEdit,
    stepQuantity,
    restoreCalculatedQuantity,
  } = useConsumerRepairItemRowEditing({
    item,
    numericEditResetKey,
    onQuantityChange,
    onUnitPriceChange,
    onSpecificationChange,
  });
  const needEvidence = useCanonicalPreliminaryNeedEvidence(item.sourceParameters?.canonicalNeedEvidenceReference, professionalEvidenceOpen);
  const professionalEvidence = React.useMemo(() => buildRequestEstimateProfessionalRowEvidence(needEvidence.evidence == null ? item : {
    ...item,
    sourceParameters: { ...item.sourceParameters,
      normativeRowTraceV3: needEvidence.evidence.rawNeed.normative_trace,
      canonicalNeedEvidenceStatus: "loaded",
    },
  }, parameterRequirementTables), [item, needEvidence.evidence, parameterRequirementTables]);
  return (
    <View
      style={[styles.row, preliminaryNeed && !applicationPending ? styles.unresolvedRow : null]}
      testID={`consumer-repair-item-${item.id}`}
      nativeID={canonicalRowNativeId}
    >
      <View style={styles.main}>
        {purchaseShortage ? (
          <View accessibilityLiveRegion="polite" style={styles.unresolvedNotice}
            testID={`consumer-repair-item-purchase-shortage-${item.id}`}>
            <Text style={styles.unresolvedNoticeText}>{purchaseShortage}</Text>
          </View>
        ) : null}
        {preliminaryNeed && requirementDetailsOpen ? (
          <View
            accessibilityLiveRegion="polite"
            style={styles.unresolvedNotice}
            testID={`consumer-repair-item-unresolved-notice-${item.id}`}
          >
            <Text style={styles.unresolvedNoticeTitle}>Пояснение к расчёту</Text>
            <Text style={styles.unresolvedNoticeText}>
              {requirementNotice}
            </Text>
          </View>
        ) : null}
        {specificationEditing ? (
          <View style={styles.specificationEditRow}>
            <TextInput
              accessibilityLabel={`Название позиции ${item.titleRu}`}
              autoFocus
              importantForAutofill="no"
              onBlur={Platform.OS === "web" ? undefined : finishSpecificationEdit}
              onChangeText={setSpecificationText}
              onSubmitEditing={finishSpecificationEdit}
              selectTextOnFocus
              style={styles.specificationInput}
              testID={`consumer-repair-item-specification-input-${item.id}`}
              value={specificationText}
            />
            <Pressable
              accessibilityLabel="Сохранить название позиции"
              accessibilityRole="button"
              onPress={finishSpecificationEdit}
              style={styles.specificationSaveButton}
              testID={`consumer-repair-item-specification-save-${item.id}`}
            >
              <Ionicons name="checkmark" size={17} color="#166534" />
            </Pressable>
          </View>
        ) : (
          <View style={styles.titleRow}>
            <Text style={styles.title} testID={`consumer-repair-item-title-${item.id}`}>{applicationPending && item.sourceParameters?.canonicalManualTitleOverride !== true ? canonicalPublicEstimatePendingRowTitleRu(item.titleRu) : item.titleRu}</Text>
            <Text style={styles.traceLine} testID={`consumer-repair-item-resource-kind-${item.id}`}>{resourceCategoryTitle}</Text>
            {preliminaryNeed || nonPayableRow ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Пояснение к расчёту ${item.titleRu}`}
                accessibilityState={{ expanded: requirementDetailsOpen }}
                onPress={() => setRequirementDetailsOpen(value => !value)}
                style={styles.specificationEditButton}
                testID={`consumer-repair-item-info-${item.id}`}
              >
                <Ionicons name="information-circle-outline" size={19} color="#64748B" />
              </Pressable>
            ) : null}
            {onSpecificationChange ? (
              <Pressable
                accessibilityLabel={`Изменить название позиции ${item.titleRu}`}
                accessibilityRole="button"
                onPress={beginSpecificationEdit}
                style={styles.specificationEditButton}
                testID={`consumer-repair-item-specification-edit-${item.id}`}
              >
                <Ionicons name="pencil-outline" size={15} color="#475569" />
              </Pressable>
            ) : null}
          </View>
        )}
        <View style={styles.fields}>
          <View style={styles.field}>
            <Text style={styles.label}>Количество</Text>
            <View style={styles.quantityLine}>
              <Pressable
                testID={`consumer-repair-item-minus-${item.id}`}
                accessibilityRole="button"
                accessibilityLabel={`${"\u0423\u043c\u0435\u043d\u044c\u0448\u0438\u0442\u044c"} ${item.titleRu}`}
                onPress={() => stepQuantity(-1)}
                style={styles.stepper}
              >
                <Ionicons name="remove" size={15} color="#0F172A" />
              </Pressable>
              <TextInput
                ref={quantityInputRef}
                value={quantityText}
                importantForAutofill="no"
                onBlur={finishQuantityEdit}
                onChangeText={setQuantityText}
                onFocus={beginQuantityEdit}
                onSubmitEditing={finishQuantityEdit}
                keyboardType="decimal-pad"
                inputMode="decimal"
                placeholder={item.quantity == null ? "Введите количество" : undefined}
                placeholderTextColor="#94A3B8"
                selectTextOnFocus={Platform.OS !== "web"}
                style={[styles.input, styles.quantityInput]}
                testID={`consumer-repair-item-quantity-input-${item.id}`}
                accessibilityLabel={`${"\u041a\u043e\u043b\u0438\u0447\u0435\u0441\u0442\u0432\u043e"} ${item.titleRu}: ${quantityText} ${unitLabel}`}
              />
              <Pressable
                testID={`consumer-repair-item-plus-${item.id}`}
                accessibilityRole="button"
                accessibilityLabel={`${"\u0423\u0432\u0435\u043b\u0438\u0447\u0438\u0442\u044c"} ${item.titleRu}`}
                onPress={() => stepQuantity(1)}
                style={styles.stepper}
              >
                <Ionicons name="add" size={15} color="#0F172A" />
              </Pressable>
              <Text
                accessibilityLabel={
                  unitLabel === "\u043c\u00b2"
                    ? "\u0415\u0434\u0438\u043d\u0438\u0446\u0430 \u0438\u0437\u043c\u0435\u0440\u0435\u043d\u0438\u044f: \u043c\u00b2 (m2, \u043c2)"
                    : `\u0415\u0434\u0438\u043d\u0438\u0446\u0430 \u0438\u0437\u043c\u0435\u0440\u0435\u043d\u0438\u044f: ${unitLabel}`
                }
                style={styles.unit}
                testID={`consumer-repair-item-unit-${item.id}`}
              >
                {unitLabel}
              </Text>
            </View>
            {purchaseRequirement ? <Text style={styles.calculatedQuantityHint} testID={`consumer-repair-item-known-consumption-${item.id}`}>
              {purchaseRequirement.labelRu}: {formatEstimateQuantityRu(purchaseRequirement.quantity)} {formatEstimateUnitLabel(purchaseRequirement.unitId)}. Точный заказ ещё не подтверждён.
            </Text> : null}
            {manualQuantityOverride ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (calculatedQuantity == null) {
                    setQuantityText("");
                    onQuantityChange(item.id, "");
                    return;
                  }
                  restoreCalculatedQuantity(calculatedQuantity);
                }}
                style={styles.restoreCalculatedButton}
                testID={`consumer-repair-item-restore-calculated-${item.id}`}
              >
                <Text style={styles.restoreCalculatedText}>{calculatedQuantity == null ? "Убрать ручное количество" : "Вернуть расчётное"}</Text>
              </Pressable>
            ) : null}
          </View>
          {priceEditable ? (
            <View style={styles.field}>
              <Text style={styles.label}>Цена за единицу</Text>
              <TextInput
                value={priceText}
                importantForAutofill="no"
                placeholder=""
                placeholderTextColor="#94A3B8"
                onChangeText={setPriceText}
                onFocus={beginPriceEdit}
                onBlur={finishPriceEdit}
                onSubmitEditing={finishPriceEdit}
                keyboardType="decimal-pad"
                inputMode="decimal"
                selectTextOnFocus={Platform.OS !== "web"}
                style={styles.priceInput}
                testID={`consumer-repair-item-unit-price-input-${item.id}`}
                accessibilityLabel={`Цена за единицу ${item.titleRu}`}
              />
            </View>
          ) : supplyWarning && item.unitPrice != null ? <View style={styles.field}>
            <Text style={styles.label}>Сохранённая цена (справочно)</Text>
            <Text testID={`consumer-repair-item-saved-supply-price-${item.id}`}>{priceText} {item.currency}</Text>
          </View> : null}
          <View style={styles.field}>
            <Text style={styles.label}>Сумма</Text>
            <Text style={styles.total} testID={`consumer-repair-item-total-${item.id}`}>
              {supplyWarning || applicationPending || nonPayableRow || totalLabel === '—' ? '' : totalLabel}
            </Text>
          </View>
        </View>
        {item.unitPrice != null && professionalEvidenceOpen ? (
          <Text style={styles.priceStatus} testID={`consumer-repair-item-price-status-${item.id}`}>
            {itemPriceStatusLabel}
          </Text>
        ) : null}
        {!nonPayableRow&&consumerMachineHourPriceDecision(item)?<View testID={`consumer-repair-machine-hour-price-${item.id}`}>
          <Text style={styles.nonPayableNotice}>{item.unitPrice==null?canonicalMachineHourPricePromptRuV1(String(item.sourceParameters?.rowCode??'')):consumerMachineHourPriceNeedsConfirmation(item)
            ?'Состав цены эксплуатации не подтверждён. Введённая сумма предварительная.'
            :consumerMachineHourPriceDecision(item)?.status==='CONFIRMED_MANUAL'?'Состав цены подтверждён пользователем.':'Состав цены подтверждён ценовым источником.'}</Text>
          {consumerMachineHourPriceNeedsConfirmation(item)&&!itemOptional&&onConfirmMachineHourPrice?<>
            <Text style={styles.nonPayableNotice}>{canonicalMachineHourPriceConfirmationRuV1(String(item.sourceParameters?.rowCode??''))}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`Подтвердить состав цены эксплуатации ${item.titleRu}`}
              testID={`consumer-repair-confirm-machine-hour-price-${item.id}`} onPress={()=>onConfirmMachineHourPrice(item.id)} style={styles.traceButton}>
              <Text style={styles.traceButtonText}>Подтвердить этот состав цены</Text>
            </Pressable>
          </>:null}
        </View>:null}
        {supplyWarning ? <Text style={styles.nonPayableNotice} testID={`consumer-repair-item-supply-state-${item.id}`}>
          Строка не суммируется: условия поставки не подтверждены. Введённые количество и цена сохранены.
        </Text> : !nonPayableRow ? <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: itemOptional }}
          accessibilityLabel={`${"Не включать позицию в расчёт"} ${item.titleRu}`}
          onPress={() => onOptionalChange?.(item.id, !itemOptional)}
          style={[styles.optionalToggle, itemOptional && styles.optionalToggleActive]}
          testID={`consumer-repair-item-optional-toggle-${item.id}`}
        >
          <Text style={[styles.optionalToggleText, itemOptional && styles.optionalToggleTextActive]}>
            {itemOptional ? "Опциональная позиция" : "Включена в расчёт"}
          </Text>
        </Pressable> : !requirementDetailsOpen ? null : (
          <Text style={styles.nonPayableNotice} testID={`consumer-repair-item-cost-treatment-${item.id}`}>
            {consumerRepairRowCostCoverageLabel(item) ?? (consumerRepairRowCostTreatment(item) === "INCLUDED_IN_RESOURCE_ROWS"
                ? "Не суммируется повторно: стоимость включена в отдельные строки материалов, работ и механизмов этой сметы."
                : consumerRepairRowCostTreatment(item) === "INFORMATIONAL_SCOPE"
                  ? "Организация потока показана как условие выполнения и отдельно не суммируется."
                  : consumerRepairRowCostTreatment(item) === "CONTROL_OR_DOCUMENT"
                    ? "Контрольная или документальная позиция отдельно не суммируется."
                    : "Строка не включена в итог; введённые количество и цена сохраняются справочно.")}
          </Text>
        )}
        {requirementDetailsOpen && consumerRepairRowCommercialScopeLabel(item) ? (
          <Text style={styles.nonPayableNotice}>{consumerRepairRowCommercialScopeLabel(item)}</Text>
        ) : null}
        {item.selectedProductBinding ? (
          <Text style={styles.selectedProduct} testID={`consumer-repair-item-selected-product-${item.id}`}>
            {`${"\u0412\u044b\u0431\u0440\u0430\u043d \u0442\u043e\u0432\u0430\u0440"}: ${item.selectedProductBinding.visibleName}${item.selectedProductBinding.packageLabel ? `, ${item.selectedProductBinding.packageLabel}` : ""}`}
          </Text>
        ) : null}
        {professionalEvidence || publicResourcePresentation || calculatedQuantity != null || manualQuantityOverride || derivedQuantityEditReason != null ? (
          <View style={styles.traceWrap}>
            <Pressable
              accessibilityLabel="Объяснение формулы, нормы и цены"
              accessibilityRole="button"
              accessibilityState={{ expanded: professionalEvidenceOpen }}
              onPress={() => setProfessionalEvidenceOpen((value) => !value)}
              style={styles.traceButton}
              testID={`consumer-repair-item-professional-proof-${item.id}`}
            >
              <Ionicons
                name={professionalEvidenceOpen ? "chevron-up" : "chevron-down"}
                size={14}
                color="#7C2D12"
              />
              <Text style={styles.traceButtonText}>
                Как посчитано
              </Text>
            </Pressable>
            {professionalEvidenceOpen ? (
              <View
                style={styles.traceBox}
                testID={`consumer-repair-item-professional-proof-detail-${item.id}`}
              >
                {calculatedQuantity != null || manualQuantityOverride || (derivedQuantityEditReason != null && item.quantity != null) ? (
                  <Text
                    style={manualQuantityOverride ? styles.manualQuantityHint : styles.calculatedQuantityHint}
                    testID={`consumer-repair-item-quantity-mode-${item.id}`}
                  >
                    {manualQuantityOverride
                      ? calculatedQuantity != null
                        ? `Введено вручную. По формуле: ${exactQuantity?.calculatedQuantityText ?? calculatedQuantity} ${unitLabel}.`
                        : "Введено вручную. Расчётное количество пока неизвестно."
                      : derivedQuantityEditReason
                      ? derivedQuantityEditReason
                      : sourceManagedNeed
                      ? "Сохранённое количество ожидает подтверждения технического источника."
                      : `Рассчитано автоматически: ${exactQuantity?.calculatedQuantityText ?? calculatedQuantity} ${unitLabel}. Поле можно изменить.`}
                  </Text>
                ) : null}
                {publicResourcePresentation?.brandAndModelRu ? (
                  <Text style={styles.traceLine} testID={`consumer-repair-item-brand-${item.id}`}>{publicResourcePresentation.brandAndModelRu}</Text>
                ) : null}
                {publicResourcePresentation?.specificationRu ? (
                  <Text style={styles.traceLine} testID={`consumer-repair-item-selected-specification-${item.id}`}>{publicResourcePresentation.specificationRu}</Text>
                ) : null}
                {professionalEvidence ? <Text style={styles.traceLine}>{professionalEvidence.formulaLabel}</Text> : null}
                {professionalEvidence?.parameterLabel ? (
                  <Text style={styles.traceLine}>{professionalEvidence.parameterLabel}</Text>
                ) : null}
                {professionalEvidence ? <Text style={styles.traceLine}>{professionalEvidence.normativeLabel}</Text> : null}
                {professionalEvidence ? <Text style={styles.traceLine}>{professionalEvidence.priceLabel}</Text> : null}
                {needEvidence.referenced && needEvidence.status !== "ready" ? (
                  <Text accessibilityLiveRegion="polite" style={styles.traceLine}>
                    {needEvidence.status === "loading" ? "Загружаются доказательства сохранённой строки…"
                      : needEvidence.errorCode === "NETWORK_UNAVAILABLE" || needEvidence.errorCode?.includes("TIMEOUT")
                        ? "Доказательства ещё не загружены. Проверьте соединение с сервером."
                        : needEvidence.errorCode === "AUTH_REQUIRED" || needEvidence.errorCode === "FORBIDDEN"
                          ? "Нет доступа к доказательствам. Проверьте вход в свой аккаунт."
                          : "Доказательства этой версии не удалось подтвердить. Повторите загрузку."}
                  </Text>
                ) : null}
                {needEvidence.referenced && needEvidence.status === "unavailable" ? (
                  <Pressable accessibilityRole="button" onPress={needEvidence.retry} testID={`consumer-repair-item-evidence-retry-${item.id}`}>
                    <Text style={styles.traceButtonText}>Повторить загрузку</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}
        {showPhotoButton && item.itemType === "material" ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${"\u0424\u043e\u0442\u043e \u0442\u043e\u0432\u0430\u0440\u0430"} ${item.titleRu}`}
            onPress={() => onOpenPhoto?.(item.id)}
            style={styles.photoButton}
            testID={`estimate-material-row-photo-button-${item.id}`}
          >
            <Ionicons name="camera-outline" size={15} color="#166534" />
            <Text style={styles.photoButtonText}>Фото</Text>
          </Pressable>
        ) : null}
        {item.itemType === "material" && (hasPhotoAttachment || photoThumbnailUri) ? (
          <View
            accessible={false}
            style={styles.photoAttachment}
            testID={`estimate-material-row-photo-attached-${photoRowIdentity}`}
          >
            {photoThumbnailUri ? (
              <Image
                accessible
                accessibilityLabel={`Прикреплённое фото ${item.titleRu}`}
                accessibilityIgnoresInvertColors
                resizeMode="cover"
                source={{ uri: photoThumbnailUri }}
                style={styles.photoAttachmentImage}
                testID={`estimate-material-row-photo-view-${photoRowIdentity}`}
              />
            ) : null}
            <Text style={styles.photoAttachmentText}>
              {photoThumbnailUri ? "Прикреплённое фото" : "Фото подтверждено сервером"}
            </Text>
          </View>
        ) : null}
        {catalogBindingLabel ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${"\u041f\u043e\u0434\u043e\u0431\u0440\u0430\u0442\u044c \u043c\u0430\u0442\u0435\u0440\u0438\u0430\u043b \u0438\u0437 \u043a\u0430\u0442\u0430\u043b\u043e\u0433\u0430 \u0434\u043b\u044f"} ${item.titleRu}`}
            onPress={() => onOpenCatalog?.(item.id)}
            style={styles.catalogBadge}
            testID={`consumer-repair-item-catalog-${item.id}`}
          >
            <Text style={styles.catalogBadgeText}>Выбрать материал</Text>
          </Pressable>
        ) : null}
      </View>
      <Pressable
        testID={`consumer-repair-item-remove-${item.id}`}
        accessibilityRole="button"
        accessibilityLabel={`${"\u0423\u0434\u0430\u043b\u0438\u0442\u044c"} ${item.titleRu}`}
        onPress={() => onRemove(item.id)}
        style={styles.remove}
      >
        <Ionicons name="trash-outline" size={16} color="#DC2626" />
      </Pressable>
    </View>
  );
}

export const ConsumerRepairItemRow = React.memo(ConsumerRepairItemRowComponent);
ConsumerRepairItemRow.displayName = "ConsumerRepairItemRow";

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  unresolvedRow: {
    borderWidth: 2,
    borderColor: "#F59E0B",
    borderRadius: 10,
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 10,
    marginVertical: 4,
  },
  unresolvedNotice: {
    gap: 3,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  unresolvedNoticeTitle: {
    color: "#92400E",
    fontSize: 12,
    fontWeight: "900",
  },
  unresolvedNoticeText: {
    color: "#92400E",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
  },
  main: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    flex: 1,
    minWidth: 0,
    color: "#0F172A",
    fontSize: 14,
    fontWeight: "900",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  fields: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
    gap: 8,
    marginTop: 8,
  },
  specificationEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  specificationInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "800",
    paddingHorizontal: 9,
    paddingVertical: 7,
    backgroundColor: "#FFFFFF",
  },
  specificationEditButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  specificationSaveButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    backgroundColor: "#F0FDF4",
  },
  field: {
    gap: 4,
  },
  label: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "900",
  },
  readOnlyValue: {
    maxWidth: 190,
    minHeight: 34,
    color: "#475569",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800",
    paddingTop: 4,
  },
  inlineSourceHint: {
    maxWidth: 190,
    color: "#94A3B8",
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "700",
  },
  calculatedQuantityHint: {
    maxWidth: 230,
    color: "#64748B",
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "700",
  },
  manualQuantityHint: {
    maxWidth: 230,
    color: "#9A3412",
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "800",
  },
  restoreCalculatedButton: {
    alignSelf: "flex-start",
    minHeight: 26,
    justifyContent: "center",
  },
  restoreCalculatedText: {
    color: "#0F766E",
    fontSize: 10,
    fontWeight: "900",
  },
  quantityLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  stepper: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  input: {
    width: 70,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "900",
    paddingHorizontal: 8,
    backgroundColor: "#FFFFFF",
  },
  quantityInput: {
    // Keep calculated decimals visible instead of showing only the tail of
    // quantities such as 69.171546141. Input precision is not changed.
    width: 140,
  },
  priceInput: {
    width: 106,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "900",
    paddingHorizontal: 8,
    backgroundColor: "#FFFFFF",
  },
  unit: {
    minWidth: 42,
    color: "#334155",
    fontSize: 12,
    fontWeight: "900",
  },
  total: {
    minHeight: 34,
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "900",
    paddingTop: 8,
  },
  priceStatus: {
    marginTop: 6,
    color: "#0F766E",
    fontSize: 12,
    fontWeight: "900",
  },
  optionalToggle: {
    marginTop: 6,
    alignSelf: "flex-start",
    minHeight: 30,
    justifyContent: "center",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 8,
  },
  optionalToggleActive: {
    borderColor: "#F59E0B",
    backgroundColor: "#FFFBEB",
  },
  optionalToggleText: {
    color: "#334155",
    fontSize: 11,
    fontWeight: "900",
  },
  optionalToggleTextActive: {
    color: "#92400E",
  },
  nonPayableNotice: {
    marginTop: 6,
    color: "#92400E",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "800",
  },
  selectedProduct: {
    marginTop: 6,
    color: "#334155",
    fontSize: 12,
    fontWeight: "800",
  },
  priceTrace: {
    marginTop: 4,
    color: "#334155",
    fontSize: 10,
    fontWeight: "800",
    lineHeight: 14,
  },
  photoButton: {
    marginTop: 6,
    alignSelf: "flex-start",
    minWidth: 74,
    height: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  photoButtonText: {
    color: "#166534",
    fontSize: 11,
    fontWeight: "900",
  },
  photoAttachment: {
    marginTop: 6,
    alignSelf: "flex-start",
    width: 132,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    backgroundColor: "#F0FDF4",
    overflow: "hidden",
  },
  photoAttachmentImage: {
    width: 130,
    height: 86,
    backgroundColor: "#DCFCE7",
  },
  photoAttachmentText: {
    color: "#166534",
    fontSize: 10,
    fontWeight: "900",
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  catalogBadge: {
    marginTop: 6,
    alignSelf: "flex-start",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  catalogBadgeText: {
    color: "#1D4ED8",
    fontSize: 11,
    fontWeight: "900",
  },
  traceWrap: {
    marginTop: 7,
    alignSelf: "stretch",
  },
  traceButton: {
    alignSelf: "flex-start",
    minHeight: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FED7AA",
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  traceButtonText: {
    color: "#7C2D12",
    fontSize: 11,
    fontWeight: "900",
  },
  traceBox: {
    marginTop: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FDBA74",
    backgroundColor: "#FFFBEB",
    padding: 8,
    gap: 3,
  },
  traceLine: {
    color: "#431407",
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 14,
  },
  remove: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
