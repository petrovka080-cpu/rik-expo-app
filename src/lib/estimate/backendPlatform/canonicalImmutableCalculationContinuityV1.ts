import {canonicalEstimateStableJson as stable} from './canonicalEstimateDeterminism';

/** Read-only database identity. Never supplied as an authorization command. */
export type CanonicalImmutableCalculationIdentityV1=Readonly<{
  catalogId:string;
  definitionVersionId:string;
  definitionSha256:string;
  approvedTemplateBaselineId:string;
}>;
type Json=Record<string,unknown>;
const object=(v:unknown):Json=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Json:{};
const uuid=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(v);

export function parseCanonicalImmutableCalculationIdentityV1(value:unknown):CanonicalImmutableCalculationIdentityV1|null{
  const v=object(value);
  if(Object.keys(v).sort().join('|')!=='approvedTemplateBaselineId|catalogId|definitionSha256|definitionVersionId'
    ||typeof v.catalogId!=='string'||!v.catalogId.trim()||v.catalogId!==v.catalogId.trim()
    ||!uuid(v.definitionVersionId)||!uuid(v.approvedTemplateBaselineId)
    ||typeof v.definitionSha256!=='string'||!/^[a-f0-9]{64}$/u.test(v.definitionSha256))return null;
  return v as CanonicalImmutableCalculationIdentityV1;
}

/** A new release containing exactly the same immutable calculation is distinct
 * from migrating manual fields to another definition or approved baseline. */
export function canonicalSameImmutableCalculationV1(input:Readonly<{
  fromIdentity:unknown;toIdentity:unknown;savedCatalogId:unknown;savedDefinitionVersionId:unknown;savedApprovedTemplateBaselineId:unknown;
}>):boolean{
  const from=parseCanonicalImmutableCalculationIdentityV1(input.fromIdentity),to=parseCanonicalImmutableCalculationIdentityV1(input.toIdentity);
  return from!==null&&to!==null&&stable(from)===stable(to)&&from.catalogId===input.savedCatalogId
    &&from.definitionVersionId===input.savedDefinitionVersionId&&from.approvedTemplateBaselineId===input.savedApprovedTemplateBaselineId;
}

export function canonicalSavedApprovedTemplateBaselineIdV1(amendmentContract:unknown):string|null{
  const id=object(object(amendmentContract).parameterSources).approvedTemplateBaselineId;
  return uuid(id)?id:null;
}

/** The first bridge preserves saved inputs. New edits follow on its ordinary
 * child; a missing snapshot list inherits the exact saved list, including []. */
export function assertCanonicalImmutableCalculationBridgeV1(input:Readonly<{
  parentCurrency:unknown;requestedCurrency:unknown;parentOverrides:unknown;requestedOverrides:unknown;
  parentCustomRows:unknown;requestedCustomRows:unknown;parentUserParameters:unknown;requestedParameters:unknown;
  parentPriceSnapshotIds:unknown;requestedPriceSnapshotIds:unknown;
  parentCompositionSelection:unknown;requestedCompositionSelection:unknown;
}>):readonly string[]{
  const snapshots=input.parentPriceSnapshotIds;
  const requested=input.requestedPriceSnapshotIds;
  const parameters=object(input.requestedParameters);
  if(input.parentCurrency!==input.requestedCurrency
    ||stable(input.parentOverrides??{})!==stable(input.requestedOverrides??{})
    ||stable(input.parentCustomRows??[])!==stable(input.requestedCustomRows??[])
    ||(Object.keys(parameters).length>0&&stable(parameters)!==stable(input.parentUserParameters??{}))
    ||input.requestedParameters===null||typeof input.requestedParameters!=='object'||Array.isArray(input.requestedParameters)
    ||!Array.isArray(snapshots)||snapshots.length>64||!snapshots.every(uuid)
    ||(requested!==undefined&&(!Array.isArray(requested)||stable(requested)!==stable(snapshots)))
    ||(input.requestedCompositionSelection!==undefined
      &&stable(input.requestedCompositionSelection)!==stable(input.parentCompositionSelection??null))){
    throw Object.assign(new Error('Сначала продолжите сохранённую смету без новых правок. Введённые изменения сохранены в редакторе.'),{
      code:'IMMUTABLE_CALCULATION_BRIDGE_INPUTS_CHANGED',httpStatus:409});
  }
  return [...snapshots];
}
