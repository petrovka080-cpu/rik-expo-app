import { getCanonicalEstimateCatalogItem, getCanonicalEstimateRevisionHistory } from "../../lib/estimate/backendPlatform/canonicalEstimateClient";
import {canonicalStoredManualPricesCanMigrate} from '../../lib/estimate/backendPlatform/canonicalManualPriceReleaseMigration';
import {
  CanonicalEstimateApiError,
  type CanonicalEstimateCatalogItem,
  type CanonicalEstimateRecalculateRequest,
  type CanonicalEstimateRevisionView,
} from "../../lib/estimate/backendPlatform/contracts";
import {
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
};

export type ConsumerCanonicalRecalculationConsent = {
  confirmReleaseMigration?: (prompt: ConsumerCanonicalReleaseMigrationPrompt) => Promise<boolean>;
  assertMutationSource?: () => void;
};

/** Old norm/passport/derived values cannot become overrides of a new source.
 * Target defaults remain available to validation and to the backend baseline. */
export function consumerCanonicalMigrationUserParameters(
  catalog: CanonicalEstimateCatalogItem,
  parameters: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  return Object.fromEntries(catalog.parameterSchema.flatMap((schema) =>
    Object.prototype.hasOwnProperty.call(parameters, schema.parameterId)
    && (!isCanonicalEstimateSourceManagedParameter(schema)
      || isCanonicalEstimateVisibleReplaceableProfile(schema)
      || isCanonicalEstimateVisibleUserResourceSelectionParameter(schema))
      ? [[schema.parameterId, parameters[schema.parameterId]]]
      : [],
  ));
}

export function consumerCanonicalInheritedRecalculationInputs(
  revision: CanonicalEstimateRevisionView,
  catalog: CanonicalEstimateCatalogItem,
): Record<string, unknown> {
  return catalog.releaseId === revision.releaseId
    ? { ...revision.parameters }
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

async function existingMigrationChild(parent: CanonicalEstimateRevisionView, catalog: CanonicalEstimateCatalogItem) {
  let cursor: string | null = null;
  for (let pageIndex = 0; pageIndex < 20; pageIndex += 1) {
    const page = await getCanonicalEstimateRevisionHistory({ catalogId: parent.catalogId, cursor, limit: 100 });
    const child = page.revisions.find(candidate => candidate.parentRevisionId === parent.revisionId
      && candidate.catalogId === parent.catalogId && candidate.releaseId === catalog.releaseId
      && (candidate.organizationId ?? null) === (parent.organizationId ?? null)
      && candidate.status === "ready");
    if (child) return child;
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
  parameterPatchKeys?: readonly string[];
} & ConsumerCanonicalRecalculationConsent): Promise<{
  catalog: CanonicalEstimateCatalogItem;
  releaseMigration: CanonicalEstimateRecalculateRequest["releaseMigration"];
  recoveredRevision?: CanonicalEstimateRevisionView;
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
  if (input.hasNewRowAmendments
    || !canonicalStoredManualPricesCanMigrate({rowOverrides:input.revision.amendmentContract.rowOverrides,
      customRows:input.revision.amendmentContract.customRows,fromBindings:parentCatalog.manualPriceMigrationBindings,toBindings:catalog.manualPriceMigrationBindings})) {
    throw new CanonicalEstimateApiError("Переход к новой версии остановлен: совместимость ручных количеств, цен и строк ещё не подтверждена. Исходная смета и все правки сохранены. Новую правку строки можно выполнить после отдельного перехода через параметры.", {
      code: "RELEASE_MIGRATION_ROW_BINDING_REVIEW_REQUIRED", httpStatus: 409,
    });
  }
  if (input.revision.userInputSnapshot == null) {
    throw new CanonicalEstimateApiError("Переход остановлен: у исходной сметы нет сохранённого перечня введённых данных. Нужно проверить исходные сведения перед пересчётом; смета сохранена.", {
      code: "RELEASE_MIGRATION_USER_SNAPSHOT_REQUIRED", httpStatus: 409,
    });
  }
  const transferable = consumerCanonicalMigrationUserParameters(parentCatalog, input.revision.userInputSnapshot);
  for (const parameterId of new Set([...Object.keys(transferable), ...(input.parameterPatchKeys ?? [])])) {
    const source = parentCatalog.parameterSchema.find(schema => schema.parameterId === parameterId);
    const destination = catalog.parameterSchema.find(schema => schema.parameterId === parameterId);
    // Tightening a numeric fact to an integer keeps its meaning and unit.
    // The target's shared validator still rejects fractions after consent;
    // this guard never converts or rounds an inherited or edited value.
    const compatibleValueType = source && destination && (source.valueType === destination.valueType
      || (source.valueType === "decimal" && destination.valueType === "integer"));
    if (!source || !destination || source.unitId !== destination.unitId || !compatibleValueType
      || (source.semanticParameterKey ?? source.parameterId) !== (destination.semanticParameterKey ?? destination.parameterId)) {
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
  const recoveredRevision = await existingMigrationChild(input.revision, catalog);
  input.assertMutationSource?.();
  const acknowledged = await input.confirmReleaseMigration?.({
    revisionId: input.revision.revisionId,
    titleRu: catalog.titleRu,
    fromReleaseId: input.revision.releaseId,
    toReleaseId: catalog.releaseId,
    fromDefinitionVersion: parentCatalog.definitionVersion,
    toDefinitionVersion: catalog.definitionVersion,
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
    || currentCatalog.workKey !== catalog.workKey || currentCatalog.definitionVersion !== catalog.definitionVersion) {
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
