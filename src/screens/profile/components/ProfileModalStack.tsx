import React from "react";

import { BusinessWizardModal } from "./BusinessWizardModal";
import { EditCompanyModal } from "./EditCompanyModal";
import { EditProfileModal } from "./EditProfileModal";
import { InviteModal } from "./InviteModal";
import { ListingModal } from "./ListingModal";
import type {
  CatalogSearchItem,
  CompanyFormState,
  CompanyTab,
  ListingCartItem,
  ListingFormState,
  ProfileFormState,
  ProfileListingKind,
} from "../profile.types";

type ProfileModalStackProps = {
  listingModalOpen: boolean;
  catalogModalOpen: boolean;
  itemModalOpen: boolean;
  listingForm: ListingFormState;
  listingCartItems: ListingCartItem[];
  editingItem: ListingCartItem | null;
  catalogSearch: string;
  catalogResults: CatalogSearchItem[];
  savingListing: boolean;
  catalogLoading: boolean;
  onCloseListingModal: () => void;
  onPublishListing: () => void;
  onChangeListingKind: (kind: ProfileListingKind) => void;
  onChangeListingTitle: (value: string) => void;
  onChangeListingDescription: (value: string) => void;
  onChangeListingPhone: (value: string) => void;
  onChangeListingWhatsapp: (value: string) => void;
  onChangeListingEmail: (value: string) => void;
  onInlineCatalogPick: (item: CatalogSearchItem) => void;
  onChangeCatalogSearch: (value: string) => void;
  onLoadCatalog: () => void;
  onCloseCatalogModal: () => void;
  onCatalogModalPick: (item: CatalogSearchItem) => void;
  onCloseItemModal: () => void;
  onChangeEditingItemCity: (value: string) => void;
  onChangeEditingItemUom: (value: string) => void;
  onChangeEditingItemQty: (value: string) => void;
  onChangeEditingItemPrice: (value: string) => void;
  onConfirmEditingItem: () => void;
  businessOnboardingOpen: boolean;
  businessStep: 1 | 2 | 3;
  savingCompany: boolean;
  companyForm: CompanyFormState;
  onCloseBusinessWizard: () => void;
  onPrevBusinessStep: () => void;
  onNextBusinessStep: () => void;
  onSubmitBusinessWizard: () => void;
  onChangeCompanyName: (value: string) => void;
  onChangeCompanyCity: (value: string) => void;
  onChangeCompanyLegalForm: (value: string) => void;
  onChangeCompanyAddress: (value: string) => void;
  onChangeCompanyIndustry: (value: string) => void;
  onChangeCompanyAboutShort: (value: string) => void;
  onChangeCompanyPhoneMain: (value: string) => void;
  onChangeCompanyPhoneWhatsapp: (value: string) => void;
  onChangeCompanyEmail: (value: string) => void;
  onChangeCompanySite: (value: string) => void;
  onChangeCompanyTelegram: (value: string) => void;
  onChangeCompanyWorkTime: (value: string) => void;
  onChangeCompanyContactPerson: (value: string) => void;
  onChangeCompanyAboutFull: (value: string) => void;
  onChangeCompanyServices: (value: string) => void;
  onChangeCompanyRegions: (value: string) => void;
  onChangeCompanyClientsTypes: (value: string) => void;
  onChangeCompanyInn: (value: string) => void;
  onChangeCompanyBin: (value: string) => void;
  onChangeCompanyRegNumber: (value: string) => void;
  onChangeCompanyBankDetails: (value: string) => void;
  onChangeCompanyLicensesInfo: (value: string) => void;
  editProfileOpen: boolean;
  avatarLetter: string;
  profileAvatarDraft: string | null;
  profileForm: ProfileFormState;
  savingProfile: boolean;
  onCloseEditProfile: () => void;
  onPickProfileAvatar: () => void;
  onSaveProfile: () => void;
  onChangeProfileName: (value: string) => void;
  onChangeProfilePhone: (value: string) => void;
  onChangeProfileCity: (value: string) => void;
  onChangeProfileBio: (value: string) => void;
  onChangeProfilePosition: (value: string) => void;
  onChangeProfileTelegram: (value: string) => void;
  onChangeProfileWhatsapp: (value: string) => void;
  inviteModalOpen: boolean;
  savingInvite: boolean;
  inviteRole: string;
  inviteName: string;
  invitePhone: string;
  inviteEmail: string;
  inviteComment: string;
  lastInviteCode: string | null;
  onCloseInviteModal: () => void;
  onChangeInviteRole: (value: string) => void;
  onChangeInviteName: (value: string) => void;
  onChangeInvitePhone: (value: string) => void;
  onChangeInviteEmail: (value: string) => void;
  onChangeInviteComment: (value: string) => void;
  onSubmitInvite: () => void;
  onInviteAnother: () => void;
  onCopyInviteCode: () => void;
  onShareInviteWhatsApp: () => void;
  onShareInviteTelegram: () => void;
  editCompanyOpen: boolean;
  companyTab: CompanyTab;
  onCloseEditCompany: () => void;
  onSaveCompany: () => void;
  onSelectCompanyTab: (tab: CompanyTab) => void;
};

