import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, appendFileSync } from "node:fs";
import path from "node:path";

const TOKEN = "RED_M1_ASPHALT_FIVE_P0_REMEDIATION_C2_KG_CONSTRUCTION_NORM_PRIMARY_NOT_LOCATOR_READY_AFFECTED_63_NO_BATCH_NO_EXTERNAL_ACTION";
const EXPECTED_HEAD = "0d9bb68c9b438758eba019376f4a0906d3825bd6";
const EXPECTED_TREE = "5af5bee6dfff80f6ef71abce9e46ded54d5b262c";
const argv = Object.fromEntries(process.argv.slice(2).map((argument) => {
  const [key, ...rest] = argument.replace(/^--/u, "").split("=");
  return [key, rest.join("=") || true];
}));
const evidenceRoot = path.resolve(String(argv["evidence-root"] ?? path.join(
  ".release-runtime", "master-11610-group-batches-r1", "03-m1-asphalt-five-p0-remediation-r1",
)));
const closedAtUtc = String(argv["closed-at-utc"] ?? "");
const head = String(argv.head ?? "");
const tree = String(argv.tree ?? "");
const rebuildLanguageAudit = argv["rebuild-language-audit"] === "true";
const closeoutRoot = path.join(evidenceRoot, "closeout");
const registryFile = path.join(evidenceRoot, "normative-sources", "OFFICIAL_SOURCE_REGISTRY.json");
const statusLedgerFile = path.join(evidenceRoot, "normative-sources", "SOURCE_STATUS_AND_APPLICABILITY_LEDGER.csv");
const identityLedgerFile = path.join(evidenceRoot, "identity", "M1_R63_GLOBAL55_EXTERNAL8_IDENTITY_LEDGER.csv");
const journalFile = path.join(evidenceRoot, "JOURNAL.jsonl");

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function hashFile(file) {
  return sha256(readFileSync(file));
}

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (quoted && character === '"' && line[index + 1] === '"') { value += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { values.push(value); value = ""; }
    else value += character;
  }
  values.push(value);
  return values;
}

function parseCsv(file) {
  const lines = readFileSync(file, "utf8").trim().split(/\r?\n/u);
  const header = parseCsvLine(lines.shift());
  return lines.map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(header.map((column, index) => [column, values[index] ?? ""]));
  });
}

function walkFiles(root) {
  const files = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(absolute));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

function relative(file) {
  return path.relative(evidenceRoot, file).replaceAll("\\", "/");
}

function listCode(values) {
  return values.map((value) => `\`${value}\``).join(", ");
}

invariant(closedAtUtc && !Number.isNaN(Date.parse(closedAtUtc)), "CLOSED_AT_UTC_INVALID");
invariant(head === EXPECTED_HEAD, `HEAD_MISMATCH:${head}`);
invariant(tree === EXPECTED_TREE, `TREE_MISMATCH:${tree}`);
for (const file of [registryFile, statusLedgerFile, identityLedgerFile, journalFile]) {
  invariant(existsSync(file), `REQUIRED_CLOSEOUT_INPUT_MISSING:${relative(file)}`);
}
mkdirSync(closeoutRoot, { recursive: true });
const tokenFile = path.join(closeoutRoot, "M1_ASPHALT_REMEDIATION_TOKEN.txt");
invariant(!existsSync(tokenFile) || rebuildLanguageAudit, "IMMUTABLE_RED_CLOSEOUT_ALREADY_EXISTS");

const registry = JSON.parse(readFileSync(registryFile, "utf8"));
const identities = parseCsv(identityLedgerFile);
const caseIds = identities.map((row) => row.caseId).sort();
const catalogIds = identities.filter((row) => row.caseType === "GLOBAL_CATALOG_WORK").map((row) => row.catalogId).sort();
const externalIds = identities.filter((row) => row.caseType === "EXTERNAL_BENCHMARK_ENTRYPOINT").map((row) => row.externalEntrypointId).sort();
invariant(registry.gate.status === "RED", `R3_GATE_NOT_RED:${registry.gate.status}`);
invariant(caseIds.length === 63 && catalogIds.length === 55 && externalIds.length === 8, "R63_PARTITION_MISMATCH_AT_CLOSEOUT");
invariant(JSON.stringify(caseIds) === JSON.stringify(registry.gate.affectedCaseIds), "AFFECTED_CASE_IDS_MISMATCH");

