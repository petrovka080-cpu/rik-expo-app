import { roofPreparationMigrationSemanticHashV1 as semanticHash, type RoofPreparationMigrationModelV1 as Model,
  type RoofPreparationDefinitionIdentityV1 as Identity } from './canonicalRoofPreparationMigrationV1';
import { ROOF_SCREED25_STANDALONE_BINDING_V1 as binding, ROOF_SCREED25_STANDALONE_BINDING_SHA_V1,
  roofScreed25StandaloneSuccessorModelV1 } from './canonicalRoofScreed25StandaloneV1';
import { canonicalEstimateStableJson as stable } from './canonicalEstimateDeterminism';
import { canonicalManualExclusionMigrationBindings, canonicalManualPriceMigrationBindings } from './canonicalManualPriceReleaseMigration';
type Input = {fromDefinition:Identity;toDefinition:Identity;from:Model;to:Model};
export type RoofScreed25StandaloneMigrationProofV1 = {contractVersion:'canonical-roof-screed25-standalone-migration/v1';catalogId:string;
  fromDefinitionId:string;toDefinitionId:string;fromDefinitionSha256:string;toDefinitionSha256:string;
  fromSemanticSha256:string;toSemanticSha256:string;sourceSha256:string;directBaseSourceSha256:string;
  applicationBindingSha256:string;preservedRowIds:string[]};
export function buildRoofScreed25StandaloneMigrationProofV1(i:Input):RoofScreed25StandaloneMigrationProofV1 {
  return {contractVersion:'canonical-roof-screed25-standalone-migration/v1',catalogId:i.toDefinition.catalogId,
    fromDefinitionId:i.fromDefinition.id,toDefinitionId:i.toDefinition.id,fromDefinitionSha256:i.fromDefinition.sha256,toDefinitionSha256:i.toDefinition.sha256,
    fromSemanticSha256:semanticHash(i.from),toSemanticSha256:semanticHash(i.to),sourceSha256:binding.sourceSha256,
    directBaseSourceSha256:binding.directBaseSourceSha256,applicationBindingSha256:ROOF_SCREED25_STANDALONE_BINDING_SHA_V1,
    preservedRowIds:i.from.resources.map(r => String(r.row_id)).sort()};
}
/** Only this finite forward transition can normalize historical compatibility.
 * The compiled successor keeps its real new guards and questions. */
export function admitRoofScreed25StandaloneMigrationProofV1(i:Input&{proof:unknown}) {
  const p=i.proof as RoofScreed25StandaloneMigrationProofV1|null,target=binding.targets.find(t => t.catalogId === p?.catalogId);
  if(!p || !target || p.contractVersion !== 'canonical-roof-screed25-standalone-migration/v1'
    || p.catalogId !== i.fromDefinition.catalogId || p.catalogId !== i.toDefinition.catalogId
    || p.fromDefinitionId !== target.predecessorDefinitionId || p.fromDefinitionSha256 !== target.predecessorDefinitionSha256
    || p.fromDefinitionId !== i.fromDefinition.id || p.toDefinitionId !== i.toDefinition.id || p.fromDefinitionId === p.toDefinitionId
    || !/^[0-9a-f-]{36}$/iu.test(p.toDefinitionId) || !/^[a-f0-9]{64}$/u.test(p.toDefinitionSha256)
    || p.toDefinitionSha256 !== i.toDefinition.sha256 || p.fromDefinitionSha256 !== i.fromDefinition.sha256
    || p.applicationBindingSha256 !== ROOF_SCREED25_STANDALONE_BINDING_SHA_V1 || p.sourceSha256 !== binding.sourceSha256
    || p.directBaseSourceSha256 !== binding.directBaseSourceSha256 || p.fromSemanticSha256 !== semanticHash(i.from)
    || p.toSemanticSha256 !== semanticHash(i.to) || stable(p.preservedRowIds) !== stable(i.from.resources.map(r => String(r.row_id)).sort())
    || i.from.resources.length !== 127 || i.from.parameters.length !== 64 || i.from.formulas.length !== 127
    || i.to.resources.length !== 137 || i.to.parameters.length !== 67 || i.to.formulas.length !== 135
    || new Set(i.to.resources.map(r => r.row_id)).size !== 137 || new Set(i.to.parameters.map(r => r.parameter_id)).size !== 67) return null;
  try {
    const expected=roofScreed25StandaloneSuccessorModelV1(i.from,p.catalogId);
    if(semanticHash(expected) !== p.toSemanticSha256) return null;
    const old=new Map(i.from.resources.map(r => [String(r.row_id),r]));
    const normalizedTo={...i.to,parameters:i.from.parameters,resources:i.to.resources.map(r => old.get(String(r.row_id)) ?? r)};
    const sameBindings=(build:typeof canonicalManualPriceMigrationBindings) => {
      const before=build(i.from),after=build(normalizedTo);
      return Object.keys(before).length === 127 && Object.entries(before).every(([id,value]) => after[id] === value);
    };
    if(!sameBindings(canonicalManualPriceMigrationBindings) || !sameBindings(canonicalManualExclusionMigrationBindings)) return null;
    return {proof:p,normalizedTo};
  } catch {return null;}
}
