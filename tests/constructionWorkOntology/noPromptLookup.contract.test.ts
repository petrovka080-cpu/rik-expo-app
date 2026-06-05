import { readArtifactJson, readMigration, readText } from "./constructionWorkOntologyTestHelpers";

it("does not add prompt lookup or hardcoded prompt answer tables", () => {
  const combined = [
    readMigration(),
    readText("src/lib/constructionWork/constructionWorkRepository.ts"),
    readText("src/lib/constructionWork/normalizeConstructionWorkAlias.ts"),
  ].join("\n");
  const proof = readArtifactJson<Record<string, unknown>>("no_prompt_lookup_proof.json");

  expect(combined).not.toMatch(/prompt[_\s-]*lookup|lookup[_\s-]*prompt|hardcoded[_\s-]*prompt/i);
  expect(combined).not.toMatch(/llm|openai|anthropic|semantic\s+search|opensearch/i);
  expect(proof).toEqual(
    expect.objectContaining({
      prompt_lookup_created: false,
      hardcoded_prompt_answers_created: false,
      semantic_retrieval_started: false,
      fake_green_claimed: false,
    }),
  );
});
