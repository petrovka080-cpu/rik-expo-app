import { estimateDeterministicHash } from "../../estimateDeterministicHash";
import { ASPHALT_NORMATIVE_EVIDENCE_V4 } from "../asphalt/asphaltProfessionalPassportV4";
import { ROADWORKS_WAVE_A_NORMATIVE_SOURCES } from "../roadworks/roadworksWaveASemanticTruth";

export type ProductionNormSourceEvidenceV1 = {
  source_id: string;
  source_kind: "OFFICIAL_NORMATIVE_DOCUMENT" | "MANUFACTURER_TECHNICAL_REFERENCE";
  title: string;
  authority: string;
  jurisdiction: string;
  source_document_version: string;
  official_reference: string;
  review_status: "REVIEWED_SOURCE_EVIDENCE";
  evidence_digest: string;
};

export type ProductionNormSourceLocatorAliasV1 = {
  alias_source_id: string;
  canonical_source_id: string;
  exact_locator: string;
  review_status: "EXACT_LOCATOR_REVIEWED";
};

const ADMITTED_ASPHALT_EVIDENCE_IDS = new Set([
  "eaeu_tr_ts_014_2011",
  "kg_mtd_road_quality_control",
  "kg_krer_2015_collection_27",
  "manufacturer_bitumina_emulsion_technical_note",
]);

const ADMITTED_ROADWORKS_EVIDENCE_IDS = new Set([
  "kg_krer_27_roadworks_2015",
  "kg_krer_11_floors_2015",
]);

const directEvidence: ProductionNormSourceEvidenceV1[] = [
  ...ASPHALT_NORMATIVE_EVIDENCE_V4
    .filter((item) => ADMITTED_ASPHALT_EVIDENCE_IDS.has(item.source_id))
    .map((item): ProductionNormSourceEvidenceV1 => ({
      source_id: item.source_id,
      source_kind: item.source_id === "manufacturer_bitumina_emulsion_technical_note"
        ? "MANUFACTURER_TECHNICAL_REFERENCE"
        : "OFFICIAL_NORMATIVE_DOCUMENT",
      title: item.title,
      authority: item.organization,
      jurisdiction: item.jurisdiction,
      source_document_version: item.version,
      official_reference: String(item.url_or_document_id ?? ""),
      review_status: "REVIEWED_SOURCE_EVIDENCE",
      evidence_digest: estimateDeterministicHash({
        source_id: item.source_id,
        version: item.version,
        official_reference: item.url_or_document_id,
        checksum: item.checksum,
        applicability: item.applicability,
      }),
    })),
  ...ROADWORKS_WAVE_A_NORMATIVE_SOURCES
    .filter((item) =>
      ADMITTED_ROADWORKS_EVIDENCE_IDS.has(item.sourceId) &&
      item.status === "ACTIVE_METADATA_VERIFIED" &&
      item.reviewStatus === "REVIEWED"
    )
    .map((item): ProductionNormSourceEvidenceV1 => ({
      source_id: item.sourceId,
      source_kind: "OFFICIAL_NORMATIVE_DOCUMENT",
      title: item.titleRu,
      authority: item.issuingAuthority,
      jurisdiction: item.jurisdiction,
      source_document_version: item.documentVersion,
      official_reference: item.url,
      review_status: "REVIEWED_SOURCE_EVIDENCE",
      evidence_digest: item.evidenceHash,
    })),
];

export const PRODUCTION_NORM_SOURCE_EVIDENCE_V1: readonly ProductionNormSourceEvidenceV1[] =
  Object.freeze(directEvidence);

const krer27Alias = (
  aliasSourceId: string,
  exactLocator: string,
): ProductionNormSourceLocatorAliasV1 => ({
  alias_source_id: aliasSourceId,
  canonical_source_id: "kg_krer_2015_collection_27",
  exact_locator: exactLocator,
  review_status: "EXACT_LOCATOR_REVIEWED",
});

