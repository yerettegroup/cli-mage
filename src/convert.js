'use strict';

const { Jimp, intToRGBA } = require('jimp');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

// ── Character sets ─────────────────────────────────────────────────────────
const CHARS_SIMPLE   = ' .,:;+*?%S#@';
const CHARS_DETAILED = ' .\'`^",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$';
const CHARS_BLOCK    = ' ░▒▓█';

// Braille dot bit positions (rows 0-3, cols 0-1)
const BRAILLE_DOTS = [
  [0x01, 0x08],
  [0x02, 0x10],
  [0x04, 0x20],
  [0x40, 0x80],
];

const CHAR_ASPECT = 0.45;

// ── Helpers ────────────────────────────────────────────────────────────────
function brightness(r, g, b) {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function ansiColor(text, r, g, b) {
  return `\x1b[38;2;${r};${g};${b}m${text}\x1b[0m`;
}

function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60)       { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else              { r = c; g = 0; b = x; }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

// ── Sobel edge detection ───────────────────────────────────────────────────
function sobelEdges(image) {
  const { width: w, height: h } = image.bitmap;
  const gray = new Float32Array(w * h);
  image.scan(0, 0, w, h, function (x, y, idx) {
    gray[y * w + x] = brightness(
      this.bitmap.data[idx],
      this.bitmap.data[idx + 1],
      this.bitmap.data[idx + 2]
    );
  });
  const edges = new Float32Array(w * h);
  let maxMag = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const gx =
        -gray[(y-1)*w+(x-1)] + gray[(y-1)*w+(x+1)]
        -2*gray[y*w+(x-1)]   + 2*gray[y*w+(x+1)]
        -gray[(y+1)*w+(x-1)] + gray[(y+1)*w+(x+1)];
      const gy =
        -gray[(y-1)*w+(x-1)] - 2*gray[(y-1)*w+x] - gray[(y-1)*w+(x+1)]
        +gray[(y+1)*w+(x-1)] + 2*gray[(y+1)*w+x] + gray[(y+1)*w+(x+1)];
      const mag = Math.sqrt(gx * gx + gy * gy);
      edges[y * w + x] = mag;
      if (mag > maxMag) maxMag = mag;
    }
  }
  if (maxMag > 0) for (let i = 0; i < edges.length; i++) edges[i] /= maxMag;
  return edges;
}

