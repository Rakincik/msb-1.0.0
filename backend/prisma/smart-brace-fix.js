/**
 * SMART BRACE FIX — `}, [deps]);` satırlarının önündeki eksik `}` yi ekle
 * 
 * Pattern: 
 *   if/else/for bloğunun son satırı; (ör: `router.replace('/dashboard');`)
 *   }, [deps]);  ← bu satırda useEffect/useCallback kapanışı var
 * 
 * Ama aradaki `}` eksik. Bunu yeniden ekleyelim.
 * 
 * Ayrıca sonundaki fazla `}` kaldır.
 */
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.resolve(__dirname, '../../frontend/src');

function findFiles(dir) {
    const r = [];
    try {
        for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.join(dir, item.name);
            if (item.isDirectory() && item.name !== 'node_modules' && !item.name.startsWith('.')) r.push(...findFiles(full));
            else if ((item.name.endsWith('.tsx') || item.name.endsWith('.ts'))) r.push(full);
        }
    } catch(e){}
    return r;
}

function smartFix(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    const orig = content;
    const lines = content.split(/\r?\n/);
    const result = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        
        // Look for `}, [xxx]);` pattern — useEffect/useCallback/useMemo closing
        if (/^\s*\}, \[/.test(line)) {
            // Check if previous non-empty line needs a closing brace
            let prevIdx = i - 1;
            while (prevIdx >= 0 && lines[prevIdx].trim() === '') prevIdx--;
            
            if (prevIdx >= 0) {
                const prevTrimmed = lines[prevIdx].trim();
                // If previous line ends with `;` or `}` and isn't already a `}`
                // AND the indentation of `}, [` is LESS than the previous line
                // Then there's likely a missing `}`
                
                const prevIndent = lines[prevIdx].match(/^(\s*)/)[1].length;
                const curIndent = line.match(/^(\s*)/)[1].length;
                
                // If current line's indent <= previous line's indent AND
                // previous line isn't just } AND previous line ends with ;
                if (curIndent < prevIndent && !prevTrimmed.startsWith('}') && prevTrimmed.endsWith(';')) {
                    // Need to insert `}` between them
                    // Determine correct indent for the closing brace
                    const braceIndent = ' '.repeat(curIndent + 4);
                    result.push(braceIndent + '}');
                }
            }
        }
        
        result.push(line);
    }
    
    content = result.join('\r\n');
    
    // Now fix trailing excess braces
    const finalLines = content.split(/\r?\n/);
    let openCount = 0, closeCount = 0;
    for (const ch of content) {
        if (ch === '{') openCount++;
        if (ch === '}') closeCount++;
    }
    
    while (closeCount > openCount) {
        let removed = false;
        for (let i = finalLines.length - 1; i >= 0; i--) {
            if (finalLines[i].trim() === '}') {
                finalLines.splice(i, 1);
                closeCount--;
                removed = true;
                break;
            } else if (finalLines[i].trim() !== '') break;
        }
        if (!removed) break;
    }
    
    content = finalLines.join('\r\n');
    
    if (content !== orig) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`✅ ${path.relative(SRC_DIR, filePath)}`);
        return true;
    }
    return false;
}

const files = findFiles(SRC_DIR);
let count = 0;
for (const f of files) { if (smartFix(f)) count++; }
console.log(`\n🎯 ${count} dosya düzeltildi`);

// Verify
let issues = 0;
for (const f of files) {
    const c = fs.readFileSync(f, 'utf-8');
    let o=0, cl=0;
    for (const ch of c) { if(ch==='{')o++; if(ch==='}')cl++; }
    if (o !== cl) {
        console.log(`⚠️  ${path.relative(SRC_DIR, f)}: diff=${o-cl}`);
        issues++;
    }
}
if (!issues) console.log('✅ Brace balance OK');
