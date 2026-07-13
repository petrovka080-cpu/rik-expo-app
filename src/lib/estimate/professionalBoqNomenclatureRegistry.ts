import materialsJson from "../../../data/estimate/professional-nomenclature/materials.json";
import worksJson from "../../../data/estimate/professional-nomenclature/works.json";
import equipmentJson from "../../../data/estimate/professional-nomenclature/equipment.json";
import servicesJson from "../../../data/estimate/professional-nomenclature/services.json";
import type { CanonicalProfessionalBoqUnit } from "./canonicalUnits";
import type { ProfessionalBoqNomenclatureType } from "./professionalBoqLineItemQualityContract";

export type ProfessionalBoqNomenclatureEntry = {
  nomenclatureId: string;
  type: ProfessionalBoqNomenclatureType;
  nameRu: string;
  canonicalUnit?: CanonicalProfessionalBoqUnit;
  synonyms: string[];
};

const registry = [
  ...(materialsJson as ProfessionalBoqNomenclatureEntry[]),
  ...(worksJson as ProfessionalBoqNomenclatureEntry[]),
  ...(equipmentJson as ProfessionalBoqNomenclatureEntry[]),
  ...(servicesJson as ProfessionalBoqNomenclatureEntry[]),
];

export const PROFESSIONAL_BOQ_NOMENCLATURE_REGISTRY: readonly ProfessionalBoqNomenclatureEntry[] =
  Object.freeze(registry);

export const PROFESSIONAL_BOQ_NOMENCLATURE_BY_ID = new Map(
  PROFESSIONAL_BOQ_NOMENCLATURE_REGISTRY.map((entry) => [entry.nomenclatureId, entry]),
);
