import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {compileRoadPlatform150Plus50S2736 as compile,ROAD_PLATFORM_DEFINITION_S2736 as definition,ROAD_PLATFORM_SOURCE_METADATA_S2736 as source} from '../../src/lib/estimate/v4/roadPlatform150Plus50ConstructorS2736';
import {compileAsphaltInstallLargeAreaKrer27ProfileR1 as asphalt,ASPHALT_INSTALL_KRER27_RUNTIME_CLASSIFICATION} from '../../src/lib/estimate/v4/asphaltInstallLargeAreaKrer27ProfileR1';
import {buildMasterParameterCalculationConsumers} from '../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import {canonicalEstimateRevisionRowFromStorage} from '../../src/lib/estimate/backendPlatform/canonicalEstimateRevisionReadMapper';
import {canonicalEstimateParameterChoiceLabelRu} from '../../src/lib/estimate/backendPlatform/canonicalEstimateParameterSemantics';
const known={area_m2:1000,base_delivery_cost_mode:'INCLUDED',base_extra_mobilization_cost_mode:'INCLUDED',base_qa_cost_mode:'INCLUDED',base_delivery_included_reference:'VALIDATION_FIXTURE material contract includes delivery; no runtime default',base_extra_mobilization_included_reference:'VALIDATION_FIXTURE equipment contract includes extra transport; no runtime default',base_qa_included_reference:'VALIDATION_FIXTURE project acceptance contract includes base QA; no runtime default'};
const yes={road_formation_accepted:'YES',road_base_150mm_m1200_approved:'YES',road_asphalt_50mm_approved:'YES',road_layer_interface_approved:'YES'};
const q=(r:Awaited<ReturnType<typeof compile>>,id:string)=>r.rows.find(x=>x.row_id===id)?.quantity;

