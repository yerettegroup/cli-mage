'use strict';

const QRCode = require('qrcode');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

const QUIET = 2;

function ansiColor(text, r, g, b) {
  return `\x1b[38;2;${r};${g};${b}m${text}\x1b[0m`;
}

function buildGrid(qr) {
  const size = qr.modules.size;
  const data = qr.modules.data;
  const totalRows = size + QUIET * 2;
  const totalCols = (size + QUIET * 2) * 2;

  const grid = Array.from({ length: totalRows }, () =>
    Array.from({ length: totalCols }, () => ({ ch: ' ', r: 255, g: 255, b: 255 }))
  );

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dark = data[y * size + x] === 1;
      const row = y + QUIET;
      const colBase = (x + QUIET) * 2;
      const cell = { ch: dark ? '█' : ' ', r: dark ? 20 : 255, g: dark ? 20 : 255, b: dark ? 20 : 255 };
      grid[row][colBase] = { ...cell };
      grid[row][colBase + 1] = { ...cell };
    }
  }

  return { grid, totalRows, totalCols, size };
}

function renderGrid(grid, useColor) {
  const lines = [];
  for (let i = 0; i < grid.length; i++) {
    const row = grid[i];
    let colored = '  ', plain = '  ';
    for (const { ch, r, g, b } of row) {
      plain += ch;
      colored += useColor ? ansiColor(ch, r, g, b) : ch;
    }
    lines.push({ colored, plain, cells: grid[i] });
  }
  return lines;
}

async function generateQr(text, options) {
  const { color = true, output, save } = options;

  console.log(chalk.hex('#a78bfa')('  ✦ Conjuring QR for: ') + chalk.white(text));

  let qr;
  try {
    qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
  } catch {
    throw new Error(`Cannot generate QR code for: ${text}`);
  }

  const { grid, totalRows, totalCols, size } = buildGrid(qr);
  const lines = renderGrid(grid, color);

  const divider = chalk.hex('#6d28d9')('  ' + '─'.repeat(Math.min(totalCols + 2, (process.stdout.columns || 80) - 4)));
  console.log(divider);
  console.log();
  for (const { colored } of lines) process.stdout.write(colored + '\n');
  console.log();
  console.log(divider);
  console.log(chalk.hex('#a78bfa')(`  ✦ ${size}×${size} modules`));
  console.log();

  if (output) {
    fs.writeFileSync(output, lines.map(l => l.plain).join('\n'), 'utf8');
    console.log(chalk.hex('#a78bfa')('  ✦ Saved to: ') + chalk.white(output));
    console.log();
  }

  if (save) {
    const { toHtml, toSvg } = require('./exporters');
    const ext = path.extname(save).toLowerCase();
    switch (ext) {
      case '.html':
        toHtml(lines, save, text);
        break;
      case '.svg':
        toSvg(lines, save, text);
        break;
      default:
        throw new Error(`Unsupported file type: ${ext}. Use .html or .svg`);
    }
    console.log(chalk.hex('#a78bfa')('  ✦ Saved to: ') + chalk.white(save));
    if (ext === '.svg') {
      console.log(chalk.dim('  To convert to PNG: inkscape mage.svg --export-filename=mage.png'));
      console.log(chalk.dim('                  or: magick mage.svg mage.png'));
    }
    console.log();
  }
}

module.exports = { generateQr };
