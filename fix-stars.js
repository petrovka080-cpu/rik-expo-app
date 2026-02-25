const fs = require('fs');
const path = require('path');

const file = path.join('c:', 'dev', 'rik-expo-app', 'app', '(tabs)', 'foreman.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    `function Dropdown({
  label,
  options,
  value,
  onChange,
  placeholder = 'Выбрать...',
  searchable = true,
  width = 280,
}: {
  label: string;
  options: { code: string; name: string }[];
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  searchable?: boolean;
  width?: number;
}) {`,
    `function Dropdown({
  label,
  options,
  value,
  onChange,
  placeholder = 'Выбрать...',
  searchable = true,
  width = 280,
  required = false,
}: {
  label: string;
  options: { code: string; name: string }[];
  value: string;
  onChange: (code: string) => void;
  placeholder?: string;
  searchable?: boolean;
  width?: number;
  required?: boolean;
}) {`);

content = content.replace(
    `    <View style={{ marginTop: 6, marginBottom: 8 }}>
      <Text style={s.small}>{label}</Text>`,
    `    <View style={{ marginTop: 6, marginBottom: 8 }}>
      <Text style={s.small}>
        {label}
        {required && <Text style={{ color: 'red' }}> *</Text>}
      </Text>`);

content = content.replace(
    `          <Text style={s.small}>
            ФИО прораба (обязательно):
          </Text>`,
    `          <Text style={s.small}>
            ФИО прораба<Text style={{ color: 'red' }}> *</Text>
          </Text>`);

content = content.replace(
    `            <Dropdown
              label="Объект строительства (обязательно)"`,
    `            <Dropdown
              label="Объект строительства"
              required={true}`);

content = content.replace(
    `            <Dropdown
              label="Этаж / уровень (обязательно)"`,
    `            <Dropdown
              label="Этаж / уровень"
              required={true}`);

content = content.replace(
    `            <Dropdown
              label="Система / вид работ (опционально)"`,
    `            <Dropdown
              label="Система / вид работ"`);

content = content.replace(
    `            <Dropdown
              label="Зона / участок (опционально)"`,
    `            <Dropdown
              label="Зона / участок"`);

fs.writeFileSync(file, content, 'utf8');
console.log('done replacing foreman');