describe('selected150mm KRER crushed stone base plus ready50mm asphalt construction',()=>{
  test('cost choices identify opposite payment scopes without calling QA or mobilization delivery',()=>{
    for(const id of ['base_delivery_cost_mode','base_extra_mobilization_cost_mode','base_qa_cost_mode']){
      expect(canonicalEstimateParameterChoiceLabelRu(id,'SEPARATE')).toBe('Оплачивается отдельно');
      expect(canonicalEstimateParameterChoiceLabelRu(id,'INCLUDED')).toBe('Включено в подтверждённую стоимость');
    }
    expect(canonicalEstimateParameterChoiceLabelRu('delivery_cost_mode','SEPARATE')).toBe('Доставка отдельной строкой');
  });
  test('source bytes and every declared parameter consumer are retained without fabricated project confirmations',()=>{
    expect(source.definition_hash).toBe(createHash('sha256').update(readFileSync('data/estimate-benchmarks/source-packs/road-platform-150-plus-50-s27-36.json')).digest('hex'));
    const {resourceConsumers}=buildMasterParameterCalculationConsumers({parameters:definition.parameters,formulas:definition.formulas,resources:definition.resources});
    expect(definition.parameters.filter(p=>!resourceConsumers[p.parameter_id]?.length).map(p=>p.parameter_id)).toEqual([]);
    expect(Object.values(definition.runtimeInput)).not.toContain('YES');
    expect(Object.keys(definition.runtimeInput)).not.toContain('base_delivery_trips');
    expect(Object.keys(definition.runtimeInput)).not.toContain('base_extra_mobilization_count');
    expect(Object.keys(definition.runtimeInput)).not.toContain('base_qa_services_count');
    for(const [id,classification] of Object.entries(ASPHALT_INSTALL_KRER27_RUNTIME_CLASSIFICATION))expect(definition.runtimeClassification[id]).toBe(classification);
    expect(new Set(definition.resources.map(x=>x.row_id)).size).toBe(definition.resources.length);
  });
  test('ordinary area alone fills the selected normative base resources and keeps only actual project service needs',async()=>{
    const r=await compile({area_m2:1000});
    expect(r.preliminaryNeeds.filter(x=>x.row_id.startsWith('road-base:scope:cost-')).flatMap(x=>x.missing_parameter_ids)).toEqual(['base_delivery_cost_mode','base_extra_mobilization_cost_mode','base_qa_cost_mode']);
    expect(r.preliminaryNeeds.every(x=>x.row_id.startsWith('road-base:project:')||x.row_id.startsWith('road-base:scope:cost-'))).toBe(true);
    expect(q(r,'road-base:material:stone40')).toBe('189');expect(q(r,'road-base:material:stone10')).toBe('15');expect(q(r,'road-base:material:water')).toBe('30000');
    expect(q(r,'road-base:labor:workers')).toBe('33.29');
    expect(r.rows.filter(x=>x.included_in_procurement)).toHaveLength(7);
    expect(r.rows.filter(x=>x.row_id.startsWith('road-base:equipment:'))).toHaveLength(7);
    for(const row of r.rows.filter(x=>x.row_id.startsWith('road-base:material:')))expect(row.normative_trace).toEqual(expect.arrayContaining([expect.objectContaining({exact_locator:expect.stringContaining('27-04-005-01')})]));
  });
  test('the assembled asphalt retains every accepted physical, labor, machine and delivery quantity',async()=>{
    const own=await asphalt({area_m2:1000});const combined=await compile({area_m2:1000});
    for(const row of own.rows)expect(q(combined,row.row_id)).toBe(row.quantity);
    for(const row of definition.resources.filter(x=>x.row_id.startsWith('asphalt:'))){
      expect(row.source_metadata?.reusedOperation).toMatchObject({originalRowId:row.row_id,formulaArithmeticPreserved:true});
    }
    expect(definition.resources.some(x=>x.row_id.includes('compaction:'))).toBe(false);
  });
  test('stock/reserve and separate material quanta do not turn installed base volume into a universal loose ratio',async()=>{
    const r=await compile({...known,area_m2:1001,base_stone40_stock:100,base_stone40_reserve:5,base_stone_quantum_m3:10});
    const material=r.rows.find(x=>x.row_id==='road-base:material:stone40')!;
    expect(material.calculation_trace).toMatchObject({purchaseBalance:{consumed:'189.189',stock:'100',reserve:'5',effectiveOrder:'100',remaining:'10.811',freeBeyondReserve:'5.811',quantum:'10'}});
    expect(q(r,'road-base:material:stone10')).toBe('20');expect(q(r,'road-base:material:water')).toBe('31000');
    expect(q(r,'road-base:labor:workers')).toBe('33.32329');
    const reopened=canonicalEstimateRevisionRowFromStorage(JSON.parse(JSON.stringify(material)),null);
    expect(reopened.calculationTrace.purchaseBalance).toMatchObject({consumed:'189.189',effectiveOrder:'100',remaining:'10.811'});
  });
  test('operators, operating fuel and contractor tooling are allocated to actual paid parents; shared mobilization is not duplicated',async()=>{
    const r=await compile(known);
    const operators=r.rows.filter(x=>x.row_id.startsWith('road-base:included:operator:'));
    expect(operators.reduce((sum,x)=>sum+Number(x.quantity),0)).toBeCloseTo(49.92,10);
    for(const x of r.rows.filter(x=>x.row_id.startsWith('road-base:included:')||x.row_id.startsWith('road-base:tool:'))){
      expect(x.included_in_estimate).toBe(false);expect(x.included_in_procurement).toBe(false);
      const root=definition.resources.find(row=>row.row_id===x.row_id)!;
      expect(definition.resources.some(row=>row.row_id===root.resource_graph.includedInResourceOwnerRowId)).toBe(true);
    }
    expect(definition.resources.filter(x=>x.row_id.startsWith('asphalt:mobilization:'))).toHaveLength(5);
    expect(definition.resources.some(x=>x.row_id.startsWith('road-base:mobilization:'))).toBe(false);
  });
  test('confirmations remain actual inputs; incompatible thickness and negative measured service facts are rejected',async()=>{
    const missing=await compile({...known,road_applicability_mode:'CONFIRMED_PROJECT_FACTS'});
    expect(missing.preliminaryNeeds.flatMap(x=>x.missing_parameter_ids)).toEqual(expect.arrayContaining(Object.keys(yes)));
    expect((await compile({...known,...yes,road_applicability_mode:'CONFIRMED_PROJECT_FACTS'})).preliminaryNeeds).toEqual([]);
    await expect(compile({...known,base_thickness_mm:100})).rejects.toThrow();
    await expect(compile({...known,layer_thickness_mm:60})).rejects.toThrow();
    await expect(compile({...known,base_delivery_cost_mode:'SEPARATE',base_delivery_trips:-1})).rejects.toThrow();
    await expect(compile({...known,road_formation_accepted:'NO'})).rejects.toThrow();
  });
  test('included costs require saved references; zero cannot bypass the choice, while positive separate services survive',async()=>{
    const none=await compile(known);expect(none.preliminaryNeeds).toEqual([]);
    expect(none.rows.some(x=>x.row_id.startsWith('road-base:project:'))).toBe(false);
    const withoutReferences=await compile({area_m2:1000,base_delivery_cost_mode:'INCLUDED',base_extra_mobilization_cost_mode:'INCLUDED',base_qa_cost_mode:'INCLUDED'});
    expect(withoutReferences.preliminaryNeeds.flatMap(x=>x.missing_parameter_ids)).toEqual(expect.arrayContaining(['base_delivery_included_reference','base_extra_mobilization_included_reference','base_qa_included_reference']));
    for(const row of none.rows.filter(x=>x.row_id.startsWith('road-base:scope:cost-'))){expect(row.included_in_estimate).toBe(false);expect(row.title_ru).toContain('VALIDATION_FIXTURE');}
    await expect(compile({area_m2:1000,base_delivery_trips:0,base_extra_mobilization_count:0,base_qa_services_count:0})).rejects.toThrow();
    await expect(compile({...known,base_delivery_cost_mode:'SEPARATE',base_delivery_trips:0})).rejects.toThrow();
    const actual=await compile({...known,base_delivery_cost_mode:'SEPARATE',base_extra_mobilization_cost_mode:'SEPARATE',base_qa_cost_mode:'SEPARATE',base_delivery_trips:17,base_extra_mobilization_count:4,base_qa_services_count:2});
    expect(q(actual,'road-base:project:base_delivery_trips')).toBe('17');
    expect(q(actual,'road-base:project:base_extra_mobilization_count')).toBe('4');
    expect(q(actual,'road-base:project:base_qa_services_count')).toBe('2');
    expect(actual.preliminaryNeeds).toEqual([]);
  });
});
