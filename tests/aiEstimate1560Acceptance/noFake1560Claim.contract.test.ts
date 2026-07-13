import { PRODUCTION_1560_ACCEPTANCE_READY_STATUS } from "../../src/lib/ai/estimateTemplate10000";
import { acceptanceMatrix1560 } from "./aiEstimate1560AcceptanceTestHelpers";

describe("1560 acceptance no fake green claim", () => {
  it("only returns green when every required acceptance area passes", () => {
    const matrix = acceptanceMatrix1560();
    expect(matrix.final_status).toBe(PRODUCTION_1560_ACCEPTANCE_READY_STATUS);
    expect(matrix.fake_green_claimed).toBe(false);
    expect(matrix.sample_total).toBe(1560);
    expect(matrix.sample_unique_work_keys).toBe(1560);
    expect(matrix.compiled_failed).toBe(0);
    expect(matrix.selected_work_key_lost).toBe(0);
    expect(matrix.wrong_similar_work_auto_selected).toBe(0);
    expect(matrix.generic_rows_found).toBe(0);
    expect(matrix.cross_work_contamination_found).toBe(0);
    expect(matrix.fake_prices_found).toBe(0);
    expect(matrix.mojibake_found).toBe(0);
    expect(matrix.english_debug_labels_visible).toBe(0);
    expect(matrix.internal_keys_visible).toBe(0);
    expect(matrix.blockers).toEqual([]);
  });
});
