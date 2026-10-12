import data from '../../../../data/estimate-benchmarks/source-packs/flat-roof-scope-s27-65.json';
import type {CanonicalScopeRequirementKindV1} from '../backendPlatform/canonicalScopeRequirementV1';
export type FlatRoofScopeClassificationS2765 = {
  suffix:string; kind:CanonicalScopeRequirementKindV1; reviewDecision:string; groupId:string; groupTitleRu:string;
  reasonRu:string; includedNormRoles:string[]; satisfiedBy:'conditions'|'measurement'|null;
};
export const flatRoofScopePackS2765 = data as Omit<typeof data,'scopeClassification'> & {
  scopeClassification:FlatRoofScopeClassificationS2765[];
};
