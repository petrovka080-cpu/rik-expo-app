import { rankNoHintWorkOntologyCandidates } from "../../src/lib/ai/workOntology/workOntologyCandidateRanker";
import { resolveConstructionWorkOntologyIntent } from "./workOntologyTestHelpers";

describe("work ontology operation/object disambiguation", () => {
  it("keeps carpet laying in flooring without masonry candidates", () => {
    const result = resolveConstructionWorkOntologyIntent("укладка ковролина 100 м2");

    expect(result.ambiguity_status).toBe("RESOLVED");
    expect(result.selected_work_key).toBe("carpet_laying");
    expect(result.category).toBe("flooring");
    expect(result.candidates.some((candidate) => candidate.category === "masonry")).toBe(false);

    const noHint = rankNoHintWorkOntologyCandidates("укладка ковролина 100 м2", 8);
    expect(noHint[0]?.canonical_work_key).toBe("carpet_laying");
    expect(noHint[0]?.category).toBe("flooring");
    expect(noHint.some((candidate) => candidate.category === "masonry")).toBe(false);
  });

  it("does not read kladka from the middle of ukladka", () => {
    const result = resolveConstructionWorkOntologyIntent("укладка ковролина и плинтуса");

    expect(result.selected_work_key).toBe("carpet_laying");
    expect(result.category).toBe("flooring");
    expect(result.candidates.flatMap((candidate) => candidate.reasons).join(" ")).not.toContain("masonry_object_action_match");
  });

  it("allows masonry only when the object noun is masonry material", () => {
    const brick = resolveConstructionWorkOntologyIntent("укладка кирпича 40 м2");
    const aerated = resolveConstructionWorkOntologyIntent("укладка газоблока 60 м2");

    expect(brick.ambiguity_status).toBe("RESOLVED");
    expect(brick.selected_work_key).toBe("brick_masonry");
    expect(brick.category).toBe("masonry");

    expect(aerated.ambiguity_status).toBe("RESOLVED");
    expect(aerated.selected_work_key).toBe("aerated_block_masonry");
    expect(aerated.category).toBe("masonry");

    expect(rankNoHintWorkOntologyCandidates("укладка кирпича 40 м2", 3)[0]?.canonical_work_key).toBe("brick_masonry");
    expect(rankNoHintWorkOntologyCandidates("укладка газоблока 60 м2", 3)[0]?.canonical_work_key).toBe("aerated_block_masonry");
  });
});
