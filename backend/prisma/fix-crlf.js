/**
 * DEFINITIVE FIX V2 — CR/LF mixed line endings + merged lines fix
 * 
 * Root cause identified: Scripts used \n for replacements but files had \r\n
 * This caused lines to merge: `}) {\r    const` etc.
 */
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.resolve(__dirname, '../../frontend/src');
const SKIP = new Set(['api-client.ts', 'api-config.ts', 'auth-context.tsx', 'middleware.ts']);
const ALREADY_FIXED = new Set([
    'unit-dialog.tsx', 'lesson-dialog.tsx', 'topic-dialog.tsx',
    'dashboard-charts.tsx', 'recent-activity.tsx',
]);

function findFiles(dir) {
    const r = [];
    try {
        for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, item.name);
            if (item.isDirectory() && item.name !== 'node_modules' && !item.name.startsWith('.')) r.push(...findFiles(full));
            else if ((item.name.endsWith('.tsx') || item.name.endsWith('.ts')) && !SKIP.has(item.name) && !ALREADY_FIXED.has(item.name)) r.push(full);
        }
    } catch(e){}
    return r;
}

function fix(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    const orig = content;
    
    // ============================
    // FIX 1: Merged lines from CR/LF issues
    // Pattern: `something\r    something` (CR followed by spaces inside a single line)
    // These are actually two lines that got merged
    // ============================
    
    // Split on \r that isn't followed by \n — these are merged lines
    content = content.replace(/\r(?!\n)/g, '\r\n');
    
    // ============================
    // FIX 2: Merged useEffect closing
    // Pattern: `});\n        }, [deps]);` should be `});\n        }\n    }, [deps]);`
    // After CR fix, might look like: `});` then `, [deps]);` on next line
    // ============================
    
    // Fix `});\r\n        }, [` → `});\r\n        }\r\n    }, [`
    content = content.replace(/\}\);\s*\r?\n(\s+)\}, \[/g, '});\r\n$1}\r\n    }, [');
    
    // ============================
    // FIX 3: Trailing excess `}`
    // ============================
    let lines = content.split(/\r?\n/);
    let openCount = 0, closeCount = 0;
    for (const ch of content) {
        if (ch === '{') openCount++;
        if (ch === '}') closeCount++;
    }
    
    while (closeCount > openCount) {
        let removed = false;
        for (let i = lines.length - 1; i >= 0; i--) {
            if (lines[i].trim() === '}') {
                lines.splice(i, 1);
                closeCount--;
                removed = true;
                break;
            } else if (lines[i].trim() !== '') {
                break;
            }
        }
        if (!removed) break;
    }
    
    // ============================
    // FIX 4: accessToken restoration
    // ============================
    content = lines.join('\r\n');
    
    // Restore accessToken declaration if used but not declared
    if (content.includes('${accessToken}') || content.match(/\bAccessToken\b/i)) {
        // Check if accessToken is in useAuth destructure
        const hasDecl = content.includes('accessToken }') || content.includes('accessToken,') || content.includes('{ accessToken');
        
        if (!hasDecl && content.includes('useAuth()')) {
            content = content.replace(
                /const\s*\{([^}]+)\}\s*=\s*useAuth\(\)/,
                (m, fields) => {
                    if (fields.includes('accessToken')) return m;
                    return `const { ${fields.trim()}, accessToken } = useAuth()`;
                }
            );
        }
    }
    
    if (content !== orig) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`✅ ${path.relative(SRC_DIR, filePath)}`);
        return true;
    }
    return false;
}

const files = findFiles(SRC_DIR);
let count = 0;
for (const f of files) { if (fix(f)) count++; }
console.log(`\n🎯 ${count} dosya düzeltildi`);

// Verify
console.log('\n--- Brace Balance ---');
let issues = 0;
for (const f of findFiles(SRC_DIR)) {
    const c = fs.readFileSync(f, 'utf-8');
    let o=0, cl=0;
    for (const ch of c) { if(ch==='{')o++; if(ch==='}')cl++; }
    if (o !== cl) {
        console.log(`⚠️  ${path.relative(SRC_DIR, f)}: diff=${o-cl}`);
        issues++;
    }
}
if (!issues) console.log('✅ Tüm dosyalar dengeli!');
