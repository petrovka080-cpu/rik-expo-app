const fs = require('fs');
const file = 'app/(tabs)/foreman.tsx';
let txt = fs.readFileSync(file, 'utf8');

// Fix 1: CloseIconButton around line 2314
txt = txt.replace(/<CloseIconButton\s+onPress=\{\(\) => setDraftOpen\(false\)\}\s+accessibilityLabel="[^"]+"\s+size=\{46\}\s+iconSize=\{22\}\s+iconColor=\{UI\.text\}\s+spinnerColor=\{UI\.text\}\s*\/>/,
    `<CloseIconButton
                onPress={() => setDraftOpen(false)}
                accessibilityLabel="Свернуть"
                size={24}
                color={UI.text}
              />`);

// Fix 2: CloseIconButton for cancel item which got IconSquareButton props
txt = txt.replace(/size=\{44\}\s+radius=\{12\}\s+iconSize=\{22\}\s+bg=\{UI\.btnReject\}\s+bgPressed="#b91c1c"\s+bgDisabled="#7f1d1d"\s+iconColor="#FFFFFF"\s+spinnerColor="#FFFFFF"/g,
    `size={24} color={UI.btnReject}`);

fs.writeFileSync(file, txt, 'utf8');
console.log('Fixed props in foreman.tsx');
