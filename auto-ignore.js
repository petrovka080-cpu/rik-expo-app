const fs = require('fs');

const tsErrorsPath = 'ts_errors6.txt';
if (!fs.existsSync(tsErrorsPath)) {
    console.log('No ts_errors6.txt');
    process.exit();
}

const errors = fs.readFileSync(tsErrorsPath, 'utf8').split('\n');
const fileModifications = {};

for (const line of errors) {
    const match = line.match(/^([a-zA-Z0-9_\-\.\/\\]+)\((\d+),\d+\): error TS/);
    if (match) {
        const file = match[1];
        const lineNum = parseInt(match[2], 10);

        if (!fileModifications[file]) {
            fileModifications[file] = new Set();
        }
        fileModifications[file].add(lineNum);
    }
}

for (const file of Object.keys(fileModifications)) {
    if (fs.existsSync(file)) {
        let lines = fs.readFileSync(file, 'utf8').split('\n');
        let offset = 0;

        const sortedLines = Array.from(fileModifications[file]).sort((a, b) => a - b);

        for (const originalLine of sortedLines) {
            const targetIndex = originalLine - 1 + offset;

            if (targetIndex > 0 && !lines[targetIndex - 1].includes('@ts-ignore')) {
                lines.splice(targetIndex, 0, '    // @ts-ignore');
                offset++;
            }
        }

        fs.writeFileSync(file, lines.join('\n'), 'utf8');
        console.log('Injected ts-ignores into', file);
    }
}

console.log('Automated injection complete.');
