import { calculateGlobalConstructionEstimateSync } from "../../src/lib/ai/globalEstimate/globalEstimateCalculator";
import { createEstimatePdf } from "../../src/lib/estimatePdf/createEstimatePdf";
import { extractEstimatePdfTextForProof } from "../../src/lib/estimatePdf/extractEstimatePdfTextForProof";

const ru = {
  prompt: "\u0441\u043c\u0435\u0442\u0430 \u043d\u0430 \u0431\u0443\u0440\u0435\u043d\u0438\u0435 \u0441\u043a\u0432\u0430\u0436\u0438\u043d\u044b \u043d\u0430 50 \u043c\u0435\u0442\u0440\u043e\u0432",
  city: "\u0411\u0438\u0448\u043a\u0435\u043a",
  address: "\u0443\u043b. \u041a\u0438\u0435\u0432\u0441\u043a\u0430\u044f 10",
  time: "\u0437\u0430\u0432\u0442\u0440\u0430 \u043f\u043e\u0441\u043b\u0435 14:00",
  status: "\u0423\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0430",
  repairType: "\u0421\u043a\u0432\u0430\u0436\u0438\u043d\u0430",
  addressLabel: "\u0410\u0434\u0440\u0435\u0441",
  contactLabel: "\u041a\u043e\u043d\u0442\u0430\u043a\u0442",
  timeLabel: "\u041a\u043e\u0433\u0434\u0430 \u0443\u0434\u043e\u0431\u043d\u043e",
  sourceLabel: "\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a",
  tableLabel: "\u0422\u0430\u0431\u043b\u0438\u0446\u0430 \u0441\u043c\u0435\u0442\u044b",
};

describe("estimate PDF request header", () => {
  it("prints request contact details and keeps source evidence visible in the table", () => {
    const estimate = calculateGlobalConstructionEstimateSync({
      text: ru.prompt,
      language: "ru",
      countryCode: "KG",
      city: ru.city,
      currency: "KGS",
    });

    const pdf = createEstimatePdf({
      estimate,
      generatedAt: "2026-06-02T07:00:00.000Z",
      language: "ru",
      requestDetails: {
        city: ru.city,
        addressText: ru.address,
        preferredTimeText: ru.time,
        contactPhone: "+996 555 123 456",
        repairType: ru.repairType,
        status: ru.status,
        createdAt: "2026-06-02T06:30:00.000Z",
        attachmentsCount: 2,
      },
      runtimeTrace: { traceId: "estimate_pdf_request_header_test" },
    });

    const proof = extractEstimatePdfTextForProof({
      pdf: pdf.bytes,
      knownWorkKey: estimate.work.workKey,
      requiredText: [ru.tableLabel, ru.addressLabel, ru.contactLabel, ru.timeLabel],
    });

    expect(proof.valid).toBe(true);
    expect(proof.failures).toEqual([]);
    expect(proof.text).toContain(`${ru.addressLabel}: ${ru.city}, ${ru.address}`);
    expect(proof.text).toContain(`${ru.contactLabel}: +996 555 123 456`);
    expect(proof.text).toContain(`${ru.timeLabel}: ${ru.time}`);
    expect(proof.text).toContain(ru.sourceLabel);
    expect(pdf.body).toContain("/FontFile2");
    expect(pdf.body).toContain("/CIDToGIDMap /Identity");
  });
});
