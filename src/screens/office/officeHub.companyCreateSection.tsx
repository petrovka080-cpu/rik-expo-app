import React from "react";
import {
  Pressable,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
} from "react-native";

import type { CreateCompanyDraft } from "./officeAccess.types";
import { COMPANY_FIELDS, COPY, RULES } from "./officeHub.constants";
import { styles } from "./officeHub.styles";

type OfficeCompanyCreateSectionProps = {
  companyDraft: CreateCompanyDraft;
  savingCompany: boolean;
  onChangeCompanyDraft: React.Dispatch<React.SetStateAction<CreateCompanyDraft>>;
  onCreateCompany: () => void;
  onCompanyCreateLayout: (event: LayoutChangeEvent) => void;
  onRulesLayout: (event: LayoutChangeEvent) => void;
};

function getCompanyFieldTestId(fieldKey: keyof CreateCompanyDraft) {
  switch (fieldKey) {
    case "name":
      return "office-company-name";
    case "legalAddress":
      return "office-company-legal-address";
    case "inn":
      return "office-company-inn";
    default:
      return undefined;
  }
}

function getCompanyFieldKeyboardType(fieldKey: keyof CreateCompanyDraft) {
  if (fieldKey === "phoneMain") return "phone-pad";
  if (fieldKey === "email") return "email-address";
  return "default";
}

function getCompanyFieldAutoCapitalize(fieldKey: keyof CreateCompanyDraft) {
  return fieldKey === "email" || fieldKey === "website" ? "none" : "sentences";
}

export function OfficeCompanyCreateSection({
  companyDraft,
  savingCompany,
  onChangeCompanyDraft,
  onCreateCompany,
  onCompanyCreateLayout,
  onRulesLayout,
}: OfficeCompanyCreateSectionProps) {
  return (
    <>
      <View style={styles.section} onLayout={onCompanyCreateLayout}>
        <Text style={styles.sectionTitle}>{COPY.companyCreateTitle}</Text>
        <View style={styles.panel}>
          <Text style={styles.helper}>{COPY.companyCreateLead}</Text>
          {COMPANY_FIELDS.map((field) => (
            <View key={field.key} style={styles.stack}>
              <Text style={styles.label}>{field.label}</Text>
              <TextInput
                testID={getCompanyFieldTestId(field.key)}
                placeholder={field.placeholder}
                placeholderTextColor="#94A3B8"
                style={[
                  styles.input,
                  field.key === "siteAddress" && styles.textArea,
                ]}
                autoCapitalize={getCompanyFieldAutoCapitalize(field.key)}
                keyboardType={getCompanyFieldKeyboardType(field.key)}
                multiline={field.key === "siteAddress"}
                value={companyDraft[field.key]}
                onChangeText={(value) =>
                  onChangeCompanyDraft((current) => ({
                    ...current,
                    [field.key]: value,
                  }))
                }
              />
            </View>
          ))}
          <View style={styles.stack}>
            <View style={styles.inline}>
              <Text style={styles.label}>Р”РѕРїРѕР»РЅРёС‚РµР»СЊРЅС‹Рµ С‚РµР»РµС„РѕРЅС‹</Text>
              <Pressable
                testID="office-add-company-phone"
                onPress={() =>
                  onChangeCompanyDraft((current) => ({
                    ...current,
                    additionalPhones: [...current.additionalPhones, ""],
                  }))
                }
              >
                <Text style={styles.link}>Р”РѕР±Р°РІРёС‚СЊ С‚РµР»РµС„РѕРЅ</Text>
              </Pressable>
            </View>
            {companyDraft.additionalPhones.map((phone, index) => (
              <View key={`phone-${index}`} style={styles.phoneRow}>
                <TextInput
                  testID={`office-company-phone-${index}`}
                  placeholder="Р”РѕРїРѕР»РЅРёС‚РµР»СЊРЅС‹Р№ С‚РµР»РµС„РѕРЅ"
                  placeholderTextColor="#94A3B8"
                  style={[styles.input, styles.phoneInput]}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={(value) =>
                    onChangeCompanyDraft((current) => ({
                      ...current,
                      additionalPhones: current.additionalPhones.map(
                        (item, itemIndex) =>
                          itemIndex === index ? value : item,
                      ),
                    }))
                  }
                />
                <Pressable
                  onPress={() =>
                    onChangeCompanyDraft((current) => ({
                      ...current,
                      additionalPhones: current.additionalPhones.filter(
                        (_item, itemIndex) => itemIndex !== index,
                      ),
                    }))
                  }
                >
                  <Text style={styles.linkDanger}>РЈР±СЂР°С‚СЊ</Text>
                </Pressable>
              </View>
            ))}
          </View>
          <Pressable
            testID="office-create-company"
            disabled={savingCompany}
            onPress={onCreateCompany}
            style={[styles.primary, savingCompany && styles.dim]}
          >
            <Text style={styles.primaryText}>{COPY.companyCta}</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section} onLayout={onRulesLayout}>
        <Text style={styles.sectionTitle}>{COPY.rulesTitle}</Text>
        <View style={styles.panel}>
          {RULES.map((rule) => (
            <Text key={rule} style={styles.rule}>
              вЂў {rule}
            </Text>
          ))}
        </View>
      </View>
    </>
  );
}
