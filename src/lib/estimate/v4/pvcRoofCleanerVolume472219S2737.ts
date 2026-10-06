import pack from '../../../../data/estimate-benchmarks/source-packs/pvc-roof-cleaner-472219-volume-s27-37.json';
import { buildAutomaticConstructionOwnerR1, compileAutomaticConstructionOwnerR1, type AutomaticOwnerDefinition } from './automaticConstructionOwnerR1';
import { effectivePurchaseBalanceExpressionsR1, effectiveResourceQuantityParameterId } from './effectivePurchaseBalanceR1';
import { estimateDeterministicHash } from '../estimateDeterministicHash';
import { PVC_ROOF_CONCRETE_DEFINITION_S2736 as base } from './pvcRoofConcreteKrer12ConstructorS2736';
import { PVC_ROOF_FIELD_DISPLAY_NAME_RU } from '../backendPlatform/russianTechnologyTitleR542';

export const PVC_ROOF_VOLUME_CLEANER_CONTRACT_S2737 = pack.contract;
export const PVC_ROOF_VOLUME_CLEANER_WORK_KEY_S2737 = 'roof_pvc_1_2mm_krer12_cleaner_472219_volume';
export const PVC_ROOF_VOLUME_CLEANER_CATALOG_S2737 = 'canonical-work:master:' + PVC_ROOF_VOLUME_CLEANER_WORK_KEY_S2737;
export const PVC_ROOF_VOLUME_CLEANER_SOURCE_ID_S2737 = 'pvc_roof_krer12_cleaner_472219_volume_s2737';
export const PVC_ROOF_VOLUME_CLEANER_NORM_ID_S2737 = 'PVC-ROOF-KRER12-CLEANER472219-VOLUME-S2737';
export const PVC_ROOF_VOLUME_CLEANER_SOURCE_PACK_SHA256_S2737 = '5c1d01789bbd5d23f17556122c066106394e63927fa99712fc22754e7a991628';
export const PVC_ROOF_VOLUME_CLEANER_ROW_ID_S2737 = 'pvc-roof:material:cleaner-volume-472219';
export const PVC_ROOF_VOLUME_CLEANER_CONFIRMATION_S2737 = 'delivered_membrane_and_volume_cleaner_472219_confirmed';
export const PVC_ROOF_VOLUME_CLEANER_SOURCE_METADATA_S2737 = {
  source_title: 'ПВХ-мембрана 1,2 мм: готовая операция КРЕР и отдельная объёмная листовка очистителя ЕКН 472219',
  source_authority: 'Минстрой Кыргызской Республики; ТЕХНОНИКОЛЬ',
  source_document_version: PVC_ROOF_VOLUME_CLEANER_CONTRACT_S2737,
  definition_hash: PVC_ROOF_VOLUME_CLEANER_SOURCE_PACK_SHA256_S2737,
  artifact_sha256: PVC_ROOF_VOLUME_CLEANER_SOURCE_PACK_SHA256_S2737,
  official_url: null,
  source_kind: 'PINNED_COMPOSITE_FIELD_AND_MANUFACTURER_SOURCE_PACK',
  primarySources: { field: pack.reusedField, cleaner: pack.cleaner },
  exact_locator: 'Составной пакет ' + 'data/estimate-benchmarks/source-packs/pvc-roof-cleaner-472219-volume-s27-37.json'
    + '; поле: ' + pack.reusedField.primaryDocument.url + ', ' + pack.reusedField.primaryDocument.exactLocatorRu
    + '; объёмный очиститель: ' + pack.cleaner.url + ', ' + pack.cleaner.exactLocatorRu,
  use_restriction: pack.scopeRu + ' ' + pack.restrictionsRu.join(' '),
};

