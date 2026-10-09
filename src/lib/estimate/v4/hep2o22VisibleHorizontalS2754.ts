import pack from '../../../../data/estimate-benchmarks/source-packs/hep2o22-visible-horizontal-s27-54.json';
import {hep2oVisibleLineDefinitionS2754, hep2oVisibleLineCompletenessMapS2754} from './hep2o15VisibleLineS2754';
import {compileAutomaticConstructionOwnerR1} from './automaticConstructionOwnerR1';

export const hep2o22VisibleHorizontalPackS2754 = pack;
export const hep2o22VisibleHorizontalPrefixS2754 = 'plumbing:hep2o22-visible:horizontal';
export function hep2o22VisibleHorizontalDefinitionS2754() {
  return hep2oVisibleLineDefinitionS2754({index:0,pack,prefix:hep2o22VisibleHorizontalPrefixS2754,nominalInsertionMm:33,maxRouteM:24.934});
}
export function compileHep2o22VisibleHorizontalS2754(input:Record<string,unknown>) {
  return compileAutomaticConstructionOwnerR1({catalogId:pack.types[0].catalogId,compilerVersion:pack.contract,
    primaryMeasureParameterId:'pipe_route_length_m',definition:hep2o22VisibleHorizontalDefinitionS2754(),submittedParameters:input});
}
export function hep2o22VisibleHorizontalCompletenessMapS2754() {
  return hep2oVisibleLineCompletenessMapS2754(pack,hep2o22VisibleHorizontalPrefixS2754);
}
