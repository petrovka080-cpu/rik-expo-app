import { canonicalParameterMigrationBindingCompatibleV1 } from "../../lib/estimate/backendPlatform/canonicalParameterMigrationBindingV1";
import { getCanonicalEstimateCatalogItem, getCanonicalEstimateRevision, getCanonicalEstimateRevisionHistory, getCanonicalFusionQuantityClearPreviewS2758 } from "../../lib/estimate/backendPlatform/canonicalEstimateClient";
import {canonicalSameImmutableCalculationV1,canonicalSavedApprovedTemplateBaselineIdV1} from '../../lib/estimate/backendPlatform/canonicalImmutableCalculationContinuityV1';
import { canonicalEstimateStableJson as stable } from '../../lib/estimate/backendPlatform/canonicalEstimateDeterminism';
import {canonicalStoredManualPricesCanMigrate} from '../../lib/estimate/backendPlatform/canonicalManualPriceReleaseMigration';
import {floorPreparationIntentBindingS2769 as floorPreparation,isFloorPreparationConsumerS2769} from '../../lib/estimate/backendPlatform/canonicalFloorPreparationIntentS2769';
import {canonicalCompositionSelectionCanMigrateWithBindingsV1,type CanonicalEstimateCompositionSelectionV1} from '../../lib/estimate/backendPlatform/canonicalEstimateCompositionSelectionV1';
import {
  CanonicalEstimateApiError,
  type CanonicalEstimateCatalogItem,
  type CanonicalEstimateRecalculateRequest,
  type CanonicalEstimateRevisionView,
  type CanonicalFusionQuantityClearPreviewS2758,
} from "../../lib/estimate/backendPlatform/contracts";
import {
  canonicalEstimateConsumerInputRole,
  isCanonicalEstimateSourceManagedParameter,
  isCanonicalEstimateVisibleReplaceableProfile,
  isCanonicalEstimateVisibleUserResourceSelectionParameter,
} from "../../lib/estimate/backendPlatform/canonicalEstimateParameterSemantics";

export type ConsumerCanonicalReleaseMigrationPrompt = {
  revisionId: string;
  titleRu: string;
  fromReleaseId: string;
  toReleaseId: string;
  fromDefinitionVersion: number;
  toDefinitionVersion: number;
  recoveredRevisionId?: string;
  recoveredMeasureRu?: string;
  quantityClearPreview?: CanonicalFusionQuantityClearPreviewS2758;
  preserveFloorPreparationComposition?: boolean;
};

export type ConsumerCanonicalRecalculationConsent = {
  confirmReleaseMigration?: (prompt: ConsumerCanonicalReleaseMigrationPrompt) => Promise<boolean>;
  assertMutationSource?: () => void;
};

const APPLICATION_SUPPLIED_CLASSIFICATIONS = new Set([
  'NORMATIVE', 'PRELIMINARY_SOURCE_FORMULA', 'CATALOGUE_SOURCE_SELECTION',
  'ASSUMPTION', 'VISIBLE_PRELIMINARY_SCENARIO', 'RUNTIME_STRUCTURAL_DEFAULT',
]);

/** Old norm/passport/derived values cannot become overrides of a new source.
 * Target defaults remain available to validation and to the backend baseline. */
export function consumerCanonicalMigrationUserParameters(
  catalog: CanonicalEstimateCatalogItem,
  parameters: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  return Object.fromEntries(catalog.parameterSchema.flatMap((schema) => {
    // Short-form ownership controls which questions we ask, not whether an
    // explicitly supplied project value survives a release transition. Keep
    // the underlying norm/derived ownership checks for all transferred data.
    const ownership = canonicalEstimateConsumerInputRole(schema) === "APPLICATION_TECHNICAL"
      ? { ...schema, provenance: { ...schema.provenance, consumer_input_role_v1: undefined } }
      : schema;
    return Object.prototype.hasOwnProperty.call(parameters, schema.parameterId)
    && (!isCanonicalEstimateSourceManagedParameter(ownership)
      || isCanonicalEstimateVisibleReplaceableProfile(ownership)
      || isCanonicalEstimateVisibleUserResourceSelectionParameter(ownership))
      ? [[schema.parameterId, parameters[schema.parameterId]]]
      : [];
  }));
}

