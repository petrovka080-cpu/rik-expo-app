import { createPdfDocumentViewerHref } from "./pdfDocumentViewerEntry";
import {parseCanonicalPdfRecoveryReference,type CanonicalPdfRecoveryReference} from "./pdfDocument";
import {resolvePdfViewerRouteModel,resolvePdfViewerSnapshot} from "../pdf/pdfViewer.route";
import {createPdfDocumentDescriptor} from "./pdfDocument";
import {createInMemoryDocumentPreviewSession,clearDocumentSessions,getDocumentSessionSnapshot} from "./pdfDocumentSessions";

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
jest.mock("../logger", () => ({ logger: { info: jest.fn() } }));

describe("viewer entry navigation identity", () => {
  it("encodes the actual caller key separately from the safe recovery href", () => {
    const result = createPdfDocumentViewerHref("own-session", "own-token", "/request?draftId=own", "request/index-+/own");
    const query = new URLSearchParams(String(result.href).split("?")[1]);
    expect(query.get("callerRouteKey")).toBe("request/index-+/own");
    expect(query.get("returnTo")).toBe("/request?draftId=own");
    expect(query.get("sessionId")).toBe("own-session");
  });

  it("does not admit an external recovery route with an otherwise valid caller key", () => {
    const result = createPdfDocumentViewerHref("own-session", null, "https://example.com", "own-caller");
    expect(new URLSearchParams(String(result.href).split("?")[1]).has("returnTo")).toBe(false);
  });
});

it('retains the exact selected saved recovery tuple without a visibility token or a signed URL',()=>{
 const reference:CanonicalPdfRecoveryReference={contractVersion:'canonical-pdf-recovery/v1',revisionId:'TEST_ONLY_OLD_REVISION',
  releaseId:'TEST_ONLY_RELEASE',definitionVersionId:'TEST_ONLY_DEFINITION',checksumSha256:'a'.repeat(64),issuancePurpose:'PRELIMINARY_REVIEW',
  documentProfile:'professional_v1',organizationId:'TEST_ONLY_COMPANY'};
 const href=createPdfDocumentViewerHref('TEST_ONLY_SESSION',undefined,'/request',undefined,reference).href;
 const query=new URLSearchParams(String(href).split('?')[1]),raw=query.get('canonicalRecovery')!;
 expect(raw).not.toMatch(/signedUrl|access_token|ownerUserId|viewerUserId/u);
 const route=resolvePdfViewerRouteModel({sessionId:query.get('sessionId')??undefined,canonicalRecovery:raw});
 expect(route.canonicalRecovery).toEqual(reference);expect(route.openToken).toBe('');
 expect(parseCanonicalPdfRecoveryReference({...reference,uri:'https://example.test/forbidden.pdf'})).toBeNull();
 expect(resolvePdfViewerRouteModel({sessionId:'TEST_ONLY_SESSION',canonicalRecovery:[raw,raw]}).canonicalRecovery).toBeNull();
});

it('does not substitute a valid neighbor session when a supplied canonical locator is malformed',()=>{
 const neighbor=createInMemoryDocumentPreviewSession(createPdfDocumentDescriptor({uri:'https://example.test/neighbor.pdf',title:'TEST_ONLY_NEIGHBOR',documentType:'request',source:'generated',originModule:'reports'}));
 try{
  const route=resolvePdfViewerRouteModel({sessionId:neighbor.session.sessionId,canonicalRecovery:'{"uri":"https://example.test/forbidden.pdf"}'});
  expect(route.canonicalRecoveryInvalid).toBe(true);
  expect(resolvePdfViewerSnapshot({route,registrySnapshot:getDocumentSessionSnapshot(neighbor.session.sessionId)})).toEqual({session:null,asset:null});
  expect(getDocumentSessionSnapshot(neighbor.session.sessionId).asset?.uri).toBe('https://example.test/neighbor.pdf');
 }finally{clearDocumentSessions();}
});
