import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT_SCHEMA = "m1-asphalt-five-p0-remediation-r1:official-source-registry:v1";
const argv = Object.fromEntries(process.argv.slice(2).map((argument) => {
  const [key, ...rest] = argument.replace(/^--/u, "").split("=");
  return [key, rest.join("=") || true];
}));
const evidenceRoot = path.resolve(String(argv["evidence-root"] ?? path.join(
  ".release-runtime", "master-11610-group-batches-r1", "03-m1-asphalt-five-p0-remediation-r1",
)));
const normativeRoot = path.join(evidenceRoot, "normative-sources");
const reviewedAtUtc = String(argv["reviewed-at-utc"] ?? "");
const identityLedgerFile = path.join(evidenceRoot, "identity", "M1_R63_GLOBAL55_EXTERNAL8_IDENTITY_LEDGER.csv");

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function readJson(relative) {
  const file = path.join(normativeRoot, relative);
  invariant(existsSync(file), `REQUIRED_INPUT_MISSING:${relative}`);
  return JSON.parse(readFileSync(file, "utf8"));
}

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (quoted && character === '"' && line[index + 1] === '"') {
      value += '"'; index += 1;
    } else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { values.push(value); value = ""; }
    else value += character;
  }
  values.push(value);
  return values;
}

function parseCsv(file) {
  const lines = readFileSync(file, "utf8").trim().split(/\r?\n/u);
  const header = parseCsvLine(lines.shift());
  return lines.map((line) => Object.fromEntries(header.map((column, index) => [column, parseCsvLine(line)[index] ?? ""])));
}

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(rows, columns) {
  return `${columns.join(",")}\n${rows.map((row) => columns.map((column) => csvEscape(row[column])).join(",")).join("\n")}\n`;
}

function sourceFrom(manifest, sourceId) {
  const source = manifest.sources.find((candidate) => candidate.sourceId === sourceId);
  invariant(source, `DISCOVERY_SOURCE_MISSING:${sourceId}`);
  return source;
}

function writeDeterministic(relative, value) {
  const file = path.join(normativeRoot, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, value);
}

invariant(reviewedAtUtc, "REVIEWED_AT_UTC_REQUIRED");
invariant(!Number.isNaN(Date.parse(reviewedAtUtc)), "REVIEWED_AT_UTC_INVALID");
invariant(existsSync(identityLedgerFile), "R63_IDENTITY_LEDGER_MISSING");

const discovery = readJson("discovery/OFFICIAL_SOURCE_DISCOVERY_FETCH.json");
const supplemental = readJson("discovery/OFFICIAL_SOURCE_SUPPLEMENTAL_DISCOVERY_FETCH.json");
const linked = readJson("discovery/OFFICIAL_LINKED_DOCUMENT_FETCH.json");
const extraction = readJson("discovery/PDF_TEXT_EXTRACTION_INDEX.json");
const ocr = readJson("ocr/krer27-text/OCR_RUN_0002_0223.json");
const cases = parseCsv(identityLedgerFile);
invariant(cases.length === 63, `R63_CASE_COUNT_MISMATCH:${cases.length}`);
invariant(new Set(cases.map((row) => row.caseId)).size === 63, "R63_CASE_ID_DUPLICATE");

const initial = (sourceId) => sourceFrom(discovery, sourceId);
const extra = (sourceId) => sourceFrom(supplemental, sourceId);
const linkedSource = (sourceId) => sourceFrom(linked, sourceId);
const draftPage = linkedSource("KG_SP_KR_32_107_2024_PUBLIC_DISCUSSION_PAGE");
const draftPdfA = linkedSource("KG_SP_KR_32_107_2024_PUBLIC_DISCUSSION_PAGE_LINKED_PDF_01");
const draftPdfB = linkedSource("KG_MINSTROY_AUTOMOBILE_ROADS_NORM_PAGE_LINKED_PDF_01");
const krerPdf = linkedSource("KG_KRER_27_OFFICIAL_PDF");
const trPdf = linkedSource("EAEU_TR_TS_014_2011_OFFICIAL_PDF");
invariant(draftPdfA.sha256 === draftPdfB.sha256, "DRAFT_PDF_HASH_NOT_IDENTICAL_ACROSS_OFFICIAL_PAGES");
invariant(draftPdfA.sha256 === "7f10c01b1cc1a1bea7a0056c92ab9766d2228569ff7be9539219685c171c68a6", "DRAFT_PDF_HASH_UNEXPECTED");
invariant(krerPdf.sha256 === "cd3d6735d1bbdda5957945b7682f032785c76624b54a435edfe5d2ef5e107161", "KRER_PDF_HASH_UNEXPECTED");
invariant(trPdf.sha256 === "4aae405f8e6dfa1a6f63ced7ef380d804a5c0a3b41d46a64fd3cdaebdbbea2fc", "TR_TS_PDF_HASH_UNEXPECTED");
invariant(ocr.emptyPageCount === 0 && ocr.pageCount === 222, "KRER_OCR_COVERAGE_INCOMPLETE");

