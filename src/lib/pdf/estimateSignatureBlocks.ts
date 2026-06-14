export type EstimateSignatureBlock = {
  title: string;
  lines: string[];
};

export const ESTIMATE_SIGNATURE_SECTION_TITLE = "Подписи сторон";

export const ESTIMATE_SIGNATURE_BLOCKS: readonly EstimateSignatureBlock[] = Object.freeze([
  {
    title: "Заказчик",
    lines: [
      "Должность: __________________________",
      "ФИО: ________________________________",
      "Подпись: ____________________________",
      "Дата: _______________________________",
    ],
  },
  {
    title: "Исполнитель / Подрядчик",
    lines: [
      "Должность: __________________________",
      "ФИО: ________________________________",
      "Подпись: ____________________________",
      "Дата: _______________________________",
    ],
  },
]);
