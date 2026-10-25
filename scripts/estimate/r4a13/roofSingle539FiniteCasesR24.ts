import assert from 'node:assert/strict';
import type {Roof539FiniteCaseR24} from './prepareRoofSingle539WholeLayersR24';
import {roofSingle539ProfileNotSelectedR24 as none,roofSingle539Existing00209WholeChoiceR24,type buildRoofSingle539WholeLayersR24} from '../../../src/lib/estimate/v4/roofSingle539WholeLayersR24';
import {roofMasticMeshControlsR24 as main} from '../../../src/lib/estimate/v4/roofMasticMeshExisting003R24';
import {roofRemaining002NativeR24 as n002} from '../../../src/lib/estimate/v4/roofMissingFlatRollWhole002R24';
import {roofMissing014NativeR24 as n014} from '../../../src/lib/estimate/v4/roofMissingInsulationProfilesWhole014R24';
import {roofMissing015NativeR24 as n015} from '../../../src/lib/estimate/v4/roofMissingVaporProfilesWhole015R24';
import {roofPrimerWithPreparation01601NativeR24 as n016} from '../../../src/lib/estimate/v4/roofPrimerWithPreparationWhole01601R24';
import {roofMissing017NativeR24 as n017} from '../../../src/lib/estimate/v4/roofMissingScreedProfilesWhole017R24';
import {roofRooflight018NativeR24 as n018} from '../../../src/lib/estimate/v4/roofRooflightCurbWhole018R24';
import {roofMasticPreparation019SourceR24 as n019} from '../../../src/lib/estimate/v4/roofMasticPreparationWhole019R24';
import quantities from '../../../data/estimate-benchmarks/source-packs/roof-single539-independent-finite-quantities-r24.json';

type Json=Record<string,unknown>;
type Model=ReturnType<typeof buildRoofSingle539WholeLayersR24>;
const object=(v:unknown):v is Json=>v!==null&&typeof v==='object'&&!Array.isArray(v);
// This roster is read from the immutable source packs, not candidate rows.
const ids=(p:Readonly<{prefix:string;rates:readonly Readonly<{role:string}>[]}>)=>p.rates.map(r=>p.prefix+':'+r.role);
const sourceRows={torch:ids(n002.torchThree),gravel:ids(n002.gravelOnly),insulation:ids(n014.shungizite),firstRoll:ids(n015.firstRoll),extraRoll:ids(n015.extraRoll),
 primer:ids(n016),asphalt:ids(n017.asphalt),prefab:ids(n017.sheets),curb:ids(n018.deckOrganic),production:ids(n019)};

/** Finite test measures are illustrative inputs, never captured project facts.
 * No condition, PPR, source-applicability or physical-stock count is supplied. */