// ── Core render: image → line data ────────────────────────────────────────
// phase ∈ [0, 1): drives animation (gradient sweep, brightness pulse)
function buildLines(image, opts, phase = 0) {
  const { color = true, invert, detailed, gradient, edge, braille, blockart } = opts;
  const charset = blockart ? CHARS_BLOCK : detailed ? CHARS_DETAILED : CHARS_SIMPLE;
  const { width: W, height: H } = image.bitmap;

  const edgeMap = edge ? sobelEdges(image) : null;
  const lines = [];

  if (braille) {
    const charCols = Math.floor(W / 2);
    const charRows = Math.max(1, Math.round(H * CHAR_ASPECT / 2));
    const rowStep = H / charRows;

    for (let row = 0; row < charRows; row++) {
      const pyBase = Math.round(row * rowStep);
      const dotRowStride = rowStep / 4;
      const cells = [];
      let colored = '', plain = '';

      for (let col = 0; col < charCols; col++) {
        let bits = 0;
        const pxBase = col * 2;

        for (let dy = 0; dy < 4; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            const px = Math.min(W - 1, pxBase + dx);
            const py = Math.min(H - 1, Math.round(pyBase + dy * dotRowStride));
            const { r, g, b, a } = intToRGBA(image.getPixelColor(px, py));
            if (a < 64) continue;
            const lum = brightness(r, g, b);
            if (invert ? lum < 0.5 : lum > 0.5) bits |= BRAILLE_DOTS[dy][dx];
          }
        }

        const ch = String.fromCodePoint(0x2800 + bits);
        plain += ch;

        const { r, g, b } = intToRGBA(image.getPixelColor(Math.min(W-1, pxBase), Math.min(H-1, pyBase)));
        let [cr, cg, cb] = gradient
          ? hslToRgb(((col / charCols + phase) * 360) % 360, 1, 0.5)
          : [r, g, b];

        cells.push({ ch, r: cr, g: cg, b: cb });
        colored += color ? ansiColor(ch, cr, cg, cb) : ch;
      }
      lines.push({ colored, plain, cells });
    }
  } else {
    const targetHeight = Math.max(1, Math.round(H * CHAR_ASPECT));
    const rowStep = H / targetHeight;

    for (let row = 0; row < targetHeight; row++) {
      const y = Math.round(row * rowStep);
      const cells = [];
      let colored = '', plain = '';

      for (let x = 0; x < W; x++) {
        const { r, g, b, a } = intToRGBA(image.getPixelColor(x, y));

        if (a < 64) {
          cells.push({ ch: ' ', r: 0, g: 0, b: 0 });
          colored += ' '; plain += ' ';
          continue;
        }

        let lum = edgeMap ? edgeMap[y * W + x] : brightness(r, g, b);

        // Animate: pulse brightness with a spatial sine wave
        if (phase !== 0) {
          const wave = Math.sin((x / W + row / targetHeight + phase) * Math.PI * 4) * 0.08;
          lum = Math.max(0, Math.min(1, lum + wave));
        }

        const adjusted = invert ? 1 - lum : lum;
        const idx = Math.max(0, Math.min(charset.length - 1, Math.floor(adjusted * (charset.length - 1))));
        const ch = charset[idx];
        plain += ch;

        let [cr, cg, cb] = [r, g, b];
        if (gradient) {
          [cr, cg, cb] = hslToRgb(((x / W + row / targetHeight * 0.3 + phase) * 360) % 360, 1, 0.5);
        } else if (edgeMap) {
          const mag = edgeMap[y * W + x];
          cr = Math.round(r * mag);
          cg = Math.round(g * mag);
          cb = Math.round(b * mag);
        }

        cells.push({ ch, r: cr, g: cg, b: cb });
        colored += color ? ansiColor(ch, cr, cg, cb) : ch;
      }
      lines.push({ colored, plain, cells });
    }
  }

  return lines;
}

// ── Terminal display ───────────────────────────────────────────────────────
function printLines(lines, targetWidth) {
  const cols = process.stdout.columns || 80;
  const divider = chalk.hex('#6d28d9')('  ' + '─'.repeat(Math.min(targetWidth + 2, cols - 4)));
  console.log(divider);
  console.log();
  for (const { colored } of lines) process.stdout.write('  ' + colored + '\n');
  console.log();
  console.log(divider);
}

// ── stdin ──────────────────────────────────────────────────────────────────
function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.on('data', c => chunks.push(c));
    process.stdin.on('end', () => resolve(Buffer.concat(chunks)));
    process.stdin.on('error', reject);
  });
}

// ── Load animated GIF frames via gifwrap ───────────────────────────────────
async function loadGifFrames(srcPath, pixelWidth) {
  const { GifUtil } = require('gifwrap');
  const gif = await GifUtil.read(srcPath);
  return gif.frames.map(frame => {
    const img = new Jimp({ width: frame.bitmap.width, height: frame.bitmap.height });
    img.bitmap.data = Buffer.from(frame.bitmap.data);
    img.resize({ w: pixelWidth });
    return { image: img, delayMs: (frame.delayCentisecs || 10) * 10 };
  });
}

