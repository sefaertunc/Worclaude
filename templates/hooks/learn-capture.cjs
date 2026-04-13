#!/usr/bin/env node
'use strict';

// Stop hook: scans the transcript for [LEARN] blocks and persists them
// to .claude/learnings/ as markdown files with YAML frontmatter.
// Always exits 0 — never blocks session stop.

const { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, unlinkSync } = require('fs');
const { join, basename } = require('path');

const LEARN_REGEX =
  /\[LEARN\]\s*([\w][\w\s-]*?)\s*:\s*(.+?)(?:\r?\nMistake:\s*(.+?))?(?:\r?\nCorrection:\s*(.+?))?(?=\r?\n\[LEARN\]|\r?\n\r?\n|$)/gim;

const STALE_THRESHOLD_MS = 30000; // 30 seconds

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function checkStopHookActive(cwd) {
  const flagPath = join(cwd, '.claude', '.stop-hook-active');
  if (existsSync(flagPath)) {
    try {
      const stat = statSync(flagPath);
      if (Date.now() - stat.mtimeMs < STALE_THRESHOLD_MS) {
        return true; // Another stop hook is active
      }
    } catch {
      // Flag file unreadable — proceed
    }
  }
  return false;
}

function setStopHookActive(cwd) {
  const flagPath = join(cwd, '.claude', '.stop-hook-active');
  try {
    writeFileSync(flagPath, String(Date.now()));
  } catch {
    // Non-critical
  }
}

function clearStopHookActive(cwd) {
  const flagPath = join(cwd, '.claude', '.stop-hook-active');
  try {
    unlinkSync(flagPath);
  } catch {
    // Non-critical
  }
}

function readIndex(learningsDir) {
  const indexPath = join(learningsDir, 'index.json');
  if (existsSync(indexPath)) {
    try {
      return JSON.parse(readFileSync(indexPath, 'utf8'));
    } catch {
      return { learnings: [] };
    }
  }
  return { learnings: [] };
}

function writeIndex(learningsDir, index) {
  writeFileSync(join(learningsDir, 'index.json'), JSON.stringify(index, null, 2) + '\n');
}

function extractLearnings(transcriptPath) {
  if (!existsSync(transcriptPath)) return [];

  const lines = readFileSync(transcriptPath, 'utf8').split(/\r?\n/).filter(Boolean);
  const learnings = [];

  // Scan last 20 lines for assistant messages containing [LEARN] blocks
  const recent = lines.slice(-20);
  for (const line of recent) {
    try {
      const entry = JSON.parse(line);
      if (entry.type !== 'assistant') continue;

      const content = entry.message?.content;
      if (!Array.isArray(content)) continue;

      for (const block of content) {
        if (block.type !== 'text' || !block.text) continue;

        let match;
        LEARN_REGEX.lastIndex = 0;
        while ((match = LEARN_REGEX.exec(block.text)) !== null) {
          learnings.push({
            category: match[1].trim(),
            rule: match[2].trim(),
            mistake: match[3] ? match[3].trim() : null,
            correction: match[4] ? match[4].trim() : null,
          });
        }
      }
    } catch {
      // Skip malformed JSONL lines
    }
  }

  return learnings;
}

try {
  const input = readFileSync(0, 'utf8');
  const data = JSON.parse(input);
  const cwd = data.cwd || process.cwd();
  const transcriptPath = data.transcript_path;

  if (checkStopHookActive(cwd)) process.exit(0);
  setStopHookActive(cwd);

  try {
    if (!transcriptPath) process.exit(0);

    const learnings = extractLearnings(transcriptPath);
    if (learnings.length === 0) process.exit(0);

    const learningsDir = join(cwd, '.claude', 'learnings');
    mkdirSync(learningsDir, { recursive: true });

    const index = readIndex(learningsDir);
    const today = new Date().toISOString().split('T')[0];
    const projectName = basename(cwd);

    for (const learning of learnings) {
      const slug = slugify(learning.category);
      const filename = `${slug}.md`;
      const filePath = join(learningsDir, filename);

      const entry = [
        '---',
        `created: ${today}`,
        `category: ${learning.category}`,
        `project: ${projectName}`,
        'times_applied: 0',
        '---',
        '',
        `**Rule:** ${learning.rule}`,
      ];
      if (learning.mistake) entry.push(`**Mistake:** ${learning.mistake}`);
      if (learning.correction) entry.push(`**Correction:** ${learning.correction}`);
      entry.push('');

      if (existsSync(filePath)) {
        const existing = readFileSync(filePath, 'utf8');
        writeFileSync(filePath, existing + '\n' + entry.join('\n'));
      } else {
        writeFileSync(filePath, entry.join('\n'));
      }

      const existingEntry = index.learnings.find((l) => l.file === filename);
      if (existingEntry) {
        existingEntry.created = today;
      } else {
        index.learnings.push({
          file: filename,
          category: learning.category,
          created: today,
          times_applied: 0,
        });
      }
    }

    writeIndex(learningsDir, index);
  } finally {
    clearStopHookActive(cwd);
  }
} catch {
  // Never block session stop
}

process.exit(0);
