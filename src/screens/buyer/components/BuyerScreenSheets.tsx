import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import AppButton from "../../../ui/AppButton";
import IconSquareButton from "../../../ui/IconSquareButton";
import SendPrimaryButton from "../../../ui/SendPrimaryButton";
import WarehouseFioModal from "../../warehouse/components/WarehouseFioModal";
import ToastOverlay from "../ToastOverlay";
import type { BuyerSheetKind } from "../buyer.types";
import type { BuyerAccountingSheetState } from "../hooks/useBuyerAccountingSheetState";
import type { BuyerProposalDetailsState } from "../hooks/useBuyerProposalDetailsState";
import type { useBuyerRfqForm } from "../hooks/useBuyerRfqForm";
import { BuyerAccountingSheetBody } from "./BuyerAccountingSheetBody";
import { BuyerInboxSheetBody } from "./BuyerInboxSheetBody";
import { BuyerPropDetailsSheetBody } from "./BuyerPropDetailsSheetBody";
import { BuyerReworkSheetBody, SheetFooterActions } from "./BuyerReworkSheetBody";
import { BuyerRfqSheetBody } from "./BuyerRfqSheetBody";
import { BuyerSheetShell } from "./BuyerSheetShell";
import type { StylesBag } from "./component.types";

type BuyerFioModalProps = React.ComponentProps<typeof WarehouseFioModal>;
type BuyerAccountingSheetBodyProps = React.ComponentProps<typeof BuyerAccountingSheetBody>;
type BuyerInboxSheetBodyProps = React.ComponentProps<typeof BuyerInboxSheetBody>;
type BuyerPropDetailsSheetBodyProps = React.ComponentProps<typeof BuyerPropDetailsSheetBody>;
type BuyerReworkSheetBodyProps = React.ComponentProps<typeof BuyerReworkSheetBody>;
type BuyerRfqSheetBodyProps = React.ComponentProps<typeof BuyerRfqSheetBody>;

type BuyerScreenSheetsInboxProps = Omit<
  BuyerInboxSheetBodyProps,
  "s" | "footer" | "sheetGroup"
> & {
  sheetGroup: BuyerInboxSheetBodyProps["sheetGroup"] | null | undefined;
  showFooter: boolean;
  clearPick: () => void;
  openRfqSheet: () => void;
  handleCreateProposalsBySupplier: () => void | Promise<void>;
  disableClear: boolean;
  disableRfq: boolean;
  disableSend: boolean;
};

export type BuyerScreenSheetsProps = {
  s: StylesBag;
  isWeb: boolean;
  sheetKind: BuyerSheetKind;
  sheetTitle: string;
  isSheetOpen: boolean;
  closeSheet: () => void;
  fioModal: BuyerFioModalProps;
  inbox: BuyerScreenSheetsInboxProps;
  renderMobileEditorModal?: () => React.ReactNode;
  proposalDetails: {
    state: BuyerProposalDetailsState;
    isReqContextNote: BuyerPropDetailsSheetBodyProps["isReqContextNote"];
    extractReqContextLines: BuyerPropDetailsSheetBodyProps["extractReqContextLines"];
    propAttBusy: BuyerPropDetailsSheetBodyProps["propAttBusy"];
    propAttErrByPid: Record<string, string | undefined>;
    propAttByPid: Record<string, BuyerPropDetailsSheetBodyProps["attachments"] | undefined>;
    loadProposalAttachments: (proposalId: string) => void | Promise<void>;
    attachFileToProposal: (proposalId: string, groupKey: string) => void | Promise<void>;
    openPropAttachment: BuyerPropDetailsSheetBodyProps["onOpenAttachment"];
    openProposalPdfFromDetails: NonNullable<BuyerPropDetailsSheetBodyProps["onOpenPdf"]>;
    openAccountingModal: NonNullable<BuyerPropDetailsSheetBodyProps["onOpenAccounting"]>;
    openRework: NonNullable<BuyerPropDetailsSheetBodyProps["onOpenRework"]>;
  };
  accounting: BuyerAccountingSheetState & {
    openInvoicePickerWeb: BuyerAccountingSheetBodyProps["openInvoicePickerWeb"];
    pickInvoiceFile: BuyerAccountingSheetBodyProps["pickInvoiceFile"];
    sendToAccounting: BuyerAccountingSheetBodyProps["sendToAccounting"];
  };
  rework: Omit<BuyerReworkSheetBodyProps, "s" | "closeSheet">;
  rfq: {
    form: ReturnType<typeof useBuyerRfqForm>;
    pickedIdsLen: BuyerRfqSheetBodyProps["pickedIdsLen"];
    rfqPickedPreview: BuyerRfqSheetBodyProps["rfqPickedPreview"];
    fmtLocal: BuyerRfqSheetBodyProps["fmtLocal"];
    setDeadlineHours: BuyerRfqSheetBodyProps["setDeadlineHours"];
    isDeadlineHoursActive: BuyerRfqSheetBodyProps["isDeadlineHoursActive"];
    inferCountryCode: BuyerRfqSheetBodyProps["inferCountryCode"];
    publishRfq: BuyerRfqSheetBodyProps["publishRfq"];
  };
  toast: string | null;
};

