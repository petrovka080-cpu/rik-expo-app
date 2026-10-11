import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {jubilee110BinPackS2758 as pack,jubilee110BinPrefixS2758 as prefix,jubilee110BinDefinitionS2758,compileJubilee110BinS2758,
  includedBinFixingsS2758,separateBinFixingsS2758,jubilee110BinCompletenessMapS2758} from '../../../src/lib/estimate/v4/jubilee110BinPreparedConcreteS2758';
import {validateIndependentCompletenessMapReferences} from './prepareMasterSingleDefinitionSuccessorR1';

export function jubilee110BinControlS2758(n=3,separate=false):Record<string,unknown>{return {
  bin_count:n,
  project_bin_configuration_reference:'CONTROL_ONLY: проект/редакция/позиция готовой собранной Glasdon Jubilee110 со стальным оцинкованным вкладышем110л и выбранной дверцей/отверстиями/цветом; не данные объекта',
  prepared_foundation_acceptance_reference:'CONTROL_ONLY: реальный проект/акт/обмер ровного прочного готового бетона20–30Н/мм² и выбранных точек установки; не данные объекта',
  safe_drilling_foundation_reference:'CONTROL_ONLY: проект/акт подтверждает безопасные отверстияØ10мм минимум130мм и анкеровкуM10×120, без мешающих коммуникаций; толщина не взята из рисунка; не данные объекта',
  minimum_anchor_edge_distance_mm:110,actual_concrete_strength_n_mm2:20,minimum_safe_drilling_depth_mm:130,
  actual_bin_supply_specification:'CONTROL_ONLY: готовая собранная Glasdon Jubilee110, стальной оцинкованный вкладыш110л,1158×598×553мм; выбранная поставка и состав по документу; не данные объекта',
  anchor_supply_scope:separate?separateBinFixingsS2758:includedBinFixingsS2758,bin_stock:0,bin_reserve:0,bin_quantum:1,
  ...(separate?{fixing_supply_specification:'CONTROL_ONLY: совместимый полный бетонный узел Jubilee110/C0000018: болтM10×120,гайкаM10,обе шайбыØ20/Ø50; артикул/марка/покрытие по поставщику; не данные объекта',
    fixing_stock:0,fixing_reserve:0,fixing_quantum:1}:{}),
};}

export async function verifyJubilee110BinS2758(){
  for(const source of pack.sources)assert.equal(createHash('sha256').update(readFileSync(source.path)).digest('hex'),source.sha256);
  const d=jubilee110BinDefinitionS2758();assert.deepEqual([d.parameters.length,d.formulas.length,d.resources.length],[28,13,13]);
  assert.deepEqual(validateIndependentCompletenessMapReferences({completenessMap:jubilee110BinCompletenessMapS2758(),formulaDefinitions:d.formulas,resourceDefinitions:d.resources}),[]);
  assert.equal(d.parameters.filter(p=>p.truth_metadata.visibility_role==='USER_INPUT').length,18);
  for(const separate of [false,true])for(const n of [3,11]){
    const result=await compileJubilee110BinS2758(jubilee110BinControlS2758(n,separate));assert.equal(result.rows.length,4);assert.equal(result.preliminaryNeeds.length,8);
    assert.equal(result.rows.filter(r=>r.included_in_procurement).length,separate?2:1);
    assert.equal(result.rows.find(r=>r.row_id===prefix+':bin-consumed')?.quantity,String(n));
    assert.equal(result.rows.find(r=>r.row_id===prefix+':bin-order')?.quantity,String(n));
    assert.equal(result.rows.find(r=>r.row_id===prefix+':fixing-consumed')?.quantity,String(4*n));
    assert.equal(result.rows.find(r=>r.row_id===prefix+':fixing-included')?.quantity,separate?undefined:String(4*n));
    assert.equal(result.rows.find(r=>r.row_id===prefix+':fixing-order')?.quantity,separate?String(4*n):undefined);
    assert(result.rows.every(r=>r.unit_price===null));assert(!result.rows.some(r=>/holes|washers|bolt|nut/.test(r.row_id)));
  }
  const base=jubilee110BinControlS2758(),positive={...base,bin_stock:1,bin_reserve:1,bin_quantum:2};
  assert(!(await compileJubilee110BinS2758(positive)).rows.some(r=>r.row_id===prefix+':bin-order'));
  const ready=await compileJubilee110BinS2758({...positive,bin_stock_compatibility_reference:'CONTROL_ONLY: точные пригодные полные комплекты урн с вкладышем и четырьмя штатными креплениями'});
  assert.equal(ready.rows.find(r=>r.row_id===prefix+':bin-order')?.quantity,'4');assert.equal(ready.rows.find(r=>r.row_id===prefix+':fixing-consumed')?.quantity,'12');
  const noMode=await compileJubilee110BinS2758({...base,anchor_supply_scope:undefined});assert.equal(noMode.rows.find(r=>r.row_id===prefix+':bin-consumed')?.quantity,'3');assert.equal(noMode.rows.find(r=>r.row_id===prefix+':fixing-consumed')?.quantity,'12');assert.equal(noMode.rows.filter(r=>r.included_in_procurement).length,0);
  const separate=await compileJubilee110BinS2758({...jubilee110BinControlS2758(11,true),bin_stock:4,bin_reserve:1,bin_quantum:4,bin_stock_compatibility_reference:'CONTROL_ONLY: exact compatible bins',fixing_stock:10,fixing_reserve:2,fixing_quantum:8,fixing_stock_compatibility_reference:'CONTROL_ONLY: exact complete compatible assemblies'});
  assert.equal(separate.rows.find(r=>r.row_id===prefix+':bin-order')?.quantity,'8');assert.equal(separate.rows.find(r=>r.row_id===prefix+':fixing-order')?.quantity,'40');assert.equal(separate.rows.find(r=>r.row_id===prefix+':fixing-consumed')?.quantity,'44');
  for(const bad of [{bin_count:1.5},{bin_count:0},{minimum_anchor_edge_distance_mm:109},{minimum_safe_drilling_depth_mm:129},{actual_concrete_strength_n_mm2:19.9},{actual_concrete_strength_n_mm2:30.1},{anchor_supply_scope:'NOT_SELECTED'},{bin_quantum:0},{open_scope_qty_drill_and_bit_provision:1}])await assert.rejects(()=>compileJubilee110BinS2758({...base,...bad}));
  const unresolved=d.resources.filter(r=>r.source_metadata?.quantityUnitUnconfirmed);assert.equal(unresolved.length,8);assert(unresolved.every(r=>r.unit_id===''));
  return {status:'GREEN_EXACT_JUBILEE110_MANUFACTURER_COMPOSITION_PARTIAL',shape:[28,13,13],included:[4,8,1],separate:[4,8,2],physicalFourNRetainedWithoutPurchaseMode:true,arbitraryComponentPurchases:0,holePriceOwners:0,fullTechnicalAcceptance:false,acceptedCompleteTypes:0};
}
if(process.argv[1]?.replaceAll('\\','/').endsWith('/preflightS2758Jubilee110Bin.ts'))void verifyJubilee110BinS2758()
  .then(result=>process.stdout.write(JSON.stringify(result)+'\n')).catch(e=>{process.stderr.write(String(e.stack??e)+'\n');process.exitCode=1;});
