'use strict';

const fs = require('fs');

// ── HTML ───────────────────────────────────────────────────────────────────
function toHtml(lines, filePath, title = 'cli-mage') {
  const rows = lines.map(({ cells }) => {
    const spans = cells.map(({ ch, r, g, b }) => {
      const esc = ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '&' ? '&amp;' : ch;
      if (ch === ' ') return ' ';
      return `<span style="color:rgb(${r},${g},${b})">${esc}</span>`;
    }).join('');
    return `<div>${spans}</div>`;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${title} — cli-mage</title>
<style>
  body { background: #0a0a0f; margin: 0; padding: 2rem; }
  pre  { font-family: 'Cascadia Code', 'Fira Code', 'Courier New', monospace;
         font-size: 10px; line-height: 1.2; letter-spacing: 0.05em; }
  div  { white-space: pre; }
</style>
</head>
<body>
<pre>
${rows}
</pre>
</body>
</html>`;

  fs.writeFileSync(filePath, html, 'utf8');
}

// ── SVG ────────────────────────────────────────────────────────────────────
function toSvg(lines, filePath, title = 'cli-mage') {
  const CHAR_W = 7;
  const CHAR_H = 13;
  const LINE_H = 14;
  const PAD = 12;

  const cols = Math.max(...lines.map(l => l.cells.length));
  const svgW = cols * CHAR_W + PAD * 2;
  const svgH = lines.length * LINE_H + PAD * 2;

  const texts = lines.flatMap(({ cells }, row) => {
    const y = PAD + row * LINE_H + CHAR_H;
    return cells
      .map(({ ch, r, g, b }, col) => {
        if (ch === ' ') return null;
        const x = PAD + col * CHAR_W;
        const esc = ch === '<' ? '&lt;' : ch === '>' ? '&gt;' : ch === '&' ? '&amp;' : ch === '"' ? '&quot;' : ch;
        return `<text x="${x}" y="${y}" fill="rgb(${r},${g},${b})">${esc}</text>`;
      })
      .filter(Boolean);
  });

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">
  <title>${title} — cli-mage</title>
  <rect width="100%" height="100%" fill="#0a0a0f"/>
  <g font-family="'Cascadia Code','Fira Code','Courier New',monospace" font-size="12">
${texts.join('\n')}
  </g>
</svg>`;

  fs.writeFileSync(filePath, svg, 'utf8');
}

// ── GIF ────────────────────────────────────────────────────────────────────
// Each ASCII cell becomes a CELL_W×CELL_H pixel block.
// frames is an array of line arrays (one per animation frame).
async function toGif(frames, filePath, cellW = 6, cellH = 11) {
  const GIFEncoder = require('gif-encoder-2');

  const cols = Math.max(...frames[0].map(l => l.cells.length));
  const rows = frames[0].length;
  const imgW = cols * cellW;
  const imgH = rows * cellH;

  const encoder = new GIFEncoder(imgW, imgH);
  encoder.start();
  encoder.setRepeat(0);   // loop forever
  encoder.setDelay(60);   // ms per frame
  encoder.setQuality(10);

  for (const lines of frames) {
    const pixels = new Uint8Array(imgW * imgH * 4);

    for (let row = 0; row < rows; row++) {
      const { cells } = lines[row] || { cells: [] };
      for (let col = 0; col < cols; col++) {
        const cell = cells[col] || { ch: ' ', r: 0, g: 0, b: 0 };
        const isLit = cell.ch !== ' ';
        const [fr, fg, fb] = isLit ? [cell.r, cell.g, cell.b] : [0, 0, 0];

        for (let py = 0; py < cellH; py++) {
          for (let px = 0; px < cellW; px++) {
            const idx = ((row * cellH + py) * imgW + col * cellW + px) * 4;
            pixels[idx]     = fr;
            pixels[idx + 1] = fg;
            pixels[idx + 2] = fb;
            pixels[idx + 3] = 255;
          }
        }
      }
    }

    encoder.addFrame(pixels);
  }

  encoder.finish();
  fs.writeFileSync(filePath, Buffer.from(encoder.out.getData()));
}

module.exports = { toHtml, toSvg, toGif };