// ── Main entry point ───────────────────────────────────────────────────────
async function convertImage(srcPath, options) {
  const {
    width, color = true, invert, detailed, gradient, edge,
    braille, blockart, output, save, animate,
  } = options;

  const useStdin = !srcPath && !process.stdin.isTTY;
  if (!srcPath && !useStdin) throw new Error('No image path provided and stdin is not piped.');

  const label = useStdin ? '<stdin>' : path.basename(srcPath);
  console.log(chalk.hex('#a78bfa')('  ✦ Casting spell on: ') + chalk.white(label));

  const pixelWidth = Math.max(10, Math.min(braille ? width * 2 : width, 800));
  const renderOpts = { color, invert, detailed, gradient, edge, braille, blockart };

  // ── Animated GIF input ─────────────────────────────────────────────────
  const isGifInput = !useStdin && srcPath.toLowerCase().endsWith('.gif');
  if (isGifInput) {
    let gifFrames;
    try { gifFrames = await loadGifFrames(srcPath, pixelWidth); }
    catch { throw new Error(`Cannot read GIF: ${srcPath}`); }

    if (gifFrames.length > 1) {
      // Render all frames up front
      const rendered = gifFrames.map(({ image, delayMs }) => ({
        lines: buildLines(image, renderOpts, 0),
        delayMs,
      }));

      const displayWidth = gifFrames[0].image.bitmap.width;
      const lineCount = rendered[0].lines.length + 4;
      let frameIdx = 0;

      printLines(rendered[0].lines, displayWidth);

      const tick = () => {
        frameIdx = (frameIdx + 1) % rendered.length;
        const { lines, delayMs } = rendered[frameIdx];
        process.stdout.write(`\x1b[${lineCount}A`);
        printLines(lines, displayWidth);
        setTimeout(tick, delayMs);
      };
      setTimeout(tick, rendered[0].delayMs);

      process.on('SIGINT', () => {
        process.stdout.write('\n');
        console.log(chalk.hex('#a78bfa')('  ✦ Spell complete.\n'));
        process.exit(0);
      });
      return;
    }

    // Single-frame GIF — fall through with that frame as rawImage
  }

  // ── Load static image ──────────────────────────────────────────────────
  let rawImage;
  if (useStdin) {
    rawImage = await Jimp.read(await readStdin());
  } else {
    try { rawImage = await Jimp.read(srcPath); }
    catch { throw new Error(`Cannot read image: ${srcPath}`); }
  }
  rawImage.resize({ w: pixelWidth });

  const render = (phase = 0) => buildLines(rawImage, renderOpts, phase);
  const displayWidth = rawImage.bitmap.width;

  // ── Animate mode ───────────────────────────────────────────────────────
  if (animate) {
    let phase = 0;
    const FRAMES = 20;
    let lines = render(0);
    printLines(lines, displayWidth);
    const lineCount = lines.length + 4;

    const tick = setInterval(() => {
      phase = (phase + 1 / FRAMES) % 1;
      lines = render(phase);
      process.stdout.write(`\x1b[${lineCount}A`);
      printLines(lines, displayWidth);
    }, 100);

    process.on('SIGINT', () => {
      clearInterval(tick);
      process.stdout.write('\n');
      console.log(chalk.hex('#a78bfa')('  ✦ Spell complete.\n'));
      process.exit(0);
    });
    return;
  }

  // ── Single render ──────────────────────────────────────────────────────
  const lines = render(0);
  printLines(lines, displayWidth);
  console.log(chalk.hex('#a78bfa')(`  ✦ ${lines[0]?.cells?.length || displayWidth}×${lines.length} chars  ·  ${rawImage.bitmap.width}×${rawImage.bitmap.height}px source`));
  console.log();

  if (output) {
    fs.writeFileSync(output, lines.map(l => l.plain).join('\n'), 'utf8');
    console.log(chalk.hex('#a78bfa')('  ✦ Saved to: ') + chalk.white(output));
    console.log();
  }

  if (save) {
    await saveByExtension(lines, save, label, render);
  }
}

async function saveByExtension(lines, filePath, label, render) {
  const { toHtml, toSvg, toGif, toImage } = require('./exporters');
  const ext = path.extname(filePath).toLowerCase();
  const chalk = require('chalk');

  switch (ext) {
    case '.html':
      toHtml(lines, filePath, label);
      break;
    case '.svg':
      toSvg(lines, filePath, label);
      break;
    case '.gif':
      console.log(chalk.hex('#a78bfa')('  ✦ Generating animated GIF...'));
      await toGif(Array.from({ length: 24 }, (_, i) => render(i / 24)), filePath);
      break;
    default:
      throw new Error(`Unsupported file type: ${ext}. Use .html, .svg, or .gif`);
  }

  console.log(chalk.hex('#a78bfa')('  ✦ Saved to: ') + chalk.white(filePath));
  if (ext === '.svg') {
    console.log(chalk.dim('  To convert to PNG: inkscape mage.svg --export-filename=mage.png'));
    console.log(chalk.dim('                  or: magick mage.svg mage.png'));
  }
  console.log();
}

module.exports = { convertImage, buildLines };
