const fs = require('fs');
const data = JSON.parse(fs.readFileSync('eslint_report.json', 'utf8'));
let out = '';
data.forEach(file => {
    if (file.errorCount > 0 && file.filePath.includes('CLG RESEARCH\\\\src')) {
        out += `\n--- ${file.filePath.split('CLG RESEARCH\\\\')[1]} ---\n`;
        file.messages.forEach(m => {
            let msg = m.message;
            if (msg.includes('Math.random')) msg = 'impure Math.random()';
            out += `Line ${m.line}: ${msg}\n`;
        });
    }
});
fs.writeFileSync('lint_summary.txt', out);
console.log('Summary created');
