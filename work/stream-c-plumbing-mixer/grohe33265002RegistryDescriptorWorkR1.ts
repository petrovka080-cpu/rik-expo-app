// C-owned WORK only. Pure descriptor for the existing common registry reader.
// It does not read files, connect to a database, issue admission or publish.
import {basinMixerGrohe33265002PackR1 as pack} from '../../src/lib/estimate/v4/basinMixerGrohe33265002KitR1';
import {hashMasterSingleDefinitionSuccessorReceiptR1 as hash,
 resolveMasterSingleDefinitionLocatorExcerptSha256R1} from '../../scripts/estimate/r4a13/prepareMasterSingleDefinitionSuccessorR1';
import type {MasterScopedNormativeRegistryInputR1} from '../../scripts/estimate/r4a13/masterScopedNormativeRegistryPreimageR1';

export const grohe33265002RetainedContractWorkR1 = 'gox-build.basin-mixer-grohe33265002-retained/r1';
export const grohe33265002SourceBoundRowKeysWorkR1 = ['kit-consumed', 'flexible-hoses-reference', 'waste-set-reference', 'mounting-set-reference'] as const;
const id = (key: string) => pack.prefix + ':' + key;
function uuid(seed: string): string {
 const b = Buffer.from(hash(seed).slice(0,32),'hex'); b[6] = (b[6]! & 15) | 80; b[8] = (b[8]! & 63) | 128;
 const h = b.toString('hex'); return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
export function grohe33265002RegistryDescriptorWorkR1() {
 const contract = grohe33265002RetainedContractWorkR1;
 const sourceMetadata = {
  source_title: 'GROHE Eurosmart 33265002: комплект и граница монтажа на готовой совместимой раковине',
  source_authority: 'GROHE: официальная страница точного артикула и связанная инструкция изготовителя',
  source_kind: 'MANUFACTURER_COMPLETE_PRODUCT_COMPOSITION_NOT_LABOR_NORM',
  official_url: pack.source.tpiUrl, artifact_sha256: pack.source.sha256, exact_locator: pack.source.locatorRu,
  use_restriction: pack.scopeRu + ' Комплектность сверяется по артикулу 33265002, EAN4005176861543 и фактической поставке. Один смеситель — один полный комплект; ссылка на штатную подводку, FastFixation и донный клапан не создаёт второй закупки. Источник не задаёт человеко-часы, машино-часы, цены, число шлангов как отдельных изделий или автоматическое соответствие старой точки одному комплекту.'
 };
 const locator = {key: 'GROHE-33265002-EAN4005176861543-COMPLETE-KIT-AND-READY-SITE', payload: {
  kind: 'EXACT_MANUFACTURER_COMPLETE_PRODUCT_SCOPE_NOT_FULL_PLUMBING_NORM', normId: pack.normId,
  sourceArtifact: pack.source.path, sourceArtifactSha256: pack.source.sha256,
  productPageUrl: pack.source.officialUrl, productPageArtifact: pack.source.htmlPath, productPageSha256: pack.source.htmlSha256,
  model: pack.sku, ean: pack.ean, edition: pack.source.edition, exactLocatorRu: pack.source.locatorRu,
  sourceNormativeBindingRowIds: grohe33265002SourceBoundRowKeysWorkR1.map(id),
  components: pack.components, operations: pack.operations,
  includedPartsAreReferencesOnly: true, purchaseOwnerRowId: id('kit-order'),
  noLegacyPointConversion: true, noLegacyPriceInheritance: true, noManufacturerLaborOrMachineHours: true,
  fullTechnicalAcceptance: false
 }};
 const sourceId = uuid(`${contract}:${pack.sourceId}:source`), locatorId = uuid(`${contract}:${pack.sourceId}:${locator.key}:locator`);
 const managedSource = {id: sourceId, source_key: pack.sourceId, title_ru: sourceMetadata.source_title,
  authority: sourceMetadata.source_authority, official_url: sourceMetadata.official_url,
  artifact_sha256: pack.source.sha256, effective_from: null, effective_to: null,
  metadata: {contract, sourceKind: sourceMetadata.source_kind, useRestriction: sourceMetadata.use_restriction,
   exactSku: pack.sku, exactEan: pack.ean, productPageSha256: pack.source.htmlSha256,
   universalProductivityClaimed: false, activationAllowed: false}};
 const binding = {rowId: id(grohe33265002SourceBoundRowKeysWorkR1[0]), additionalRowIds: grohe33265002SourceBoundRowKeysWorkR1.slice(1).map(id),
  applicability: {completeKitCompositionOnly: true, laborHoursNormClaimed: false, fullTechnicalAcceptance: false}};
 const managedLocators = [{id: locatorId, source_id: sourceId, locator_key: locator.key, locator: locator.payload,
  excerpt_sha256: resolveMasterSingleDefinitionLocatorExcerptSha256R1({stopCode: 'BASIN_MIXER_GROHE33265002_RETAINED_R1', sourceMetadata, locator, binding})}];
 return {sourceMetadata, locator, managedSource, managedLocators, binding};
}
export function grohe33265002RegistryCaptureInputWorkR1(): MasterScopedNormativeRegistryInputR1 {
 const r = grohe33265002RegistryDescriptorWorkR1();
 return {config: {stopCode: 'BASIN_MIXER_GROHE33265002_RETAINED_R1', normId: pack.normId,
  binding: {retainParentBindings: {capturedSourcePreimage: {sourceKey: pack.sourceId, expected: null}}}},
  newSource: r.managedSource, newLocators: r.managedLocators};
}
