import {ceramicFloorM150ExactFormatDefinitionR1 as definition,ceramicFloorM150ExactFormatCompletenessR1 as completeness,compileCeramicFloorM150ExactFormatR1 as compile,type CeramicFloorM150ExactFormatR1} from './ceramicFloorM150ExactFormatBranchesR1';
import {ceramicFloorM150ResourceGroupDefinitionR2 as immutableR2,ceramicFloorM150ResourceGroupPackR2 as group} from './ceramicFloorCementMortarResourceGroupR2';
import {ceramicFloorM150WholeProvisionDefinitionR3 as base} from './ceramicFloorCementMortarWholeProvisionR3';
import {estimateDeterministicHash} from '../estimateDeterministicHash';
import {validateIndependentCompletenessMapReferences,validateMasterFormulaGraphConsistency} from '../../../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
const input={net_ceramic_floor_area_m2:100,ceramic_m150_skirting_length_m:50};
it.each(['ceramic100x100','ceramic150x150'] as CeramicFloorM150ExactFormatR1[])('reuses the entire group for exact format%s without changing numeric formulas',async format=>{
 const before=estimateDeterministicHash(immutableR2()),d=definition(format),b=base(),map=completeness(format),r=await compile(format,input);
 expect(estimateDeterministicHash(immutableR2())).toBe(before);expect(d.formulas).toEqual(b.formulas);expect([d.parameters.length,d.formulas.length,d.resources.length]).toEqual([30,84,84]);
 expect(d.resources.map(r=>r.row_id)).toEqual(b.resources.map(r=>r.row_id));
 expect(validateMasterFormulaGraphConsistency(d.formulas)).toEqual([]);expect(validateIndependentCompletenessMapReferences({completenessMap:map,formulaDefinitions:d.formulas,resourceDefinitions:d.resources})).toEqual([]);
 expect(r.rows.find(r=>r.row_id.endsWith(':ready-mortar-m150-order'))?.quantity).toBe('1.38');
 expect(r.rows.find(r=>r.row_id.endsWith(':r2:skirting-tile-order'))?.quantity).toBe('50.5');
 expect(r.rows.find(r=>r.row_id.endsWith(':r2:provision-owner'))?.quantity).toBe('100');
 for(const p of [...group.tools,...group.ppe])expect(r.rows.find(r=>r.row_id.endsWith(':r2:'+p.id))?.quantity).toBe(String(p.count));
 expect(r.preliminaryNeeds).toHaveLength(5);expect(d.resources.filter(r=>r.row_id.endsWith(':r2:provision-owner'))).toHaveLength(1);
});
it('keeps the two existing size scopes exact without inferring pieces or changing consumption',async()=>{
 const a=await compile('ceramic100x100',input),b=await compile('ceramic150x150',input);
 expect(a.rows.map(r=>[r.row_id,r.quantity])).toEqual(b.rows.map(r=>[r.row_id,r.quantity]));
 for(const [format,mm]of [['ceramic100x100',100],['ceramic150x150',150]] as const){const d=definition(format),tile=d.resources.find(r=>r.row_id.endsWith(':ceramic-tile-order'))!;
  expect(tile.source_metadata?.exactFormatScopeR1).toMatchObject({tileEdgeMm:mm,reuseClassification:'REUSE_EXACT',newNumericalNorm:false});
 }
});
