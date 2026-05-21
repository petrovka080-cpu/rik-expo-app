import {
  findAiNodeFact,
  isInternalAiSourceRef,
  normalizeAiQuestionRu,
  uniqueAiSourceRefs,
  uniqueStrings,
  type AiAppEntityType,
  type AiContextGraphAnswer,
  type AiContextGraphBuildResult,
  type AiContextGraphNode,
  type AiSourceRef,
} from "./aiSourceRef";

export type AiContextGraphAnswerComposeInput = {
  questionRu: string;
  role: string;
  screenId: string;
  graph: AiContextGraphBuildResult;
};

type AnswerItem = AiContextGraphAnswer["answerRu"]["sections"][number]["items"][number];

function sourceRefById(graph: AiContextGraphBuildResult): Map<string, AiSourceRef> {
  return new Map(graph.sourceRefs.map((ref) => [ref.id, ref]));
}

function nodeByRefId(graph: AiContextGraphBuildResult): Map<string, AiContextGraphNode> {
  return new Map(graph.nodes.map((node) => [node.ref.id, node]));
}

function nodesOfType(graph: AiContextGraphBuildResult, entityType: AiAppEntityType): AiContextGraphNode[] {
  return graph.nodes.filter((node) => node.ref.entityType === entityType);
}

function hasText(value: string, needle: string): boolean {
  return normalizeAiQuestionRu(value).includes(normalizeAiQuestionRu(needle));
}

function titleOrFacts(node: AiContextGraphNode): string {
  return [
    node.titleRu,
    node.ref.labelRu,
    ...node.facts.map((fact) => fact.valueRu),
  ].join(" ");
}

function linkedNodes(graph: AiContextGraphBuildResult, node: AiContextGraphNode): AiContextGraphNode[] {
  const byId = nodeByRefId(graph);
  return node.links.map((link) => byId.get(link.targetRefId)).filter((item): item is AiContextGraphNode => Boolean(item));
}

function uniqueRefIds(values: readonly string[]): string[] {
  return uniqueStrings(values);
}

function refIdsForNodeAndLinks(node: AiContextGraphNode): string[] {
  return uniqueRefIds([node.ref.id, ...node.links.map((link) => link.targetRefId)]);
}

function openLinksForRefs(graph: AiContextGraphBuildResult, refIds: readonly string[]): AiContextGraphAnswer["answerRu"]["openLinks"] {
  const refs = sourceRefById(graph);
  return uniqueRefIds(refIds)
    .map((sourceRefId) => refs.get(sourceRefId))
    .filter((ref): ref is AiSourceRef => Boolean(ref))
    .filter((ref) => isInternalAiSourceRef(ref))
    .map((ref) => ({
      labelRu: ref.labelRu,
      sourceRefId: ref.id,
      route: ref.appLink?.route ?? "",
      enabled: ref.permission.canOpen && Boolean(ref.appLink?.route),
      disabledReasonRu: ref.permission.canOpen ? undefined : ref.permission.reasonRu,
    }));
}

function usedSourceRefs(graph: AiContextGraphBuildResult, refIds: readonly string[]): AiSourceRef[] {
  const refs = sourceRefById(graph);
  return uniqueAiSourceRefs(
    uniqueRefIds(refIds)
      .map((id) => refs.get(id))
      .filter((ref): ref is AiSourceRef => Boolean(ref)),
  );
}

function checkedEmpty(questionRu: string, normalizedQuestionRu: string, role: string, screenId: string, reasonRu: string): AiContextGraphAnswer {
  return {
    questionRu,
    normalizedQuestionRu,
    role,
    screenId,
    answerRu: {
      shortRu: reasonRu,
      sections: [
        {
          titleRu: "Что проверено",
          items: [{ textRu: reasonRu, sourceRefIds: [], status: "checked_empty" }],
        },
      ],
      openLinks: [],
      missingData: [reasonRu],
      nextStepRu: "Уточнить объект, период или выбрать конкретный внутренний источник.",
      statusRu: "Данные не изменены",
    },
    sourceRefs: [],
    safetyStatus: {
      changedData: false,
      draftOnly: false,
      approvalRequired: false,
      finalSubmit: false,
      dangerousMutation: false,
    },
  };
}

