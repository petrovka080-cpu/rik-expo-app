import pack from '../../../../data/estimate-benchmarks/source-packs/ct29-exterior-plaster-s27-54.json';
import {buildCt29PlasterDefinitionS2754,buildCt29PlasterCompletenessMapS2754} from './ct29IndoorPlasterS2754';
import {compileAutomaticConstructionOwnerR1} from './automaticConstructionOwnerR1';

export const ct29ExteriorPlasterPackS2754=pack;
export const ct29ExteriorPlasterPrefixS2754='plaster:ct29-exterior-manual';
export const ct29ExteriorPlasterDefinitionS2754=buildCt29PlasterDefinitionS2754(pack,ct29ExteriorPlasterPrefixS2754);
export function ct29ExteriorPlasterCompletenessMapS2754(){return buildCt29PlasterCompletenessMapS2754(pack,ct29ExteriorPlasterPrefixS2754);}
export function compileCt29ExteriorPlasterS2754(input:Record<string,unknown>){return compileAutomaticConstructionOwnerR1({catalogId:pack.catalogId,
  compilerVersion:pack.contract,primaryMeasureParameterId:'plaster_area_m2',definition:ct29ExteriorPlasterDefinitionS2754,submittedParameters:input});}
