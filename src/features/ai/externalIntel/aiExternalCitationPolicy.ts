import type {
  ExternalIntelCitation,
  ExternalIntelSearchPreviewOutput,
  ExternalIntelSearchResult,
} from "./externalIntelTypes";

export type AiExternalCitationPolicyResult = {
  ok: boolean;
  citationsRequired: true;
  checkedAtRequired: true;
  urlHashOnly: true;
  rawUrlReturned: false;
  rawHtmlReturned: false;
  blockers: string[];
};

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

function citationKey(citation: ExternalIntelCitation): string {
  return `${citation.sourceId}:${citation.urlHash}:${citation.checkedAt}`;
}

function resultHasCitation(
  result: ExternalIntelSearchResult,
  citationKeys: ReadonlySet<string>,
): boolean {
  return citationKeys.has(`${result.sourceId}:${result.urlHash}:${result.checkedAt}`);
}

export function validateAiExternalCitations(
  output: Pick<ExternalIntelSearchPreviewOutput, "results" | "citations" | "rawHtmlReturned">,
): AiExternalCitationPolicyResult {
  const blockers: string[] = [];
  const citationKeys = new Set(output.citations.map(citationKey));

  for (const citation of output.citations) {
    if (!hasText(citation.sourceId) || !hasText(citation.title) || !hasText(citation.urlHash) || !hasText(citation.checkedAt)) {
      blockers.push("BLOCKED_EXTERNAL_CITATION_INCOMPLETE");
    }
  }

  for (const result of output.results) {
    if (!hasText(result.evidenceRef) || !hasText(result.checkedAt) || !hasText(result.urlHash)) {
      blockers.push("BLOCKED_EXTERNAL_RESULT_WITHOUT_EVIDENCE");
    }
    if (!resultHasCitation(result, citationKeys)) {
      blockers.push("BLOCKED_EXTERNAL_RESULT_WITHOUT_CITATION");
    }
  }

  if (output.rawHtmlReturned !== false) {
    blockers.push("BLOCKED_EXTERNAL_RAW_HTML_RETURNED");
  }

  return {
    ok: blockers.length === 0,
    citationsRequired: true,
    checkedAtRequired: true,
    urlHashOnly: true,
    rawUrlReturned: false,
    rawHtmlReturned: false,
    blockers: [...new Set(blockers)],
  };
}
