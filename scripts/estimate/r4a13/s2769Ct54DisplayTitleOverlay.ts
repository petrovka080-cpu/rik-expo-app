import {createHash} from 'node:crypto';
import {stringifyCanonicalEstimateJson} from '../../../src/lib/estimate/estimateDeterministicHash';
import type {PurchaseGroupRepresentative} from './s2732PurchaseGroupOverlay';
const hash=(v:unknown)=>createHash('sha256').update(stringifyCanonicalEstimateJson(v)).digest('hex');
/** A forward publication fixes the canonical label field consumed by revision
 * identity. Existing immutable revisions/PDFs and numerical owners are retained. */
export function overlayS2769Ct54DisplayTitle(parent:PurchaseGroupRepresentative,target:{catalogId:string;predecessorDefinitionId:string;predecessorVersion:number;parentSha256:string;titleRu:string},contract:string){
 if(parent.definition.catalog_id!==target.catalogId||parent.definition.id!==target.predecessorDefinitionId||parent.definition.definition_version!==target.predecessorVersion||parent.definition.definition_sha256!==target.parentSha256)throw Error('CT54_DISPLAY_TITLE_PARENT_DRIFT');
 const result=structuredClone(parent);result.definition.passport={...result.definition.passport,canonicalRuName:target.titleRu,titleRu:target.titleRu};
 for(const p of result.parameters)p.truth_metadata={...p.truth_metadata,contract};
 result.baseline.parameter_schema_sha256=hash(result.parameters.map(p=>({parameterId:p.parameter_id,unitId:p.unit_id,valueType:p.value_type,constraints:p.constraints_json,truth:p.truth_metadata})));
 return{representative:result,legacyRowIds:parent.resources.map(r=>r.row_id),addedRowIds:[] as string[],addedParameterIds:[] as string[],changedFormulaIds:[] as string[],newPayableOwnerRowId:null,physicalNormOwnerRowIds:[] as string[],ownerDisposition:parent.passport.decision.ownerDisposition};
}
