import React from "react";
import TestRenderer, { act, type ReactTestRenderer } from "react-test-renderer";

import { BusinessWizardModal } from "./BusinessWizardModal";
import { EditCompanyModal } from "./EditCompanyModal";
import { EditProfileModal } from "./EditProfileModal";
import { InviteModal } from "./InviteModal";
import { ListingModal } from "./ListingModal";

const baseProfileForm = {
  profileNameInput: "Айбек",
  profilePhoneInput: "+996700000000",
  profileCityInput: "Бишкек",
  profileBioInput: "bio",
  profileTelegramInput: "@aibek",
  profileWhatsappInput: "+996700000111",
  profilePositionInput: "Снабженец",
};

const baseCompanyForm = {
  companyNameInput: "ОсОО GOX",
  companyCityInput: "Бишкек",
  companyLegalFormInput: "ОсОО",
  companyAddressInput: "Токтогула 1",
  companyIndustryInput: "Строительство",
  companyAboutShortInput: "short",
  companyPhoneMainInput: "+996555000000",
  companyPhoneWhatsAppInput: "+996555000111",
  companyEmailInput: "info@gox.kg",
  companySiteInput: "https://gox.kg",
  companyTelegramInput: "@gox",
  companyWorkTimeInput: "Пн-Сб 09:00-18:00",
  companyContactPersonInput: "Айбек",
  companyAboutFullInput: "full",
  companyServicesInput: "Монолит",
  companyRegionsInput: "Бишкек",
  companyClientsTypesInput: "B2B",
  companyInnInput: "123456789",
  companyBinInput: "987654321",
  companyRegNumberInput: "REG-1",
  companyBankDetailsInput: "Demir",
  companyLicensesInfoInput: "license",
};

const baseListingForm = {
  listingTitle: "Газоблок",
  listingCity: "Бишкек",
  listingPrice: "",
  listingUom: "шт",
  listingDescription: "desc",
  listingPhone: "+996700000000",
  listingWhatsapp: "+996700000111",
  listingEmail: "user@example.com",
  listingKind: "material" as const,
  listingRikCode: "R-1",
};

