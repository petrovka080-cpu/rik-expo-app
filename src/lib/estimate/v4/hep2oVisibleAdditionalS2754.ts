import source from '../../../../data/estimate-benchmarks/source-packs/hep2o-visible-additional-s27-54.json';
import {hep2oVisibleLineDefinitionS2754,hep2oVisibleLineCompletenessMapS2754} from './hep2o15VisibleLineS2754';
import {compileAutomaticConstructionOwnerR1} from './automaticConstructionOwnerR1';

export const hep2oVisibleAdditionalSourceS2754=source;
export function hep2oVisibleAdditionalVariantS2754(index:number) {
  const variant=source.variants[index];if(!variant)throw Error('EXACT_THREE_HEP2O_ADDITIONAL_TYPES_REQUIRED');return variant;
}
export function hep2oVisibleAdditionalPrefixS2754(index:number) {
  const v=hep2oVisibleAdditionalVariantS2754(index);return `plumbing:hep2o${v.diameterMm}-visible:${v.orientation}`;
}
export function hep2oVisibleAdditionalDefinitionS2754(index:number) {
  const v=hep2oVisibleAdditionalVariantS2754(index);
  return hep2oVisibleLineDefinitionS2754({index:0,pack:v.pack,prefix:hep2oVisibleAdditionalPrefixS2754(index),
    nominalInsertionMm:v.nominalInsertionMm as 33|36,maxRouteM:v.routeMaximumM as 24.934|24.928});
}
export function compileHep2oVisibleAdditionalS2754(index:number,input:Record<string,unknown>) {
  const v=hep2oVisibleAdditionalVariantS2754(index);
  return compileAutomaticConstructionOwnerR1({catalogId:v.pack.types[0].catalogId,compilerVersion:v.pack.contract,
    primaryMeasureParameterId:'pipe_route_length_m',definition:hep2oVisibleAdditionalDefinitionS2754(index),submittedParameters:input});
}
export function hep2oVisibleAdditionalCompletenessMapS2754(index:number) {
  return hep2oVisibleLineCompletenessMapS2754(hep2oVisibleAdditionalVariantS2754(index).pack,hep2oVisibleAdditionalPrefixS2754(index));
}