const journalLines = readFileSync(journalFile, "utf8").trim().split(/\r?\n/u);
invariant(
  journalLines.at(-1)?.includes(rebuildLanguageAudit ? "JOURNAL|seq=7|" : "JOURNAL|seq=6|"),
  rebuildLanguageAudit ? "JOURNAL_LAST_SEQUENCE_NOT_7_FOR_LANGUAGE_AUDIT" : "JOURNAL_LAST_SEQUENCE_NOT_6",
);
const journalEntry = [
  "JOURNAL", "seq=7", `utc=${closedAtUtc}`, `head=${head}`, `tree=${tree}`,
  "gate=R3/C2", "cohort=null", "target=63", "ready=0", "blocked=63", "rows=0",
  "norm_traces=0", "crosswalk=0", "durable=2",
  "command=node scripts/estimate/runM1AsphaltOfficialSourceStatusR1.mjs --reviewed-at-utc=2026-08-12T12:31:33.239Z",
  "command_explanation=команда проверила официальные snapshots, статус, редакцию, KG applicability и locator readiness до row repair",
  "exit=0",
  `evidence=normative-sources/OFFICIAL_SOURCE_REGISTRY.json/${hashFile(registryFile)}; normative-sources/SOURCE_STATUS_AND_APPLICABILITY_LEDGER.csv/${hashFile(statusLedgerFile)}`,
  "next=HARD STOP; отдельное delta-ТЗ возможно только после законного получения официальной действующей KG construction norm, акта введения и полного locator-ready текста",
].join("|");
if (!rebuildLanguageAudit) appendFileSync(journalFile, `${journalEntry}\n`, "utf8");

