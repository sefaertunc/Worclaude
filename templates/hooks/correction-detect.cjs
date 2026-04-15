#!/usr/bin/env node
'use strict';

// UserPromptSubmit hook: detects correction and learn patterns in user prompts.
// Outputs a hint to stdout if a pattern matches; empty output otherwise.
// No file I/O, no network. Always exits 0.

const { readFileSync } = require('fs');

const correctionPatterns = [
  /no,?\s*(that's|thats)?\s*(wrong|incorrect|not right)/i,
  /you\s*(should|shouldn't|need to|forgot)/i,
  /that's not what I (meant|asked|wanted)/i,
  /wrong file/i,
  /undo that/i,
  /don't do that/i,
  /actually,?\s/i,
  /I said /i,
];

const learnPatterns = [
  /remember (this|that)/i,
  /add (this|that) to (your )?rules/i,
  /don't (do|make) that (again|mistake)/i,
  /learn from this/i,
  /\[LEARN\]/i,
];

try {
  const data = JSON.parse(readFileSync(0, 'utf8'));
  const prompt = data.input?.prompt || '';

  if (prompt) {
    if (learnPatterns.some((p) => p.test(prompt))) {
      process.stdout.write(
        '[Learn trigger detected] Capture this as a [LEARN] block with category, rule, and optional mistake/correction.\n'
      );
    } else if (correctionPatterns.some((p) => p.test(prompt))) {
      process.stdout.write(
        '[Correction detected] Consider proposing a [LEARN] block if this is a generalizable rule.\n'
      );
    }
  }
} catch {
  // Never block user input
}

process.exit(0);
