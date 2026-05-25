import { getAi1000PostBoqArtifacts } from "./ai1000PostBoqTestHelpers";

describe("built-in AI 1000 post-BOQ save/send payloads", () => {
  it("includes final items in save and send payloads", async () => {
    const { matrix, saveSendPayloads } = await getAi1000PostBoqArtifacts();

    expect(matrix.save_send_payloads_include_final_items).toBe(true);
    expect(saveSendPayloads.save_send_payloads_include_final_items).toBe(true);
  });
});
