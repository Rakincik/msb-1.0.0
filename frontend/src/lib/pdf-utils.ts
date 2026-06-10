export interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
}

/**
 * Analyzes the canvas to find blocks of content (questions) using a projection profile algorithm.
 * It looks for vertical gaps (whitespace) to segment the page into probable question regions.
 * 
 * @param canvas The source canvas element containing the rendered PDF page.
 * @returns An array of Rect objects representing detected question boundaries.
 */
export function analyzeCanvas(canvas: HTMLCanvasElement): Rect[] {
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];

    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // 1. Horizontal Projection Profile (Y-axis histogram)
    // Count non-white pixels for each row.
    const rowDensity = new Array(height).fill(0);
    const threshold = 240; // Pixel value > 240 considered "white"

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];

            // If pixel is NOT white (dark ink), increment density
            if (r < threshold || g < threshold || b < threshold) {
                rowDensity[y]++;
            }
        }
    }

    // 2. Find Vertical Gaps
    // A gap is a range of rows with very low density (mostly whitespace).
    const rects: Rect[] = [];
    const minHeight = 50; // Minimum height for a question block (pixel)
    const gapThreshold = 5; // Max 'ink' pixels allowed in a separator row

    let inBlock = false;
    let startY = 0;

    for (let y = 0; y < height; y++) {
        const isContentRow = rowDensity[y] > gapThreshold;

        if (isContentRow && !inBlock) {
            // Start of a new block
            inBlock = true;
            startY = y;
        } else if (!isContentRow && inBlock) {
            // End of current block
            inBlock = false;
            const blockHeight = y - startY;

            if (blockHeight >= minHeight) {
                // Determine the X boundaries for this specific block
                // (Refinement: Crop left/right margins for this slice)
                // For simplicity v1, we use a fixed margin or scan X

                // Let's scan X for this block range to find tight bounds
                let minX = width;
                let maxX = 0;

                for (let by = startY; by < y; by++) {
                    for (let bx = 0; bx < width; bx++) {
                        const idx = (by * width + bx) * 4;
                        if (data[idx] < threshold || data[idx + 1] < threshold || data[idx + 2] < threshold) {
                            if (bx < minX) minX = bx;
                            if (bx > maxX) maxX = bx;
                        }
                    }
                }

                // Add padding
                const padding = 10;
                const finalX = Math.max(0, minX - padding);
                const finalY = Math.max(0, startY - padding);
                const finalW = Math.min(width, (maxX - minX) + (padding * 2));
                const finalH = Math.min(height, blockHeight + (padding * 2));

                if (maxX > minX) {
                    rects.push({
                        x: finalX,
                        y: finalY,
                        w: finalW,
                        h: finalH
                    });
        }
            }
        }
    }

    return rects;
}

/**
 * Parses OCR text to extract the question root and options (A-E).
 * Uses heuristics like "A)", "A.", "(A)" to identify options.
 */
export function parseQuestionsFromOCR(text: string) {
    const cleanText = text
        .replace(/\|/g, 'I')
        .replace(/\r\n/g, '\n');

    // Patterns: A) ... or A. ... or (A) ...
    // Must be at start of line or preceded by whitespace
    const optionPattern = /(?:^|\n|\s)([A-E])(?:\)|\.|-)\s+/g;

    const options: Record<string, string> = { A: '', B: '', C: '', D: '', E: '' };
    const indices: { letter: string, index: number }[] = [];

    let match;
    while ((match = optionPattern.exec(cleanText)) !== null) {
        indices.push({
            letter: match[1],
            index: match.index
        });
        }

    indices.sort((a, b) => a.index - b.index);

    let questionRoot = cleanText;
    if (indices.length > 0) {
        questionRoot = cleanText.substring(0, indices[0].index).trim();
    }

    for (let i = 0; i < indices.length; i++) {
        const current = indices[i];
        const next = indices[i + 1];

        // Find where content really starts (skip marker "A) ")
        let contentStart = current.index + 2;
        const sub = cleanText.substring(current.index);
        const matchMarker = sub.match(/^([A-E])(?:\)|\.|-)\s+/);
        if (matchMarker) {
            contentStart = current.index + matchMarker[0].length;
        }

        const contentEnd = next ? next.index : cleanText.length;
        options[current.letter] = cleanText.substring(contentStart, contentEnd).trim();
    }

    return {
        questionRoot,
        options
    };
}