export function ProfileModalStack({
  listingModalOpen,
  catalogModalOpen,
  itemModalOpen,
  listingForm,
  listingCartItems,
  editingItem,
  catalogSearch,
  catalogResults,
  savingListing,
  catalogLoading,
  onCloseListingModal,
  onPublishListing,
  onChangeListingKind,
  onChangeListingTitle,
  onChangeListingDescription,
  onChangeListingPhone,
  onChangeListingWhatsapp,
  onChangeListingEmail,
  onInlineCatalogPick,
  onChangeCatalogSearch,
  onLoadCatalog,
  onCloseCatalogModal,
  onCatalogModalPick,
  onCloseItemModal,
  onChangeEditingItemCity,
  onChangeEditingItemUom,
  onChangeEditingItemQty,
  onChangeEditingItemPrice,
  onConfirmEditingItem,
  businessOnboardingOpen,
  businessStep,
  savingCompany,
  companyForm,
  onCloseBusinessWizard,
  onPrevBusinessStep,
  onNextBusinessStep,
  onSubmitBusinessWizard,
  onChangeCompanyName,
  onChangeCompanyCity,
  onChangeCompanyLegalForm,
  onChangeCompanyAddress,
  onChangeCompanyIndustry,
  onChangeCompanyAboutShort,
  onChangeCompanyPhoneMain,
  onChangeCompanyPhoneWhatsapp,
  onChangeCompanyEmail,
  onChangeCompanySite,
  onChangeCompanyTelegram,
  onChangeCompanyWorkTime,
  onChangeCompanyContactPerson,
  onChangeCompanyAboutFull,
  onChangeCompanyServices,
  onChangeCompanyRegions,
  onChangeCompanyClientsTypes,
  onChangeCompanyInn,
  onChangeCompanyBin,
  onChangeCompanyRegNumber,
  onChangeCompanyBankDetails,
  onChangeCompanyLicensesInfo,
  editProfileOpen,
  avatarLetter,
  profileAvatarDraft,
  profileForm,
  savingProfile,
  onCloseEditProfile,
  onPickProfileAvatar,
  onSaveProfile,
  onChangeProfileName,
  onChangeProfilePhone,
  onChangeProfileCity,
  onChangeProfileBio,
  onChangeProfilePosition,
  onChangeProfileTelegram,
  onChangeProfileWhatsapp,
  inviteModalOpen,
  savingInvite,
  inviteRole,
  inviteName,
  invitePhone,
  inviteEmail,
  inviteComment,
  lastInviteCode,
  onCloseInviteModal,
  onChangeInviteRole,
  onChangeInviteName,
  onChangeInvitePhone,
  onChangeInviteEmail,
  onChangeInviteComment,
  onSubmitInvite,
  onInviteAnother,
  onCopyInviteCode,
  onShareInviteWhatsApp,
  onShareInviteTelegram,
  editCompanyOpen,
  companyTab,
  onCloseEditCompany,
  onSaveCompany,
  onSelectCompanyTab,
}: ProfileModalStackProps) {
  return (
    <>
      <ListingModal
        visible={listingModalOpen}
        catalogModalOpen={catalogModalOpen}
        itemModalOpen={itemModalOpen}
        listingForm={listingForm}
        listingCartItems={listingCartItems}
        editingItem={editingItem}
        catalogSearch={catalogSearch}
        catalogResults={catalogResults}
        savingListing={savingListing}
        catalogLoading={catalogLoading}
        onRequestClose={onCloseListingModal}
        onPublish={onPublishListing}
        onChangeListingKind={onChangeListingKind}
        onChangeListingTitle={onChangeListingTitle}
        onChangeListingDescription={onChangeListingDescription}
        onChangeListingPhone={onChangeListingPhone}
        onChangeListingWhatsapp={onChangeListingWhatsapp}
        onChangeListingEmail={onChangeListingEmail}
        onInlineCatalogPick={onInlineCatalogPick}
        onChangeCatalogSearch={onChangeCatalogSearch}
        onLoadCatalog={onLoadCatalog}
        onCatalogModalClose={onCloseCatalogModal}
        onCatalogModalPick={onCatalogModalPick}
        onItemModalClose={onCloseItemModal}
        onChangeEditingItemCity={onChangeEditingItemCity}
        onChangeEditingItemUom={onChangeEditingItemUom}
        onChangeEditingItemQty={onChangeEditingItemQty}
        onChangeEditingItemPrice={onChangeEditingItemPrice}
        onConfirmEditingItem={onConfirmEditingItem}
      />

      <BusinessWizardModal
        visible={businessOnboardingOpen}
        businessStep={businessStep}
        savingCompany={savingCompany}
        companyForm={companyForm}
        onRequestClose={onCloseBusinessWizard}
        onPrevOrClose={businessStep === 1 ? onCloseBusinessWizard : onPrevBusinessStep}
        onNextOrSubmit={businessStep < 3 ? onNextBusinessStep : onSubmitBusinessWizard}
        onChangeCompanyName={onChangeCompanyName}
        onChangeCompanyCity={onChangeCompanyCity}
        onChangeCompanyLegalForm={onChangeCompanyLegalForm}
        onChangeCompanyAddress={onChangeCompanyAddress}
        onChangeCompanyIndustry={onChangeCompanyIndustry}
        onChangeCompanyAboutShort={onChangeCompanyAboutShort}
        onChangeCompanyPhoneMain={onChangeCompanyPhoneMain}
        onChangeCompanyPhoneWhatsapp={onChangeCompanyPhoneWhatsapp}
        onChangeCompanyEmail={onChangeCompanyEmail}
        onChangeCompanySite={onChangeCompanySite}
        onChangeCompanyTelegram={onChangeCompanyTelegram}
        onChangeCompanyWorkTime={onChangeCompanyWorkTime}
        onChangeCompanyContactPerson={onChangeCompanyContactPerson}
        onChangeCompanyAboutFull={onChangeCompanyAboutFull}
        onChangeCompanyServices={onChangeCompanyServices}
        onChangeCompanyRegions={onChangeCompanyRegions}
        onChangeCompanyClientsTypes={onChangeCompanyClientsTypes}
        onChangeCompanyInn={onChangeCompanyInn}
        onChangeCompanyBin={onChangeCompanyBin}
        onChangeCompanyRegNumber={onChangeCompanyRegNumber}
        onChangeCompanyBankDetails={onChangeCompanyBankDetails}
        onChangeCompanyLicensesInfo={onChangeCompanyLicensesInfo}
      />

      <EditProfileModal
        visible={editProfileOpen}
        avatarLetter={avatarLetter}
        profileAvatarDraft={profileAvatarDraft}
        profileForm={profileForm}
        savingProfile={savingProfile}
        onRequestClose={onCloseEditProfile}
        onPickProfileAvatar={onPickProfileAvatar}
        onSave={onSaveProfile}
        onChangeProfileName={onChangeProfileName}
        onChangeProfilePhone={onChangeProfilePhone}
        onChangeProfileCity={onChangeProfileCity}
        onChangeProfileBio={onChangeProfileBio}
        onChangeProfilePosition={onChangeProfilePosition}
        onChangeProfileTelegram={onChangeProfileTelegram}
        onChangeProfileWhatsapp={onChangeProfileWhatsapp}
      />

      <InviteModal
        visible={inviteModalOpen}
        savingInvite={savingInvite}
        inviteRole={inviteRole}
        inviteName={inviteName}
        invitePhone={invitePhone}
        inviteEmail={inviteEmail}
        inviteComment={inviteComment}
        lastInviteCode={lastInviteCode}
        onRequestClose={onCloseInviteModal}
        onChangeInviteRole={onChangeInviteRole}
        onChangeInviteName={onChangeInviteName}
        onChangeInvitePhone={onChangeInvitePhone}
        onChangeInviteEmail={onChangeInviteEmail}
        onChangeInviteComment={onChangeInviteComment}
        onSubmitInvite={onSubmitInvite}
        onInviteAnother={onInviteAnother}
        onInviteDone={onCloseInviteModal}
        onCopyInviteCode={onCopyInviteCode}
        onShareInviteWhatsApp={onShareInviteWhatsApp}
        onShareInviteTelegram={onShareInviteTelegram}
      />

      <EditCompanyModal
        visible={editCompanyOpen}
        companyTab={companyTab}
        savingCompany={savingCompany}
        companyForm={companyForm}
        onRequestClose={onCloseEditCompany}
        onSave={onSaveCompany}
        onSelectCompanyTab={onSelectCompanyTab}
        onChangeCompanyName={onChangeCompanyName}
        onChangeCompanyCity={onChangeCompanyCity}
        onChangeCompanyLegalForm={onChangeCompanyLegalForm}
        onChangeCompanyAddress={onChangeCompanyAddress}
        onChangeCompanyIndustry={onChangeCompanyIndustry}
        onChangeCompanyAboutShort={onChangeCompanyAboutShort}
        onChangeCompanyPhoneMain={onChangeCompanyPhoneMain}
        onChangeCompanyPhoneWhatsapp={onChangeCompanyPhoneWhatsapp}
        onChangeCompanyEmail={onChangeCompanyEmail}
        onChangeCompanySite={onChangeCompanySite}
        onChangeCompanyTelegram={onChangeCompanyTelegram}
        onChangeCompanyWorkTime={onChangeCompanyWorkTime}
        onChangeCompanyContactPerson={onChangeCompanyContactPerson}
        onChangeCompanyAboutFull={onChangeCompanyAboutFull}
        onChangeCompanyServices={onChangeCompanyServices}
        onChangeCompanyRegions={onChangeCompanyRegions}
        onChangeCompanyClientsTypes={onChangeCompanyClientsTypes}
        onChangeCompanyInn={onChangeCompanyInn}
        onChangeCompanyBin={onChangeCompanyBin}
        onChangeCompanyRegNumber={onChangeCompanyRegNumber}
        onChangeCompanyBankDetails={onChangeCompanyBankDetails}
        onChangeCompanyLicensesInfo={onChangeCompanyLicensesInfo}
      />
    </>
  );
}

export default ProfileModalStack;
