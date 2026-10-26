import { PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS } from '../ai/estimateTemplate10000/productionProfessionalNormPackRegistry';
import type { ProfessionalNormSourceAdmission, ProfessionalNormSourceAdmissionInput } from './professionalNormSourceAdmissionContract';

/** Existing static identity policy, shared without importing physical evaluation. */
export function classifyStaticProfessionalNormSourceAdmission(input: ProfessionalNormSourceAdmissionInput): ProfessionalNormSourceAdmission | null {
  const sourceId=String(input.normSourceId ?? '').trim();
  if (!sourceId) return {admitted:false,route:'NONE',reason:'SOURCE_ID_MISSING'};
  const item=PROFESSIONAL_NORM_PACK_REGISTRY_ITEMS.find(value=>value.sourceId===sourceId);
  if (!item) return null;
  if (item.normId!==String(input.normId ?? '').trim() || item.sourceDocumentVersion!==String(input.normVersion ?? '').trim()) {
    return {admitted:false,route:'NONE',reason:'STATIC_REGISTRY_IDENTITY_MISMATCH'};
  }
  return {admitted:true,route:'STATIC_CATALOG_REGISTRY',reason:'ADMITTED_STATIC_CATALOG_REGISTRY'};
}
