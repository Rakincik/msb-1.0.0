/**
 * Fix v2: Script'in bozuk bıraktığı dosyaları düzelt
 * 
 * Sorunlar:
 * 1. `if (accessToken) {` kaldırıldı ama kapanan `}` kaldı
 * 2. Bazı dosyalardaki fetch() → apiClient.fetch() dönmedi (karmaşık pattern'ler)
 * 3. accessToken referansları hâlâ kalmış olabilir
 */
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.resolve(__dirname, '../../frontend/src');

function findFiles(dir) {
    const results = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
            results.push(...findFiles(fullPath));
        } else if (item.name.endsWith('.tsx') || item.name.endsWith('.ts')) {
            results.push(fullPath);
        }
    }
    return results;
}

const SKIP = ['api-client.ts', 'api-config.ts', 'auth-context.tsx'];

function fix(filePath) {
    if (SKIP.some(s => filePath.endsWith(s))) return false;
    
    let content = fs.readFileSync(filePath, 'utf-8');
    const orig = content;

    // 1) Fix any remaining raw fetch with API_URL & accessToken
    // Pattern: fetch(`${API_URL}/path`, { headers: { Authorization: `Bearer ${accessToken}` } })
    content = content.replace(
        /fetch\(`\$\{API_URL\}([^`]+)`\s*,\s*\{[\s\S]*?headers\s*:\s*\{[\s\S]*?Authorization\s*:\s*`Bearer \$\{accessToken\}`[\s\S]*?\}\s*\}\s*\)/g,
        (match, path) => `apiClient.fetch('${path}')`
    );

    // Pattern: fetch(`${API_URL}/path`, { method: 'XXX', headers: { ... }, body: ... })
    content = content.replace(
        /fetch\(`\$\{API_URL\}([^`]+)`\s*,\s*\{([\s\S]*?)method\s*:\s*'(POST|PATCH|PUT|DELETE)'([\s\S]*?)\}\s*\)/g,
        (match, urlPath, before, method, after) => {
            // Extract body if present
            const bodyMatch = (before + after).match(/body\s*:\s*(JSON\.stringify\([^)]+\)|[^,}]+)/);
            if (bodyMatch) {
                return `apiClient.fetch('${urlPath}', { method: '${method}', body: ${bodyMatch[1]} })`;
            }
            return `apiClient.fetch('${urlPath}', { method: '${method}' })`;
        }
    );

    // 2) Fix apiClient.fetch to proper method calls where possible
    // apiClient.fetch('/path') → no change needed (fetchWithAuth handles it)
    // But we should also handle the res.ok / res.json() pattern that follows
    
    // Pattern: const res = await apiClient.fetch('/path');\n    if (res.ok) {\n      const data = await res.json();\n      setSomething(data);\n    }
    // → const data = await apiClient.get('/path');\n    setSomething(data);
    content = content.replace(
        /const\s+(\w+)\s*=\s*await\s+apiClient\.fetch\('([^']+)'\);\s*\n\s*if\s*\(\1\.ok\)\s*\{\s*\n\s*const\s+(\w+)\s*=\s*await\s+\1\.json\(\);\s*\n\s*(\w+\([^)]*\));?\s*\n\s*\}/g,
        (match, resVar, urlPath, dataVar, setter) => {
            return `const ${dataVar} = await apiClient.get('${urlPath}');\n            ${setter}`;
        }
    );
    
    // Simpler pattern: just res.ok + res.json on its own
    content = content.replace(
        /const\s+res\s*=\s*await\s+apiClient\.fetch\('([^']+)'\);\s*\n\s*if\s*\(res\.ok\)\s*\{\s*\n([\s\S]*?)\n\s*\}/g,
        (match, urlPath, body) => {
            // Replace res.json() inside body
            const cleaned = body.replace(/const\s+(\w+)\s*=\s*await\s+res\.json\(\);/, 'const $1 = await apiClient.get(\'' + urlPath + '\');');
            // Remove the if block, keep inner content de-indented
            const lines = cleaned.split('\n').map(l => l.replace(/^    /, '')).join('\n');
            return lines;
        }
    );

    // 3) If there's still apiClient.fetch remaining, convert simple GET cases
    // const res = await apiClient.fetch('/xxx'); followed by res.json() etc
    // This is fine - fetchWithAuth returns a Response object, which is correct
    // BUT our apiClient.get/post methods return parsed JSON directly

    // 4) Fix orphan `}` from if(accessToken) removal: 
    // Look for } that appears just before }, [ pattern (useEffect closing)
    // This is: indentation + } + newline + indentation + }, [
    content = content.replace(/^(\s+)}\s*\n(\s*}, \[)/gm, '$2');

    // 5) Fix broken indentation from guard removal
    content = content.replace(/^(\s{4,})(\s{4,})(fetchAnalytics|fetchData|fetchExams|fetchUsers|fetchTree|fetchGroups|loadData|loadExamAreas|fetchExamAreas|fetchQuestions|fetchPdfs|fetchContent)\(\);/gm, 
        (match, indent1, indent2, func) => `${indent1}${func}();`
    );
    
    // 6) Remove unused `useAuth` import if accessToken was the only usage
    // Check if file still uses useAuth for other things (user, etc)
    if (!content.includes('accessToken') && !content.includes('useAuth')) {
        // Already clean
    }
    
    // 7) Remove `API_URL` usage that's still lingering (the import was already changed)
    // But there might be inline uses
    if (content.includes('${API_URL}')) {
        // Still has API_URL inline usage - the main fetch→apiClient regex didn't catch it
        // This needs manual inspection
        const relativePath = path.relative(SRC_DIR, filePath);
        console.log(`⚠️  Still has API_URL: ${relativePath}`);
    }

    if (content !== orig) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`✅ ${path.relative(SRC_DIR, filePath)}`);
        return true;
    }
    return false;
}

const files = findFiles(SRC_DIR);
let fixed = 0;
for (const f of files) {
    if (fix(f)) fixed++;
}
console.log(`\n🎯 ${fixed} dosya düzeltildi`);