function buildAnswer(params: {
  input: AiContextGraphAnswerComposeInput;
  shortRu: string;
  sections: AiContextGraphAnswer["answerRu"]["sections"];
  refIds: string[];
  chainRu?: AiContextGraphAnswer["answerRu"]["chainRu"];
  missingData?: string[];
  nextStepRu: string;
  statusRu?: AiContextGraphAnswer["answerRu"]["statusRu"];
}): AiContextGraphAnswer {
  const normalizedQuestionRu = normalizeAiQuestionRu(params.input.questionRu);
  const refIds = uniqueRefIds([
    ...params.refIds,
    ...params.sections.flatMap((section) => section.items.flatMap((item) => item.sourceRefIds)),
    ...(params.chainRu ?? []).flatMap((step) => step.sourceRefIds),
  ]);

  return {
    questionRu: params.input.questionRu,
    normalizedQuestionRu,
    role: params.input.role,
    screenId: params.input.screenId,
    answerRu: {
      shortRu: params.shortRu,
      sections: params.sections,
      openLinks: openLinksForRefs(params.input.graph, refIds),
      chainRu: params.chainRu,
      missingData: uniqueStrings(params.missingData ?? []),
      nextStepRu: params.nextStepRu,
      statusRu: params.statusRu ?? "Данные не изменены",
    },
    sourceRefs: usedSourceRefs(params.input.graph, refIds),
    safetyStatus: {
      changedData: false,
      draftOnly: false,
      approvalRequired: false,
      finalSubmit: false,
      dangerousMutation: false,
    },
  };
}

function nodeMatchesFloor(graph: AiContextGraphBuildResult, node: AiContextGraphNode, normalizedQuestion: string): boolean {
  const asksFirstFloor = /(^|\s)(1|перв)/.test(normalizedQuestion) && normalizedQuestion.includes("этаж");
  if (!asksFirstFloor) return true;

  const directFloor = findAiNodeFact(node, "floor");
  if (directFloor && /(^|\s)(1|перв)/.test(normalizeAiQuestionRu(directFloor))) return true;

  return linkedNodes(graph, node)
    .filter((linked) => linked.ref.entityType === "floor")
    .some((floor) => /(^|\s)(1|перв)/.test(normalizeAiQuestionRu(titleOrFacts(floor))));
}

function composeRequestsByFloor(input: AiContextGraphAnswerComposeInput, normalizedQuestion: string): AiContextGraphAnswer {
  const requests = nodesOfType(input.graph, "procurement_request")
    .filter((node) => nodeMatchesFloor(input.graph, node, normalizedQuestion));

  if (!requests.length) {
    return checkedEmpty(
      input.questionRu,
      normalizedQuestion,
      input.role,
      input.screenId,
      "По указанному этажу заявки не найдены в переданном app context graph.",
    );
  }

  const requestItems: AnswerItem[] = requests.map((request) => {
    const status = findAiNodeFact(request, "status");
    const floor = findAiNodeFact(request, "floor");
    const linked = linkedNodes(input.graph, request);
    const work = linked.find((node) => node.ref.entityType === "work")?.titleRu;
    const object = linked.find((node) => node.ref.entityType === "object")?.titleRu;
    const text = [
      request.titleRu,
      status ? `статус: ${status}` : null,
      object ? `объект: ${object}` : null,
      floor ? `этаж: ${floor}` : null,
      work ? `работа: ${work}` : null,
    ].filter(Boolean).join("; ");
    return {
      textRu: text,
      sourceRefIds: refIdsForNodeAndLinks(request),
      status: request.missingLinks.length ? "risk" : "found",
    };
  });

  const missingData = requests.flatMap((request) => request.missingLinks.map((link) => link.reasonRu));
  const refIds = requests.flatMap(refIdsForNodeAndLinks);

  return buildAnswer({
    input,
    shortRu: `По запросу найдено ${requests.length} заявок.`,
    sections: [
      { titleRu: "Заявки", items: requestItems },
      {
        titleRu: "Источник",
        items: [
          {
            textRu: "Проверены заявки, строки заявок и связи с объектом, этажом, работой, складом и документами.",
            sourceRefIds: refIds,
            status: "found",
          },
        ],
      },
    ],
    refIds,
    chainRu: requests.flatMap((request) => [
      { stepRu: request.titleRu, sourceRefIds: [request.ref.id] },
      ...request.links.map((link) => ({ stepRu: link.labelRu, sourceRefIds: [link.targetRefId] })),
    ]),
    missingData,
    nextStepRu: "Открыть заявки без поставщика, склада или работы и проверить недостающие связи.",
  });
}

