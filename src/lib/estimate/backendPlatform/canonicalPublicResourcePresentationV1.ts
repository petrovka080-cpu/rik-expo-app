import { canonicalPublicEstimateChoiceLabelRu, canonicalPublicEstimateRowNameRu, canonicalPublicEstimateRowDetailsRu } from './canonicalPublicEstimateLanguageRu';
import simpleBindings from '../../../../data/estimate-benchmarks/source-packs/public-subwork-resource-presentation-r2.json';
import calculationDetailRoles from '../../../../data/estimate-benchmarks/source-packs/public-calculation-detail-roles-r1.json';
import {canonicalPublicSelectedSpecificationV1} from './canonicalPublicSelectedSpecificationV1';

/** An authored display projection of a saved resource. It changes no identity,
 * specification, quantity, price or owner and never guesses a generic name. */
export type CanonicalPublicResourcePresentationV1 = Readonly<{
  contractVersion: 'canonical-public-resource-presentation/v1';
  sourceTitleRu: string;
  nameRu: string;
  brandAndModelRu: string | null;
  specificationRu: string | null;
  detailsRu: readonly string[];
  rowKind?: 'CALCULATION_DETAIL' | 'PROCESS_NOTE';
}>;

export function parseCanonicalPublicResourcePresentationV1(value: unknown): CanonicalPublicResourcePresentationV1 | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  const allowed = ['contractVersion', 'sourceTitleRu', 'nameRu', 'brandAndModelRu', 'specificationRu', 'detailsRu', 'rowKind'];
  const text = (v: unknown, max: number): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
  if (Object.keys(candidate).length !== (candidate.rowKind == null ? 6 : 7) || Object.keys(candidate).some(key => !allowed.includes(key))
    || (Object.hasOwn(candidate, 'rowKind') && !['CALCULATION_DETAIL', 'PROCESS_NOTE'].includes(String(candidate.rowKind)))
    || candidate.contractVersion !== 'canonical-public-resource-presentation/v1'
    || !text(candidate.sourceTitleRu, 2000) || !text(candidate.nameRu, 180) || !/[А-Яа-яЁё]/u.test(candidate.nameRu)
    || (candidate.brandAndModelRu !== null && !text(candidate.brandAndModelRu, 300))
    || (candidate.specificationRu !== null && !text(candidate.specificationRu, 500))
    || !Array.isArray(candidate.detailsRu) || candidate.detailsRu.length > 16
    || candidate.detailsRu.some(detail => !text(detail, 1000))) return null;
  return candidate as CanonicalPublicResourcePresentationV1;
}

export function canonicalPublicResourcePresentationV1(input: {
  titleRu: string; descriptor: unknown; manualTitleOverride?: boolean;
}): CanonicalPublicResourcePresentationV1 | null {
  if (input.manualTitleOverride) return null;
  const presentation = parseCanonicalPublicResourcePresentationV1(input.descriptor);
  // Exact source identity protects manual names, replaced products and selected
  // specifications. A stale mapping remains a full source title, never an alias.
  return presentation?.sourceTitleRu === input.titleRu ? presentation : null;
}

/** Brand-free display is separate from authored identity validation and saved
 * title binding, so public wording never rewrites the source descriptor. */
export function canonicalPublicResourceDisplayPresentationV1(input: Parameters<typeof canonicalPublicResourcePresentationV1>[0] & {
  rowId?: string; graph?: unknown; parameters?: Readonly<Record<string,unknown>>;compactPreliminaryNeed?:boolean;
}): CanonicalPublicResourcePresentationV1 | null {
  if (input.manualTitleOverride) return null;
  // A complete authored binding is an independent display authority for an
  // exact saved row. Never repair or borrow a malformed source descriptor.
  if (input.descriptor != null && !parseCanonicalPublicResourcePresentationV1(input.descriptor)) return null;
  const saved = canonicalPublicResourcePresentationV1(input);
  const binding = simpleBindings.bindings.find(binding => binding.rowId===input.rowId
    && (binding.sourceTitleRu===input.titleRu || (saved!=null&&input.titleRu.startsWith(binding.sourceTitleRu+' — '))));
  const {rowId:_bindingRow,...boundDescriptor}=binding??{};
  const presentation = binding ? parseCanonicalPublicResourcePresentationV1({...boundDescriptor,sourceTitleRu:input.titleRu,
    ...(saved?.rowKind?{rowKind:saved.rowKind}:{}),
    specificationRu:saved&&saved.sourceTitleRu!==binding.sourceTitleRu?saved.specificationRu:binding.specificationRu}) : saved;
  const selected=canonicalPublicSelectedSpecificationV1({...input,graph:input.graph});
  if(selected)return{contractVersion:'canonical-public-resource-presentation/v1',sourceTitleRu:input.titleRu,
    nameRu:selected.nameRu,brandAndModelRu:null,specificationRu:selected.specificationRu,
    detailsRu:[...new Set([...(presentation?.detailsRu??[]),...selected.detailsRu,
      ...canonicalPublicEstimateRowDetailsRu({rowId:input.rowId,sourceTitleRu:input.titleRu,titleRu:selected.nameRu})])],
    ...(presentation?.rowKind?{rowKind:presentation.rowKind}:{})};
  const details = canonicalPublicEstimateRowDetailsRu({ rowId: input.rowId, sourceTitleRu: input.titleRu,
    titleRu: presentation?.nameRu ?? input.titleRu });
  if (!presentation) return details.length ? {
    contractVersion: 'canonical-public-resource-presentation/v1', sourceTitleRu: input.titleRu,
    nameRu: canonicalPublicEstimateRowNameRu({ rowId: input.rowId, titleRu: input.titleRu }),
    brandAndModelRu: null, specificationRu: null, detailsRu: details,
  } : null;
  const authoredRole=calculationDetailRoles.bindings.find(role=>role.rowId===input.rowId&&role.sourceTitleRu===input.titleRu);
  return { ...presentation, ...(authoredRole?.rowKind==='CALCULATION_DETAIL'?{rowKind:'CALCULATION_DETAIL' as const}:{}), nameRu: canonicalPublicEstimateRowNameRu({ rowId: input.rowId,
    sourceTitleRu: input.titleRu, titleRu: presentation.nameRu }), brandAndModelRu: null,
    specificationRu: presentation.specificationRu == null ? null : canonicalPublicEstimateChoiceLabelRu(presentation.specificationRu),
    detailsRu: [...new Set([...presentation.detailsRu, ...details].map(canonicalPublicEstimateChoiceLabelRu).filter(Boolean))] };
}

