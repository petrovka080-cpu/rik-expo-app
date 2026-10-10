import {buildKerbObjectScopeDefinitionS2754} from './concreteKerbOtherObjectScopeS2754';
import {compileAutomaticConstructionOwnerR1,type AutomaticOwnerDefinition} from './automaticConstructionOwnerR1';
import {concreteKerbSourcePackS2754} from './concreteKerbInstallationS2754';
import {estimateDeterministicHash} from '../estimateDeterministicHash';

export const kerbSupplyIdentityContractS2758='gox-build.s27-58.existing-kerb-supplier-identity.v1';
export const kerbSupplyMaterialKeysS2758=['concrete','mortar','timber','nails','stone'] as const;
const names={concrete:'бетона В15',mortar:'готового цементного раствора М100',timber:'брусьев для опалубки',nails:'гвоздей для опалубки',stone:'бетонных бортовых камней'};

/** Successor only. Historical v3 owners and all physical formulas stay intact. */
export function kerbSupplyIdentityDefinitionS2758(index:0|1):AutomaticOwnerDefinition {
  const original=buildKerbObjectScopeDefinitionS2754(index),prefix='concrete-kerb:'+concreteKerbSourcePackS2754.types[index].key;
  const parameters=[...original.parameters];
  const template=original.parameters.find(p=>p.parameter_id==='concrete_mix_specification')!;
  const add=(id:string,title:string,guide:string,condition?:{kind:'greater_than';parameterId:string;value:number})=>{
    parameters.push({...template,parameter_id:id,ordinal:parameters.length,title_ru:title,required:!condition,default_value:null,
      constraints_json:{minLength:1,maxLength:1000,...(condition?{requiredWhen:condition}:{})},
      truth_metadata:{...template.truth_metadata,contract:kerbSupplyIdentityContractS2758,semantic_parameter_key:prefix+':'+id,
        value_source_role:condition?'CONDITIONAL_PROJECT_FACT':'PROJECT_SPECIFIC_INPUT',source_confirmation_required:false,
        ...(condition?{required_when:condition}:{}),provenance:{consumer_input_role_v1:'OBJECT_FACT'},
        guide:{...template.truth_metadata.guide as Record<string,unknown>,guide_short_ru:guide}}});
  };
  add('mortar_supply_specification','Поставочная спецификация готового цементного раствора М100 для швов',
    'Укажите фактический готовый цементный кладочный раствор М100: обозначение, характеристики по проекту и данные поставщика. Сухая смесь и цементно-известковый раствор не заменяют эту позицию. Нормативный расход рассчитан приложением.');
  for(const k of kerbSupplyMaterialKeysS2758)add(k+'_stock_compatibility_reference','Проверка пригодности имеющегося '+names[k],
    'При положительном наличии укажите документ или результат проверки: материал соответствует выбранной поставочной спецификации и пригоден для этой работы. Другой товар и непригодный остаток не вычитаются.',
    {kind:'greater_than',parameterId:k+'_stock',value:0});
  const resources=original.resources.map(r=>{
    const k=kerbSupplyMaterialKeysS2758.find(k=>r.row_id===prefix+':'+k);if(!k)return r;
    const {row_sha256:_hash,...body}=r;
    const updated={...body,resource_graph:{...r.resource_graph,
      inputParameterIds:[...new Set([...(r.resource_graph.inputParameterIds as string[]),k+'_stock_compatibility_reference',...(k==='mortar'?['mortar_supply_specification']:[])])],
      ...(k==='mortar'?{titleSpecificationParameterIds:['mortar_supply_specification'],titleSpecificationMode:'APPEND',titleSpecificationSeparator:' — '}:{})},
      source_metadata:{...r.source_metadata,supplierIdentityAndCompatibleStockRequired:true,purchaseBalancePreviouslyImplemented:true}};
    return {...updated,row_sha256:estimateDeterministicHash(updated)};
  });
  return {...original,parameters,resources};
}
export function compileKerbSupplyIdentityS2758(index:0|1,input:Record<string,unknown>){
  return compileAutomaticConstructionOwnerR1({catalogId:concreteKerbSourcePackS2754.types[index].catalogId,
    compilerVersion:kerbSupplyIdentityContractS2758,primaryMeasureParameterId:'kerb_length_m',definition:kerbSupplyIdentityDefinitionS2758(index),submittedParameters:input});
}
