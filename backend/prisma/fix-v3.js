/**
 * Fix v3: Brace-balanced fixer
 * 
 * Her dosyada:
 * 1. Kalan apiClient.fetch() → res.ok/res.json pattern'lerini düzelt
 * 2. Orphan closing braces'ı bul ve kaldır (scope counting)
 * 3. accessToken referanslarını temizle
 */
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.resolve(__dirname, '../../frontend/src');
const SKIP = ['api-client.ts', 'api-config.ts', 'auth-context.tsx', 'middleware.ts'];

function findFiles(dir) {
    const results = [];
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) results.push(...findFiles(fullPath));
        else if ((item.name.endsWith('.tsx') || item.name.endsWith('.ts')) && !SKIP.includes(item.name)) {
            results.push(fullPath);
        }
    }
    return results;
}

function fixBraces(content, filePath) {
    const lines = content.split('\n');
    const result = [];
    let i = 0;
    let changes = 0;
    
    while (i < lines.length) {
        const line = lines[i];
        const trimmed = line.trim();
        
        // Look for orphan `}` before `}, [` (useEffect end)
        // An orphan `}` is one that doesn't match any opener in the current scope
        if (trimmed === '}' && i + 1 < lines.length) {
            const nextLine = lines[i + 1]?.trim();
            if (nextLine && (nextLine.startsWith('}, [') || nextLine.startsWith('};'))) {
                // This might be an orphan from if(accessToken) removal
                // Check if the previous meaningful line is a function call or statement end
                let prevIdx = i - 1;
                while (prevIdx >= 0 && lines[prevIdx].trim() === '') prevIdx--;
                const prevLine = prevIdx >= 0 ? lines[prevIdx].trim() : '';
                
                if (prevLine.endsWith(';') || prevLine.endsWith(')') || prevLine === '') {
                    // Likely orphan - skip it
                    console.log(`    Removed orphan } at line ${i + 1}`);
                    changes++;
                    i++;
                    continue;
                }
            }
        }

        // Fix: `const res = await apiClient.fetch('/path');`
        // followed by if (res.ok) { ... }
        if (trimmed.startsWith('const res = await apiClient.fetch(') || 
            trimmed.startsWith('const response = await apiClient.fetch(')) {
            const urlMatch = trimmed.match(/apiClient\.fetch\('([^']+)'\)/);
            if (urlMatch) {
                const url = urlMatch[1];
                // Look ahead for if (res.ok) or if (response.ok)
                let j = i + 1;
                while (j < lines.length && lines[j].trim() === '') j++;
                
                const nextMeaningful = lines[j]?.trim() || '';
                if (nextMeaningful.startsWith('if (res.ok)') || nextMeaningful.startsWith('if (response.ok)')) {
                    // Found the pattern - collect the if block
                    const indent = line.match(/^(\s*)/)[1];
                    let depth = 0;
                    let ifBody = [];
                    let k = j;
                    // Skip the if line
                    for (let c of nextMeaningful) {
                        if (c === '{') depth++;
                        if (c === '}') depth--;
                    }
                    k++;
                    
                    // Collect body
                    while (k < lines.length && depth > 0) {
                        const kLine = lines[k].trim();
                        for (let c of kLine) {
                            if (c === '{') depth++;
                            if (c === '}') depth--;
                        }
                        if (depth > 0) {
                            // De-indent by 4 spaces
                            let bodyLine = lines[k];
                            if (bodyLine.startsWith(indent + '    ')) {
                                bodyLine = indent + bodyLine.substring(indent.length + 4);
                            }
                            // Replace res.json() with apiClient.get
                            bodyLine = bodyLine.replace(/await\s+(res|response)\.json\(\)/, `await apiClient.get('${url}')`);
                            ifBody.push(bodyLine);
                        }
                        k++;
                    }
                    
                    // Replace the fetch+if pattern with flat code
                    result.push(...ifBody);
                    i = k;
                    changes++;
                    continue;
                }
            }
        }
        
        result.push(line);
        i++;
    }
    
    if (changes > 0) {
        return result.join('\n');
    }
    return content;
}

function fixRemainingPatterns(content) {
    const orig = content;
    
    // Fix: `apiClient.fetch('/path', { method: 'POST', body: JSON.stringify(...) })` 
    // when used as: const res = await apiClient.fetch(...);\nif(!res.ok) throw...
    // These are write operations - they should stay as apiClient.fetch but the
    // res.ok check pattern needs to work. Actually apiClient.fetch returns Response.
    // So those patterns are actually fine as-is IF the code compiles.
    
    // The main issue is orphan `}` blocks and indentation
    
    // Fix accessToken in remaining patterns (template literals etc)
    content = content.replace(/`Bearer \$\{accessToken\}`/g, '`Bearer ${localStorage.getItem("accessToken")}`');
    
    // Fix: remaining ${API_URL} - replace with the base URL call through apiClient
    // These are cases where the regex didn't match (complex patterns)
    // apiClient.fetch already prepends the base URL, so ${API_URL}/path → just '/path'
    
    // Fix remaining `useAuth` destructure with only accessToken
    // Pattern: const { something, accessToken } = useAuth(); → const { something } = useAuth();
    content = content.replace(/,\s*accessToken\s*}/g, ' }');
    content = content.replace(/\{\s*accessToken,\s*/g, '{ ');
    content = content.replace(/\{\s*accessToken\s*\}/g, '{ }');
    // If `{ }` is left, remove the whole line
    content = content.replace(/const\s*\{\s*\}\s*=\s*useAuth\(\);\s*\n/g, '');

    return content;
}

const files = findFiles(SRC_DIR);
let fixed = 0;

for (const f of files) {
    let content = fs.readFileSync(f, 'utf-8');
    const orig = content;
    const rel = path.relative(SRC_DIR, f);
    
    content = fixRemainingPatterns(content);
    content = fixBraces(content, f);
    
    if (content !== orig) {
        fs.writeFileSync(f, content, 'utf-8');
        console.log(`✅ ${rel}`);
        fixed++;
    }
}

console.log(`\n🎯 ${fixed} dosya düzeltildi`);
