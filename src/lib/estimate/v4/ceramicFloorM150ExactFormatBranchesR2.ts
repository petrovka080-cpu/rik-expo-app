import {ceramicFloorM150ExactFormatDefinitionR1,type CeramicFloorM150ExactFormatR1} from './ceramicFloorM150ExactFormatBranchesR1';
import {applyCeramicFloorM150HandPreparationR4,ceramicFloorM150WholeProvisionCompletenessR4,ceramicFloorM150WholeProvisionPackR4 as pack} from './ceramicFloorCementMortarWholeProvisionR4';
import {compileAutomaticConstructionOwnerR1} from './automaticConstructionOwnerR1';
/** Select the immutable exact-format whole R3 first, then reuse the same R4
 * hand-preparation overlay. No format owns a second dose/schedule algorithm. */
export function ceramicFloorM150ExactFormatDefinitionR2(format:CeramicFloorM150ExactFormatR1){return applyCeramicFloorM150HandPreparationR4(ceramicFloorM150ExactFormatDefinitionR1(format));}
export function ceramicFloorM150ExactFormatCompletenessR2(format:CeramicFloorM150ExactFormatR1){
 if(!['ceramic100x100','ceramic150x150'].includes(format))throw Error('CERAMIC_M150_EXACT_FORMAT_REQUIRED');
 return{...ceramicFloorM150WholeProvisionCompletenessR4(),exactFormatScopeR2:{formatId:format,reuseClassification:'REUSE_EXACT',normalPreparationHelperUnchanged:true},wholeResourceGroupReused:true};
}
export function compileCeramicFloorM150ExactFormatR2(format:CeramicFloorM150ExactFormatR1,submittedParameters:Record<string,unknown>){return compileAutomaticConstructionOwnerR1({catalogId:pack.catalogId,compilerVersion:pack.contract+':'+format,primaryMeasureParameterId:pack.parent.primaryParameterId,definition:ceramicFloorM150ExactFormatDefinitionR2(format),submittedParameters});}
