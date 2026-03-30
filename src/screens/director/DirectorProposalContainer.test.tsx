import React from "react";
import TestRenderer, { act } from "react-test-renderer";

import DirectorProposalContainer from "./DirectorProposalContainer";

const mockCapturedProps: Array<Record<string, unknown>> = [];

jest.mock("./DirectorProposalSheet", () => {
  return function MockDirectorProposalSheet(props: Record<string, unknown>) {
    mockCapturedProps.push(props);
    return null;
  };
});

describe("DirectorProposalContainer", () => {
  beforeEach(() => {
    mockCapturedProps.length = 0;
  });

  it("disables approve when proposal has degraded request item links", async () => {
    await act(async () => {
      TestRenderer.create(
        <DirectorProposalContainer
          sheetProposalId="proposal-1"
          loadedByProp={{ "proposal-1": true }}
          itemsByProp={{
            "proposal-1": [
              {
                id: 1,
                request_item_id: "ri-1",
                rik_code: "MAT-1",
                name_human: "Broken line",
                uom: "pcs",
                app_code: "APP-1",
                total_qty: 2,
                price: 10,
                request_item_integrity_state: "source_cancelled",
                request_item_integrity_reason: "request_item_cancelled",
              },
            ],
          }}
          propsHeads={[{ id: "proposal-1", pretty: "PR-1" }]}
          screenLock={false}
          propApproveId={null}
          propReturnId={null}
          decidingId={null}
          actingPropItemId={null}
          propAttByProp={{}}
          propAttBusyByProp={{}}
          propAttErrByProp={{}}
          reqItemNoteById={{}}
          propReqIdsByProp={{}}
          reqMetaById={{}}
          isProposalPdfBusy={() => false}
          loadProposalAttachments={jest.fn(async () => {})}
          onOpenAttachment={jest.fn()}
          rejectProposalItem={jest.fn(async () => {})}
          onDirectorReturn={jest.fn()}
          openProposalPdf={jest.fn(async () => {})}
          exportProposalExcel={jest.fn(async () => {})}
          approveProposal={jest.fn(async () => {})}
        />,
      );
    });

    expect(mockCapturedProps).toHaveLength(1);
    expect(mockCapturedProps[0]?.approveDisabled).toBe(true);
  });
});