const expectedFiles = [
  [draftPdfA.snapshotFile, draftPdfA.sha256],
  [krerPdf.snapshotFile, krerPdf.sha256],
  [trPdf.snapshotFile, trPdf.sha256],
];
for (const [relative, expectedHash] of expectedFiles) {
  const buffer = readFileSync(path.join(normativeRoot, relative));
  invariant(sha256(buffer) === expectedHash, `SNAPSHOT_HASH_MISMATCH:${relative}`);
}

const common = { retrievedAtUtc: discovery.retrievedAtUtc, reviewer: "Codex" };
const registry = [
  {
    sourceId: "KG_SP_KR_32_107_2024_DRAFT", jurisdiction: "KG",
    publisherCompetentAuthority: "Министерство строительства, архитектуры и жилищно-коммунального хозяйства Кыргызской Республики",
    officialUrlRepositoryLocator: draftPage.url, documentNumberTitle: "СП КР 32-107:2024 Автомобильные дороги",
    editionDate: "2024 draft; exact enactment date absent", approvalEnactmentInstrument: null,
    effectiveFrom: null, effectiveTo: null, status: "DRAFT", sourceRole: "KG_CONSTRUCTION_NORM_PRIMARY",
    secondaryRoles: [], KGApplicabilityBasis: null,
    scope: "Проект строительных правил для автомобильных дорог; не допускается как действующая норма",
    officialFileContentSha256: draftPdfA.sha256, officialPageSha256: draftPage.sha256,
    ...common, licenseAccessLimitation: "Официальный полный текст доступен, но имеет статус проекта",
    supersedes: "СНиП 3.06.03-85 только при будущем вступлении приказа в силу", supersededBy: null,
    exactStatusEvidence: ["PAGE_1:Проект ПРИКАЗ", "PAGE_2:размещается для общественного обсуждения", "PAGE_4:Дата введения 2024.__.__"],
    verdict: "DRAFT_NOT_ADMITTED",
  },
  {
    sourceId: "KG_SNIP_3_06_03_85_CURRENT_STATUS", jurisdiction: "KG",
    publisherCompetentAuthority: "Официальная карточка текущего статуса в реестре Минстроя не найдена",
    officialUrlRepositoryLocator: initial("KG_MINSTROY_DOCUMENT_REGISTRY_PAGE").url,
    documentNumberTitle: "СНиП 3.06.03-85 Автомобильные дороги", editionDate: "1985; current KG edition/status unproven",
    approvalEnactmentInstrument: null, effectiveFrom: null, effectiveTo: null, status: "UNKNOWN",
    sourceRole: "KG_CONSTRUCTION_NORM_PRIMARY", secondaryRoles: [], KGApplicabilityBasis: null,
    scope: "Возможный предшественник; ссылки внутри иных документов не заменяют status record и официальный текст",
    officialFileContentSha256: null, officialPageSha256: initial("KG_MINSTROY_DOCUMENT_REGISTRY_PAGE").sha256,
    ...common, licenseAccessLimitation: "Официальный полный текст и отдельная карточка статуса не локализованы",
    supersedes: null, supersededBy: null,
    exactStatusEvidence: ["NO_OFFICIAL_STATUS_CARD_LOCATED", "NO_OFFICIAL_FULL_TEXT_LOCATED"],
    verdict: "SOURCE_TEXT_AND_CURRENT_STATUS_UNAVAILABLE_BLOCKED",
  },
  {
    sourceId: "KG_KRER_27_2016", jurisdiction: "KG",
    publisherCompetentAuthority: "Госстрой Кыргызской Республики", officialUrlRepositoryLocator: krerPdf.url,
    documentNumberTitle: "КРЕР, сборник 27 Автомобильные дороги", editionDate: "2016",
    approvalEnactmentInstrument: "приказ от 28 марта 2016 года № 2-нпа; регистрация Минюста от 29 марта 2016 года № 34",
    effectiveFrom: "2016-01-01", effectiveTo: null, status: "ACTIVE", sourceRole: "KG_ESTIMATE_RATE_PRIMARY",
    secondaryRoles: [], KGApplicabilityBasis: "Официальное KG издание, приказ и регистрация указаны на титульной странице",
    scope: "Сметные расценки и состав операций; не является полным доказательством stage graph или строительной технологии",
    officialFileContentSha256: krerPdf.sha256, officialPageSha256: initial("KG_KRER_27_CATALOG_PAGE").sha256,
    ...common, licenseAccessLimitation: "OCR требует ручной сверки с изображением для каждого exact locator",
    supersedes: null, supersededBy: null, exactStatusEvidence: ["OCR_PAGE_0002"],
    verdict: "ADMITTED_FOR_ESTIMATE_RATE_ROLE_ONLY_LOCATORS_REQUIRE_MANUAL_IMAGE_VERIFICATION",
  },
  {
    sourceId: "KG_GOST_9128_2013_CATALOG_RECORD", jurisdiction: "KG",
    publisherCompetentAuthority: "Кыргызстандарт", officialUrlRepositoryLocator: initial("KG_KYRGYZSTANDARD_GOST_9128_2013_CATALOG_PAGE").url,
    documentNumberTitle: "ГОСТ 9128-2013", editionDate: null, approvalEnactmentInstrument: null,
    effectiveFrom: null, effectiveTo: null, status: "UNKNOWN", sourceRole: "KG_NATIONAL_STANDARD_PRIMARY",
    secondaryRoles: ["KG_ADOPTED_INTERSTATE_STANDARD"], KGApplicabilityBasis: null,
    scope: "Карточка национального каталога продукта; текст и актуальный статус не получены из-за transport failure",
    officialFileContentSha256: null, officialPageSha256: null, ...common,
    licenseAccessLimitation: "fetch failed; connect ECONNREFUSED 195.38.163.170:443",
    supersedes: null, supersededBy: null, exactStatusEvidence: ["NETWORK_ERROR_NOT_SOURCE_STATUS_PROOF"],
    verdict: "SOURCE_STATUS_AND_TEXT_UNAVAILABLE_BLOCKED",
  },
  {
    sourceId: "EAEU_TR_TS_014_2011", jurisdiction: "EAEU",
    publisherCompetentAuthority: "Евразийская экономическая комиссия", officialUrlRepositoryLocator: initial("EAEU_TR_TS_014_2011_OFFICIAL_PAGE").url,
    documentNumberTitle: "ТР ТС 014/2011 Безопасность автомобильных дорог", editionDate: "2011-10-18",
    approvalEnactmentInstrument: "Решение Комиссии Таможенного союза от 18 октября 2011 года № 827",
    effectiveFrom: "2015-02-15", effectiveTo: null, status: "ACTIVE", sourceRole: "EAEU_MANDATORY_SAFETY",
    secondaryRoles: [], KGApplicabilityBasis: "Обязательный EAEU safety layer в пределах собственной области применения",
    scope: "Минимальные требования безопасности; не заменяет KG construction norm, estimate rate или product standard",
    officialFileContentSha256: trPdf.sha256, officialPageSha256: initial("EAEU_TR_TS_014_2011_OFFICIAL_PAGE").sha256,
    ...common, licenseAccessLimitation: "Официальный полный текст доступен", supersedes: null, supersededBy: null,
    exactStatusEvidence: ["OFFICIAL_PAGE:Вступил в силу 15 февраля 2015 года", "PDF:Решение № 827"], verdict: "ADMITTED_FOR_EAEU_MANDATORY_SAFETY_ROLE_ONLY",
  },
];

