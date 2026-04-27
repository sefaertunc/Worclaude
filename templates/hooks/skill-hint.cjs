#!/usr/bin/env node
'use strict';

// UserPromptSubmit hook: hints at relevant skills based on user prompt keywords.
// Reads .claude/skills/ directory and matches prompt tokens against skill
// directory names AND each skill's `description:` frontmatter line. The
// description fallback lets renames stay in sync with intent (e.g. a skill
// named "compact-safe" still matches the prompt "session context budget"
// because its description mentions "context" and "session").
// Outputs at most one hint to stdout if a match is found; empty output otherwise.
// Always exits 0.

const { readFileSync, readdirSync, statSync } = require('fs');
const path = require('path');

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'have', 'from', 'your',
  'will', 'would', 'could', 'should', 'about', 'when', 'what', 'which',
  'there', 'here', 'than', 'then', 'them', 'they', 'their', 'been',
  'being', 'does', 'doing', 'just', 'some', 'like', 'want', 'need',
  'make', 'made', 'take', 'into', 'also', 'only', 'because',
]);

function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
}

function readSkillDescription(skillsDir, slug) {
  try {
    const content = readFileSync(path.join(skillsDir, slug, 'SKILL.md'), 'utf8');
    const fm = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fm) return '';
    const desc = fm[1].match(/^description:\s*["']?(.+?)["']?\s*$/m);
    return desc ? desc[1] : '';
  } catch {
    return '';
  }
}

try {
  const data = JSON.parse(readFileSync(0, 'utf8'));
  const prompt = data.input?.prompt || '';
  const cwd = data.cwd || process.cwd();
  const skillsDir = path.join(cwd, '.claude', 'skills');

  if (prompt) {
    const promptTokens = new Set(tokenize(prompt));

    let skills = [];
    try {
      skills = readdirSync(skillsDir)
        .filter((name) => {
          try {
            return statSync(path.join(skillsDir, name)).isDirectory();
          } catch {
            return false;
          }
        })
        .sort();
    } catch {
      // .claude/skills/ missing — nothing to hint at
    }

    for (const slug of skills) {
      const slugTokens = tokenize(slug);
      let hit = slugTokens.some((t) => promptTokens.has(t));
      if (!hit) {
        const descTokens = tokenize(readSkillDescription(skillsDir, slug));
        hit = descTokens.some((t) => promptTokens.has(t));
      }
      if (hit) {
        process.stdout.write(
          `[Skill hint] Consider loading skill: ${slug}/SKILL.md\n`
        );
        break;
      }
    }
  }
} catch {
  // Never block user input
}

process.exit(0);
