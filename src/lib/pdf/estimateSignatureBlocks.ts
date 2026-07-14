export type EstimateSignatureBlock = {
  title: string;
  lines: string[];
};

export const ESTIMATE_SIGNATURE_SECTION_TITLE = "\u041f\u043e\u0434\u043f\u0438\u0441\u0438 \u0441\u0442\u043e\u0440\u043e\u043d";

export const ESTIMATE_SIGNATURE_BLOCKS: readonly EstimateSignatureBlock[] = Object.freeze([
  {
    title: "\u0417\u0430\u043a\u0430\u0437\u0447\u0438\u043a",
    lines: [
      "\u0414\u043e\u043b\u0436\u043d\u043e\u0441\u0442\u044c: __________________________",
      "\u0424\u0418\u041e: ________________________________",
      "\u041f\u043e\u0434\u043f\u0438\u0441\u044c: ____________________________",
      "\u0414\u0430\u0442\u0430: _______________________________",
    ],
  },
  {
    title: "\u0418\u0441\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c / \u041f\u043e\u0434\u0440\u044f\u0434\u0447\u0438\u043a",
    lines: [
      "\u0414\u043e\u043b\u0436\u043d\u043e\u0441\u0442\u044c: __________________________",
      "\u0424\u0418\u041e: ________________________________",
      "\u041f\u043e\u0434\u043f\u0438\u0441\u044c: ____________________________",
      "\u0414\u0430\u0442\u0430: _______________________________",
    ],
  },
]);

export function estimateSignatureBlocks() {
  return {
    section_title: ESTIMATE_SIGNATURE_SECTION_TITLE,
    blocks: ESTIMATE_SIGNATURE_BLOCKS,
    signature_blocks_present: ESTIMATE_SIGNATURE_BLOCKS.length >= 2,
    fake_green_claimed: false,
  };
}
