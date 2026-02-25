const fs = require('fs');
const file = 'app/(tabs)/foreman.tsx';
let txt = fs.readFileSync(file, 'utf8');

// Replace any garbage characters between the closing quote and 'size='
const regex = /accessibilityLabel="Удалить позицию"[^s]+size/g;
txt = txt.replace(regex, 'accessibilityLabel="Удалить позицию"\n              size');

fs.writeFileSync(file, txt, 'utf8');
console.log("Fixed syntax error in foreman.tsx");
