import crypto from 'node:crypto';
import { readFile } from './file.js';

export function hashContent(content) {
  return crypto.createHash('sha256').update(content, 'utf-8').digest('hex');
}

export async function hashFile(filePath) {
  const content = await readFile(filePath);
  return hashContent(content);
}
