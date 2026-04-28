import path from 'node:path';
import fs from 'fs-extra';
import { fileExists, readFile } from '../../../utils/file.js';

const README_CANDIDATES = ['README.md', 'README.rst', 'README.txt'];
const SETUP_HEADING = /installation|getting\s*started|setup|quick\s*start/i;
const SETUP_CAP = 2000;
const MIN_DESCRIPTION_LENGTH = 20;
// Cap full-file read to keep a pathological 50MB README from blocking the scan.
const MAX_README_BYTES = 512 * 1024;
const BADGE_PATTERNS = [/^\s*\[!\[.*?\]\(.*?\)\]\(.*?\)\s*$/, /^\s*!\[.*?\]\(.*?\)\s*$/];

function stripUntilStable(text, regex) {
  let prev;
  do {
    prev = text;
    text = text.replace(regex, '');
  } while (text !== prev);
  return text;
}

function stripHtmlComments(text) {
  return stripUntilStable(text, /<!--[\s\S]*?-->/g);
}

function stripHtmlTags(text) {
  return stripUntilStable(text, /<[^>]+>/g);
}

function isSkippable(line) {
  if (line.trim() === '') return true;
  return BADGE_PATTERNS.some((p) => p.test(line));
}

function stripLeadingBadges(lines) {
  const result = [...lines];
  while (result.length > 0 && isSkippable(result[0])) {
    result.shift();
  }
  return result;
}

function firstNonEmptyParagraph(lines, startIndex) {
  let i = startIndex;
  while (i < lines.length && isSkippable(lines[i])) i++;
  if (i >= lines.length) return null;
  const paragraph = [];
  while (i < lines.length && lines[i].trim() !== '') {
    if (/^#{1,6}\s/.test(lines[i])) break;
    if (isSkippable(lines[i])) {
      i++;
      continue;
    }
    paragraph.push(lines[i]);
    i++;
  }
  const text = paragraph.join(' ').trim();
  return text.length > 0 ? text : null;
}

function findH1Index(lines) {
  return lines.findIndex((line) => /^#\s+/.test(line));
}

function extractSetupInstructions(lines) {
  const startIdx = lines.findIndex(
    (line) => /^#{1,6}\s/.test(line) && SETUP_HEADING.test(line.replace(/^#+\s+/, ''))
  );
  if (startIdx === -1) return null;
  const body = [];
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (/^#{1,6}\s/.test(lines[i])) break;
    body.push(lines[i]);
  }
  const text = body.join('\n').trim();
  if (text.length === 0) return null;
  return text.length > SETUP_CAP ? text.slice(0, SETUP_CAP) : text;
}

export default async function detectReadme(projectRoot) {
  let sourceFile = null;
  let content = null;
  for (const candidate of README_CANDIDATES) {
    const p = path.join(projectRoot, candidate);
    if (await fileExists(p)) {
      sourceFile = candidate;
      const stat = await fs.stat(p);
      if (stat.size > MAX_README_BYTES) {
        // Oversized README — read just the head; description/setup headings are near the top.
        const handle = await fs.open(p, 'r');
        try {
          const buf = Buffer.alloc(MAX_README_BYTES);
          const { bytesRead } = await handle.read(buf, 0, MAX_README_BYTES, 0);
          content = buf.subarray(0, bytesRead).toString('utf-8');
        } finally {
          await handle.close();
        }
      } else {
        content = await readFile(p);
      }
      break;
    }
  }
  if (!sourceFile) return [];

  const cleaned = stripHtmlTags(stripHtmlComments(content));
  const rawLines = cleaned.split(/\r?\n/);
  const lines = stripLeadingBadges(rawLines);

  const h1Index = findH1Index(lines);
  const descStart = h1Index === -1 ? 0 : h1Index + 1;
  let projectDescription = firstNonEmptyParagraph(lines, descStart);
  if (projectDescription && projectDescription.length < MIN_DESCRIPTION_LENGTH) {
    projectDescription = null;
  }

  const setupInstructions = extractSetupInstructions(lines);

  return [
    {
      field: 'readme',
      value: {
        projectDescription,
        setupInstructions,
        fullPath: sourceFile,
      },
      confidence: 'medium',
      source: sourceFile,
      candidates: null,
    },
  ];
}
