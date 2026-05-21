/**
 * Clean Fix: Bozuk dosyaları sadece import satırını değiştirerek düzelt
 * 
 * Script'in bozduğu her dosyayı api-config → api-client import'una çeviriyoruz.
 * Ancak API_URL artık api-client'tan da export edildiği için,
 * mevcut `fetch(\`${API_URL}...` pattern'i çalışmaya devam eder.
 * 
 * Böylece mevcut kodun SYNTAX'ı bozulmaz, sadece token refresh devreye girer.
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

// Step 1: Find all files that import from api-client but still have broken syntax
// These need to be identified
const files = findFiles(SRC_DIR);
let fixCount = 0;

for (const f of files) {
    let content = fs.readFileSync(f, 'utf-8');
    const orig = content;
    
    // If file imports from api-client but NOT api-config, 
    // and still uses API_URL → the import is fine because we re-export API_URL
    // But the SYNTAX might be broken from script removing braces
    
    // We can't fix arbitrary syntax - but what we CAN do is detect if the file
    // has import { apiClient } from '@/lib/api-client' along with remaining API_URL usage
    // That's totally valid now since we re-export API_URL
    
    // The real issue: orphan braces were already removed or too many were removed
    // We need a different approach - count opening and closing braces
    
    const rel = path.relative(SRC_DIR, f);
    
    // Just count braces to identify files with mismatch
    let opens = 0, closes = 0;
    for (const ch of content) {
        if (ch === '{') opens++;
        if (ch === '}') closes++;
    }
    
    if (opens !== closes) {
        console.log(`⚠️  Brace mismatch (${opens} open, ${closes} close): ${rel}`);
    }
}
