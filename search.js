const fs = require('fs');
const filePath = 'C:/Users/Rüstem/.gemini/antigravity/scratch/kurumsal-e-ticaret/src/app/admin/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/\r\n/g, '\n');
const lines = content.split('\n');

lines.forEach((line, idx) => {
    if (line.includes("modalFooter")) {
        console.log(`LINE ${idx + 1}: ${line}`);
    }
});