export function consumerCanonicalInheritedRecalculationInputs(
  revision: Pick<CanonicalEstimateRevisionView, 'releaseId' | 'parameters' | 'userInputSnapshot'>,
  catalog: CanonicalEstimateCatalogItem,
): Record<string, unknown> {
  return catalog.releaseId === revision.releaseId
    ? Object.fromEntries(Object.entries(revision.parameters).filter(([id]) => {
      const schema = catalog.parameterSchema.find(parameter => parameter.parameterId === id);
      return !APPLICATION_SUPPLIED_CLASSIFICATIONS.has(String(schema?.runtimeProfileClassification))
        || Object.prototype.hasOwnProperty.call(revision.userInputSnapshot ?? {}, id);
    }))
    : consumerCanonicalMigrationUserParameters(catalog, revision.userInputSnapshot ?? {});
}

export function consumerCanonicalExplicitMigrationParameters(
  catalog: CanonicalEstimateCatalogItem,
  validated: Readonly<Record<string, unknown>>,
  supplied: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  return consumerCanonicalMigrationUserParameters(catalog, Object.fromEntries(
    Object.entries(validated).filter(([id]) => Object.prototype.hasOwnProperty.call(supplied, id)),
  ));
}

export function consumerCanonicalExplicitAutomaticParameters(
  catalog: CanonicalEstimateCatalogItem,
  validated: Readonly<Record<string, unknown>>,
  supplied: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  const automatic = new Set(catalog.parameterSchema.filter(schema =>
    APPLICATION_SUPPLIED_CLASSIFICATIONS.has(String(schema.runtimeProfileClassification))).map(schema => schema.parameterId));
  return Object.fromEntries(Object.entries(validated).filter(([id]) => !automatic.has(id) || Object.prototype.hasOwnProperty.call(supplied, id)));
}

async function existingMigrationChild(parent: CanonicalEstimateRevisionView, catalog: CanonicalEstimateCatalogItem, sameImmutableCalculation=false) {
  let cursor: string | null = null;
  for (let pageIndex = 0; pageIndex < 20; pageIndex += 1) {
    const page = await getCanonicalEstimateRevisionHistory({ catalogId: parent.catalogId, cursor, limit: 100 });
    const candidates = page.revisions.filter(candidate => candidate.parentRevisionId === parent.revisionId
      && candidate.catalogId === parent.catalogId && candidate.releaseId === catalog.releaseId
      && (candidate.organizationId ?? null) === (parent.organizationId ?? null)
      && candidate.status === "ready");
    for(const candidate of candidates){
      if(!sameImmutableCalculation)return candidate;
      const child=await getCanonicalEstimateRevision(candidate.revisionId);
      if(child.revisionId===candidate.revisionId&&child.parentRevisionId===parent.revisionId
        &&child.catalogId===parent.catalogId&&child.releaseId===catalog.releaseId&&child.status==='ready'
        &&(child.organizationId??null)===(parent.organizationId??null)
        &&child.definitionVersionId===catalog.immutableCalculationIdentityV1?.definitionVersionId
        &&canonicalSavedApprovedTemplateBaselineIdV1(child.amendmentContract)===catalog.immutableCalculationIdentityV1?.approvedTemplateBaselineId
        &&stable(child.amendmentContract.rowOverrides)===stable(parent.amendmentContract.rowOverrides)
        &&stable(child.amendmentContract.customRows)===stable(parent.amendmentContract.customRows)
        &&stable(child.userInputSnapshot)===stable(parent.userInputSnapshot)
        &&stable(child.compositionSelectionV1??null)===stable(parent.compositionSelectionV1??null)
        &&stable(child.priceSnapshotIds)===stable(parent.priceSnapshotIds)&&child.currencyCode===parent.currencyCode
        &&child.sourceRequestText===parent.sourceRequestText&&child.sourceRequestHash===parent.sourceRequestHash
        &&child.primaryMeasureParameterId===parent.primaryMeasureParameterId
        &&child.primaryMeasureValue===parent.primaryMeasureValue&&child.primaryMeasureUnitId===parent.primaryMeasureUnitId)return child;
    }
    if (!page.nextCursor) return null;
    if (page.nextCursor === cursor) break;
    cursor = page.nextCursor;
  }
  throw new CanonicalEstimateApiError("Не удалось проверить завершённый пересчёт в истории. Исходная смета сохранена; повторите позже.", {
    code: "RELEASE_MIGRATION_HISTORY_INCOMPLETE", httpStatus: 409,
  });
}

