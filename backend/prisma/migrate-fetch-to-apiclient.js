/**
 * Toplu fetch() → apiClient göç script'i
 * 
 * Bu script tüm frontend dosyalarında:
 * 1. `import { API_URL } from '@/lib/api-config'` → `import { apiClient } from '@/lib/api-client'`
 * 2. `fetch(\`${API_URL}...` pattern'ini `apiClient.get/post/patch/delete(...)` ile değiştirir
 * 3. `accessToken` dependency'lerini kaldırır
 * 
 * NOT: auth-context.tsx ve api-client.ts hariç — onlar API_URL'ı doğrudan kullanıyor.
 */

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.resolve(__dirname, '../../frontend/src');

// Bu dosyalar hariç tutulacak (API_URL'ı doğrudan kullananlar)
const EXCLUDE_FILES = [
    'auth-context.tsx',
    'api-client.ts',
    'api-config.ts',
];

function findTsxFiles(dir) {
    const results = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
            results.push(...findTsxFiles(fullPath));
        } else if ((item.name.endsWith('.tsx') || item.name.endsWith('.ts')) && !EXCLUDE_FILES.includes(item.name)) {
            results.push(fullPath);
        }
    }
    return results;
}

function migrateFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    const originalContent = content;
    const changes = [];

    // 1) API_URL import → apiClient import (sadece api-config import eden dosyalarda)
    if (content.includes("from '@/lib/api-config'")) {
        // Eğer zaten apiClient import ediyorsa, sadece api-config satırını kaldır
        if (content.includes("from '@/lib/api-client'")) {
            content = content.replace(/import\s*\{[^}]*API_URL[^}]*\}\s*from\s*'@\/lib\/api-config';\s*\n?/g, '');
        } else {
            content = content.replace(
                /import\s*\{\s*API_URL\s*\}\s*from\s*'@\/lib\/api-config'/g,
                "import { apiClient } from '@/lib/api-client'"
            );
        }
        changes.push('import replaced');
    }

    // 2) Basit GET fetch pattern:
    //    const res = await fetch(`${API_URL}/path`, { headers: { Authorization: ... } });
    //    if (res.ok) { const data = await res.json(); ... }
    // → const data = await apiClient.get('/path');
    
    // Bu çok karmaşık regex olacağı için, en yaygın pattern'leri hedefleyelim:
    
    // Pattern: fetch(`${API_URL}/xxx`, { headers: { Authorization: `Bearer ${accessToken}` } })
    // → apiClient.fetch('/xxx')  (basit dönüşüm)
    content = content.replace(
        /fetch\(`\$\{API_URL\}(\/[^`]+)`\s*,\s*\{\s*headers\s*:\s*\{\s*Authorization\s*:\s*`Bearer \$\{accessToken\}`\s*\}\s*\}\s*\)/g,
        "apiClient.fetch('$1')"
    );
    
    // Pattern: fetch(`${API_URL}/xxx`, { method: 'POST', headers: {...}, body: JSON.stringify(yyy) })
    content = content.replace(
        /fetch\(`\$\{API_URL\}(\/[^`]+)`\s*,\s*\{\s*method\s*:\s*'POST'\s*,\s*headers\s*:\s*\{\s*'Content-Type'\s*:\s*'application\/json'\s*,\s*Authorization\s*:\s*`Bearer \$\{accessToken\}`\s*\}\s*,\s*body\s*:\s*JSON\.stringify\(([^)]+)\)\s*\}\s*\)/g,
        "apiClient.fetch('$1', { method: 'POST', body: JSON.stringify($2) })"
    );

    // Pattern: fetch(`${API_URL}/xxx`, { method: 'PATCH', ... })
    content = content.replace(
        /fetch\(`\$\{API_URL\}(\/[^`]+)`\s*,\s*\{\s*method\s*:\s*'PATCH'\s*,\s*headers\s*:\s*\{\s*'Content-Type'\s*:\s*'application\/json'\s*,\s*Authorization\s*:\s*`Bearer \$\{accessToken\}`\s*\}\s*,\s*body\s*:\s*JSON\.stringify\(([^)]+)\)\s*\}\s*\)/g,
        "apiClient.fetch('$1', { method: 'PATCH', body: JSON.stringify($2) })"
    );

    // Pattern: fetch(`${API_URL}/xxx`, { method: 'DELETE', headers: ... })
    content = content.replace(
        /fetch\(`\$\{API_URL\}(\/[^`]+)`\s*,\s*\{\s*method\s*:\s*'DELETE'\s*,\s*headers\s*:\s*\{\s*Authorization\s*:\s*`Bearer \$\{accessToken\}`\s*\}\s*\}\s*\)/g,
        "apiClient.fetch('$1', { method: 'DELETE' })"
    );

    // Catch remaining: fetch(`${API_URL}/xxx`) without options
    content = content.replace(
        /fetch\(`\$\{API_URL\}(\/[^`]+)`\)/g,
        "apiClient.fetch('$1')"
    );

    // 3) useAuth'dan accessToken kaldır (sadece başka destructure yoksa)
    // { accessToken } → kaldır veya simplify
    content = content.replace(
        /const\s*\{\s*accessToken\s*\}\s*=\s*useAuth\(\);\s*\n/g,
        ''
    );
    
    // accessToken ile birlikte başka field varsa, sadece accessToken'ı kaldır
    content = content.replace(/accessToken\s*,\s*/g, (match, offset) => {
        // Sadece useAuth destructure'ında kaldır
        const before = content.substring(Math.max(0, offset - 100), offset);
        if (before.includes('useAuth')) return '';
        return match;
    });
    content = content.replace(/,\s*accessToken/g, (match, offset) => {
        const before = content.substring(Math.max(0, offset - 100), offset);
        if (before.includes('useAuth')) return '';
        return match;
    });

    // 4) useEffect dependency'lerinden accessToken kaldır
    content = content.replace(/\[accessToken\]/g, '[]');
    content = content.replace(/\[accessToken,\s*/g, '[');
    content = content.replace(/,\s*accessToken\]/g, ']');
    content = content.replace(/,\s*accessToken,/g, ',');

    // 5) if (accessToken) guard'larını kaldır
    content = content.replace(/if\s*\(accessToken\)\s*\{\s*\n(\s+)/g, '$1');
    // Kapanan brace'ler otomatik kaldırılamaz, manual fix gerekebilir

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf-8');
        const relativePath = path.relative(SRC_DIR, filePath);
        console.log(`✅ ${relativePath}`);
        return true;
    }

    return false;
}

// Main
const files = findTsxFiles(SRC_DIR);
let modified = 0;

for (const file of files) {
    if (migrateFile(file)) modified++;
}

console.log(`\n🎯 ${modified}/${files.length} dosya güncellendi`);