const report = `# M1 Asphalt R63 — RED-closeout R1

## Итог

${TOKEN}

Контрольный этап \`R3/C2_OFFICIAL_SOURCE_READINESS\` завершён \`RED\`. Все 63 case затронуты: независимый expected scope для каждого требует \`KG_CONSTRUCTION_NORM_PRIMARY\`, но допущенный действующий официальный документ с доказанным текущим статусом, полным текстом и exact locator readiness не найден.

## Проверка exact predecessor

- HEAD: \`${head}\` — без изменения.
- TREE: \`${tree}\` — без изменения.
- Последний \`GREEN\` gate: \`R2\`, expected scope \`63/63\`.
- R0 exact M1/Foundation/Audit identity, hashes и ancestry: \`GREEN\`.
- Изменений production content: \`0\`.

## Точные затронутые идентификаторы

- case IDs (63): ${listCode(caseIds)}.
- global catalog IDs (55): ${listCode(catalogIds)}.
- external benchmark IDs (8): ${listCode(externalIds)}.
- row IDs: \`[]\`. Gate остановлен до \`R4\`; ни одна текущая или final row не допущена и не изменена.
- source IDs: ${listCode(registry.gate.blockedSourceIds)}.

Полный identity ledger: \`identity/M1_R63_GLOBAL55_EXTERNAL8_IDENTITY_LEDGER.csv\`, SHA-256 \`${hashFile(identityLedgerFile)}\`.

## Корневая причина и evidence BEFORE/AFTER

- BEFORE: официальный Минстрой KG публикует \`SP KR 32-107:2024\` на странице общественного обсуждения; PDF содержит \`Проект ПРИКАЗ\`, пустую подпись/дату и \`Дата введения 2024.__.__\`.
- AFTER discovery: отдельный exact approval/enactment order и финальная официальная публикация не найдены; обе официальные страницы ведут к одному draft PDF SHA-256 \`7f10c01b1cc1a1bea7a0056c92ab9766d2228569ff7be9539219685c171c68a6\`. Verdict: \`DRAFT_NOT_ADMITTED\`.
- BEFORE: draft упоминает \`СНиП 3.06.03-85\` как документ, который будет отменён после вступления будущего приказа в силу.
- AFTER discovery: отдельная официальная карточка текущего KG status и официальный полный текст \`СНиП 3.06.03-85\` не локализованы. Ссылки из других документов не доказывают действующий статус, редакцию или exact locator. Verdict: \`SOURCE_TEXT_AND_CURRENT_STATUS_UNAVAILABLE_BLOCKED\`.
- \`KG_KRER_27_2016\` подтверждён приказом от 28 марта 2016 года № 2-нпа и регистрацией Минюста от 29 марта 2016 года № 34, но допускается только в роли \`KG_ESTIMATE_RATE_PRIMARY\`; он не доказывает полный stage graph и строительную технологию.
- \`EAEU_TR_TS_014_2011\` подтверждён как действующий с 15 февраля 2015 года и допускается только в роли \`EAEU_MANDATORY_SAFETY\`; он не заменяет KG construction norm.
- Доступ к карточке \`KG_GOST_9128_2013_CATALOG_RECORD\` дал \`fetch failed\` / \`connect ECONNREFUSED 195.38.163.170:443\`. Это транспортный сбой, не статус документа; product standard в любом случае не заменяет строительную норму или quantity formula.

Реестр официальных источников: \`normative-sources/OFFICIAL_SOURCE_REGISTRY.json\`, SHA-256 \`${hashFile(registryFile)}\`. Реестр статусов: \`normative-sources/SOURCE_STATUS_AND_APPLICABILITY_LEDGER.csv\`, SHA-256 \`${hashFile(statusLedgerFile)}\`.

## Матрица закрытия пяти P0 — BEFORE/AFTER

| P0 | BEFORE | AFTER на текущем gate | Статус |
|---|---|---|---|
| \`P0-NORM-ROW-TRACE\` | 675 rows без source IDs; 3 034 без exact locator verification; 0/63 strict | C2 source readiness не достигнут; R4 не начат; row mutation 0 | \`RED\` |
| \`P0-JURISDICTION\` | 0/693 | Официальные реестры обнаружены, но crosswalk 693 не выполнялся после C2 STOP | \`RED\` |
| \`P0-ROAD-ROUTING\` | ROAD 304 ошибочно заявлялся как proof \`built-in-ai-1000:0701\` | Дефект identity воспроизведён, production routing не изменён | \`RED\` |
| \`P0-DURABLE\` | 2/63 | Исправление durable не начато | \`RED\` |
| \`P0-GLOBAL-ARITHMETIC\` | external 8 смешаны с global counts 4 068/7 542 | Exact partition 55+8 и арифметика 4 060/7 550 доказаны в R1 artifacts; tracked source/config correction не применена из-за C2 STOP | \`RED\` |

## Завершено

- R0: exact predecessor/topology/hash preflight — \`GREEN\`.
- R1: exact 55 global + 8 external partition, denominator 11 610, semantic cohorts и арифметическое доказательство — \`GREEN\`.
- R2: independent expected scope — \`63/63 GREEN\`.
- R3: поиск официальных источников, snapshots, linked PDFs, PDF extraction, KRER OCR 222/222 и проверка статуса выполнены.
- Текущий C2 verdict: \`RED\` с affected count 63.

## Не выполнено вследствие STOP

- R4 row dispositions/traces: \`0\`.
- Crosswalk: \`0/693\`.
- ROAD/0701 production routing repair: не выполнен.
- Durable/history/PDF/procurement: остаётся predecessor \`2/63\`.
- Tracked program-arithmetic source correction: не применена.
- Cohort implementation, focused/mutation tests, two-run replay и exact-SHA GREEN seal: не выполнялись.
- \`BATCH-00\`, \`PREPARE_EXACT_BATCH\`, Full Jest, push, PR, merge, deploy, release, EAS, OTA и production DB mutation: не выполнялись.

## Инвалидированный результат

- GREEN token: не выдан.
- \`C2_OFFICIAL_SOURCE_READINESS\`: ready \`0/63\`, affected \`63\`.
- \`CONTENT_COMPLETE=false\`.

## Одно следующее безопасное действие

Получить законным способом от компетентного органа KG один exact package: действующий final road-construction norm, его approval/enactment instrument, официальную публикацию, текущую редакцию/status и полный locator-ready текст; затем оформить отдельное delta-ТЗ только для повторного C2 review.

## STOP

\`HARD STOP\`. Следующая cohort и R4 не начинаются. \`STOP_BEFORE_BATCH00\`.
`;
const reportFile = path.join(closeoutRoot, "M1_ASPHALT_REMEDIATION_FINAL_REPORT.md");
writeFileSync(tokenFile, `${TOKEN}\n`, "utf8");
writeFileSync(reportFile, report, "utf8");

