import field from '../../../../data/estimate-benchmarks/source-packs/flat-roof-torch-two-s27-63.json';
import primer from '../../../../data/estimate-benchmarks/source-packs/roof-prime-ready-emulsion-five-s27-63.json';
import screed from '../../../../data/estimate-benchmarks/source-packs/roof-cement-screed15-five-s27-63.json';
import valley from '../../../../data/estimate-benchmarks/source-packs/roof-valley-torch-two-companion-s27-67.json';
import {sourcePinnedRoofNormOwnerR1,type SourcePinnedRoofNormPackR1} from './sourcePinnedRoofNormOwnerR1';
import {canonicalEstimateSha256HexText} from '../backendPlatform/canonicalEstimateSha256';
import {canonicalEstimateStableJson} from '../backendPlatform/canonicalEstimateDeterminism';
import {compileCanonicalEstimateCore} from '../backendPlatform/canonicalEstimateCompileCore';
const hash=(v:unknown)=>canonicalEstimateSha256HexText(canonicalEstimateStableJson(v));
const asPack=(v:unknown)=>v as SourcePinnedRoofNormPackR1;
describe('source pinned linear measure without changing accepted area consumers',()=>{
 test.each([
  [field,'b25bef08c27f983333cd861d0c56770adf9bc5387c7126a405cdb0fa8d1bee10'],
  [primer,'31426cff324388c9296cd93644fd37a7b9b265c74f5840d10e4bfdf6b61596e7'],
  [screed,'66f27ac78b4c30de2d4db79ffae1ea2e352e4f3a3189b1c6e77bc1133bd380a5'],
 ])('retains the frozen complete output of an admitted area packet', (pack,digest)=>{
  expect(canonicalEstimateSha256HexText(JSON.stringify(sourcePinnedRoofNormOwnerR1(asPack(pack))))).toBe(digest);
 });
 test('calculates seven source rates from independently measured length, with no q or numerical operator anomaly',async()=>{
  const r=sourcePinnedRoofNormOwnerR1(asPack(valley));expect(r.parameters.some(p=>p.parameter_id==='q')).toBe(false);
  expect(r.parameters.find(p=>p.parameter_id===valley.measurementParameterId)?.unit_id).toBe('linear_m');
  expect(r.formulas.every(f=>JSON.stringify(f.input_parameter_ids)===JSON.stringify([valley.measurementParameterId]))).toBe(true);
  expect(r.resources).toHaveLength(7);
  const result=await compileCanonicalEstimateCore({operation:'compile',catalogId:'valley-control',compilerVersion:'TEST',parameterDefinitions:[...r.parameters],formulaDefinitions:[...r.formulas],resourceDefinitions:[...r.resources],
   submittedParameters:{[valley.measurementParameterId]:'20',[valley.systemParameterId]:valley.systemYesRu,[valley.conditionsParameterId]:valley.conditionsYesRu,[valley.areaParameterId]:valley.areaYesRu},confirmedParameters:{},currencyCode:'KGS',rowOverrides:{},priceItems:[],maximumResourceRows:7,hashJson:hash});
  for(const [role,quantity]of [['workers','3.58'],['tower_crane_8t','0.048'],['truck_crane_10t','0.02'],['gas_flame_burner','1.32'],['flatbed_truck_to_5t','0.03'],['propane_butane','2.36'],['lower_isoplast_epp_4','69']])expect(result.rows.find(r=>r.row_id===valley.prefix+':'+role)?.quantity).toBe(quantity);
  for(const row of r.resources){expect(row.source_metadata?.normativeMeasureUnitId).toBe('linear_m');expect(row.source_metadata).not.toHaveProperty('normativeRatePer100M2');expect((row.resource_graph.derivedQuantityEditPolicyV1 as any).parameterIds).toEqual([valley.measurementParameterId]);}
 });
 test.each(['missingUnit','areaRate','missingRate','collision','guide'])('rejects incomplete or contradictory linear configuration: %s',kind=>{
  const p=structuredClone(valley) as any;
  if(kind==='missingUnit')delete p.measurementUnitId;
  if(kind==='areaRate')p.rates[0].per100m2='17.90';
  if(kind==='missingRate')delete p.rates[0].per100Measure;
  if(kind==='collision')p.measurementParameterId=p.systemParameterId;
  if(kind==='guide')p.measurementGuideRu='';
  expect(()=>sourcePinnedRoofNormOwnerR1(p)).toThrow();
 });
});
