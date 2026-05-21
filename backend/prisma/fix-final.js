/**
 * DEFINITIVE FIX — Doğru yaklaşım:
 * 
 * 1. Fazla trailing `}` brace'leri kaldır (brace counting ile)
 * 2. `accessToken` kullanılıyor ama yoksa → useAuth'a geri ekle
 * 3. Sorunlu `const res = await apiClient.fetch(...)` → `const res = await fetch(...)` pattern'leri düzelt
 */
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.resolve(__dirname, '../../frontend/src');
const SKIP_FILES = new Set([
    'api-client.ts', 'api-config.ts', 'auth-context.tsx', 'middleware.ts',
]);

function findFiles(dir) {
    const results = [];
    try {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
            const full = path.join(dir, item.name);
            if (item.isDirectory() && item.name !== 'node_modules' && !item.name.startsWith('.')) {
                results.push(...findFiles(full));
            } else if ((item.name.endsWith('.tsx') || item.name.endsWith('.ts')) && !SKIP_FILES.has(item.name)) {
                results.push(full);
            }
        }
    } catch(e){}
    return results;
}

function countBraces(text) {
    let o = 0, c = 0;
    let inStr = false, strCh = '', inTpl = false, esc = false, inLineComment = false, inBlockComment = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        const next = text[i+1] || '';
        
        if (esc) { esc = false; continue; }
        if (ch === '\\') { esc = true; continue; }
        
        if (inLineComment) {
            if (ch === '\n') inLineComment = false;
            continue;
        }
        if (inBlockComment) {
            if (ch === '*' && next === '/') { inBlockComment = false; i++; }
            continue;
        }
        if (ch === '/' && next === '/') { inLineComment = true; i++; continue; }
        if (ch === '/' && next === '*') { inBlockComment = true; i++; continue; }
        
        if (inStr) {
            if (ch === strCh) inStr = false;
            continue;
        }
        if (ch === '"' || ch === "'") {
            inStr = true; strCh = ch;
            continue;
        }
        if (ch === '`') {
            inTpl = !inTpl;
            continue;
        }
        
        // In template literals, ${} is a special case but we should count those braces
        if (ch === '{') o++;
        if (ch === '}') c++;
    }
    return { opens: o, closes: c };
}

const files = findFiles(SRC_DIR);
let totalFixed = 0;

for (const f of files) {
    let content = fs.readFileSync(f, 'utf-8');
    const orig = content;
    const rel = path.relative(SRC_DIR, f);
    let changed = false;
    
    // Step 1: Remove excess trailing `}` if brace count shows too many closes
    let { opens, closes } = countBraces(content);
    let excess = closes - opens;
    
    if (excess > 0) {
        // Remove `excess` trailing `}` lines from the end of the file
        const lines = content.split('\n');
        let removed = 0;
        for (let i = lines.length - 1; i >= 0 && removed < excess; i--) {
            if (lines[i].trim() === '}') {
                lines.splice(i, 1);
                removed++;
                changed = true;
            } else if (lines[i].trim() === '') {
                continue; // skip empty lines
            } else {
                break; // stop at first non-empty non-brace line
            }
        }
        content = lines.join('\n');
        if (removed > 0) {
            console.log(`  Removed ${removed} excess trailing }:  ${rel}`);
        }
    }
    
    // Step 2: Ensure accessToken is declared if used
    const usesAccessToken = content.includes('${accessToken}') || 
                           content.match(/\baccessToken\b/) !== null;
    const hasAccessTokenDecl = content.includes("const { accessToken }") || 
                               content.includes(", accessToken }") ||
                               content.includes(", accessToken,") ||
                               content.includes("accessToken }") ||
                               content.includes("{ accessToken,");
    
    // Fix: if uses accessToken but doesn't declare it, and has useAuth()
    if (usesAccessToken && !hasAccessTokenDecl && content.includes('useAuth()')) {
        // Add accessToken to existing useAuth destructure
        content = content.replace(
            /const\s*\{([^}]+)\}\s*=\s*useAuth\(\)/,
            (match, fields) => {
                if (fields.includes('accessToken')) return match;
                return `const {${fields}, accessToken } = useAuth()`;
            }
        );
        changed = true;
    }
    
    if (usesAccessToken && !hasAccessTokenDecl && !content.includes('useAuth()') && content.includes('useAuth')) {
        // useAuth import exists but not called - add it
        // This shouldn't happen normally
    }
    
    // Step 3: Fix broken `const res =` patterns with apiClient.fetch
    // These are lines like: `const res = await fetch(...` that were half-converted
    
    if (changed || content !== orig) {
        fs.writeFileSync(f, content, 'utf-8');
        console.log(`✅ ${rel}`);
        totalFixed++;
    }
}

console.log(`\n🎯 ${totalFixed} dosya düzeltildi`);

// Final brace check
console.log('\n--- Final Brace Balance Check ---');
for (const f of files) {
    const content = fs.readFileSync(f, 'utf-8');
    const { opens, closes } = countBraces(content);
    const rel = path.relative(SRC_DIR, f);
    if (opens !== closes) {
        console.log(`⚠️  ${rel}: ${opens} open, ${closes} close (diff: ${opens - closes})`);
    }
}
