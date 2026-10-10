import pack from '../../../../data/estimate-benchmarks/source-packs/concrete-kerb-cement-object-scope-s27-54.json';
import {buildKerbObjectScopeDefinitionS2754,buildKerbObjectScopeCompletenessMapS2754} from './concreteKerbOtherObjectScopeS2754';
import {compileAutomaticConstructionOwnerR1} from './automaticConstructionOwnerR1';
export const kerbCementObjectScopePackS2754=pack;
export const kerbCementObjectScopePrefixS2754='concrete-kerb:cement-concrete-pavement';
export const kerbCementObjectScopeDefinitionS2754=buildKerbObjectScopeDefinitionS2754(0);
export const kerbCementObjectScopeCompletenessMapS2754=()=>buildKerbObjectScopeCompletenessMapS2754(0);
export const compileKerbCementObjectScopeS2754=(input:Record<string,unknown>)=>compileAutomaticConstructionOwnerR1({catalogId:pack.catalogId,compilerVersion:pack.contract,primaryMeasureParameterId:'kerb_length_m',definition:kerbCementObjectScopeDefinitionS2754,submittedParameters:input});
