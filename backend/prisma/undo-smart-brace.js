/**
 * UNDO smart-brace-fix: }, [ pattern'inden önce eklenen yanlış } satırlarını kaldır
 * 
 * smart-brace-fix aşağıdaki pattern'de yanlış } ekledi:
 *   .finally(() => setLoading(false));
 *         }        ← BUNU KALDIR (smart-brace-fix ekledi)  
 *     }, []);
 * 
 * Deteksiyon: indent + `}` + newline + indent + `}, [` — ama SADECE
 * üstündeki satır `{` ile bitmeyen bir ifade ise (yani yeni açılan scope değilse)
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

function undo(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    const orig = content;
    const lines = content.split(/\r?\n/);
    const result = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        
        // Check if this is a lone `}` that's followed by `}, [`
        if (trimmed === '}' && i + 1 < lines.length) {
            const nextTrimmed = lines[i + 1].trim();
            if (nextTrimmed.startsWith('}, [')) {
                // Check what's above - if it's `.finally(...)` or `.catch(...)` or `.then(...)`
                // then the `}` is wrong
                let prevIdx = i - 1;
                while (prevIdx >= 0 && lines[prevIdx].trim() === '') prevIdx--;
                
                if (prevIdx >= 0) {
                    const prevLine = lines[prevIdx].trim();
                    if (prevLine.endsWith(';') && 
                        (prevLine.includes('.finally') || prevLine.includes('.catch') || 
                         prevLine.includes('.then') || prevLine.includes('setLoading'))) {
                        // Skip this `}` — it was wrongly inserted
                        console.log(`  Removed wrong } at line ${i+1}: ${path.relative(SRC_DIR, filePath)}`);
                        continue;
                    }
                }
            }
        }
        
        result.push(line);
    }
    
    content = result.join('\r\n');
    
    if (content !== orig) {
        fs.writeFileSync(filePath, content, 'utf-8');
        return true;
    }
    return false;
}

const files = findFiles(SRC_DIR);
let count = 0;
for (const f of files) { if (undo(f)) count++; }
console.log(`🎯 ${count} dosya düzeltildi`);
