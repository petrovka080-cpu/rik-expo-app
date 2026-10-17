// An incompatible old primary requires binding review before build/compile.
import pins from '../../../data/estimate-benchmarks/fixtures/curing-thirty-six-current-parents-r1.json';
import type {EmbeddedProjectMaterialParentR1 as Parent} from './embeddedProjectMaterialExpansionR1';
export function assertCuring36PrimaryBindingR1(parent:Parent):void {
 const catalogId=String(parent.definition.catalog_id),pin=pins.parents.find(p=>p.catalogId===catalogId);
 const key='cured_concrete_volume_m3',primary=parent.parameters.filter(p=>p.parameter_id===key);
 const p=primary[0];
 const valid=pin&&primary.length===1&&p?.unit_id==='m3'&&p?.value_type==='decimal'
  &&p.required===true&&p.default_value==null
  &&p.truth_metadata?.semantic_parameter_key===catalogId+':'+key
  &&p.truth_metadata?.value_source_role==='PROJECT_SPECIFIC_INPUT'
  &&p.truth_metadata?.hidden_default_forbidden===true;
 if(!valid){
  const error=new Error('RELEASE_MIGRATION_PARAMETER_BINDING_REVIEW_REQUIRED:'+catalogId+':'+key) as Error&{code:string};
  error.code='RELEASE_MIGRATION_PARAMETER_BINDING_REVIEW_REQUIRED';throw error;
 }
}