export function roofSingle539FiniteCasesR24(model:Model):readonly Roof539FiniteCaseR24[]{
 const inactive:Json=Object.fromEntries(model.localMethodIds.map(id=>[id,none]));
 // No retained INTERNAL_ONLY selector or project fact is copied into input.
 const scope=(key:string)=>{const alias:Readonly<Record<string,string>>={...model.scopeAliases,...Object.fromEntries(Object.entries(model.existingScopeKeys).map(([k,v])=>['existing'+k,v]))};const s=model.lowerScopes.find(s=>s.key===(alias[key]??key));assert(s);return s.publicChoice;};
 const input=(publicChoice:string,values:Json):Json=>{const roll=model.all002.find(n=>n.systemYesRu===publicChoice);
  const parameters=Object.fromEntries(Object.entries(values).map(([id,value])=>[model.inputParameterRemap.get(id)??id,value]));
  return{...inactive,[main.publicMethod]:roll?model.rollPublicChoice:publicChoice,...(roll?{[roll.systemParameterId]:roll.systemYesRu}:{}),...parameters};};
 const success=(name:string,values:Json,selected:readonly string[],absent:readonly string[]=[]):Roof539FiniteCaseR24=>({name,input:values,expected:{kind:'PRELIMINARY',selectedRowIds:selected,absentRowIds:absent}});
 const c17=n017.asphalt.controls,c19=n019.controls;
 const cases:Roof539FiniteCaseR24[]=[
  success('whole00208-three-layer-field',input(n002.torchThree.systemYesRu,{[main.area]:'125'}),sourceRows.torch,sourceRows.gravel),
  success('whole00211-own-gravel-protection',input(n002.gravelOnly.systemYesRu,{[main.area]:'37.5'}),sourceRows.gravel,sourceRows.torch),
  success('whole01403-own-cubic-measure',input(scope('014'),{[n014.shungizite.systemParameterId]:n014.shungizite.systemYesRu,[n014.shungizite.measurementParameterId]:'3.75'}),sourceRows.insulation,ids(n014.concrete)),
  success('whole01501-plus-own01502',input(scope('015'),{[n015.firstRoll.systemParameterId]:n015.firstRoll.systemYesRu,[n015.firstRoll.measurementParameterId]:'125',
   [n015.extraRoll.systemParameterId]:n015.extraRoll.systemYesRu,[n015.extraRoll.measurementParameterId]:'37.5'}),[...sourceRows.firstRoll,...sourceRows.extraRoll],ids(n015.firstCoat)),
  success('whole01601-own-primer',input(scope('016'),{[n016.systemParameterId]:n016.systemYesRu,[n016.measurementParameterId]:'125'}),sourceRows.primer),
  success('whole01703-with-signed-one-mm',input(scope('017-asphalt'),{[c17.method]:n017.asphalt.methodChoice,[c17.area]:'37.5',[c17.thickness]:'16'}),sourceRows.asphalt,sourceRows.prefab),
  success('whole01705-source-conflict-stays-unresolved',input(scope('017-prefab'),{[c17.method]:n017.sheets.systemYesRu,[n017.sheets.measurementParameterId]:'125'}),sourceRows.prefab,sourceRows.asphalt),
  success('whole01803-own-curb-perimeter',input(scope('018'),{[n018.deckOrganic.systemParameterId]:n018.deckOrganic.systemYesRu,[n018.deckOrganic.measurementParameterId]:'37.5'}),sourceRows.curb,ids(n018.rcOrganic)),
  success('whole01901-own-prepared-tonne-source-hold',input(scope('019'),{[c19.method]:n019.methodChoice,[c19.mass]:'1'}),sourceRows.production),
  success('retained00209-plus01403-and01501',input(roofSingle539Existing00209WholeChoiceR24,{[main.area]:'125',
   [n014.shungizite.systemParameterId]:n014.shungizite.systemYesRu,[n014.shungizite.measurementParameterId]:'3.75',
   [n015.firstRoll.systemParameterId]:n015.firstRoll.systemYesRu,[n015.firstRoll.measurementParameterId]:'125'}),
   [...model.existingProfiles.find(p=>p.key==='00209')!.rows.map(r=>r.rowId),...sourceRows.insulation,...sourceRows.firstRoll]),
  success('whole00208-plus01403-01501-and01703',input(n002.torchThree.systemYesRu,{[main.area]:'125',
   [n014.shungizite.systemParameterId]:n014.shungizite.systemYesRu,[n014.shungizite.measurementParameterId]:'3.75',
   [n015.firstRoll.systemParameterId]:n015.firstRoll.systemYesRu,[n015.firstRoll.measurementParameterId]:'125',
   [c17.method]:n017.asphalt.methodChoice,[c17.area]:'125',[c17.thickness]:'15'}),[...sourceRows.torch,...sourceRows.insulation,...sourceRows.firstRoll,...sourceRows.asphalt])
 ];
 for(const p of model.existingProfiles.filter(p=>p.key!=='00209')){const selector=model.localMethodForLayer[p.layer];assert(selector);
  const values:Json={[selector]:p.choice,[p.primaryMeasureId]:'125'};
  for(const measure of p.measureMetadata)if(measure.unitId==='mm')values[measure.parameterId]='30';
  cases.push(success('retained-whole'+p.key+'-own-measure-and-ppr-unresolved',input(scope('existing'+p.key),values),p.rows.map(r=>r.rowId),p.legacyRawSiblingIds));
 }
 const reject=(name:string,values:Json,reasonIncludes:string):Roof539FiniteCaseR24=>({name,input:values,expected:{kind:'REJECT',code:'PARAMETER_VALIDATION_FAILED',reasonIncludes}});
 cases.push({name:'whole00208-plus01403-missing-own-volume-is-preliminary',input:input(n002.torchThree.systemYesRu,{[main.area]:'125',
  [n014.shungizite.systemParameterId]:n014.shungizite.systemYesRu}),expected:{kind:'PRELIMINARY',selectedRowIds:[...sourceRows.torch,...sourceRows.insulation],
  absentRowIds:ids(n014.concrete),unknownQuantityRowIds:sourceRows.insulation}});
 const sourceHold=model.sourceReferenceHolds.find(h=>h.key==='01402');assert(sourceHold);
 const clay=model.existingProfiles.find(p=>p.key==='01402');assert(clay);
 const claySelector=model.localMethodForLayer[clay.layer];assert(claySelector);
 cases.push(reject('raw-source-reference-is-not-approved-family-authority',input(scope('existing01402'),{[claySelector]:clay.choice,[clay.primaryMeasureId]:'125',
  [sourceHold.parameterId]:sourceHold.referenceValue}),'unresolved application norm cannot be supplied '+sourceHold.parameterId));
 cases.push(reject('no-buy-ready-plus019-manufacture',input(scope('015'),{[n015.firstRoll.systemParameterId]:n015.firstRoll.systemYesRu,[n015.firstRoll.measurementParameterId]:'125',
  [c19.method]:n019.methodChoice,[c19.mass]:'1'}),'parameter '+c19.method+' is forbidden by cross-field rule'));
 cases.push(reject('no-independent-primer-plus-included015-primer',input(scope('015'),{[n015.firstRoll.systemParameterId]:n015.firstRoll.systemYesRu,[n015.firstRoll.measurementParameterId]:'125',
  [n016.systemParameterId]:n016.systemYesRu,[n016.measurementParameterId]:'125'}),'parameter '+n016.systemParameterId+' is forbidden by cross-field rule'));
 cases.push(reject('no-extra01502-without-positive-first',input(scope('015'),{[n015.firstRoll.systemParameterId]:n015.firstRoll.systemYesRu,[n015.firstRoll.measurementParameterId]:'0',
  [n015.extraRoll.systemParameterId]:n015.extraRoll.systemYesRu,[n015.extraRoll.measurementParameterId]:'37.5'}),'parameter '+n015.extraRoll.systemParameterId+' is forbidden by cross-field rule'));
 cases.push(reject('raw01705-source-resolution-is-not-user-fact',input(scope('017-prefab'),{[c17.method]:n017.sheets.systemYesRu,[n017.sheets.measurementParameterId]:'125',
  [n017.sheets.sourceConflictGate.parameterId]:n017.sheets.sourceConflictGate.value}),'unresolved application norm cannot be supplied '+n017.sheets.sourceConflictGate.parameterId));
 const oldDocument=model.capture.parameters.find(p=>p.parameter_id.startsWith('m212_roof_reuse_clay_')&&p.value_type==='enum'&&p.truth_metadata.value_source_role==='PROJECT_DOCUMENTATION');
 assert(oldDocument&&object(oldDocument.constraints_json)&&Array.isArray(oldDocument.constraints_json.values)&&typeof oldDocument.constraints_json.values[0]==='string');
 cases.push(reject('raw-retained-clay-project-selector-is-not-public-choice',input(scope('014'),{[n014.shungizite.systemParameterId]:n014.shungizite.systemYesRu,
  [n014.shungizite.measurementParameterId]:'3.75',[oldDocument.parameter_id]:oldDocument.constraints_json.values[0]}),'source-managed parameter cannot be submitted '+oldDocument.parameter_id));
 assert.equal(cases.length,23);const literal=new Map(Object.entries(quantities.cases));
 return cases.map(c=>c.expected.kind==='PRELIMINARY'?{...c,expected:{...c.expected,quantities:literal.get(c.name)??[]}}:c);
}
