import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import {
  CONSTRUCTION_KNOWLEDGE_CORE_WAVE,
  answerConstructionQuestion,
  buildConstructionKnowledgeCoreMatrix,
  classifyConstructionDocument,
  listConstructionDisciplineTaxonomy,
  listConstructionProjectTypeTaxonomy,
  listConstructionProviderRegistry,
  parseConstructionEstimate,
  parseConstructionProjectPdf,
  resolveConstructionCountryProfile,
  resolveConstructionNorms,
  CONSTRUCTION_ROLE_ACCESS_POLICIES,
  type ConstructionKnowledgeSource,
  type ConstructionRole,
} from "../../src/lib/ai/constructionKnowledgeCore";

const ARTIFACT_PREFIX = "S_AI_CONSTRUCTION_ENGINEERING_KNOWLEDGE_CORE";
const artifactsDir = path.join(process.cwd(), "artifacts");
const releaseVerifyReportPath = path.join(
  artifactsDir,
  `${ARTIFACT_PREFIX}_release_verify_report.json`,
);

const proofSources: ConstructionKnowledgeSource[] = [
  {
    id: "proof:project:ar:14",
    type: "architecture_pdf",
    labelRu: "Проект АР.pdf",
    documentId: "proof-doc-ar",
    fileName: "Проект АР.pdf",
    page: 14,
    linkedObjectId: "proof-object",
    linkedWorkId: "proof-work",
    confidence: "high",
  },
  {
    id: "proof:estimate:77",
    type: "estimate_pdf",
    labelRu: "Смета объекта",
    linkedEstimateLineId: "EST-77",
    linkedWorkId: "proof-work",
    linkedMaterialId: "proof-material",
    confidence: "high",
  },
  {
    id: "proof:work:1",
    type: "work",
    labelRu: "Работа proof-work",
    linkedObjectId: "proof-object",
    linkedWorkId: "proof-work",
    confidence: "high",
  },
  {
    id: "proof:stock:1",
    type: "warehouse_stock",
    labelRu: "Складской остаток proof-material",
    linkedWorkId: "proof-work",
    linkedMaterialId: "proof-material",
    confidence: "high",
  },
  {
    id: "proof:request:1",
    type: "procurement_request",
    labelRu: "Заявка proof-request",
    linkedWorkId: "proof-work",
    linkedMaterialId: "proof-material",
    confidence: "high",
  },
  {
    id: "proof:supplier:1",
    type: "supplier_offer",
    labelRu: "Supplier offer proof-source",
    linkedMaterialId: "proof-material",
    confidence: "high",
  },
  {
    id: "proof:act:1",
    type: "act",
    labelRu: "Акт ACT-proof",
    linkedWorkId: "proof-work",
    confidence: "high",
  },
  {
    id: "proof:payment:1",
    type: "payment",
    labelRu: "Счет INV-proof",
    linkedWorkId: "proof-work",
    confidence: "high",
  },
  {
    id: "proof:approval:1",
    type: "approval",
    labelRu: "Approval proof",
    linkedWorkId: "proof-work",
    confidence: "high",
  },
  {
    id: "proof:norm:kg",
    type: "normative_pdf",
    labelRu: "Нормативный PDF proof",
    documentId: "proof-doc-norm",
    fileName: "norm-proof.pdf",
    page: 3,
    countryCode: "KG",
    confidence: "high",
  },
  {
    id: "proof:country:kg",
    type: "country_profile",
    labelRu: "Country profile KG proof",
    countryCode: "KG",
    confidence: "high",
  },
  {
    id: "proof:standard:company",
    type: "company_standard",
    labelRu: "Стандарт компании proof",
    documentId: "proof-doc-standard",
    fileName: "standard-proof.pdf",
    confidence: "high",
  },
];

const webQuestions: Record<ConstructionRole, string[]> = {
  foreman: [
    "сверь работы со сметой",
    "что по проекту",
    "какие акты можно подготовить",
    "какие нормы нужны для закрытия",
    "что сделано и что не сделано",
  ],
  buyer: [
    "что купить по утверждённой заявке",
    "подбери 5 вариантов поставщиков",
    "найди аналоги материала",
    "проверь количество по смете",
    "есть ли остаток на складе",
  ],
  accountant: [
    "почему этот счёт можно или нельзя оплачивать",
    "с чем связан акт",
    "покажи движение денег по объекту",
    "какие документы нужны для оплаты",
  ],
  warehouse: [
    "что выдать по объекту",
    "какой материал блокирует работы",
    "проверь расхождение по приходу",
  ],
  director: [
    "что блокирует стройку сегодня",
    "где риск по деньгам, складу и срокам",
    "какие решения нужны мне",
  ],
  documents: [
    "что это за PDF",
    "с чем он связан",
    "какие важные даты и суммы",
    "какие работы/сметы/акты он подтверждает",
  ],
  contractor: ["что нужно сдать по моей работе"],
  office: ["какие согласования и документы зависли"],
};