const originalCleaner = base.resources.find(row => row.row_id === 'pvc-roof:material:cleaner');
if (!originalCleaner) throw new Error('PVC_ROOF_INHERITED_CLEANER_MISSING');
const oldEffective = effectiveResourceQuantityParameterId(originalCleaner.row_id);
const removedMassParameterIds = new Set(['cleaner_density_kg_l', 'roof_cleaner_stock', 'roof_cleaner_reserve', oldEffective]);
const massConfirmationId = 'delivered_membrane_and_cleaner_version_confirmed';
const consumed = `cleaned_surface_m2*${pack.cleaner.rateLPerCleanedM2}`;
const balance = effectivePurchaseBalanceExpressionsR1({
  ownerRowId: PVC_ROOF_VOLUME_CLEANER_ROW_ID_S2737, orderUnitId: 'l', consumed,
  stock: 'roof_cleaner_stock_l', reserve: 'roof_cleaner_reserve_l', quantum: String(pack.cleaner.packL),
});
const replacement = buildAutomaticConstructionOwnerR1({
  contract: PVC_ROOF_VOLUME_CLEANER_CONTRACT_S2737, semanticOwner: PVC_ROOF_VOLUME_CLEANER_WORK_KEY_S2737,
  sourceId: PVC_ROOF_VOLUME_CLEANER_SOURCE_ID_S2737, normId: PVC_ROOF_VOLUME_CLEANER_NORM_ID_S2737,
  sourceMetadata: PVC_ROOF_VOLUME_CLEANER_SOURCE_METADATA_S2737,
  applicabilityRu: PVC_ROOF_VOLUME_CLEANER_SOURCE_METADATA_S2737.use_restriction,
  ordinary: [{ id: 'area_m2', title: 'Чистая площадь укладки мембраны', kind: 'ordinary', valueType: 'decimal', unitId: 'm2', min: 0.001 }],
  profile: [
    { id: 'roof_cleaner_stock_l', title: 'Пригодное наличие очистителя ЕКН 472219, л; предварительно 0, килограммы не переносить', kind: 'profile', valueType: 'decimal', unitId: 'l', defaultValue: 0, min: 0 },
    { id: 'roof_cleaner_reserve_l', title: 'Сохраняемый резерв очистителя ЕКН 472219, л; предварительно 0', kind: 'profile', valueType: 'decimal', unitId: 'l', defaultValue: 0, min: 0 },
  ],
  conditional: [{ id: 'cleaned_surface_m2', title: 'Обмеренная площадь загрязнений и подготовки сварных зон; не вся площадь кровли', kind: 'conditional', valueType: 'decimal', unitId: 'm2', min: 0 }],
  rows: [{ rowId: PVC_ROOF_VOLUME_CLEANER_ROW_ID_S2737, section: 'Материалы подготовки сварных зон', category: 'material',
    title: 'Очиститель для ПВХ-мембран ТЕХНОНИКОЛЬ, ЕКН 472219: 0,25 л/м² по выбранной листовке; канистра 3 л, поставленную версию подтвердить',
    unitId: 'l', formulaId: 'pvc_roof_cleaner_472219_volume_v1',
    expression: `ceil(max(0,(${consumed})+roof_cleaner_reserve_l-roof_cleaner_stock_l)/${pack.cleaner.packL})*${pack.cleaner.packL}`,
    procurement: true, ...balance.owner,
  }], deferMissingProjectFactsToRows: true,
  excludedUnownedAssumptions: pack.restrictionsRu,
});