const discoveryOnly = [
  ["RU_ROSSTANDART_OFFICIAL_FUND", "RU_REFERENCE_CROSSWALK", initial("RU_ROSSTANDART_OFFICIAL_FUND")],
  ["KZ_OFFICIAL_STANDARDS_ROAD_CATALOG", "KZ_REFERENCE_CROSSWALK", initial("KZ_OFFICIAL_STANDARDS_ROAD_CATALOG")],
  ["UZ_OFFICIAL_TECHNICAL_REGULATION_SYSTEM", "UZ_REFERENCE_CROSSWALK", initial("UZ_OFFICIAL_TECHNICAL_REGULATION_SYSTEM")],
  ["TJ_TAJIKSTANDARD_OFFICIAL_CATALOG", "TJ_REFERENCE_CROSSWALK", extra("TJ_TAJIKSTANDARD_OFFICIAL_CATALOG")],
  ["TM_TURKMENSTANDARTLARY_OFFICIAL_INFORMATION_CENTER", "TM_REFERENCE_CROSSWALK", extra("TM_TURKMENSTANDARTLARY_OFFICIAL_INFORMATION_CENTER")],
  ["AM_OFFICIAL_NATIONAL_STANDARDS_CATALOG", "AM_REFERENCE_CROSSWALK", initial("AM_OFFICIAL_NATIONAL_STANDARDS_CATALOG")],
  ["AZ_OFFICIAL_STANDARDS_INSTITUTE", "AZ_REFERENCE_CROSSWALK", initial("AZ_OFFICIAL_STANDARDS_INSTITUTE")],
  ["EASC_OFFICIAL_INTERSTATE_STANDARDS_CATALOG", "EASC_INTERSTATE_CROSSWALK", extra("EASC_OFFICIAL_INTERSTATE_STANDARDS_CATALOG")],
  ["CIS_OFFICIAL_EASC_ORGAN_RECORD", "CIS_REFERENCE_CROSSWALK", extra("CIS_OFFICIAL_EASC_ORGAN_RECORD")],
];
for (const [sourceId, role, source] of discoveryOnly) {
  registry.push({
    sourceId, jurisdiction: source.jurisdiction, publisherCompetentAuthority: source.pageTitle,
    officialUrlRepositoryLocator: source.url, documentNumberTitle: "Official discovery registry",
    editionDate: null, approvalEnactmentInstrument: null, effectiveFrom: null, effectiveTo: null,
    status: "UNKNOWN", sourceRole: role, secondaryRoles: [], KGApplicabilityBasis: null,
    scope: "Discovery/crosswalk registry only; no specific asphalt document or KG adoption admitted",
    officialFileContentSha256: source.sha256 ?? null, officialPageSha256: source.sha256 ?? null,
    retrievedAtUtc: source.retrievedAtUtc, reviewer: "Codex", licenseAccessLimitation: null,
    supersedes: null, supersededBy: null, exactStatusEvidence: [source.fetchVerdict],
    verdict: source.ok ? "OFFICIAL_REGISTRY_LOCATED_NO_KG_AUTHORITY_PROMOTION" : "OFFICIAL_PRIMARY_LOCATOR_FOUND_SNAPSHOT_UNAVAILABLE_NOT_STATUS_PROOF",
  });
}

