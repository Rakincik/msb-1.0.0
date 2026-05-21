/**
 * Fix: if (accessToken) { guard kalıntılarını temizle
 * 
 * Pattern: 
 *   if (accessToken) {\n    ...birden fazla satır...\n    }
 * →  sadece iç satırları bırak, if ve brace'leri kaldır
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

function fixFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    const original = content;

    // Fix pattern: useEffect brace mismatch caused by removing `if (accessToken) {` but not its closing `}`
    // The pattern is: inside useEffect, an orphan closing brace `}` right before `}, [`
    // We look for the specific pattern and fix it

    // Pattern 1: Empty useEffect guard removal left orphan brace
    // Before: [blank line] \n    }\n    }, [
    // After: \n    }, [
    
    // More robust approach: find `if (accessToken)` that's still left and remove it properly
    // Or find the orphan brace

    // Let's just find files that have the issue and check what the error is
    // Looking at the TS errors: "',' expected" at specific lines - means destructuring broke
    
    // The script removed `const { accessToken } = useAuth();\n` which left issues
    // if the next line was `const { something } = useToast()` etc., it might have 
    // merged. Let me look for broken destructuring.
    
    // Actually the real issue: the regex `if\s*\(accessToken\)\s*\{\s*\n(\s+)` replaced
    // `if (accessToken) {\n    ` with just `    ` but didn't remove the closing `}\n`
    
    // Find the orphan closing brace: look for a `}` that's before `}, [` in useEffect
    // Pattern: lines like "    }\n    }, [" where the first } is orphan
    
    // Simplest fix: look for blocks in useEffect that have extra closing brace
    
    // Alternative approach: just look for the broken pattern directly
    // The `if (accessToken) {` was removed but `}` closing was NOT removed
    // So we have code like:
    //     fetchSomething();
    //     } // ← orphan
    //   }, [...]
    
    // Match: line with only whitespace+} followed by }, [
    content = content.replace(/^(\s+)(\w+.*;\s*\n)\s*\}\s*\n(\s*\}, \[)/gm, '$1$2$3');
    
    // Also fix if there's a bare } followed by }, [ on next line (with possible blank lines)
    content = content.replace(/(\s+)\}\s*\n(\s*\}, \[)/g, '$2');
    
    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`✅ Fixed: ${path.relative(SRC_DIR, filePath)}`);
        return true;
    }
    return false;
}

const files = findFiles(SRC_DIR);
let fixed = 0;
for (const f of files) {
    if (fixFile(f)) fixed++;
}
console.log(`\n🎯 ${fixed} dosya düzeltildi`);
