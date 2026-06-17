import {
  accountantInvoiceStatusLabel,
  buyerBucketLabel,
  DIRECTOR_REPORTS_CONFIRMED_ISSUES_OBJECT_EXPLANATION,
  DIRECTOR_REPORTS_CONFIRMED_ISSUES_OBJECT_LABEL,
  DIRECTOR_REPORTS_NO_WORK_NAME_EXPLANATION,
  directorReportScopeLabel,
  foremanMaterialModalLabel,
  unknownOfficeCodeLabel,
} from "../../src/shared/i18n/officeRussianDisplay";

const forbiddenVisibleText =
  /[\u0420\u0421][\u0080-\u00bf\u00d7\u2010-\u202f\u0400-\u040f\u0450-\u045f\u0490-\u0491]|[\u00d0\u00d1][\u0080-\u00bf\u0400-\u045f]|\ufffd|\u043f\u0457\u0405|E2E Supplier|SYS-|director_reports|summary_buckets|request_timeout_discipline/u;

describe("office Russian display labels", () => {
  it("maps director report scope labels", () => {
    expect(directorReportScopeLabel("materials")).toBe("Материалы");
    expect(directorReportScopeLabel("discipline")).toBe("Работы");
    expect(DIRECTOR_REPORTS_CONFIRMED_ISSUES_OBJECT_LABEL).toBe("Объекты по подтверждённым выдачам");
    expect(DIRECTOR_REPORTS_CONFIRMED_ISSUES_OBJECT_EXPLANATION).toBe(
      "Счётчик построен по подтверждённым выдачам со склада за выбранный период.",
    );
    expect(DIRECTOR_REPORTS_NO_WORK_NAME_EXPLANATION).toBe(
      "Вид работ не был указан при подтверждённой выдаче.",
    );
  });

  it("maps foreman material modal labels", () => {
    expect(foremanMaterialModalLabel("catalog")).toBe("Каталог");
    expect(foremanMaterialModalLabel("estimate")).toBe("Смета");
    expect(foremanMaterialModalLabel("draft")).toBe("Черновик");
    expect(foremanMaterialModalLabel("requestHistory")).toBe("История заявок");
    expect(foremanMaterialModalLabel("subcontractHistory")).toBe("История подрядов");
    expect(foremanMaterialModalLabel("aiQuick")).toBe("AI заявка");
  });

  it("maps buyer bucket labels", () => {
    expect(buyerBucketLabel("inbox")).toBe("Вход");
    expect(buyerBucketLabel("pending")).toBe("Контроль");
    expect(buyerBucketLabel("approved")).toBe("Готово");
    expect(buyerBucketLabel("rejected")).toBe("Правки");
    expect(buyerBucketLabel("subcontracts")).toBe("Подряды");
  });

  it("maps accountant invoice status labels", () => {
    expect(accountantInvoiceStatusLabel("K_PAY")).toBe("К оплате");
    expect(accountantInvoiceStatusLabel("PART")).toBe("Частично оплачено");
    expect(accountantInvoiceStatusLabel("PAID")).toBe("Оплачено");
    expect(accountantInvoiceStatusLabel("REWORK")).toBe("На доработке");
  });

  it("uses Russian fallback for unknown codes", () => {
    expect(unknownOfficeCodeLabel("catalog_items")).toBe("Неизвестный код: catalog_items");
    expect(unknownOfficeCodeLabel("")).toBe("Неизвестный код");
    expect(foremanMaterialModalLabel("catalog_items")).toBe("Неизвестный код: catalog_items");
  });

  it("keeps mapping output free of mojibake and internal identifiers", () => {
    const labels = [
      directorReportScopeLabel("materials"),
      directorReportScopeLabel("discipline"),
      DIRECTOR_REPORTS_CONFIRMED_ISSUES_OBJECT_LABEL,
      DIRECTOR_REPORTS_CONFIRMED_ISSUES_OBJECT_EXPLANATION,
      DIRECTOR_REPORTS_NO_WORK_NAME_EXPLANATION,
      foremanMaterialModalLabel("catalog"),
      foremanMaterialModalLabel("estimate"),
      foremanMaterialModalLabel("draft"),
      foremanMaterialModalLabel("requestHistory"),
      foremanMaterialModalLabel("subcontractHistory"),
      foremanMaterialModalLabel("aiQuick"),
      buyerBucketLabel("inbox"),
      buyerBucketLabel("pending"),
      buyerBucketLabel("approved"),
      buyerBucketLabel("rejected"),
      buyerBucketLabel("subcontracts"),
      accountantInvoiceStatusLabel("K_PAY"),
      accountantInvoiceStatusLabel("PART"),
      accountantInvoiceStatusLabel("PAID"),
      accountantInvoiceStatusLabel("REWORK"),
    ];

    expect(labels.filter((label) => forbiddenVisibleText.test(label))).toEqual([]);
  });
});
