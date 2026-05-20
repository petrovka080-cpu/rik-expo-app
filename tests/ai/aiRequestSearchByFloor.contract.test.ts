import {
  FIRST_FLOOR_REQUESTS_QUESTION,
  FIRST_FLOOR_REQUEST_SOURCE,
  answerIntentFirst,
  expectRequestSearchAnswer,
} from "./aiQueryIntentFirstTestHelpers";

describe("request search by floor", () => {
  it("returns matching procurement requests when floor-linked sources are available", () => {
    const answer = answerIntentFirst("director", FIRST_FLOOR_REQUESTS_QUESTION, FIRST_FLOOR_REQUEST_SOURCE);

    expectRequestSearchAnswer(answer);
    expect(answer.answerTextRu).toContain("MR-101");
    expect(answer.answerTextRu).toContain("1 этаж");
    expect(answer.sourceTrace).toEqual(expect.arrayContaining(["buyer request MR-101"]));
  });

  it("returns a checked-empty reason when floor links are missing", () => {
    const answer = answerIntentFirst("director", FIRST_FLOOR_REQUESTS_QUESTION);

    expectRequestSearchAnswer(answer);
    expect(answer.answerTextRu).toContain("Заявки по первому этажу не найдены");
    expect(answer.checkedRu).toEqual(expect.arrayContaining(["заявки снабжения", "объекты и зоны"]));
  });
});