const affectedCaseIds = cases.map((row) => row.caseId).sort();
const affectedCatalogIds = cases.filter((row) => row.catalogId).map((row) => row.catalogId).sort();
const affectedExternalIds = cases.filter((row) => row.externalEntrypointId).map((row) => row.externalEntrypointId).sort();
const blockedSources = registry.filter((source) => /BLOCKED|DRAFT_NOT_ADMITTED/u.test(source.verdict)).map((source) => source.sourceId);
const registryDocument = {
  schemaVersion: ROOT_SCHEMA,
  reviewedAtUtc,
  sourceCount: registry.length,
  sources: registry.sort((left, right) => left.sourceId.localeCompare(right.sourceId)),
  inputHashes: {
    discovery: sha256(readFileSync(path.join(normativeRoot, "discovery", "OFFICIAL_SOURCE_DISCOVERY_FETCH.json"))),
    supplementalDiscovery: sha256(readFileSync(path.join(normativeRoot, "discovery", "OFFICIAL_SOURCE_SUPPLEMENTAL_DISCOVERY_FETCH.json"))),
    linkedDocuments: sha256(readFileSync(path.join(normativeRoot, "discovery", "OFFICIAL_LINKED_DOCUMENT_FETCH.json"))),
    extraction: sha256(readFileSync(path.join(normativeRoot, "discovery", "PDF_TEXT_EXTRACTION_INDEX.json"))),
    ocr: sha256(readFileSync(path.join(normativeRoot, "ocr", "krer27-text", "OCR_RUN_0002_0223.json"))),
    identityLedger: sha256(readFileSync(identityLedgerFile)),
  },
  gate: {
    gateId: "C2_OFFICIAL_SOURCE_READINESS",
    status: "RED",
    expectedScopeCaseCount: 63,
    affectedCaseCount: affectedCaseIds.length,
    affectedCaseIds,
    affectedCatalogIds,
    affectedExternalIds,
    blockedSourceIds: blockedSources,
    rootCause: "Не найден допущенный действующий KG construction norm с официальным полным текстом, точным status record и locator-ready содержанием; проект SP KR 32-107:2024 недопустим, текущий статус и официальный текст СНиП 3.06.03-85 не установлены, а KRER/EAEU/product layers не заменяют эту primary role.",
    verdict: "RED_C2_KG_CONSTRUCTION_NORM_PRIMARY_NOT_LOCATOR_READY_AFFECTED_63_STOP",
  },
};
writeDeterministic("OFFICIAL_SOURCE_REGISTRY.json", `${JSON.stringify(registryDocument, null, 2)}\n`);

