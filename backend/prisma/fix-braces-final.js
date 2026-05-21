/**
 * REVERT + REIMPORT: Bozuk dosyaları temizle, sadece import satırını değiştir
 * 
 * Strateji:
 * 1. Her bozuk dosyada, eksik '}' sayısını bul
 * 2. Her `}` eksikliği = bir `if (accessToken) {` bloğu guard'ının kapayan brace'i silinmiş
 * 3. Bu brace'leri useEffect'lerin sonuna ekle
 * 4. Kalan apiClient.fetch pattern'lerini geri al → eski fetch pattern'ine
 */
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.resolve(__dirname, '../../frontend/src');
const SKIP = ['api-client.ts', 'api-config.ts', 'auth-context.tsx', 'middleware.ts'];

function findFiles(dir) {
    const results = [];
    try {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
            const fullPath = path.join(dir, item.name);
            if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
                results.push(...findFiles(fullPath));
            } else if ((item.name.endsWith('.tsx') || item.name.endsWith('.ts')) && !SKIP.includes(item.name)) {
                results.push(fullPath);
            }
        }
    } catch (e) {}
    return results;
}

function countBraces(content) {
    let opens = 0, closes = 0;
    // Skip braces inside strings and template literals
    let inString = false;
    let stringChar = '';
    let inTemplate = false;
    let escaped = false;
    
    for (let i = 0; i < content.length; i++) {
        const ch = content[i];
        
        if (escaped) { escaped = false; continue; }
        if (ch === '\\') { escaped = true; continue; }
        
        if (inString) {
            if (ch === stringChar) inString = false;
            continue;
        }
        
        if (ch === '"' || ch === "'") {
            inString = true;
            stringChar = ch;
            continue;
        }
        
        if (ch === '`') {
            inTemplate = !inTemplate;
            continue;
        }
        
        if (!inTemplate) {
            if (ch === '{') opens++;
            if (ch === '}') closes++;
        }
    }
    
    return { opens, closes, diff: opens - closes };
}

const files = findFiles(SRC_DIR);
let fixCount = 0;

for (const f of files) {
    let content = fs.readFileSync(f, 'utf-8');
    const rel = path.relative(SRC_DIR, f);
    const { opens, closes, diff } = countBraces(content);
    
    if (diff > 0) {
        // Missing closing braces - add them at the end
        const lines = content.split('\n');
        // Remove trailing empty lines
        while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
            lines.pop();
        }
        
        // Add missing closing braces
        for (let i = 0; i < diff; i++) {
            lines.push('}');
        }
        lines.push(''); // trailing newline
        
        content = lines.join('\n');
        fs.writeFileSync(f, content, 'utf-8');
        console.log(`✅ Added ${diff} closing braces: ${rel}`);
        fixCount++;
    } else if (diff < 0) {
        console.log(`⚠️  Extra ${-diff} closing braces: ${rel}`);
    }
}

console.log(`\n🎯 ${fixCount} dosya düzeltildi`);
