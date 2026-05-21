/**
 * COMPREHENSIVE RESTORE — Tüm dosyaları orijinal fetch() + accessToken pattern'ine geri döndür
 * 
 * Sorunları düzelt:
 * 1. `localStorage.getItem("accessToken")` → `accessToken` 
 * 2. `apiClient` import → `API_URL` import from api-config
 * 3. useAuth'a accessToken ekle
 * 4. Birleşen `});`, [xxx]); satırlarını ayır
 * 5. Eksik `}` kapanışlarını akıllıca ekle
 * 6. Fazla trailing `}` kaldır
 */
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.resolve(__dirname, '../../frontend/src');
const SKIP_FILES = new Set([
    'api-client.ts', 'api-config.ts', 'auth-context.tsx', 'middleware.ts',
]);
// Bu dosyalar elle düzeltildi, dokunma
const MANUAL_FIXED = new Set([
    path.join(SRC_DIR, 'app', 'dashboard', 'page.tsx'),
    path.join(SRC_DIR, 'components', 'dashboard', 'dashboard-charts.tsx'),
    path.join(SRC_DIR, 'components', 'dashboard', 'recent-activity.tsx'),
    path.join(SRC_DIR, 'app', 'analytics', 'page.tsx'),
    path.join(SRC_DIR, 'components', 'content', 'unit-dialog.tsx'), // az önce düzeltildi
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
                if (!MANUAL_FIXED.has(full)) {
                    results.push(full);
                }
            }
        }
    } catch(e){}
    return results;
}

function fix(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    const orig = content;
    const rel = path.relative(SRC_DIR, filePath);
    
    // ========================
    // STEP 1: Import 修正
    // ========================
    
    // `import { apiClient } from '@/lib/api-client'` → `import { API_URL } from '@/lib/api-config'`
    // But only if the file uses ${API_URL} or fetch()
    if (content.includes("from '@/lib/api-client'") && !content.includes('apiClient.get') && !content.includes('apiClient.post') && !content.includes('apiClient.delete') && !content.includes('apiClient.patch')) {
        content = content.replace(
            /import\s*\{[^}]*apiClient[^}]*\}\s*from\s*'@\/lib\/api-client';?/g,
            "import { API_URL } from '@/lib/api-config';"
        );
    }
    
    // If both apiClient and API_URL are imported from api-client
    if (content.includes("{ apiClient, API_URL }") && content.includes("from '@/lib/api-client'")) {
        // Keep apiClient if used
        if (!content.includes('apiClient.')) {
            content = content.replace(
                /import\s*\{\s*apiClient,\s*API_URL\s*\}\s*from\s*'@\/lib\/api-client';?/g,
                "import { API_URL } from '@/lib/api-config';"
            );
        }
    }
    
    // ========================
    // STEP 2: accessToken 修正
    // ========================
    
    // `localStorage.getItem("accessToken")` → `accessToken`
    content = content.replace(/localStorage\.getItem\("accessToken"\)/g, 'accessToken');
    content = content.replace(/localStorage\.getItem\('accessToken'\)/g, 'accessToken');
    
    // Ensure accessToken is declared in useAuth
    const usesAccessToken = /\baccessToken\b/.test(content);
    const hasUseAuth = content.includes('useAuth');
    
    if (usesAccessToken && hasUseAuth) {
        // Check if accessToken is in the destructure
        const useAuthMatch = content.match(/const\s*\{([^}]+)\}\s*=\s*useAuth\(\)/);
        if (useAuthMatch) {
            const fields = useAuthMatch[1];
            if (!fields.includes('accessToken')) {
                content = content.replace(
                    /const\s*\{([^}]+)\}\s*=\s*useAuth\(\)/,
                    (match, f) => `const { ${f.trim()}, accessToken } = useAuth()`
                );
            }
        }
        // If useAuth is imported but not called, add the call
        if (!content.includes('= useAuth()') && content.includes("from '@/context/auth-context'")) {
            // Find the start of the component function
            content = content.replace(
                /(export\s+(?:default\s+)?function\s+\w+[^{]*\{)\s*\n/,
                '$1\n    const { accessToken } = useAuth();\n'
            );
        }
    }
    
    // If accessToken is used but useAuth not even imported
    if (usesAccessToken && !hasUseAuth && !content.includes('accessToken =')) {
        // Add useAuth import if missing
        if (!content.includes("from '@/context/auth-context'")) {
            content = content.replace(
                /(import[^;]+from\s+'[^']+';?\s*\n)(?!import)/,
                "$1import { useAuth } from '@/context/auth-context';\n"
            );
        }
    }
    
    // ========================
    // STEP 3: Merged line 修正
    // ========================
    
    // Fix: `});    }, [xxx]);` on same line → split to two lines
    content = content.replace(/\}\);\s+(}, \[)/g, '});\n    $1');
    
    // Fix: `});    }` on same line
    content = content.replace(/\}\);\s+\}/g, '});\n        }');
    
    // ========================  
    // STEP 4: Indentation 修正
    // ========================
    
    // Fix lines that start with extra indentation from guard removal
    // Pattern: 8+ spaces before `const {` at component level
    content = content.replace(/^(\s{8,})(const \{ (?:toast|accessToken))/gm, '    $2');
    
    // ========================
    // STEP 5: Missing finally/catch closing brace
    // ========================
    
    // Pattern: `} finally {\n    setIsLoading(false);\n    };` → missing `}`
    content = content.replace(
        /(\s+setIsLoading\(false\);\s*\n)(\s*};)/g,
        '$1        }\n$2'
    );
    
    // ========================
    // STEP 6: Trailing excess braces
    // ========================
    const lines = content.split('\n');
    // Count proper braces (simplified)
    let openCount = 0, closeCount = 0;
    for (const ch of content) {
        if (ch === '{') openCount++;
        if (ch === '}') closeCount++;
    }
    
    // Remove trailing `}` if excess
    while (closeCount > openCount) {
        for (let i = lines.length - 1; i >= 0; i--) {
            if (lines[i].trim() === '}') {
                lines.splice(i, 1);
                closeCount--;
                break;
            } else if (lines[i].trim() === '') {
                continue;
            } else {
                break;
            }
        }
        if (closeCount <= openCount) break;
        break; // safety
    }
    
    content = lines.join('\n');
    
    if (content !== orig) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`✅ ${rel}`);
        return true;
    }
    return false;
}

const files = findFiles(SRC_DIR);
let count = 0;
for (const f of files) {
    if (fix(f)) count++;
}
console.log(`\n🎯 ${count} dosya düzeltildi`);

// Re-check
console.log('\n--- Kalan Brace Sorunları ---');
let issues = 0;
for (const f of findFiles(SRC_DIR)) {
    const content = fs.readFileSync(f, 'utf-8');
    let o=0, c=0;
    for (const ch of content) { if(ch==='{')o++; if(ch==='}')c++; }
    if (o !== c) {
        console.log(`⚠️  ${path.relative(SRC_DIR, f)}: open=${o} close=${c} diff=${o-c}`);
        issues++;
    }
}
if (issues === 0) console.log('✅ Tüm dosyalar temiz!');