const ledgerRows = registryDocument.sources.map((source) => ({
  sourceId: source.sourceId,
  jurisdiction: source.jurisdiction,
  status: source.status,
  sourceRole: source.sourceRole,
  KGApplicabilityBasis: source.KGApplicabilityBasis,
  officialUrlRepositoryLocator: source.officialUrlRepositoryLocator,
  officialFileContentSha256: source.officialFileContentSha256,
  approvalEnactmentInstrument: source.approvalEnactmentInstrument,
  effectiveFrom: source.effectiveFrom,
  exactTextLocatorReadiness: source.verdict.includes("LOCATORS_REQUIRE") ? "MANUAL_IMAGE_VERIFICATION_REQUIRED" :
    source.verdict.includes("ADMITTED_FOR") ? "ROLE_LIMITED_READY" : "NOT_READY",
  affectedCaseCount: /BLOCKED|DRAFT_NOT_ADMITTED/u.test(source.verdict) ? affectedCaseIds.length : 0,
  verdict: source.verdict,
}));
const columns = ["sourceId", "jurisdiction", "status", "sourceRole", "KGApplicabilityBasis", "officialUrlRepositoryLocator", "officialFileContentSha256", "approvalEnactmentInstrument", "effectiveFrom", "exactTextLocatorReadiness", "affectedCaseCount", "verdict"];
writeDeterministic("SOURCE_STATUS_AND_APPLICABILITY_LEDGER.csv", toCsv(ledgerRows, columns));

const registryHash = sha256(readFileSync(path.join(normativeRoot, "OFFICIAL_SOURCE_REGISTRY.json")));
const ledgerHash = sha256(readFileSync(path.join(normativeRoot, "SOURCE_STATUS_AND_APPLICABILITY_LEDGER.csv")));
process.stdout.write(`${JSON.stringify({
  verdict: registryDocument.gate.verdict,
  status: registryDocument.gate.status,
  sourceCount: registryDocument.sourceCount,
  affectedCaseCount: affectedCaseIds.length,
  affectedCaseIds,
  blockedSourceIds: blockedSources,
  officialSourceRegistrySha256: registryHash,
  sourceStatusLedgerSha256: ledgerHash,
}, null, 2)}\n`);
