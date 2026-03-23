import chalk from 'chalk';

export function header(text) {
  console.log();
  console.log(chalk.bold(text));
  console.log(chalk.dim('─'.repeat(text.length)));
}

export function success(text) {
  console.log(chalk.green('  ✓ ') + text);
}

export function error(text) {
  console.log(chalk.red('  ✗ ') + text);
}

export function info(text) {
  console.log(chalk.blue('  ℹ ') + text);
}

export function warn(text) {
  console.log(chalk.yellow('  ⚠ ') + text);
}

export function dim(text) {
  console.log(chalk.dim('    ' + text));
}

export function newline() {
  console.log();
}
