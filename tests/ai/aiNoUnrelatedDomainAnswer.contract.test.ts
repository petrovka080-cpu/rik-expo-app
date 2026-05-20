import {
  FIRST_FLOOR_REQUESTS_QUESTION,
  WINDOW_ESTIMATE_QUESTION,
  answerIntentFirst,
} from "./aiQueryIntentFirstTestHelpers";

describe("no unrelated domain answer", () => {
  it("keeps estimate and request questions on their own topic", () => {
    const estimate = answerIntentFirst("director", WINDOW_ESTIMATE_QUESTION);
    const requests = answerIntentFirst("director", FIRST_FLOOR_REQUESTS_QUESTION);

    expect(estimate.queryIntent).toBe("construction_estimate_request");
    expect(estimate.answerTextRu).not.toMatch(/PAY-GKL|оплат|платеж|invoice/i);
    expect(requests.queryIntent).toBe("procurement_request_search");
    expect(requests.answerTextRu).not.toMatch(/PAY-GKL|Плат[её]ж|invoice/i);
  });
});
