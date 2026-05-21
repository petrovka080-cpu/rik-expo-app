export const AI_GOLDEN_FINANCE_DATA = {
  paymentsMissingDocsCount: 3,
  paymentsMissingDocsSumKgs: 245000,
  payments: [
    {
      id: "payment_77",
      number: 77,
      amountKgs: 125000,
      companyRu: "ОсОО \"СтройМат\"",
      missingDocs: ["акт"],
      linkedRequestId: "req_124",
      linkedWorkId: "work_31",
      linkedPdfId: "pdf_invoice_45",
      statusRu: "требует документов",
    },
    {
      id: "payment_78",
      number: 78,
      amountKgs: 80000,
      companyRu: "ОсОО \"МонтажПроф\"",
      missingDocs: ["договор"],
      partialPaidKgs: 30000,
      statusRu: "частичная оплата",
    },
    {
      id: "payment_79",
      number: 79,
      amountKgs: 40000,
      companyRu: "ОсОО \"ДокСервис\"",
      missingDocs: ["подтверждающий PDF"],
      statusRu: "не хватает PDF",
    },
  ],
} as const;