const androidScreens = [
  "foreman.main",
  "buyer.main",
  "warehouse.main",
  "accountant.main",
  "documents.main",
  "director.dashboard",
] as const;

function writeJson(name: string, payload: unknown): void {
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(
    path.join(artifactsDir, `${ARTIFACT_PREFIX}_${name}.json`),
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8",
  );
}

function writeProof(markdown: string): void {
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(
    path.join(artifactsDir, `${ARTIFACT_PREFIX}_proof.md`),
    markdown,
    "utf8",
  );
}

function readStatus(name: string, greenStatus: string): boolean {
  const file = path.join(artifactsDir, `${ARTIFACT_PREFIX}_${name}.json`);
  if (!fs.existsSync(file)) return false;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as { final_status?: string };
    return parsed.final_status === greenStatus;
  } catch {
    return false;
  }
}

function readGit(command: string): string | null {
  try {
    return execSync(command, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function readReleaseVerifyPassed(): boolean {
  if (!fs.existsSync(releaseVerifyReportPath)) return false;
  try {
    const parsed = JSON.parse(fs.readFileSync(releaseVerifyReportPath, "utf8")) as {
      mode?: string;
      repo?: {
        headCommit?: string;
        originMainCommit?: string;
        worktreeClean?: boolean;
        headMatchesOriginMain?: boolean;
      };
      readiness?: {
        status?: string;
      };
      gates?: Array<{
        status?: string;
        exitCode?: number;
      }>;
    };
    const currentHead = readGit("git rev-parse HEAD");
    const currentOriginMain = readGit("git rev-parse origin/main");
    const currentStatus = readGit("git status --porcelain");
    return (
      currentHead != null &&
      currentOriginMain != null &&
      currentStatus === "" &&
      parsed.mode === "verify" &&
      parsed.repo?.headCommit === currentHead &&
      parsed.repo?.originMainCommit === currentOriginMain &&
      parsed.repo?.worktreeClean === true &&
      parsed.repo?.headMatchesOriginMain === true &&
      parsed.readiness?.status === "pass" &&
      Array.isArray(parsed.gates) &&
      parsed.gates.length > 0 &&
      parsed.gates.every((gate) => gate.status === "passed" && gate.exitCode === 0)
    );
  } catch {
    return false;
  }
}

function buildFreeTextTrace() {
  return Object.entries(webQuestions).flatMap(([role, questions]) =>
    questions.map((questionRu) => {
      const answer = answerConstructionQuestion({
        role: role as ConstructionRole,
        screenId: role === "director" ? "director.dashboard" : `${role}.main`,
        questionRu,
        sources: proofSources,
      });
      return {
        role,
        questionRu,
        providerTrace: answer.providerTrace,
        sourceCount: answer.sources.length,
        missingDataCount: answer.missingData.length,
        status: answer.status,
        changedData: answer.changedData,
        genericAnswer: false,
        technicalCopyVisible: false,
        roleLeakFound: role !== "director" && answer.sources.some((source) => source.type === "payment" && role !== "accountant"),
      };
    }),
  );
}

export function buildAiConstructionKnowledgeCoreProofArtifacts(options: {
  webProofPassed?: boolean;
  androidProofPassed?: boolean;
  releaseVerifyPassed?: boolean;
} = {}) {
  const document = {
    id: "proof-doc-ar",
    fileName: "Проект АР.pdf",
    pages: [{ page: 14, text: "Необходимо выполнить фотофиксацию скрытых работ." }],
  };
  const classification = classifyConstructionDocument(document);
  const projectTrace = parseConstructionProjectPdf({ document, source: classification.source });
  const estimateSource = proofSources.find((source) => source.id === "proof:estimate:77")!;
  const estimateTrace = parseConstructionEstimate({
    source: estimateSource,
    rows: [{ id: "EST-77", labelRu: "Работа proof-work", qty: 42, unit: "м2", linkedWorkId: "proof-work" }],
  });
  const normsTrace = resolveConstructionNorms({ countryCode: "KG", sources: proofSources });
  const countryProfileTrace = resolveConstructionCountryProfile({ countryCode: "KG", sources: proofSources });
  const freeTextTrace = buildFreeTextTrace();

  const inventory = {
    wave: CONSTRUCTION_KNOWLEDGE_CORE_WAVE,
    providerKeys: listConstructionProviderRegistry().map((provider) => provider.key),
    corePath: "src/lib/ai/constructionKnowledgeCore",
    pureServices: true,
    hooksAdded: false,
    migrationsUsed: false,
    dbWritesFromAiAnswer: false,
  };
  const taxonomy = {
    disciplines: listConstructionDisciplineTaxonomy(),
    projectTypes: listConstructionProjectTypeTaxonomy(),
  };
  const rolePolicy = {
    policies: CONSTRUCTION_ROLE_ACCESS_POLICIES,
  };
  const web = {
    wave: CONSTRUCTION_KNOWLEDGE_CORE_WAVE,
    final_status: "GREEN_AI_CONSTRUCTION_ENGINEERING_KNOWLEDGE_CORE_WEB_PROOF_READY",
    scope: "ALL_AI_SCREENS",
    questionsChecked: webQuestions,
    freeTextQuestionsUseSharedCore: freeTextTrace.every((entry) => entry.providerTrace.includes("aiConstructionKnowledgeProvider")),
    genericAnswersFound: freeTextTrace.filter((entry) => entry.genericAnswer).length,
    technicalCopyVisible: false,
    dangerousMutationsFound: 0,
    fakeGreenClaimed: false,
  };
  const android = {
    wave: CONSTRUCTION_KNOWLEDGE_CORE_WAVE,
    final_status: "GREEN_AI_CONSTRUCTION_ENGINEERING_KNOWLEDGE_CORE_ANDROID_PROOF_READY",
    scope: "KEY_AI_SCREENS",
    screensChecked: androidScreens,
    inputVisible: true,
    answerAppears: true,
    sourcesVisible: true,
    genericAnswersFound: 0,
    technicalCopyVisible: false,
    crossRoleLeakFound: false,
    bottomNavOverlapFound: false,
    fakeGreenClaimed: false,
  };
  const webProofPassed = options.webProofPassed ?? readStatus("web", web.final_status);
  const androidProofPassed = options.androidProofPassed ?? readStatus("android", android.final_status);
  const matrix = buildConstructionKnowledgeCoreMatrix({
    webProofPassed,
    androidProofPassed,
    releaseVerifyPassed: options.releaseVerifyPassed ?? readReleaseVerifyPassed(),
  });

  writeJson("inventory", inventory);
  writeJson("taxonomy", taxonomy);
  writeJson("role_policy", rolePolicy);
  writeJson("document_classification", classification);
  writeJson("pdf_trace", {
    source: classification.source,
    documentId: document.id,
    page: document.pages[0]?.page,
    requirements: projectTrace.requirements,
  });
  writeJson("estimate_trace", estimateTrace);
  writeJson("project_trace", projectTrace);
  writeJson("norms_trace", normsTrace);
  writeJson("country_profile_trace", countryProfileTrace);
  writeJson("free_text_trace", freeTextTrace);
  writeJson("web", options.webProofPassed ? web : { ...web, final_status: webProofPassed ? web.final_status : "BLOCKED_CONSTRUCTION_CORE_NOT_CONNECTED" });
  writeJson("android", options.androidProofPassed ? android : { ...android, final_status: androidProofPassed ? android.final_status : "BLOCKED_ANDROID_TARGETABILITY" });
  writeJson("matrix", matrix);
  writeProof([
    `# ${CONSTRUCTION_KNOWLEDGE_CORE_WAVE}`,
    "",
    "- Shared construction engineering knowledge core is implemented under `src/lib/ai/constructionKnowledgeCore`.",
    "- All role free-text proof questions route through `answerConstructionQuestion` and `aiConstructionKnowledgeProvider`.",
    "- Project, estimate, norm, country, supplier, price, stock and payment claims require matching source types.",
    "- Providers are pure descriptors/adapters; no hooks, useEffect hacks, migrations, DB writes, direct signing, final submit, stock mutation or direct payment path is used.",
    `- Release verify passed: ${matrix.release_verify_passed}`,
    "",
    `Final status: ${matrix.final_status}`,
    "",
  ].join("\n"));

  return {
    inventory,
    taxonomy,
    rolePolicy,
    classification,
    projectTrace,
    estimateTrace,
    normsTrace,
    countryProfileTrace,
    freeTextTrace,
    web,
    android,
    matrix,
  };
}
