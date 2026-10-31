import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {monolithicReturnWaveConfigR1 as config} from './prepareMonolithicReturnWaveR1';
import {monolithicPhysicalCaptureR2 as capture} from '../../../src/lib/estimate/v4/monolithicPhysicalProvisionMasterR2';
import {masterRetainParentBindingsOptInR1,assertMasterRetainedParentComputationR1} from './masterSingleDefinitionRetainParentBindingsR1';
import {validateMasterFormulaGraphConsistency as validate,validateIndependentCompletenessMapReferences} from './prepareMasterSingleDefinitionSuccessorR1';
type J=Record<string,any>;
const path='data/estimate-benchmarks/fixtures/monolithic-return-retained-formula-expression-repairs-r1.json',fixture=JSON.parse(readFileSync(path,'utf8')) as {cards:J[]};
const context={releaseId:'d91453c6-20a0-5b18-9995-cb24731bd72d',searchReleaseId:'ab1eff60-cd53-5c8a-8374-2e83ab66b2f7'};
const clone=<T,>(x:T):T=>structuredClone(x);
function setup(){const cfg=config(context,fixture.cards[0]!.catalogId),source={id:'10000000-0000-5000-8000-000000000001',source_key:cfg.sourceId,
 title_ru:cfg.sourceMetadata.source_title,authority:cfg.sourceMetadata.source_authority,official_url:cfg.sourceMetadata.official_url,
 artifact_sha256:cfg.sourceMetadata.artifact_sha256,effective_from:null,effective_to:null,metadata:{controlOnly:true}},
 input:any={config:{...cfg,binding:clone(cfg.binding)},newSource:source,newLocators:[{id:'10000000-0000-5000-8000-000000000002',source_id:source.id,
 locator_key:cfg.locator.key,locator:cfg.locator.payload,excerpt_sha256:'a'.repeat(64)}]};
 return{cfg,input,next:{parameters:cfg.parameterDefinitions,formulas:cfg.formulaDefinitions,resources:cfg.resourceDefinitions}};
}
test('literal source-only repair set covers only17 texts on one of8 pinned current parents',()=>{
 expect(createHash('sha256').update(readFileSync(path)).digest('hex')).toBe('5d008ced4db3928c4192469e49549690c0a42d251488bc6ec7107e9a6eefc5d7');
 expect(fixture.cards).toHaveLength(8);expect(fixture.cards.filter(c=>c.formulaExpressionRepairs!=null)).toHaveLength(1);
 expect(Object.keys(fixture.cards[0]!.formulaExpressionRepairs)).toHaveLength(17);
});
test.each(fixture.cards)('exact old AST/inputs/units/hashes survive successor text projection: $catalogId',card=>{
 const c=capture(card.catalogId),before=JSON.stringify(c),cfg=config(context,card.catalogId),opt=cfg.binding.retainParentBindings!,repairs=card.formulaExpressionRepairs??{};
 expect(c.definition.id).toBe(card.definitionId);expect(opt.capturedParentSha256).toBe(card.capturedParentSha256);
 expect(validate(cfg.formulaDefinitions)).toEqual([]);
 for(const old of c.formulas){const next=cfg.formulaDefinitions.find(f=>f.formula_id===old.formula_id)!;
  expect({...next,expression_source:old.expression_source}).toEqual(old);
  expect(next.expression_source).toBe(repairs[old.formula_id]?.correctedExpressionSource??old.expression_source);
 }
 if(card.formulaExpressionRepairs==null)expect(Object.hasOwn(opt,'formulaExpressionRepairs')).toBe(false);
 else expect(opt.formulaExpressionRepairs).toEqual(card.formulaExpressionRepairs);
 expect(JSON.stringify(c)).toBe(before);expect(cfg.applicability.fullTechnicalAcceptance).toBe(false);
});
test('normal strict retained owner admits only declared text and does not widen arithmetic or units',()=>{
 const s=setup();expect(masterRetainParentBindingsOptInR1(s.input)).not.toBeNull();
 expect(()=>assertMasterRetainedParentComputationR1(s.input,s.next,'REPRESENTATIVE')).not.toThrow();
 const bad=clone(s.next),id='concrete_order_quantity_v1';bad.formulas.find(f=>f.formula_id===id)!.output_unit_id='kg';
 expect(()=>assertMasterRetainedParentComputationR1(s.input,bad,'REPRESENTATIVE')).toThrow('OLD_FORMULA_SEMANTICS_DRIFT');
 const wrong={...s.input,config:{...s.input.config,binding:clone(s.input.config.binding)}};
 wrong.config.binding.retainParentBindings.formulaExpressionRepairs[id].correctedExpressionSource='slab_concrete_volume_m3*77';
 expect(()=>masterRetainParentBindingsOptInR1(wrong)).toThrow('FORMULA_EXPRESSION_REPAIR_SEMANTICS');
});
test('without explicit existing opt-in the same text correction remains forbidden',()=>{
 const s=setup();delete s.input.config.binding.retainParentBindings.formulaExpressionRepairs;
 expect(()=>assertMasterRetainedParentComputationR1(s.input,s.next,'REPRESENTATIVE')).toThrow('OLD_FORMULA_SEMANTICS_DRIFT');
});

test('absent historical base map is preserved while the final merged map must be nonempty',async()=>{
 const card=fixture.cards[0]!,old=capture(card.catalogId),cfg=config(context,card.catalogId);
 expect(old.definition.id).toBe('733e0d11-dbfd-5033-8366-f250e752168c');
 expect(old.contentPassport.decision.independentCompletenessMap).toBeUndefined();
 const result=await cfg.verifyCore();expect(result).toBeTruthy();
 expect(cfg.passport.independentCompletenessMap!.entries.length).toBeGreaterThan(0);
 const input={completenessMap:cfg.passport.independentCompletenessMap!,formulaDefinitions:cfg.formulaDefinitions,resourceDefinitions:cfg.resourceDefinitions};
 expect(validateIndependentCompletenessMapReferences(input)).toEqual([]);
 expect(validateIndependentCompletenessMapReferences({...input,completenessMap:{...input.completenessMap,entries:[]}})).toContain('ENTRIES_EMPTY');
 expect(cfg.applicability.fullTechnicalAcceptance).toBe(false);
});
