import { normalizeUniversalRoleQaQuestion } from "./universalQuestionNormalizer";

export type UniversalRoleQaPeriod = {
  from: string;
  to: string;
  labelRu: string;
  source: "question" | "screen_default" | "unknown";
};

const months: Record<string, { index: number; labelRu: string }> = {
  январь: { index: 0, labelRu: "январь" },
  января: { index: 0, labelRu: "январь" },
  февраль: { index: 1, labelRu: "февраль" },
  февраля: { index: 1, labelRu: "февраль" },
  март: { index: 2, labelRu: "март" },
  марта: { index: 2, labelRu: "март" },
  апрель: { index: 3, labelRu: "апрель" },
  апреля: { index: 3, labelRu: "апрель" },
  май: { index: 4, labelRu: "май" },
  мая: { index: 4, labelRu: "май" },
  июнь: { index: 5, labelRu: "июнь" },
  июня: { index: 5, labelRu: "июнь" },
  июль: { index: 6, labelRu: "июль" },
  июля: { index: 6, labelRu: "июль" },
  август: { index: 7, labelRu: "август" },
  августа: { index: 7, labelRu: "август" },
  сентябрь: { index: 8, labelRu: "сентябрь" },
  сентября: { index: 8, labelRu: "сентябрь" },
  октябрь: { index: 9, labelRu: "октябрь" },
  октября: { index: 9, labelRu: "октябрь" },
  ноябрь: { index: 10, labelRu: "ноябрь" },
  ноября: { index: 10, labelRu: "ноябрь" },
  декабрь: { index: 11, labelRu: "декабрь" },
  декабря: { index: 11, labelRu: "декабрь" },
};

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function parseUniversalRoleQaPeriod(
  questionRu: string,
  referenceDate = "2026-05-20",
): UniversalRoleQaPeriod | undefined {
  const text = normalizeUniversalRoleQaQuestion(questionRu);
  const reference = new Date(`${referenceDate}T00:00:00.000Z`);
  const yearMatch = text.match(/\b(20\d{2})\b/);
  const year = yearMatch ? Number(yearMatch[1]) : reference.getUTCFullYear();

  for (const [needle, month] of Object.entries(months)) {
    if (!text.includes(needle)) continue;
    const from = new Date(Date.UTC(year, month.index, 1));
    const to = new Date(Date.UTC(year, month.index + 1, 0));
    return {
      from: isoDate(from),
      to: isoDate(to),
      labelRu: `${month.labelRu} ${year}`,
      source: "question",
    };
  }

  if (text.includes("сегодня")) {
    return {
      from: isoDate(reference),
      to: isoDate(reference),
      labelRu: "сегодня",
      source: "question",
    };
  }

  if (text.includes("вчера")) {
    const date = new Date(reference);
    date.setUTCDate(reference.getUTCDate() - 1);
    return {
      from: isoDate(date),
      to: isoDate(date),
      labelRu: "вчера",
      source: "question",
    };
  }

  const range = text.match(/(\d{4}-\d{2}-\d{2})\s*(?:до|-)\s*(\d{4}-\d{2}-\d{2})/);
  if (range) {
    return {
      from: range[1],
      to: range[2],
      labelRu: `${range[1]} — ${range[2]}`,
      source: "question",
    };
  }

  return undefined;
}
