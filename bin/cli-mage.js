#!/usr/bin/env node
'use strict';

const { program } = require('commander');
const chalk = require('chalk');
const path = require('path');
const { showBanner } = require('../src/banner');
const { convertImage } = require('../src/convert');

async function run(imagePath, options) {
  showBanner();

  const useStdin = !imagePath && !process.stdin.isTTY;

  if (!imagePath && !useStdin) {
    console.log(chalk.hex('#a78bfa')('  Summon an image:') + chalk.white('  cli-mage <image> [options]\n'));
    console.log(chalk.dim('  Options:'));
    console.log(chalk.dim('    -w, --width <n>      output width in chars'));
    console.log(chalk.dim('    --no-color           disable color'));
    console.log(chalk.dim('    -i, --invert         invert brightness'));
    console.log(chalk.dim('    -d, --detailed       more characters, more detail'));
    console.log(chalk.dim('    -g, --gradient       rainbow gradient colors'));
    console.log(chalk.dim('    -e, --edge           edge detection'));
    console.log(chalk.dim('    --braille            Unicode Braille (higher res)'));
    console.log(chalk.dim('    --block              block characters ░▒▓█'));
    console.log(chalk.dim('    -a, --animate        animate in terminal'));
    console.log(chalk.dim('    -o, --output <f>     save plain text'));
    console.log(chalk.dim('    --html mage.html     save HTML'));
    console.log(chalk.dim('    --svg mage.svg       save SVG'));
    console.log(chalk.dim('    --gif mage.gif       save animated GIF'));
    console.log();
    return;
  }

  const width = parseInt(options.width) || process.stdout.columns || 120;
  const src = imagePath ? path.resolve(imagePath) : null;

  try {
    await convertImage(src, { ...options, width, blockart: options.block });
  } catch (err) {
    console.error(chalk.red(`\n  ✗ ${err.message}\n`));
    process.exit(1);
  }
}

program
  .name('cli-mage')
  .description('A magical CLI ASCII image art generator')
  .version('0.1.0')
  .argument('[image]', 'path to image file (omit to read from stdin)')
  .option('-w, --width <number>', 'output width in characters', String(process.stdout.columns || 120))
  .option('--no-color', 'disable color output')
  .option('-i, --invert', 'invert brightness')
  .option('-d, --detailed', 'use detailed character set')
  .option('-g, --gradient', 'rainbow gradient color (ignores source colors)')
  .option('-e, --edge', 'edge detection mode (Sobel filter)')
  .option('--braille', 'render using Unicode Braille characters (2× resolution)')
  .option('--block', 'render using block characters ░▒▓█')
  .option('-a, --animate', 'animate in terminal (Ctrl+C to stop)')
  .option('-o, --output <file>', 'save plain-text output to file')
  .option('--html <file>', 'export colored HTML file')
  .option('--svg <file>', 'export SVG file')
  .option('--gif <file>', 'export animated GIF')
  .action(run);

program.parse();
