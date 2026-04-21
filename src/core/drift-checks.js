import path from 'node:path';
import fs from 'fs-extra';
import { fileExists, readFile, writeFile } from '../utils/file.js';
import { resolveRefPath } from './file-categorizer.js';

export const MEMORY_GUIDANCE_KEYWORDS = [
  'memory architecture',
  'native memory',
  '.claude/learnings',
  '[LEARN]',
  '/learn',
];

export function hasClaudeMdMemoryGuidance(content) {
  if (typeof content !== 'string' || content.length === 0) return false;
  const lower = content.toLowerCase();
  return MEMORY_GUIDANCE_KEYWORDS.some((kw) => lower.includes(kw.toLowerCase()));
}

export async function ensureLearningsDir(projectRoot) {
  const dir = path.join(projectRoot, '.claude', 'learnings');
  const gitkeep = path.join(dir, '.gitkeep');
  if (await fs.pathExists(gitkeep)) return false;
  await fs.ensureDir(dir);
  await writeFile(gitkeep, '');
  return true;
}

export function buildMemoryGuidanceSidecar() {
  const preamble = [
    '# CLAUDE.md — Memory Architecture Suggestion',
    '',
    'Your CLAUDE.md does not reference the workflow memory architecture. Auto-learnings may',
    'pollute the main file. Paste the snippet below into CLAUDE.md (near the top, under an',
    'existing "Conventions" or "Session Protocol" section), then delete this sidecar file.',
    '',
    '---',
    '',
    '## Memory Architecture',
    '',
    '- Auto-memory: `.claude/learnings/` (captured by hooks; reviewed via `/learn`).',
    '- CLAUDE.md stays lean — it is shared with teammates. Long-form notes belong in',
    '  `docs/memory/` or the learnings directory.',
    '- The `[LEARN]` marker in tool output flags moments worth capturing.',
    '',
  ];
  return preamble.join('\n');
}

export async function writeMemoryGuidanceSidecar(projectRoot) {
  const dest = resolveRefPath('root/CLAUDE.md', projectRoot);
  await writeFile(dest, buildMemoryGuidanceSidecar());
  return dest;
}

export async function readClaudeMd(projectRoot) {
  const claudeMdPath = path.join(projectRoot, 'CLAUDE.md');
  if (!(await fileExists(claudeMdPath))) return null;
  try {
    return await readFile(claudeMdPath);
  } catch {
    return null;
  }
}
