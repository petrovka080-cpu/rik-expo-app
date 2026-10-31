import assert from 'node:assert/strict';
import {isMasterFacadeGlassRegisteredLegacyR4 as accepted} from './masterFacadeGlassLegacyCaptureR4';
import {masterFacadeGlassCapturedParentR4 as currentCapture} from '../../../src/lib/estimate/v4/masterFacadeGlassWholeFamilyR4';
import original from '../../../data/estimate-benchmarks/fixtures/facade-glass-original-parents-r3.json';
import {canonicalDefinitionPublicationStableValueR1 as stable} from '../../../src/lib/estimate/backendPlatform/canonicalDefinitionPublicationStableValueR1';
const same=(a:unknown,b:unknown)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
// R4 binds the byte-pinned original; the R5 builder returns the separately approved UTC capture.
const capture=():Record<string,any>=>{const c=original.captures.find(c=>c.definition.catalog_id==='canonical-work:expanded:curtain_wall_system');assert(c);return structuredClone(c);};
const declaration=(c:ReturnType<typeof capture>)=>({contract:'master-retained-legacy-template-assumptions/r1',templateId:c.definition.source_metadata.templateId,parameterSources:structuredClone(c.baseline.normative_source_ids)});
// Prepared exact-source guard tests. Author executes syntax only, not imports.
describe('finite captured legacy glass assumptions R4, no provenance rewrite',()=>{
 test('exact original owner and all3logical oldassumptions admittedonlyasunchangedhistory',()=>{
  const c=capture(),before=JSON.stringify(c),d=declaration(c);assert.equal(accepted(c,d,same),true);assert.equal(JSON.stringify(c),before);
  assert.notEqual(c.definition.source_metadata.sourceTree,c.parameters.find((p:any)=>p.parameter_id==='floors').truth_metadata.provenance.approvedTemplateBinding.sourceTree);
  const prompt=c.parameters.find((p:any)=>p.parameter_id==='source_prompt').truth_metadata.provenance.approvedTemplateBinding;assert.equal(prompt.formulaConsumerIds.length,0);assert.equal(prompt.resourceConsumerRowIds.length,45);
 });
 test('approved UTC current capture does not alias the exact original historical capture',()=>{
  const c=currentCapture();assert.equal(accepted(c,declaration(c),same),false);
 });
 test('no callerchosen owner,parent,formula,resource,baseline,defaultorprovenanceaccepted',()=>{
  for(const alter of [(c:any)=>c.definition.catalog_id='canonical-work:expanded:high_rise_glazing',(c:any)=>c.definition.id='other',(c:any)=>c.definition.source_metadata.sourceTree='rewritten',(c:any)=>c.formulas[0].expression_source='1',(c:any)=>c.resources[0].unit_id='kg',(c:any)=>c.baseline.input_values.glazing_area_m2=1,(c:any)=>c.parameters.find((p:any)=>p.parameter_id==='glazing_area_m2').default_value=1,(c:any)=>c.parameters.find((p:any)=>p.parameter_id==='source_prompt').truth_metadata.provenance.approvedTemplateBinding.resourceConsumerRowIds.pop()]){const c=capture(),d=declaration(c);alter(c);assert.equal(accepted(c,d,same),false);}
 });
 test('extra/missing/changedlogicalsourceorcallerpredecessorarenotadmitted',()=>{
  const c=capture(),d=declaration(c);for(const altered of [{...d,approvedTemplatePredecessor:{}},{...d,parameterSources:{}},{...d,templateId:'arbitrary'},{...d,parameterSources:{...d.parameterSources,floors:['made-up-norm']}}])assert.equal(accepted(c,altered,same),false);
 });
});