export const PRODUCTION_NORM_SOURCE_LOCATOR_ALIASES_V1: readonly ProductionNormSourceLocatorAliasV1[] =
  Object.freeze([
    {
      alias_source_id: "eaeu_tr_ts014_2011:road_safety_marking_applicability",
      canonical_source_id: "eaeu_tr_ts_014_2011",
      exact_locator: "road-safety marking applicability",
      review_status: "EXACT_LOCATOR_REVIEWED",
    },
    {
      alias_source_id: "eaeu_tr_ts014_2011:road_sign_and_marking_applicability",
      canonical_source_id: "eaeu_tr_ts_014_2011",
      exact_locator: "road-sign and marking applicability",
      review_status: "EXACT_LOCATOR_REVIEWED",
    },
    {
      alias_source_id: "eaeu_tr_ts014_2011:road_sign_applicability",
      canonical_source_id: "eaeu_tr_ts_014_2011",
      exact_locator: "road-sign applicability",
      review_status: "EXACT_LOCATOR_REVIEWED",
    },
    krer27Alias(
      "kg_krer27:tables:27-02-001_27-02-003_27-02-005_27-02-007_27-02-009:surface_drainage",
      "tables 27-02-001, 27-02-003, 27-02-005, 27-02-007 and 27-02-009",
    ),
    krer27Alias(
      "kg_krer27:tables:27-02-014_to_27-02-015:curb_and_side_stones",
      "tables 27-02-014 through 27-02-015",
    ),
    krer27Alias(
      "kg_krer27:tables:27-03-008_to_27-03-014:official_pdf_pages:37-43",
      "tables 27-03-008 through 27-03-014, official PDF pages 37-43",
    ),
    krer27Alias(
      "kg_krer27:tables:27-04-001_to_27-04-021:subbase_and_crushed_stone_base",
      "tables 27-04-001 through 27-04-021",
    ),
    krer27Alias(
      "kg_krer27:tables:27-06-019_to_27-06-021_and_27-06-029_to_27-06-031:hot_asphalt_pavement",
      "tables 27-06-019 through 27-06-021 and 27-06-029 through 27-06-031",
    ),
    krer27Alias(
      "kg_krer27:tables:27-09-011_to_27-09-015:road_sign_installation",
      "tables 27-09-011 through 27-09-015",
    ),
    krer27Alias(
      "kg_krer27:tables:27-09-016_to_27-09-019_and_27-09-031_to_27-09-032:official_pdf_pages:171-180",
      "tables 27-09-016 through 27-09-019 and 27-09-031 through 27-09-032, official PDF pages 171-180",
    ),
    krer27Alias("kg_krer27:technical_part:clause:1.0:roadworks_scope", "technical part clause 1.0"),
    krer27Alias("kg_krer27:technical_part:clause:1.6:layer_thickness_correction", "technical part clause 1.6"),
    krer27Alias("kg_krer27:technical_part:clause:1.8:bitumen_emulsion_delivery_excluded", "technical part clause 1.8"),
    krer27Alias("kg_krer27:technical_part:clause:1.9:water_delivery_5km_boundary", "technical part clause 1.9"),
    krer27Alias("kg_krer27:technical_part:quality_control_applicability", "technical part quality-control applicability"),
  ]);

const evidenceById = new Map(PRODUCTION_NORM_SOURCE_EVIDENCE_V1.map((item) => [item.source_id, item]));
const aliasesById = new Map(PRODUCTION_NORM_SOURCE_LOCATOR_ALIASES_V1.map((item) => [item.alias_source_id, item]));

if (evidenceById.size !== PRODUCTION_NORM_SOURCE_EVIDENCE_V1.length) {
  throw new Error("DUPLICATE_PRODUCTION_NORM_SOURCE_EVIDENCE_ID");
}
for (const evidence of PRODUCTION_NORM_SOURCE_EVIDENCE_V1) {
  if (!/^https:\/\//u.test(evidence.official_reference) || !evidence.source_document_version) {
    throw new Error(`INVALID_PRODUCTION_NORM_SOURCE_EVIDENCE:${evidence.source_id}`);
  }
}
if (aliasesById.size !== PRODUCTION_NORM_SOURCE_LOCATOR_ALIASES_V1.length) {
  throw new Error("DUPLICATE_PRODUCTION_NORM_SOURCE_LOCATOR_ALIAS_ID");
}
for (const alias of PRODUCTION_NORM_SOURCE_LOCATOR_ALIASES_V1) {
  if (!evidenceById.has(alias.canonical_source_id)) {
    throw new Error(`PRODUCTION_NORM_SOURCE_ALIAS_PARENT_MISSING:${alias.alias_source_id}`);
  }
}

export const productionNormSourceEvidenceRegistryV1 = Object.freeze({
  listEvidence: (): readonly ProductionNormSourceEvidenceV1[] => PRODUCTION_NORM_SOURCE_EVIDENCE_V1,
  listAliases: (): readonly ProductionNormSourceLocatorAliasV1[] => PRODUCTION_NORM_SOURCE_LOCATOR_ALIASES_V1,
  getEvidence: (sourceId: string): ProductionNormSourceEvidenceV1 | null => evidenceById.get(sourceId) ?? null,
  getAlias: (sourceId: string): ProductionNormSourceLocatorAliasV1 | null => aliasesById.get(sourceId) ?? null,
  listAcceptedSourceIds: (): readonly string[] => Object.freeze([
    ...evidenceById.keys(),
    ...aliasesById.keys(),
  ]),
});