/** The backend owns descendant admission. Consent is bound to the exact target,
 * never inferred from a cached release or from a previous successful Apply. */
export async function resolveConsumerCanonicalRecalculationCatalog(input: {
  revision: CanonicalEstimateRevisionView;
  hasNewRowAmendments?: boolean;
  /** Supplied only for a composition-only command with no new row/price inputs. */
  compositionOnlySelectionV1?: CanonicalEstimateCompositionSelectionV1|null;
  parameterPatchKeys?: readonly string[];
  allowQuantityClearTransition?: boolean;
} & ConsumerCanonicalRecalculationConsent): Promise<{
  catalog: CanonicalEstimateCatalogItem;
  releaseMigration: CanonicalEstimateRecalculateRequest["releaseMigration"];
  recoveredRevision?: CanonicalEstimateRevisionView;
  quantityClearPreview?: CanonicalFusionQuantityClearPreviewS2758;
  confirmedCompositionParameters?: Record<string,unknown>;
  immutableCalculationContinuity?:true;
}> {
  input.assertMutationSource?.();
  const catalog = await getCanonicalEstimateCatalogItem(input.revision.catalogId);
  if (catalog.catalogId !== input.revision.catalogId) {
    throw new CanonicalEstimateApiError("Пересчёт остановлен: выбрана другая работа.", {
      code: "REVISION_CATALOG_MISMATCH", httpStatus: 409,
    });
  }
  if (catalog.releaseId === input.revision.releaseId) {
    input.assertMutationSource?.();
    return { catalog, releaseMigration: undefined };
  }
  const parentCatalog = await getCanonicalEstimateCatalogItem(
    input.revision.catalogId, null, input.revision.releaseId,
  );
  if (parentCatalog.releaseId !== input.revision.releaseId
    || parentCatalog.catalogId !== catalog.catalogId || parentCatalog.workKey !== catalog.workKey) {
    throw new CanonicalEstimateApiError("Пересчёт остановлен: не подтверждена исходная версия работы.", {
      code: "REVISION_RELEASE_MISMATCH", httpStatus: 409,
    });
  }
  const sameImmutableCalculation=canonicalSameImmutableCalculationV1({fromIdentity:parentCatalog.immutableCalculationIdentityV1,
    toIdentity:catalog.immutableCalculationIdentityV1,savedCatalogId:input.revision.catalogId,
    savedDefinitionVersionId:input.revision.definitionVersionId,
    savedApprovedTemplateBaselineId:canonicalSavedApprovedTemplateBaselineIdV1(input.revision.amendmentContract)});
  if(sameImmutableCalculation&&(input.hasNewRowAmendments||input.parameterPatchKeys?.length)){
    throw new CanonicalEstimateApiError('Сначала продолжите сохранённую смету без новых правок. Введённые изменения сохранены в редакторе.',{
      code:'IMMUTABLE_CALCULATION_BRIDGE_INPUTS_CHANGED',httpStatus:409});
  }
  let quantityClearPreview: CanonicalFusionQuantityClearPreviewS2758 | undefined;
  const physicalIds = ['bench-consumed', 'fixing-included', 'fixing-consumed-separate'].map(key => 'fusion-bench-prepared-concrete:' + key);
  const pinnedIds = physicalIds.filter(id => input.revision.amendmentContract.rowOverrides[id]?.quantity != null);
  if (input.allowQuantityClearTransition && !input.hasNewRowAmendments && pinnedIds.length
    && catalog.catalogId === 'canonical-work:master:glasdon_fusion_bench_prepared_concrete_standard') {
    const { preview } = await getCanonicalFusionQuantityClearPreviewS2758(input.revision.revisionId);
    if (!preview || preview.contractVersion !== 'canonical-fusion-quantity-clear-preview/v1'
      || preview.parentRevisionId !== input.revision.revisionId || preview.parentChecksumSha256 !== input.revision.checksumSha256
      || preview.catalogId !== catalog.catalogId || preview.fromReleaseId !== input.revision.releaseId || preview.toReleaseId !== catalog.releaseId
      || !Array.isArray(preview.rows) || stable(preview.rows.map(row => row.rowId).sort()) !== stable([...pinnedIds].sort())
      || preview.rows.some(row => row.unitId !== 'pcs' || !row.titleRu || !/^\d+(?:\.\d+)?$/u.test(row.calculatedQuantity)
        || row.oldQuantity !== String(input.revision.amendmentContract.rowOverrides[row.rowId]?.quantity))) {
      throw new CanonicalEstimateApiError('Переход остановлен: сервер не подтвердил точный перечень сбросов. Исходная смета сохранена.', {
        code: 'FUSION_QUANTITY_CLEAR_REVIEW_REQUIRED', httpStatus: 409,
      });
    }
    quantityClearPreview = preview;
  }
  const predecessorBindings=catalog.manualMigrationPredecessorV1?.definitionId===input.revision.definitionVersionId
    ?catalog.manualMigrationPredecessorV1:catalog.manualMigrationPredecessorsV1?.find(p=>p.definitionId===input.revision.definitionVersionId);
  const compositionEvidence={fromRows:parentCatalog.manualExclusionMigrationBindings,toRows:predecessorBindings?.exclusionBindings??catalog.manualExclusionMigrationBindings,
    fromOperations:parentCatalog.compositionOperationMigrationBindingsV1,toOperations:predecessorBindings?.operationBindings??catalog.compositionOperationMigrationBindingsV1};
  const compositionOnlyMigration=input.compositionOnlySelectionV1!=null
    &&(!predecessorBindings||predecessorBindings.compositionSelectionIdsPreservedV1===true)
    &&canonicalCompositionSelectionCanMigrateWithBindingsV1({...compositionEvidence,selection:input.compositionOnlySelectionV1})
    &&(input.revision.compositionSelectionV1==null||canonicalCompositionSelectionCanMigrateWithBindingsV1({...compositionEvidence,selection:input.revision.compositionSelectionV1}));
  if (!quantityClearPreview && input.hasNewRowAmendments && !compositionOnlyMigration) {
    throw new CanonicalEstimateApiError("Новое изменение строки не сохранено. Сначала отдельно обновите состав через параметры, затем повторите изменение. Если в редакторе есть несохранённые количества или цены, отмените их кнопкой «Отменить новые правки строк» перед обновлением; они не переносятся автоматически.", {
      code: "RELEASE_MIGRATION_ROW_BINDING_REVIEW_REQUIRED", httpStatus: 409,
    });
  }
  if (!quantityClearPreview && !sameImmutableCalculation && !canonicalStoredManualPricesCanMigrate({rowOverrides:input.revision.amendmentContract.rowOverrides,
      currency:input.revision.currencyCode,
      customRows:input.revision.amendmentContract.customRows,fromBindings:parentCatalog.manualPriceMigrationBindings,toBindings:predecessorBindings?.priceBindings??catalog.manualPriceMigrationBindings,
      fromExclusionBindings:parentCatalog.manualExclusionMigrationBindings,toExclusionBindings:predecessorBindings?.exclusionBindings??catalog.manualExclusionMigrationBindings,
      fromQuantityBindings:parentCatalog.manualQuantityMigrationBindings,toQuantityBindings:predecessorBindings?.quantityBindings??catalog.manualQuantityMigrationBindings})) {
    throw new CanonicalEstimateApiError("Переход остановлен: совместимость уже сохранённых ручных количеств, цен и строк ещё не подтверждена. Исходная смета сохранена. Нужна проверка переноса этих правок; отмена новых правок в редакторе не заменяет её.", {
      code: "RELEASE_MIGRATION_ROW_BINDING_REVIEW_REQUIRED", httpStatus: 409,
    });
  }
  if (input.revision.userInputSnapshot == null) {
    throw new CanonicalEstimateApiError("Переход остановлен: у исходной сметы нет сохранённого перечня введённых данных. Нужно проверить исходные сведения перед пересчётом; смета сохранена.", {
      code: "RELEASE_MIGRATION_USER_SNAPSHOT_REQUIRED", httpStatus: 409,
    });
  }
  const transferable = consumerCanonicalMigrationUserParameters(parentCatalog, input.revision.userInputSnapshot);
  const floorPreparationTransition=isFloorPreparationConsumerS2769(catalog.catalogId)
    &&catalog.parameterSchema.some(schema=>schema.parameterId===floorPreparation.modeId)
    &&!Object.hasOwn(input.revision.parameters,floorPreparation.modeId);
  for (const parameterId of new Set([...(input.revision.primaryMeasureParameterId ? [input.revision.primaryMeasureParameterId] : []), ...Object.keys(transferable), ...(quantityClearPreview ? [] : input.parameterPatchKeys ?? [])])) {
    const source = parentCatalog.parameterSchema.find(schema => schema.parameterId === parameterId);
    const destination = catalog.parameterSchema.find(schema => schema.parameterId === parameterId);
    // This finite new composition choice has no predecessor physical field.
    // It is validated by the target schema and never transfers a source rate.
    if(floorPreparationTransition&&parameterId===floorPreparation.modeId&&destination)continue;
    // Tightening a numeric fact to an integer keeps its meaning and unit.
    // The target's shared validator still rejects fractions after consent;
    // this guard never converts or rounds an inherited or edited value.
    if (!source || !destination || !canonicalParameterMigrationBindingCompatibleV1(source, destination)) {
      throw new CanonicalEstimateApiError(`Переход остановлен: изменились единица или назначение поля «${source?.titleRu ?? parameterId}». Исходные данные нужно проверить; смета сохранена.`, {
        code: "RELEASE_MIGRATION_PARAMETER_BINDING_REVIEW_REQUIRED", httpStatus: 409,
      });
    }
    if (input.parameterPatchKeys?.includes(parameterId)
      && !Object.prototype.hasOwnProperty.call(consumerCanonicalMigrationUserParameters(catalog, { [parameterId]: true }), parameterId)) {
      throw new CanonicalEstimateApiError(`Переход остановлен: поле «${source.titleRu}» в новой версии задаётся источником. Введённое значение сохранено в редакторе.`, {
        code: "RELEASE_MIGRATION_PARAMETER_BINDING_REVIEW_REQUIRED", httpStatus: 409,
      });
    }
  }
  // An existing migration child cannot satisfy a different new composition
  // command. Its own semantic idempotency key handles safe retries server-side.
  const recoveredRevision = compositionOnlyMigration ? undefined : await existingMigrationChild(input.revision, catalog,sameImmutableCalculation);
  if (quantityClearPreview && recoveredRevision) {
    const merged = JSON.parse(stable(input.revision.amendmentContract.rowOverrides));
    for (const row of quantityClearPreview.rows) merged[row.rowId].quantity = null;
    if (stable(recoveredRevision.amendmentContract.rowOverrides) !== stable(merged)
      || stable(recoveredRevision.amendmentContract.customRows) !== stable(input.revision.amendmentContract.customRows)
      || stable(recoveredRevision.userInputSnapshot) !== stable(input.revision.userInputSnapshot)
      || stable(recoveredRevision.priceSnapshotIds) !== stable(input.revision.priceSnapshotIds)
      || recoveredRevision.currencyCode !== input.revision.currencyCode
      || recoveredRevision.sourceRequestText !== input.revision.sourceRequestText
      || recoveredRevision.sourceRequestHash !== input.revision.sourceRequestHash
      || recoveredRevision.primaryMeasureParameterId !== input.revision.primaryMeasureParameterId) {
      throw new CanonicalEstimateApiError('Сохранённый пересчёт отличается от выбранного перехода. Повторная запись остановлена; исходная смета сохранена.', {
        code: 'FUSION_QUANTITY_CLEAR_RECOVERY_MISMATCH', httpStatus: 409,
      });
    }
  }
  input.assertMutationSource?.();
  const acknowledged = await input.confirmReleaseMigration?.({
    revisionId: input.revision.revisionId,
    titleRu: catalog.titleRu,
    fromReleaseId: input.revision.releaseId,
    toReleaseId: catalog.releaseId,
    fromDefinitionVersion: parentCatalog.definitionVersion,
    toDefinitionVersion: catalog.definitionVersion,
    ...(floorPreparationTransition&&!input.parameterPatchKeys?.includes(floorPreparation.modeId)?{preserveFloorPreparationComposition:true}:{}),
    ...(quantityClearPreview ? { quantityClearPreview } : {}),
    ...(recoveredRevision ? {
      recoveredRevisionId: recoveredRevision.revisionId,
      recoveredMeasureRu: [recoveredRevision.primaryMeasureValue, recoveredRevision.primaryMeasureUnitId].filter(Boolean).join(" "),
    } : {}),
  });
  if (acknowledged !== true) {
    throw new CanonicalEstimateApiError("Пересчёт отменён. Исходная смета и введённые значения сохранены.", {
      code: "RELEASE_MIGRATION_NOT_ACKNOWLEDGED", httpStatus: 409,
    });
  }
  input.assertMutationSource?.();
  const currentCatalog = await getCanonicalEstimateCatalogItem(input.revision.catalogId);
  if (currentCatalog.catalogId !== catalog.catalogId || currentCatalog.releaseId !== catalog.releaseId
    || currentCatalog.workKey !== catalog.workKey || currentCatalog.definitionVersion !== catalog.definitionVersion
    ||sameImmutableCalculation&&stable(currentCatalog.immutableCalculationIdentityV1)!==stable(catalog.immutableCalculationIdentityV1)) {
    throw new CanonicalEstimateApiError("Версия расчёта обновилась. Повторите применение и проверьте новую версию.", {
      code: "RELEASE_MIGRATION_TARGET_CHANGED", httpStatus: 409,
    });
  }
  input.assertMutationSource?.();
  return {
    catalog: currentCatalog,
    releaseMigration: {
      contractVersion: "canonical_revision_release_migration.r2",
      acknowledged: true,
      fromReleaseId: input.revision.releaseId,
      toReleaseId: currentCatalog.releaseId,
    },
    ...(recoveredRevision ? { recoveredRevision } : {}),
    ...(sameImmutableCalculation?{immutableCalculationContinuity:true as const}:{}),
    ...(quantityClearPreview ? { quantityClearPreview } : {}),
    ...(floorPreparationTransition&&!input.parameterPatchKeys?.includes(floorPreparation.modeId)
      ?{confirmedCompositionParameters:{[floorPreparation.modeId]:floorPreparation.legacyMode}}:{}),
  };
}

export function assertConsumerCanonicalChildRevision(input: {
  parent: CanonicalEstimateRevisionView;
  catalog: CanonicalEstimateCatalogItem;
  child: CanonicalEstimateRevisionView;
}): void {
  if (input.child.parentRevisionId !== input.parent.revisionId
    || input.child.catalogId !== input.parent.catalogId
    || input.child.releaseId !== input.catalog.releaseId
    || (input.child.organizationId ?? null) !== (input.parent.organizationId ?? null)) {
    throw new CanonicalEstimateApiError("Изменения не сохранены: backend вернул другую версию или другую организацию.", {
      code: "CHILD_REVISION_IDENTITY_MISMATCH", httpStatus: 409,
    });
  }
}
