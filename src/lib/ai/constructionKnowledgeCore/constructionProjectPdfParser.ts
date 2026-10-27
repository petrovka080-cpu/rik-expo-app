import { classifyConstructionDiscipline } from "./constructionDisciplineClassifier";
import type {
  ConstructionDocumentInput,
  ConstructionKnowledgeSource,
  ConstructionProjectRequirement,
} from "./constructionKnowledgeTypes";

const REQUIREMENT_LINE =
  /(?:требуется|должен|должна|должно|необходимо|required|shall)\s+([^.\n]{8,220})/gi;

function pdfSourceTypeAllowed(type: ConstructionKnowledgeSource["type"]): boolean {
  return type === "project_pdf" || type === "architecture_pdf" || type === "engineering_pdf";
}

export function parseConstructionProjectPdf(params: {
  document: ConstructionDocumentInput;
  source: ConstructionKnowledgeSource;
}): {
  requirements: ConstructionProjectRequirement[];
  source: ConstructionKnowledgeSource;
  blockedReason?: "BLOCKED_ARCHITECTURE_PROVIDER_NOT_CONNECTED" | "BLOCKED_ENGINEERING_PROJECT_PROVIDER_NOT_CONNECTED";
} {
  if (!pdfSourceTypeAllowed(params.source.type)) {
    return {
      requirements: [],
      source: params.source,
      blockedReason: "BLOCKED_ARCHITECTURE_PROVIDER_NOT_CONNECTED",
    };
  }

  const pages = params.document.pages ?? [{ page: params.source.page ?? 1, text: params.document.text ?? "" }];
  const requirements: ConstructionProjectRequirement[] = [];

  for (const page of pages) {
    const discipline = classifyConstructionDiscipline({
      fileName: params.document.fileName,
      text: page.text,
    });
    for (const [index, match] of [...page.text.matchAll(REQUIREMENT_LINE)].entries()) {
      requirements.push({
        id: `${params.source.id}:requirement:${page.page}:${index + 1}`,
        textRu: (match[1] ?? match[0]).trim(),
        discipline: discipline.discipline,
        sourceRef: params.source.id,
        page: page.page,
        linkedObjectId: params.source.linkedObjectId,
        linkedWorkId: params.source.linkedWorkId,
      });
    }
  }

  return {
    requirements,
    source: params.source,
  };
}

export function aiArchitectureProjectProvider(params: {
  document: ConstructionDocumentInput;
  source: ConstructionKnowledgeSource;
}) {
  return parseConstructionProjectPdf(params);
}

export function aiEngineeringProjectProvider(params: {
  document: ConstructionDocumentInput;
  source: ConstructionKnowledgeSource;
}) {
  return parseConstructionProjectPdf(params);
}

export const constructionProjectPdfParser = parseConstructionProjectPdf;
