import {extractConcretePlacementCanonicalParametersR1} from "../ownedDomain/concretePlacementProductionBindingR1";
import type {CanonicalCatalogPromptInputV1,CanonicalCatalogPromptExtractionV1} from "./contracts";
import {canonicalCatalogPromptSchemaV1,assertCanonicalCatalogPromptExtractionV1} from "./canonicalCatalogPromptExtractionV1";

/** Server-owned projection of the unchanged 33-way parser. Admission remains
 * owned by the existing catalog API; offline fixtures do not claim admission. */
export function deriveCanonicalCatalogPromptExtractionV1(catalog:CanonicalCatalogPromptInputV1,prompt:string):CanonicalCatalogPromptExtractionV1{
  const raw=extractConcretePlacementCanonicalParametersR1({catalogId:catalog.catalogId,text:prompt});
  const ids=new Set(catalog.parameterSchema.map(p=>p.parameterId));
  const filtered=raw===null?null:Object.fromEntries(Object.entries(raw).filter(([id])=>ids.has(id)));
  const value:CanonicalCatalogPromptExtractionV1={contract:"canonical-catalog-prompt-extraction/v1",
    catalogId:catalog.catalogId,releaseId:catalog.releaseId,definitionVersion:catalog.definitionVersion,
    prompt,...(Object.hasOwn(catalog,"immutableCalculationIdentityV1")
      ?{immutableCalculationIdentityV1:catalog.immutableCalculationIdentityV1}:{}),
    schema:canonicalCatalogPromptSchemaV1(catalog),concretePlacement:filtered};
  assertCanonicalCatalogPromptExtractionV1(value,catalog,prompt);return value;
}
