import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { profileStyles } from "../profile.styles";
import type { CompanyFormState } from "../profile.types";
import { LabeledInput } from "./ProfilePrimitives";

const styles = profileStyles;

type BusinessWizardModalProps = {
  visible: boolean;
  businessStep: 1 | 2 | 3;
  savingCompany: boolean;
  companyForm: CompanyFormState;
  onRequestClose: () => void;
  onPrevOrClose: () => void;
  onNextOrSubmit: () => void;
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
};

export function BusinessWizardModal({
  visible,
  businessStep,
  savingCompany,
  companyForm,
  onRequestClose,
  onPrevOrClose,
  onNextOrSubmit,
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
}: BusinessWizardModalProps) {
  const progressWidth =
    businessStep === 1 ? "33%" : businessStep === 2 ? "66%" : "100%";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
    >
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalCard, styles.modalTallCard]}>
          <Text style={styles.modalTitle}>Регистрация компании</Text>
          <Text style={styles.modalSub}>
            Шаг {businessStep} из 3 · создаём кабинет компании для работы в GOX.
          </Text>

          <View style={styles.wizardProgressOuter}>
            <View
              style={[
                styles.wizardProgressInner,
                {
                  width: progressWidth,
                },
              ]}
            />
          </View>

          <ScrollView
            style={styles.wizardScroll}
            contentContainerStyle={styles.modalScrollContent}
          >
            {businessStep === 1 && (
              <>
                <Text style={styles.wizardStepTitle}>Основное</Text>
                <Text style={styles.wizardStepHint}>
                  Как вас будут видеть клиенты и партнёры в GOX.
                </Text>

                <LabeledInput
                  label="Название компании"
                  value={companyForm.companyNameInput}
                  onChangeText={onChangeCompanyName}
                  placeholder="Название компании"
                />
                <View style={styles.modalFieldRow}>
                  <View style={styles.modalFieldCell}>
                    <LabeledInput
                      label="Орг. форма"
                      value={companyForm.companyLegalFormInput}
                      onChangeText={onChangeCompanyLegalForm}
                      placeholder="ОсОО, ИП…"
                    />
                  </View>
                  <View style={styles.modalFieldCell}>
                    <LabeledInput
                      label="Город"
                      value={companyForm.companyCityInput}
                      onChangeText={onChangeCompanyCity}
                      placeholder="Бишкек"
                    />
                  </View>
                </View>
                <LabeledInput
                  label="Адрес"
                  value={companyForm.companyAddressInput}
                  onChangeText={onChangeCompanyAddress}
                  placeholder="Улица, дом, офис"
                />
                <LabeledInput
                  label="Вид деятельности"
                  value={companyForm.companyIndustryInput}
                  onChangeText={onChangeCompanyIndustry}
                  placeholder="Строительство, ремонт, материалы…"
                />
                <LabeledInput
                  label="Короткое описание"
                  value={companyForm.companyAboutShortInput}
                  onChangeText={onChangeCompanyAboutShort}
                  placeholder="1–2 предложения о компании"
                  multiline
                  big
                />
              </>
            )}

            {businessStep === 2 && (
              <>
                <Text style={styles.wizardStepTitle}>Контакты</Text>
                <Text style={styles.wizardStepHint}>
                  Эти данные увидят клиенты и сотрудники для связи.
                </Text>

                <LabeledInput
                  label="Основной телефон"
                  value={companyForm.companyPhoneMainInput}
                  onChangeText={onChangeCompanyPhoneMain}
                  placeholder="+996…"
                  keyboardType="phone-pad"
                />
                <LabeledInput
                  label="Телефон WhatsApp"
                  value={companyForm.companyPhoneWhatsAppInput}
                  onChangeText={onChangeCompanyPhoneWhatsapp}
                  placeholder="+996…"
                  keyboardType="phone-pad"
                />
                <LabeledInput
                  label="Email"
                  value={companyForm.companyEmailInput}
                  onChangeText={onChangeCompanyEmail}
                  placeholder="info@company.kg"
                  keyboardType="email-address"
                />
                <LabeledInput
                  label="Сайт"
                  value={companyForm.companySiteInput}
                  onChangeText={onChangeCompanySite}
                  placeholder="https://company.kg"
                />
                <LabeledInput
                  label="Telegram"
                  value={companyForm.companyTelegramInput}
                  onChangeText={onChangeCompanyTelegram}
                  placeholder="@company"
                />
                <LabeledInput
                  label="График работы"
                  value={companyForm.companyWorkTimeInput}
                  onChangeText={onChangeCompanyWorkTime}
                  placeholder="Пн–Сб 9:00–18:00"
                />
                <LabeledInput
                  label="Контактное лицо"
                  value={companyForm.companyContactPersonInput}
                  onChangeText={onChangeCompanyContactPerson}
                  placeholder="ФИО"
                />
              </>
            )}

            {businessStep === 3 && (
              <>
                <Text style={styles.wizardStepTitle}>Описание и документы</Text>
                <Text style={styles.wizardStepHint}>
                  Финальный шаг: что вы делаете и какие реквизиты указать.
                </Text>

                <LabeledInput
                  label="Полное описание"
                  value={companyForm.companyAboutFullInput}
                  onChangeText={onChangeCompanyAboutFull}
                  placeholder="Опишите опыт, проекты, специализацию…"
                  multiline
                  big
                />
                <LabeledInput
                  label="Услуги / направления"
                  value={companyForm.companyServicesInput}
                  onChangeText={onChangeCompanyServices}
                  placeholder="Монолит, кровля, отделка…"
                  multiline
                  big
                />
                <LabeledInput
                  label="Регионы работы"
                  value={companyForm.companyRegionsInput}
                  onChangeText={onChangeCompanyRegions}
                  placeholder="Бишкек, Чуйская область…"
                />
                <LabeledInput
                  label="Типы клиентов"
                  value={companyForm.companyClientsTypesInput}
                  onChangeText={onChangeCompanyClientsTypes}
                  placeholder="Частные, B2B, госзаказы…"
                />
                <LabeledInput
                  label="ИНН"
                  value={companyForm.companyInnInput}
                  onChangeText={onChangeCompanyInn}
                  placeholder="ИНН компании"
                />
                <LabeledInput
                  label="БИН / рег. номер"
                  value={companyForm.companyBinInput}
                  onChangeText={onChangeCompanyBin}
                  placeholder="БИН / регистрационный номер"
                />
                <LabeledInput
                  label="Свидетельство / рег. данные"
                  value={companyForm.companyRegNumberInput}
                  onChangeText={onChangeCompanyRegNumber}
                  placeholder="Номер и дата регистрации"
                />
                <LabeledInput
                  label="Банковские реквизиты"
                  value={companyForm.companyBankDetailsInput}
                  onChangeText={onChangeCompanyBankDetails}
                  placeholder="Банк, счёт, БИК"
                  multiline
                  big
                />
                <LabeledInput
                  label="Лицензии и допуски"
                  value={companyForm.companyLicensesInfoInput}
                  onChangeText={onChangeCompanyLicensesInfo}
                  placeholder="Гос. лицензии, СРО и т.п."
                  multiline
                  big
                />
              </>
            )}
          </ScrollView>

          <View style={styles.modalButtonsRow}>
            <Pressable
              testID="profile-business-modal-back"
              style={[styles.modalBtn, styles.modalBtnSecondary]}
              onPress={onPrevOrClose}
              disabled={savingCompany}
            >
              <Text style={styles.modalBtnSecondaryText}>
                {businessStep === 1 ? "Отмена" : "Назад"}
              </Text>
            </Pressable>
            <Pressable
              testID="profile-business-modal-next"
              style={[styles.modalBtn, styles.modalBtnPrimary]}
              onPress={onNextOrSubmit}
              disabled={savingCompany}
            >
              {savingCompany ? (
                <ActivityIndicator color="#0B1120" />
              ) : (
                <Text style={styles.modalBtnPrimaryText}>
                  {businessStep < 3 ? "Далее" : "Создать компанию"}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default BusinessWizardModal;