function BuyerScreenSheetsInner({
  s,
  isWeb,
  sheetKind,
  sheetTitle,
  isSheetOpen,
  closeSheet,
  fioModal,
  inbox,
  renderMobileEditorModal,
  proposalDetails,
  accounting,
  rework,
  rfq,
  toast,
}: BuyerScreenSheetsProps) {
  const proposalDetailsState = proposalDetails.state;
  const propViewId = proposalDetailsState.propViewId;
  const inboxFooter = inbox.showFooter ? (
    <SheetFooterActions
      s={s}
      left={
        <IconSquareButton
          onPress={inbox.clearPick}
          disabled={inbox.disableClear}
          accessibilityLabel="РћС‡РёСЃС‚РёС‚СЊ РІС‹Р±РѕСЂ"
          width={52}
          height={52}
          radius={16}
          bg="#1F2933"
          bgPressed="#273341"
          bgDisabled="#111827"
          spinnerColor="#FFFFFF"
        >
          <Ionicons name="close" size={22} color="#FFFFFF" />
        </IconSquareButton>
      }
      center={
        <AppButton
          label="РўРћР Р“Р"
          variant="blue"
          shape="wide"
          disabled={inbox.disableRfq}
          testID="buyer-rfq-open"
          accessibilityLabel="buyer-rfq-open"
          onPress={inbox.openRfqSheet}
        />
      }
      right={
        <View style={inbox.needAttachWarn ? s.sendBtnWarnWrap : null}>
          <SendPrimaryButton
            variant="green"
            disabled={inbox.disableSend}
            loading={inbox.creating}
            testID="buyer-create-proposals-send"
            accessibilityLabel="РћС‚РїСЂР°РІРёС‚СЊ РґРёСЂРµРєС‚РѕСЂСѓ"
            onPress={inbox.handleCreateProposalsBySupplier}
          />
        </View>
      }
    />
  ) : null;

  return (
    <>
      <WarehouseFioModal {...fioModal} />

      <BuyerSheetShell isOpen={isSheetOpen} onClose={closeSheet} s={s} title={sheetTitle}>
        <View style={[s.sheetBody, { flex: 1, minHeight: 0 }]}>
          {sheetKind === "inbox" && inbox.sheetGroup ? (
            <BuyerInboxSheetBody
              {...inbox}
              s={s}
              sheetGroup={inbox.sheetGroup}
              footer={inboxFooter}
            />
          ) : null}

          {renderMobileEditorModal?.()}

          {sheetKind === "prop_details" ? (
            <BuyerPropDetailsSheetBody
              s={s}
              head={proposalDetailsState.propViewHead}
              propViewBusy={proposalDetailsState.propViewBusy}
              propViewLines={proposalDetailsState.propViewLines}
              isReqContextNote={proposalDetails.isReqContextNote}
              extractReqContextLines={proposalDetails.extractReqContextLines}
              propAttBusy={proposalDetails.propAttBusy}
              propAttErr={propViewId ? (proposalDetails.propAttErrByPid[propViewId] || "") : ""}
              attachments={propViewId ? (proposalDetails.propAttByPid[propViewId] || []) : []}
              onReloadAttachments={() => {
                if (propViewId) proposalDetails.loadProposalAttachments(propViewId);
              }}
              onAttachFile={() => {
                if (propViewId) proposalDetails.attachFileToProposal(propViewId, "extra");
              }}
              onOpenAttachment={proposalDetails.openPropAttachment}
              onOpenPdf={proposalDetails.openProposalPdfFromDetails}
              onOpenAccounting={proposalDetails.openAccountingModal}
              onOpenRework={proposalDetails.openRework}
            />
          ) : null}

          {sheetKind === "accounting" ? (
            <BuyerAccountingSheetBody {...accounting} s={s} isWeb={isWeb} closeSheet={closeSheet} />
          ) : null}

          {sheetKind === "rework" ? (
            <BuyerReworkSheetBody {...rework} s={s} closeSheet={closeSheet} />
          ) : null}

          {sheetKind === "rfq" ? (
            <BuyerRfqSheetBody
              s={s}
              rfqBusy={rfq.form.rfqBusy}
              closeSheet={closeSheet}
              pickedIdsLen={rfq.pickedIdsLen}
              rfqShowItems={rfq.form.rfqShowItems}
              setRfqShowItems={rfq.form.setRfqShowItems}
              rfqPickedPreview={rfq.rfqPickedPreview}
              fmtLocal={rfq.fmtLocal}
              rfqDeadlineIso={rfq.form.rfqDeadlineIso}
              setDeadlineHours={rfq.setDeadlineHours}
              isDeadlineHoursActive={rfq.isDeadlineHoursActive}
              rfqDeliveryDays={rfq.form.rfqDeliveryDays}
              setRfqDeliveryDays={rfq.form.setRfqDeliveryDays}
              rfqDeliveryType={rfq.form.rfqDeliveryType}
              setRfqDeliveryType={rfq.form.setRfqDeliveryType}
              rfqCity={rfq.form.rfqCity}
              setRfqCity={rfq.form.setRfqCity}
              rfqCountryCodeTouchedRef={rfq.form.rfqCountryCodeTouched}
              inferCountryCode={rfq.inferCountryCode}
              setRfqCountryCode={rfq.form.setRfqCountryCode}
              rfqAddressText={rfq.form.rfqAddressText}
              setRfqAddressText={rfq.form.setRfqAddressText}
              rfqDeliveryWindow={rfq.form.rfqDeliveryWindow}
              setRfqDeliveryWindow={rfq.form.setRfqDeliveryWindow}
              rfqCountryCode={rfq.form.rfqCountryCode}
              rfqPhone={rfq.form.rfqPhone}
              setRfqPhone={rfq.form.setRfqPhone}
              rfqEmail={rfq.form.rfqEmail}
              setRfqEmail={rfq.form.setRfqEmail}
              rfqRememberContacts={rfq.form.rfqRememberContacts}
              setRfqRememberContacts={rfq.form.setRfqRememberContacts}
              rfqVisibility={rfq.form.rfqVisibility}
              setRfqVisibility={rfq.form.setRfqVisibility}
              rfqPaymentTerms={rfq.form.rfqPaymentTerms}
              setRfqPaymentTerms={rfq.form.setRfqPaymentTerms}
              rfqNeedInvoice={rfq.form.rfqNeedInvoice}
              setRfqNeedInvoice={rfq.form.setRfqNeedInvoice}
              rfqNeedWaybill={rfq.form.rfqNeedWaybill}
              setRfqNeedWaybill={rfq.form.setRfqNeedWaybill}
              rfqNeedCert={rfq.form.rfqNeedCert}
              setRfqNeedCert={rfq.form.setRfqNeedCert}
              rfqNote={rfq.form.rfqNote}
              setRfqNote={rfq.form.setRfqNote}
              publishRfq={rfq.publishRfq}
            />
          ) : null}
        </View>
      </BuyerSheetShell>

      <ToastOverlay toast={toast} />
    </>
  );
}

export const BuyerScreenSheets = React.memo(BuyerScreenSheetsInner);
