import source from '../../../../data/estimate-benchmarks/source-packs/ct126-prepared-series-s27-54.json';
import {ct126DryPreparedDefinitionS2754,ct126DryPreparedCompletenessMapS2754} from './ct126DryWallS2754';
import {compileAutomaticConstructionOwnerR1,unresolvedApplicationNormTruthR1} from './automaticConstructionOwnerR1';

export const ct126PreparedSeriesSourceS2754=source;
export function ct126PreparedVariantS2754(index:number){const v=source.variants[index];if(!v)throw Error('EXACT_CT126_PREPARED_VARIANT_REQUIRED');return v;}
export function ct126PreparedPrefixS2754(index:number){return 'putty:ct126-prepared:'+ct126PreparedVariantS2754(index).key;}
export function ct126PreparedDefinitionS2754(index:number){const v=ct126PreparedVariantS2754(index),definition=ct126DryPreparedDefinitionS2754(v.pack,ct126PreparedPrefixS2754(index),{baseTitle:v.baseTitle,sourceTitle:v.pack.titleRu,priorPrimer:v.priorPrimer as 'CT7'|'CT19',baseAcceptanceReferenceRequired:true});
 return {...definition,parameters:definition.parameters.map(p=>p.parameter_id==='base_acceptance_reference'?{...p,truth_metadata:{...p.truth_metadata,value_source_role:'PROJECT_SPECIFIC_INPUT',provenance:{consumer_input_role_v1:'USER_INPUT'}}}:p.parameter_id.startsWith('open_qty_')?{...p,truth_metadata:unresolvedApplicationNormTruthR1(p.truth_metadata,'Норма труда, инструмент, завершающая грунтовка и услуги требуют принятого источника; ручное количество не подтверждает норму.')}:p)};
}
export function compileCt126PreparedS2754(index:number,input:Record<string,unknown>){const v=ct126PreparedVariantS2754(index);return compileAutomaticConstructionOwnerR1({catalogId:v.pack.catalogId,compilerVersion:v.pack.contract,primaryMeasureParameterId:'putty_area_m2',definition:ct126PreparedDefinitionS2754(index),submittedParameters:input});}
export function ct126PreparedCompletenessMapS2754(index:number){const v=ct126PreparedVariantS2754(index);return ct126DryPreparedCompletenessMapS2754(v.pack,ct126PreparedPrefixS2754(index),v.pack.titleRu,v.constructionState+'_'+v.surface.toUpperCase());}