function composePdf(input: AiContextGraphAnswerComposeInput, normalizedQuestion: string): AiContextGraphAnswer {
  const pdfs = nodesOfType(input.graph, "pdf_document");
  const pdf = pdfs.find((node) => normalizedQuestion.includes(normalizeAiQuestionRu(node.ref.entityId))) ?? pdfs[0];

  if (!pdf) {
    return checkedEmpty(input.questionRu, normalizedQuestion, input.role, input.screenId, "PDF не найден в переданном app context graph.");
  }

  const docType = findAiNodeFact(pdf, "document_type") ?? "документ";
  const preview = findAiNodeFact(pdf, "value_preview");
  const linked = linkedNodes(input.graph, pdf);
  const sections: AiContextGraphAnswer["answerRu"]["sections"] = [
    {
      titleRu: "Что найдено",
      items: [
        {
          textRu: [pdf.titleRu, `тип: ${docType}`, preview ? `фрагмент: ${preview}` : null].filter(Boolean).join("; "),
          sourceRefIds: [pdf.ref.id],
          status: "found",
        },
      ],
    },
    {
      titleRu: "Связи",
      items: linked.length
        ? linked.map((node) => ({
            textRu: `${node.ref.labelRu}`,
            sourceRefIds: [pdf.ref.id, node.ref.id],
            status: "found",
          }))
        : [{ textRu: "Связанные объекты приложения не найдены.", sourceRefIds: [pdf.ref.id], status: "missing" }],
    },
  ];
  const missingData = pdf.missingLinks.map((link) => link.reasonRu);
  const refIds = refIdsForNodeAndLinks(pdf);

  return buildAnswer({
    input,
    shortRu: `PDF распознан как ${docType}.`,
    sections,
    refIds,
    chainRu: [
      { stepRu: pdf.titleRu, sourceRefIds: [pdf.ref.id] },
      ...pdf.links.map((link) => ({ stepRu: link.labelRu, sourceRefIds: [link.targetRefId] })),
    ],
    missingData,
    nextStepRu: missingData.length ? "Связать PDF с недостающим документом или запросить его." : "Открыть PDF и проверить выделенный фрагмент.",
  });
}

function findMaterialNeedle(normalizedQuestion: string, graph: AiContextGraphBuildResult): string | null {
  if (normalizedQuestion.includes("гкл")) return "гкл";
  const material = nodesOfType(graph, "material").find((node) => {
    const firstWord = normalizeAiQuestionRu(node.titleRu).split(" ")[0];
    return firstWord.length > 2 && normalizedQuestion.includes(firstWord);
  });
  return material ? normalizeAiQuestionRu(material.titleRu).split(" ")[0] : null;
}

function composeMaterialMovement(input: AiContextGraphAnswerComposeInput, normalizedQuestion: string): AiContextGraphAnswer {
  const needle = findMaterialNeedle(normalizedQuestion, input.graph);
  const issues = nodesOfType(input.graph, "warehouse_issue").filter((node) => {
    const text = normalizeAiQuestionRu(titleOrFacts(node));
    return needle ? text.includes(needle) : true;
  });
  const stock = nodesOfType(input.graph, "warehouse_stock").filter((node) => {
    const text = normalizeAiQuestionRu(titleOrFacts(node));
    return needle ? text.includes(needle) : true;
  });
  const incoming = nodesOfType(input.graph, "warehouse_incoming").filter((node) => {
    const text = normalizeAiQuestionRu(titleOrFacts(node));
    return needle ? text.includes(needle) : true;
  });

  if (!issues.length && !stock.length && !incoming.length) {
    return checkedEmpty(input.questionRu, normalizedQuestion, input.role, input.screenId, "Движение материала не найдено в переданном app context graph.");
  }

  const movementNodes = [...incoming, ...stock, ...issues];
  const refIds = movementNodes.flatMap(refIdsForNodeAndLinks);
  const items: AnswerItem[] = [
    ...incoming.map((node) => ({
      textRu: `${node.titleRu}; количество: ${findAiNodeFact(node, "quantity") ?? "не указано"}`,
      sourceRefIds: refIdsForNodeAndLinks(node),
      status: "found" as const,
    })),
    ...stock.map((node) => ({
      textRu: `${node.titleRu}; остаток: ${findAiNodeFact(node, "quantity") ?? "не указан"}`,
      sourceRefIds: refIdsForNodeAndLinks(node),
      status: "found" as const,
    })),
    ...issues.map((node) => {
      const linked = linkedNodes(input.graph, node);
      const work = linked.find((item) => item.ref.entityType === "work")?.titleRu;
      const floor = linked.find((item) => item.ref.entityType === "floor")?.titleRu;
      const recipient = findAiNodeFact(node, "recipient");
      return {
        textRu: [
          `${node.titleRu}; выдано: ${findAiNodeFact(node, "quantity") ?? "не указано"}`,
          floor ? `этаж: ${floor}` : null,
          work ? `работа: ${work}` : null,
          recipient ? `получатель: ${recipient}` : null,
        ].filter(Boolean).join("; "),
        sourceRefIds: refIdsForNodeAndLinks(node),
        status: node.missingLinks.length ? "risk" as const : "found" as const,
      };
    }),
  ];

  return buildAnswer({
    input,
    shortRu: "Движение материала найдено по складу, выдаче и связанным работам.",
    sections: [{ titleRu: "Движение", items }],
    refIds,
    chainRu: movementNodes.flatMap((node) => [
      { stepRu: node.titleRu, sourceRefIds: [node.ref.id] },
      ...node.links.map((link) => ({ stepRu: link.labelRu, sourceRefIds: [link.targetRefId] })),
    ]),
    missingData: movementNodes.flatMap((node) => node.missingLinks.map((link) => link.reasonRu)),
    nextStepRu: "Открыть выдачу и работу, затем проверить остаток и недостающие документы.",
  });
}

