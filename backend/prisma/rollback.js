/**
 * ROLLBACK: apiClient.fetch → fetch geri al, import'u koru
 * 
 * Sorun: Script'in apiClient.fetch() dönüşümü syntax bozdu.
 * Çözüm: apiClient.fetch → orijinal fetch pattern'ine geri dön,
 *         ama import'u api-client'tan tut (API_URL re-export).
 * 
 * ÖNEMLİ: Bu sadece apiClient.fetch() kullanan yerleri geri alır.
 * apiClient.get/post/delete doğrudan kullanan yerler (dashboard, questions) 
 * bozulmamıştır, onlara dokunmuyoruz.
 */
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.resolve(__dirname, '../../frontend/src');
const SKIP = ['api-client.ts', 'api-config.ts', 'auth-context.tsx', 'middleware.ts', 
              'dashboard/page.tsx', // dashboard dosyalarına dokunma — elle düzeltildi
              'dashboard-charts.tsx', 'recent-activity.tsx'];

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

const files = findFiles(SRC_DIR);
let fixCount = 0;

for (const f of files) {
    let content = fs.readFileSync(f, 'utf-8');
    const orig = content;
    const rel = path.relative(SRC_DIR, f);
    
    // 1) Revert apiClient.fetch('/path') → fetch(\`\${API_URL}/path\`, { headers: { Authorization: \`Bearer \${accessToken}\` } })
    content = content.replace(
        /apiClient\.fetch\('([^']+)'\)/g,
        'fetch(`${API_URL}$1`, { headers: { Authorization: `Bearer ${accessToken}` } })'
    );
    
    // 2) Revert apiClient.fetch('/path', { method: 'XXX', body: ... })
    content = content.replace(
        /apiClient\.fetch\('([^']+)',\s*\{\s*method:\s*'(POST|PATCH|PUT|DELETE)'\s*\}\s*\)/g,
        'fetch(`${API_URL}$1`, { method: \'$2\', headers: { Authorization: `Bearer ${accessToken}` } })'
    );
    
    content = content.replace(
        /apiClient\.fetch\('([^']+)',\s*\{\s*method:\s*'(POST|PATCH|PUT|DELETE)',\s*body:\s*(JSON\.stringify\([^)]+\)|[^}]+)\s*\}\s*\)/g,
        'fetch(`${API_URL}$1`, { method: \'$2\', headers: { \'Content-Type\': \'application/json\', Authorization: `Bearer ${accessToken}` }, body: $3 })'
    );
    
    // 3) Add accessToken back to useAuth() if it's missing but used
    if (content.includes('${accessToken}') && !content.includes('accessToken')) {
        // accessToken is referenced but not declared — need to restore it
        // Find useAuth destructure and add accessToken
        content = content.replace(
            /const\s*\{\s*(user[^}]*)\}\s*=\s*useAuth\(\)/g,
            'const { $1, accessToken } = useAuth()'
        );
        // If no useAuth at all, add it
        if (!content.includes('useAuth()') && !content.includes('accessToken')) {
            // Add at the top of the component
            content = content.replace(
                /(export\s+(?:default\s+)?function\s+\w+[^{]*\{)\s*\n/,
                '$1\n    const { accessToken } = useAuth();\n'
            );
        }
    }
    
    // 4) If API_URL import was changed to apiClient, ensure both are imported
    if (content.includes("from '@/lib/api-client'") && content.includes('${API_URL}')) {
        // Make sure API_URL is in the import
        if (!content.includes('API_URL')) {
            content = content.replace(
                /import\s*\{\s*apiClient\s*\}\s*from\s*'@\/lib\/api-client'/,
                "import { apiClient, API_URL } from '@/lib/api-client'"
            );
        }
    }
    
    // 5) Remove the closing braces added at the END of file by fix-braces-final
    // These are incorrect — just remove trailing }  lines at end of file
    const lines = content.split('\n');
    while (lines.length > 1) {
        const lastLine = lines[lines.length - 1].trim();
        const secondLastLine = lines[lines.length - 2].trim();
        // Check if last line is just a `}` and the one before export default or end of file
        if (lastLine === '' && secondLastLine === '}') {
            // Check if there's another `}` on the line before that — might be too many
            // Don't remove if it's a legit function end
            break;
        }
        if (lastLine === '}' && lines.length > 2 && lines[lines.length - 2].trim() === '}') {
            // Multiple trailing } — might be extras
            // Only remove if brace count shows excess
            let opens = 0, closes = 0;
            for (const ch of content) {
                if (ch === '{') opens++;
                if (ch === '}') closes++;
            }
            if (closes > opens) {
                lines.pop();
                content = lines.join('\n');
                continue;
            }
        }
        break;
    }
    
    if (content !== orig) {
        fs.writeFileSync(f, content, 'utf-8');
        console.log(`✅ ${rel}`);
        fixCount++;
    }
}

console.log(`\n🎯 ${fixCount} dosya rollback edildi`);
