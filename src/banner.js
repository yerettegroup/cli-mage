'use strict';

const chalk = require('chalk');

const H = chalk.hex('#7c3aed').bold;
const B = chalk.hex('#a78bfa');
const S = chalk.hex('#fde68a');

//   *
//  /|\
// /___\
const HAT =
  '  ' + S('*')     + '\n' +
  ' ' + H('/|\\')   + '\n' +
  H('/') + B('___') + H('\\');

function showBanner() {
  console.log();
  const title = chalk.hex('#e879f9').bold('cli-mage');
  const sub   = chalk.hex('#6d28d9')('image → ascii');
  const lines = HAT.split('\n');
  lines.forEach((line, i) => {
    if (i === 1) process.stdout.write('  ' + line + '  ' + title + '\n');
    else if (i === 2) process.stdout.write('  ' + line + '  ' + sub + '\n');
    else process.stdout.write('  ' + line + '\n');
  });
  console.log();
}

module.exports = { showBanner };