function composePaymentsWithoutDocuments(input: AiContextGraphAnswerComposeInput, normalizedQuestion: string): AiContextGraphAnswer {
  const payments = nodesOfType(input.graph, "payment").filter((payment) =>
    payment.missingLinks.some((link) => link.expected === "pdf" || link.expected === "invoice"),
  );

  if (!payments.length) {
    return checkedEmpty(input.questionRu, normalizedQuestion, input.role, input.screenId, "Платежи без документов не найдены.");
  }

  const refIds = payments.flatMap(refIdsForNodeAndLinks);
  return buildAnswer({
    input,
    shortRu: `Найдено платежей с документальными разрывами: ${payments.length}.`,
    sections: [
      {
        titleRu: "Платежи",
        items: payments.map((payment) => ({
          textRu: [
            payment.titleRu,
            findAiNodeFact(payment, "amount") ? `сумма: ${findAiNodeFact(payment, "amount")}` : null,
            payment.missingLinks.map((link) => link.reasonRu).join("; "),
          ].filter(Boolean).join("; "),
          sourceRefIds: refIdsForNodeAndLinks(payment),
          status: "blocked",
        })),
      },
    ],
    refIds,
    missingData: payments.flatMap((payment) => payment.missingLinks.map((link) => link.reasonRu)),
    nextStepRu: "Открыть платеж и привязать счет, PDF или approval через штатный человеческий процесс.",
  });
}

function composeMarketplace(input: AiContextGraphAnswerComposeInput, normalizedQuestion: string): AiContextGraphAnswer {
  const products = nodesOfType(input.graph, "marketplace_product");
  const suppliers = nodesOfType(input.graph, "supplier");
  const selected = products.filter((node) => hasText(normalizedQuestion, node.titleRu) || normalizedQuestion.includes("товар"));

  if (!selected.length && !suppliers.length) {
    return checkedEmpty(input.questionRu, normalizedQuestion, input.role, input.screenId, "Связанные товары и поставщики не найдены.");
  }

  const nodes = selected.length ? selected : products;
  const refIds = [...nodes, ...suppliers].flatMap(refIdsForNodeAndLinks);
  return buildAnswer({
    input,
    shortRu: `Найдено товаров marketplace: ${nodes.length}.`,
    sections: [
      {
        titleRu: "Marketplace",
        items: nodes.map((node) => ({
          textRu: [
            node.titleRu,
            findAiNodeFact(node, "price") ? `цена: ${findAiNodeFact(node, "price")}` : null,
            findAiNodeFact(node, "availability") ? `наличие: ${findAiNodeFact(node, "availability")}` : null,
          ].filter(Boolean).join("; "),
          sourceRefIds: refIdsForNodeAndLinks(node),
          status: node.missingLinks.length ? "risk" : "found",
        })),
      },
    ],
    refIds,
    missingData: nodes.flatMap((node) => node.missingLinks.map((link) => link.reasonRu)),
    nextStepRu: "Открыть карточку товара или поставщика и проверить актуальность предложения.",
  });
}

export function composeAiContextGraphAnswer(input: AiContextGraphAnswerComposeInput): AiContextGraphAnswer {
  const normalizedQuestion = normalizeAiQuestionRu(input.questionRu);

  if (/платеж/.test(normalizedQuestion) && /(без документ|документ|блокир)/.test(normalizedQuestion)) {
    return composePaymentsWithoutDocuments(input, normalizedQuestion);
  }

  if (/(pdf|пдф|документ|счет)/.test(normalizedQuestion) && nodesOfType(input.graph, "pdf_document").length > 0) {
    return composePdf(input, normalizedQuestion);
  }

  if (/куда уш|выдал|выдач|склад|остат/.test(normalizedQuestion) && (normalizedQuestion.includes("гкл") || nodesOfType(input.graph, "warehouse_issue").length > 0)) {
    return composeMaterialMovement(input, normalizedQuestion);
  }

  if (/заявк/.test(normalizedQuestion)) {
    return composeRequestsByFloor(input, normalizedQuestion);
  }

  if (/товар|поставщик|marketplace|карточк/.test(normalizedQuestion)) {
    return composeMarketplace(input, normalizedQuestion);
  }

  return checkedEmpty(
    input.questionRu,
    normalizedQuestion,
    input.role,
    input.screenId,
    "Для вопроса не найден подходящий внутренний объект приложения.",
  );
}