describe("Profile modal components", () => {
  it("renders edit profile modal and forwards close/save actions", () => {
    const onClose = jest.fn();
    const onSave = jest.fn();
    let renderer: ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <EditProfileModal
          visible
          avatarLetter="А"
          profileAvatarDraft={null}
          profileForm={baseProfileForm}
          savingProfile={false}
          onRequestClose={onClose}
          onPickProfileAvatar={jest.fn()}
          onSave={onSave}
          onChangeProfileName={jest.fn()}
          onChangeProfilePhone={jest.fn()}
          onChangeProfileCity={jest.fn()}
          onChangeProfileBio={jest.fn()}
          onChangeProfilePosition={jest.fn()}
          onChangeProfileTelegram={jest.fn()}
          onChangeProfileWhatsapp={jest.fn()}
        />,
      );
    });

    renderer!.root.findByProps({ testID: "profile-edit-modal-cancel" }).props.onPress();
    renderer!.root.findByProps({ testID: "profile-edit-modal-save" }).props.onPress();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("renders listing modal family and forwards publish and nested modal actions", () => {
    const onPublish = jest.fn();
    const onCatalogClose = jest.fn();
    const onItemConfirm = jest.fn();
    let renderer: ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <ListingModal
          visible
          catalogModalOpen
          itemModalOpen
          listingForm={baseListingForm}
          listingCartItems={[
            {
              id: "1",
              rik_code: "R-1",
              name: "Газоблок",
              uom: "шт",
              qty: "10",
              price: "45",
              city: "Бишкек",
              kind: "material",
            },
          ]}
          editingItem={{
            id: "2",
            rik_code: "R-2",
            name: "Песок",
            uom: "м3",
            qty: "5",
            price: "1000",
            city: "Ош",
            kind: "material",
          }}
          catalogSearch="газ"
          catalogResults={[
            {
              rik_code: "R-1",
              name_human_ru: "Газоблок",
              uom_code: "шт",
              kind: "material",
            },
          ]}
          savingListing={false}
          catalogLoading={false}
          onRequestClose={jest.fn()}
          onPublish={onPublish}
          onChangeListingKind={jest.fn()}
          onChangeListingTitle={jest.fn()}
          onChangeListingDescription={jest.fn()}
          onChangeListingPhone={jest.fn()}
          onChangeListingWhatsapp={jest.fn()}
          onChangeListingEmail={jest.fn()}
          onInlineCatalogPick={jest.fn()}
          onChangeCatalogSearch={jest.fn()}
          onLoadCatalog={jest.fn()}
          onCatalogModalClose={onCatalogClose}
          onCatalogModalPick={jest.fn()}
          onItemModalClose={jest.fn()}
          onChangeEditingItemCity={jest.fn()}
          onChangeEditingItemUom={jest.fn()}
          onChangeEditingItemQty={jest.fn()}
          onChangeEditingItemPrice={jest.fn()}
          onConfirmEditingItem={onItemConfirm}
        />,
      );
    });

    renderer!.root.findByProps({ testID: "profile-listing-modal-publish" }).props.onPress();
    renderer!.root.findByProps({ testID: "profile-catalog-modal-close" }).props.onPress();
    renderer!.root.findByProps({ testID: "profile-item-modal-confirm" }).props.onPress();

    expect(onPublish).toHaveBeenCalledTimes(1);
    expect(onCatalogClose).toHaveBeenCalledTimes(1);
    expect(onItemConfirm).toHaveBeenCalledTimes(1);
  });

  it("renders business wizard modal and forwards navigation actions", () => {
    const onPrev = jest.fn();
    const onNext = jest.fn();
    let renderer: ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <BusinessWizardModal
          visible
          businessStep={2}
          savingCompany={false}
          companyForm={baseCompanyForm}
          onRequestClose={jest.fn()}
          onPrevOrClose={onPrev}
          onNextOrSubmit={onNext}
          onChangeCompanyName={jest.fn()}
          onChangeCompanyCity={jest.fn()}
          onChangeCompanyLegalForm={jest.fn()}
          onChangeCompanyAddress={jest.fn()}
          onChangeCompanyIndustry={jest.fn()}
          onChangeCompanyAboutShort={jest.fn()}
          onChangeCompanyPhoneMain={jest.fn()}
          onChangeCompanyPhoneWhatsapp={jest.fn()}
          onChangeCompanyEmail={jest.fn()}
          onChangeCompanySite={jest.fn()}
          onChangeCompanyTelegram={jest.fn()}
          onChangeCompanyWorkTime={jest.fn()}
          onChangeCompanyContactPerson={jest.fn()}
          onChangeCompanyAboutFull={jest.fn()}
          onChangeCompanyServices={jest.fn()}
          onChangeCompanyRegions={jest.fn()}
          onChangeCompanyClientsTypes={jest.fn()}
          onChangeCompanyInn={jest.fn()}
          onChangeCompanyBin={jest.fn()}
          onChangeCompanyRegNumber={jest.fn()}
          onChangeCompanyBankDetails={jest.fn()}
          onChangeCompanyLicensesInfo={jest.fn()}
        />,
      );
    });

    renderer!.root.findByProps({ testID: "profile-business-modal-back" }).props.onPress();
    renderer!.root.findByProps({ testID: "profile-business-modal-next" }).props.onPress();

    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("renders invite modal in form and success states with owner callbacks", () => {
    const onSubmit = jest.fn();
    const onDone = jest.fn();
    const onAgain = jest.fn();
    const onCopy = jest.fn();
    const onWhatsapp = jest.fn();
    const onTelegram = jest.fn();
    let renderer: ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <InviteModal
          visible
          savingInvite={false}
          inviteRole="foreman"
          inviteName="Азиз"
          invitePhone="+996700000000"
          inviteEmail="worker@example.com"
          inviteComment="comment"
          lastInviteCode={null}
          onRequestClose={jest.fn()}
          onChangeInviteRole={jest.fn()}
          onChangeInviteName={jest.fn()}
          onChangeInvitePhone={jest.fn()}
          onChangeInviteEmail={jest.fn()}
          onChangeInviteComment={jest.fn()}
          onSubmitInvite={onSubmit}
          onInviteAnother={onAgain}
          onInviteDone={onDone}
          onCopyInviteCode={onCopy}
          onShareInviteWhatsApp={onWhatsapp}
          onShareInviteTelegram={onTelegram}
        />,
      );
    });

    renderer!.root.findByProps({ testID: "profile-invite-modal-submit" }).props.onPress();
    expect(onSubmit).toHaveBeenCalledTimes(1);

    act(() => {
      renderer!.update(
        <InviteModal
          visible
          savingInvite={false}
          inviteRole="foreman"
          inviteName="Азиз"
          invitePhone="+996700000000"
          inviteEmail="worker@example.com"
          inviteComment="comment"
          lastInviteCode="INV-2026"
          onRequestClose={jest.fn()}
          onChangeInviteRole={jest.fn()}
          onChangeInviteName={jest.fn()}
          onChangeInvitePhone={jest.fn()}
          onChangeInviteEmail={jest.fn()}
          onChangeInviteComment={jest.fn()}
          onSubmitInvite={onSubmit}
          onInviteAnother={onAgain}
          onInviteDone={onDone}
          onCopyInviteCode={onCopy}
          onShareInviteWhatsApp={onWhatsapp}
          onShareInviteTelegram={onTelegram}
        />,
      );
    });

    renderer!.root.findByProps({ testID: "profile-invite-modal-again" }).props.onPress();
    renderer!.root.findByProps({ testID: "profile-invite-modal-copy" }).props.onPress();
    renderer!.root.findByProps({ testID: "profile-invite-modal-whatsapp" }).props.onPress();
    renderer!.root.findByProps({ testID: "profile-invite-modal-telegram" }).props.onPress();
    renderer!.root.findByProps({ testID: "profile-invite-modal-done" }).props.onPress();

    expect(onAgain).toHaveBeenCalledTimes(1);
    expect(onCopy).toHaveBeenCalledTimes(1);
    expect(onWhatsapp).toHaveBeenCalledTimes(1);
    expect(onTelegram).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("renders edit company modal and forwards save/close actions", () => {
    const onClose = jest.fn();
    const onSave = jest.fn();
    let renderer: ReactTestRenderer;

    act(() => {
      renderer = TestRenderer.create(
        <EditCompanyModal
          visible
          companyTab="main"
          savingCompany={false}
          companyForm={baseCompanyForm}
          onRequestClose={onClose}
          onSave={onSave}
          onSelectCompanyTab={jest.fn()}
          onChangeCompanyName={jest.fn()}
          onChangeCompanyCity={jest.fn()}
          onChangeCompanyLegalForm={jest.fn()}
          onChangeCompanyAddress={jest.fn()}
          onChangeCompanyIndustry={jest.fn()}
          onChangeCompanyAboutShort={jest.fn()}
          onChangeCompanyPhoneMain={jest.fn()}
          onChangeCompanyPhoneWhatsapp={jest.fn()}
          onChangeCompanyEmail={jest.fn()}
          onChangeCompanySite={jest.fn()}
          onChangeCompanyTelegram={jest.fn()}
          onChangeCompanyWorkTime={jest.fn()}
          onChangeCompanyContactPerson={jest.fn()}
          onChangeCompanyAboutFull={jest.fn()}
          onChangeCompanyServices={jest.fn()}
          onChangeCompanyRegions={jest.fn()}
          onChangeCompanyClientsTypes={jest.fn()}
          onChangeCompanyInn={jest.fn()}
          onChangeCompanyBin={jest.fn()}
          onChangeCompanyRegNumber={jest.fn()}
          onChangeCompanyBankDetails={jest.fn()}
          onChangeCompanyLicensesInfo={jest.fn()}
        />,
      );
    });

    renderer!.root.findByProps({ testID: "profile-company-modal-cancel" }).props.onPress();
    renderer!.root.findByProps({ testID: "profile-company-modal-save" }).props.onPress();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
