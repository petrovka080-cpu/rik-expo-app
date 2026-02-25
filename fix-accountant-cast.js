const fs = require('fs');
const file = 'app/(tabs)/accountant.tsx';
let txt = fs.readFileSync(file, 'utf8');

txt = txt.replace(/const isHist = tab === "История";/g, 'const isHist = (tab as string) === "История";');
fs.writeFileSync(file, txt, 'utf8');
console.log('Fixed TS narrowing error in accountant.tsx');
