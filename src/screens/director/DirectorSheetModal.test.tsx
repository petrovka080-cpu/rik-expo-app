import React from "react";
import { Modal } from "react-native";
import TestRenderer from "react-test-renderer";

import DirectorSheetModal from "./DirectorSheetModal";

jest.mock("./DirectorRequestSheet", () => () => null);
jest.mock("./DirectorProposalContainer", () => () => null);

describe("DirectorSheetModal", () => {
  it("keeps only backdrop and close button as pressable owners when the sheet is open", async () => {
    let renderer: TestRenderer.ReactTestRenderer;

    await TestRenderer.act(async () => {
      renderer = TestRenderer.create(
        <DirectorSheetModal
          isVisible
          onClose={jest.fn()}
          sheetTitle="Sheet"
          sheetKind="request"
          sheetRequest={{ request_id: "req-1", items: [] } as never}
          sheetProposalId={null}
          screenLock={false}
          actingId={null}
          reqDeleteId={null}
          reqSendId={null}
          isRequestPdfBusy={jest.fn(() => false)}
          onRejectItem={jest.fn(async () => undefined)}
          onDeleteAll={jest.fn(async () => undefined)}
          onOpenPdf={jest.fn(async () => undefined)}
          onExportExcel={jest.fn()}
          onApproveAndSend={jest.fn(async () => undefined)}
          loadedByProp={{}}
          itemsByProp={{}}
          propsHeads={[]}
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
          isProposalPdfBusy={jest.fn(() => false)}
          loadProposalAttachments={jest.fn(async () => undefined)}
          onOpenAttachment={jest.fn()}
          rejectProposalItem={jest.fn(async () => undefined)}
          onDirectorReturn={jest.fn()}
          openProposalPdf={jest.fn(async () => undefined)}
          exportProposalExcel={jest.fn(async () => undefined)}
          approveProposal={jest.fn(async () => undefined)}
        />,
      );
    });

    const pressables = renderer!.root.findAll((node) => typeof node.props.onPress === "function");
    expect(pressables).toHaveLength(2);

    const modal = renderer!.root.findByType(Modal);
    expect(modal.props.visible).toBe(true);

    await TestRenderer.act(async () => {
      renderer!.unmount();
    });
  });
});