function withoutMassInputs<T>(values: Readonly<Record<string, T>>) {
  return Object.fromEntries(Object.entries(values).filter(([id]) => !removedMassParameterIds.has(id)));
}
const newCleaner = replacement.resources[0]!;
const resources = base.resources.map((row, ordinal) => {
  const cleaner = row.row_id === originalCleaner.row_id;
  const source = cleaner ? newCleaner : row;
  const originalProcess = row.resource_graph.operationCompositionV1 as Record<string, unknown>;
  const resource = {
    ...source, ordinal,
    resource_graph: { ...source.resource_graph,
      inputParameterIds: [...((row.resource_graph.inputParameterIds as string[]) ?? [])]
        .map(id => id === massConfirmationId ? PVC_ROOF_VOLUME_CLEANER_CONFIRMATION_S2737 : id),
      operationCompositionV1: { ...originalProcess, groupId: 'pvc-roof-field-krer12-cleaner-volume-472219',
        groupTitleRu: PVC_ROOF_FIELD_DISPLAY_NAME_RU + '; очиститель ЕКН 472219 по объёмной листовке' },
    },
    source_metadata: { ...source.source_metadata,
      ...(cleaner ? {
        manufacturerSource: pack.cleaner,
        sourceRole: pack.cleaner.sourceRole,
        distinctMassSourcePreserved: pack.distinctMassSource,
        densityConversionPerformed: false,
        replacedMassResourceRowId: originalCleaner.row_id,
        pricesAndStockTransferAllowed: false,
      } : { reusedFieldSourcePackSha256: pack.reusedField.sourcePackSha256 }),
      engineeringApprovalClaimed: false,
    },
  };
  return { ...resource, row_sha256: estimateDeterministicHash({ ...resource, row_sha256: '' }) };
});
export const PVC_ROOF_VOLUME_CLEANER_DEFINITION_S2737: AutomaticOwnerDefinition = Object.freeze({
  parameters: [...base.parameters.filter(parameter => !removedMassParameterIds.has(parameter.parameter_id)).map(parameter => {
    if (parameter.parameter_id !== massConfirmationId) return parameter;
    const title = 'Поставлены выбранные мембраны и очиститель ЕКН 472219 по объёмной листовке 0,25 л/м²; версия и канистра 3 л проверены';
    return { ...parameter, parameter_id: PVC_ROOF_VOLUME_CLEANER_CONFIRMATION_S2737, title_ru: title,
      truth_metadata: { ...parameter.truth_metadata, contract: PVC_ROOF_VOLUME_CLEANER_CONTRACT_S2737,
        semantic_parameter_key: `${PVC_ROOF_VOLUME_CLEANER_WORK_KEY_S2737}:${PVC_ROOF_VOLUME_CLEANER_CONFIRMATION_S2737}`,
        guide: { ...(parameter.truth_metadata.guide as Record<string, unknown>),
          guide_short_ru: title + '; подтверждение прежнего массового профиля не переносится.',
          source_document: pack.cleaner.url, source_locator: pack.cleaner.exactLocatorRu,
          source_snapshot_hash: pack.cleaner.artifactSha256, guide_version: PVC_ROOF_VOLUME_CLEANER_CONTRACT_S2737,
          verified_at: '2026-10-06T00:00:00+06:00', applicability: PVC_ROOF_VOLUME_CLEANER_SOURCE_METADATA_S2737.use_restriction,
        },
      },
    };
  }), ...replacement.parameters.filter(parameter => parameter.parameter_id !== 'area_m2' && parameter.parameter_id !== 'cleaned_surface_m2')]
    .map((parameter, ordinal) => ({ ...parameter, ordinal })),
  formulas: [...base.formulas.filter(formula => formula.formula_id !== originalCleaner.formula_id), ...replacement.formulas],
  resources,
  runtimeInput: { ...withoutMassInputs(base.runtimeInput), ...replacement.runtimeInput },
  runtimeClassification: { ...withoutMassInputs(base.runtimeClassification), ...replacement.runtimeClassification },
  // This source key identifies the pinned composite package, not a new KRER
  // edition. Original primary guides and resource provenance remain intact.
  runtimeSourceIds: Object.fromEntries(Object.keys({ ...withoutMassInputs(base.runtimeSourceIds), ...replacement.runtimeSourceIds })
    .map(id => [id, [PVC_ROOF_VOLUME_CLEANER_SOURCE_ID_S2737]])),
  ordinaryParameterIds: base.ordinaryParameterIds,
});

export function compilePvcRoofCleanerVolume472219S2737(submittedParameters: Record<string, unknown>) {
  return compileAutomaticConstructionOwnerR1({ compilerVersion: PVC_ROOF_VOLUME_CLEANER_CONTRACT_S2737,
    catalogId: PVC_ROOF_VOLUME_CLEANER_CATALOG_S2737, primaryMeasureParameterId: 'area_m2',
    definition: PVC_ROOF_VOLUME_CLEANER_DEFINITION_S2737, submittedParameters });
}