const index = {
  schemaVersion: "m1-asphalt-five-p0-remediation-r1:red-exact-sha-evidence-index:v1",
  closedAtUtc,
  verdict: "RED",
  token: TOKEN,
  head,
  tree,
  contentComplete: false,
  lastGreenGate: "R2",
  stopGate: "R3/C2_OFFICIAL_SOURCE_READINESS",
  affectedCaseCount: 63,
  affectedCaseIds: caseIds,
  affectedCatalogIds: catalogIds,
  affectedExternalIds: externalIds,
  affectedRowIds: [],
  blockedSourceIds: registry.gate.blockedSourceIds,
  artifacts: [
    ["identity/M1_R63_GLOBAL55_EXTERNAL8_IDENTITY_LEDGER.csv", identityLedgerFile],
    ["identity/M1_R63_GLOBAL_DENOMINATOR_PARTITION_PROOF.json", path.join(evidenceRoot, "identity", "M1_R63_GLOBAL_DENOMINATOR_PARTITION_PROOF.json")],
    ["program-arithmetic/MASTER_11610_PROGRAM_ARITHMETIC_CORRECTION_MANIFEST.json", path.join(evidenceRoot, "program-arithmetic", "MASTER_11610_PROGRAM_ARITHMETIC_CORRECTION_MANIFEST.json")],
    ["cohorts/R63_REMEDIATION_COHORT_MANIFEST.json", path.join(evidenceRoot, "cohorts", "R63_REMEDIATION_COHORT_MANIFEST.json")],
    ["normative-sources/OFFICIAL_SOURCE_REGISTRY.json", registryFile],
    ["normative-sources/SOURCE_STATUS_AND_APPLICABILITY_LEDGER.csv", statusLedgerFile],
    ["JOURNAL.jsonl", journalFile],
    ["closeout/M1_ASPHALT_REMEDIATION_TOKEN.txt", tokenFile],
    ["closeout/M1_ASPHALT_REMEDIATION_FINAL_REPORT.md", reportFile],
  ].map(([artifactPath, file]) => {
    invariant(existsSync(file), `INDEX_ARTIFACT_MISSING:${artifactPath}`);
    return { path: artifactPath, bytes: statSync(file).size, sha256: hashFile(file) };
  }),
  noBatch: true,
  noExternalReleaseAction: true,
  hardStop: true,
};
const indexFile = path.join(closeoutRoot, "EXACT_SHA_EVIDENCE_INDEX.json");
writeFileSync(indexFile, `${JSON.stringify(index, null, 2)}\n`, "utf8");

const manifestFile = path.join(closeoutRoot, "MANIFEST.json");
const manifestShaFile = path.join(closeoutRoot, "MANIFEST.sha256");
const manifestArtifacts = walkFiles(evidenceRoot)
  .filter((file) => file !== manifestFile && file !== manifestShaFile)
  .sort((left, right) => relative(left).localeCompare(relative(right)))
  .map((file) => ({ path: relative(file), bytes: statSync(file).size, sha256: hashFile(file) }));
const manifest = {
  schemaVersion: "m1-asphalt-five-p0-remediation-r1:red-manifest:v1",
  closedAtUtc,
  verdict: "RED",
  token: TOKEN,
  head,
  tree,
  contentComplete: false,
  hardStop: true,
  artifactCount: manifestArtifacts.length,
  artifacts: manifestArtifacts,
};
writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
writeFileSync(manifestShaFile, `${hashFile(manifestFile)}  MANIFEST.json\n`, "utf8");

process.stdout.write(`${JSON.stringify({
  token: TOKEN,
  head,
  tree,
  affectedCaseCount: 63,
  reportSha256: hashFile(reportFile),
  evidenceIndexSha256: hashFile(indexFile),
  manifestSha256: hashFile(manifestFile),
  artifactCount: manifestArtifacts.length,
  journalSequence: 7,
  hardStop: true,
}, null, 2)}\n`);
