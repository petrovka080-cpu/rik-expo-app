import type {
  AiRoleWorkflowAnswer,
  AiRoleWorkflowContext,
  AiRoleWorkflowId,
  AiRoleWorkflowRequest,
  AiRoleWorkflowRole,
} from "./aiRoleWorkflowTypes";

export function normalizeAiRoleWorkflowQuestion(questionRu: string): string {
  return questionRu.toLocaleLowerCase("ru").replace(/\s+/g, " ").trim();
}

export function makeAiRoleWorkflowAnswer(input: {
  context: AiRoleWorkflowContext;
  request: AiRoleWorkflowRequest;
  workflowId: AiRoleWorkflowId;
  role: AiRoleWorkflowRole;
  screenId?: string;
  shortAnswerRu: string;
  businessState: AiRoleWorkflowAnswer["businessState"];
  facts: AiRoleWorkflowAnswer["facts"];
  chain: AiRoleWorkflowAnswer["chain"];
  openLinks: AiRoleWorkflowAnswer["openLinks"];
  draft?: AiRoleWorkflowAnswer["draft"];
  missingData: string[];
  nextStepRu: string;
  statusRu: AiRoleWorkflowAnswer["statusRu"];
  approvalRequired?: boolean;
}): AiRoleWorkflowAnswer {
  return {
    workflowId: input.workflowId,
    role: input.role,
    screenId: input.screenId ?? input.request.screenId ?? input.role,
    questionRu: input.request.questionRu,
    normalizedQuestionRu: input.request.normalizedQuestionRu ?? normalizeAiRoleWorkflowQuestion(input.request.questionRu),
    shortAnswerRu: input.shortAnswerRu,
    businessState: input.businessState,
    facts: input.facts,
    chain: input.chain,
    openLinks: input.openLinks,
    draft: input.draft,
    missingData: input.missingData,
    nextStepRu: input.nextStepRu,
    statusRu: input.statusRu,
    safetyStatus: {
      changedData: false,
      draftOnly: Boolean(input.draft),
      approvalRequired: input.approvalRequired ?? false,
      finalSubmit: false,
      autoApproval: false,
      dangerousMutation: false,
    },
  };
}

export function renderAiRoleWorkflowAnswerRu(answer: AiRoleWorkflowAnswer): string {
  const facts = answer.facts.map((fact) => `- ${fact.textRu}`).join("\n");
  const chain = answer.chain.map((step, index) => `${index + 1}. ${step.stepRu} — ${step.status}`).join("\n");
  const links = answer.openLinks.map((link) => `[${link.labelRu}]`).join(" ");
  const numericFacts = answer.facts
    .flatMap((fact) => fact.numericFacts ?? [])
    .map((fact) => `- ${fact.key}: ${fact.value}${fact.unit ? ` ${fact.unit}` : ""}`)
    .join("\n");
  return [
    "Коротко:",
    answer.shortAnswerRu,
    "",
    "Что найдено:",
    facts,
    numericFacts ? ["", "Числа:", numericFacts].join("\n") : "",
    "",
    "Цепочка:",
    chain,
    "",
    "Открыть:",
    links,
    answer.draft ? ["", "Черновик:", `${answer.draft.titleRu}\n${answer.draft.bodyRu}`].join("\n") : "",
    "",
    "Чего не хватает:",
    answer.missingData.length ? answer.missingData.map((item) => `- ${item}`).join("\n") : "- ничего критичного для safe-read ответа",
    "",
    "Следующий шаг:",
    answer.nextStepRu,
    "",
    "Статус:",
    answer.statusRu,
  ].filter((part) => part !== "").join("\n");
}
