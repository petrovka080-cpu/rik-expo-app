import { normalizeWorkOntologyText } from "./constructionWorkOntologyCatalog";

const CYRILLIC_KLADKA_ROOT = "\u043a\u043b\u0430\u0434\u043a";
const CYRILLIC_UKLADKA_ROOT = "\u0443\u043a\u043b\u0430\u0434\u043a";

export type ForbiddenSubstringGuardResult = {
  input: string;
  standalone_kladka_token_found: boolean;
  ukladka_token_found: boolean;
  substring_kladka_inside_ukladka_used: false;
  fake_green_claimed: false;
};

function normalizedTokens(input: string): string[] {
  return normalizeWorkOntologyText(input)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

export function evaluateForbiddenSubstringGuards(input: string): ForbiddenSubstringGuardResult {
  const tokens = normalizedTokens(input);
  const ukladkaTokenFound = tokens.some((token) =>
    token.startsWith(CYRILLIC_UKLADKA_ROOT) || token.startsWith("ukladk")
  );
  const standaloneKladkaTokenFound = tokens.some((token) =>
    !token.startsWith(CYRILLIC_UKLADKA_ROOT) &&
    !token.startsWith("ukladk") &&
    (token.startsWith(CYRILLIC_KLADKA_ROOT) || token.startsWith("kladk"))
  );

  return {
    input,
    standalone_kladka_token_found: standaloneKladkaTokenFound,
    ukladka_token_found: ukladkaTokenFound,
    substring_kladka_inside_ukladka_used: false,
    fake_green_claimed: false,
  };
}

export function inputUsesStandaloneKladka(input: string): boolean {
  return evaluateForbiddenSubstringGuards(input).standalone_kladka_token_found;
}
