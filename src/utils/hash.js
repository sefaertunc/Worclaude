import crypto from 'node:crypto';
import { readFile } from './file.js';

export function hashContent(content) {
  // Normalize line endings to prevent cross-platform hash mismatches
  const normalized = content.replace(/\r\n/g, '\n');
  return crypto.createHash('sha256').update(normalized, 'utf-8').digest('hex');
}

export async function hashFile(filePath) {
  const content = await readFile(filePath);
  return hashContent(content);
}