export function canonicalPublicResourcePresentationMatchesV1(actual: unknown, expected: unknown): boolean {
  if (actual == null && expected == null) return true;
  const a = parseCanonicalPublicResourcePresentationV1(actual), b = parseCanonicalPublicResourcePresentationV1(expected);
  return Boolean(a && b && a.sourceTitleRu === b.sourceTitleRu && a.nameRu === b.nameRu
    && a.rowKind === b.rowKind && a.brandAndModelRu === b.brandAndModelRu && a.specificationRu === b.specificationRu && a.detailsRu.length === b.detailsRu.length
    && a.detailsRu.every((detail, index) => detail === b.detailsRu[index]));
}

/** An authored display role never suppresses a payable or purchased resource.
 * Invalid/stale descriptors and manual changes keep the ordinary resource row. */
export function canonicalPublicResourceRowKindV1(input: {
  titleRu: string; descriptor: unknown; manualTitleOverride?: boolean;
  costTreatment: unknown; includedInEstimate?: boolean; includedInProcurement?: boolean;
  unitPrice?: unknown; amount?: unknown;
  rowId?: string; graph?: Readonly<Record<string,unknown>>; category?: string;
}): 'RESOURCE' | 'CALCULATION_DETAIL' | 'PROCESS_NOTE' {
  // A saved reference price does not turn an explicitly linked consumption
  // counter into a second supply. Keep its value in the calculation details.
  const presentation=canonicalPublicResourceDisplayPresentationV1(input);
  if (input.includedInEstimate === false && input.includedInProcurement === false
    && !input.manualTitleOverride && input.costTreatment === 'INFORMATIONAL_SCOPE'
    && presentation?.rowKind === 'CALCULATION_DETAIL' && input.rowId
    && typeof input.graph?.purchaseBalanceOwnerRowId === 'string'
    && input.graph.purchaseBalanceOwnerRowId.trim().length > 0
    && input.graph.purchaseBalanceOwnerRowId !== input.rowId) return 'CALCULATION_DETAIL';
  if (input.includedInEstimate === true || input.includedInProcurement === true
    || input.unitPrice != null || input.amount != null
    || input.manualTitleOverride
    || !['INFORMATIONAL_SCOPE', 'CONTROL_OR_DOCUMENT', 'INCLUDED_IN_RESOURCE_ROWS'].includes(String(input.costTreatment))) return 'RESOURCE';
  if(presentation?.rowKind)return presentation.rowKind;
  // Included physical items remain visible. A balance counter instead has
  // the explicit source role above or the structural identity below.
  // The request adapter names its material section `materials`; that section
  // still contains physical supplies, including supplies covered by work cost.
  const physicalCategory=['material','materials','tool','equipment','labor','service','transport','delivery'].includes(input.category??'');
  // Existing immutable definitions already identify their balance counters and
  // duplicate physical machine-hour counters structurally. Do not inspect a
  // Russian name, hide an unresolved real need, or change any stored row.
  const graph=input.graph;
  if(input.rowId&&graph&&input.costTreatment==='INFORMATIONAL_SCOPE'
    && ((typeof graph.purchaseBalanceOwnerRowId==='string'&&graph.purchaseBalanceOwnerRowId.trim().length>0&&graph.purchaseBalanceOwnerRowId!==input.rowId)
      || (graph.physicalNormOwnerRowId===input.rowId&&graph.machinePriceAdmissionPending===true)))return 'CALCULATION_DETAIL';
  if(physicalCategory)return 'RESOURCE';
  if(input.rowId&&graph&&input.costTreatment==='INCLUDED_IN_RESOURCE_ROWS'
    &&typeof graph.includedInResourceOwnerRowId==='string'&&graph.includedInResourceOwnerRowId.trim().length>0&&graph.includedInResourceOwnerRowId!==input.rowId
    &&graph.operationCompositionV1!=null)return 'CALCULATION_DETAIL';
  return 'RESOURCE';
}

export function bindCanonicalPublicResourceSavedTitleV1(input: {
  graph: Record<string, unknown>; sourceTitleRu: string; savedTitleRu: string;
  appendedSpecificationRu: string | null; manualTitleOverride: boolean;
}): Record<string, unknown> {
  const presentation = canonicalPublicResourcePresentationV1({ titleRu: input.sourceTitleRu,
    descriptor: input.graph.publicResourcePresentationV1, manualTitleOverride: input.manualTitleOverride });
  if (!presentation || input.savedTitleRu === input.sourceTitleRu) return input.graph;
  if (!input.appendedSpecificationRu) return input.graph; // REPLACE remains the selected specification.
  return { ...input.graph, publicResourcePresentationV1: { ...presentation, sourceTitleRu: input.savedTitleRu,
    specificationRu: input.appendedSpecificationRu } };
}
