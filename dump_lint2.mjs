import fs from 'fs';
const data = JSON.parse(fs.readFileSync('eslint_report2.json', 'utf8'));
let out = '';
data.forEach(file => {
    if (file.errorCount > 0) {
        out += `\n--- ${file.filePath.split('CLG RESEARCH')[1]} ---\n`;
        file.messages.forEach(m => {
            out += `Line ${m.line}: ${m.message}\n`;
        });
    }
});
fs.writeFileSync('lint_summary2.txt', out);
console.log('Summary 2 created');
