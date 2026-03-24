import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { hashContent, hashFile } from '../../src/utils/hash.js';

describe('hash utils', () => {
  let tmpDir;

  afterEach(async () => {
    if (tmpDir) {
      await fs.remove(tmpDir);
      tmpDir = null;
    }
  });

  it('hashContent returns consistent SHA-256 hex', () => {
    const hash = hashContent('hello world');
    expect(hash).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
  });

  it('hashContent returns different hashes for different inputs', () => {
    const h1 = hashContent('abc');
    const h2 = hashContent('def');
    expect(h1).not.toBe(h2);
  });

  it('normalizes CRLF to LF before hashing', () => {
    const lfHash = hashContent('line1\nline2\n');
    const crlfHash = hashContent('line1\r\nline2\r\n');
    expect(crlfHash).toBe(lfHash);
  });

  it('hashFile returns hash of file content', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-hash-'));
    const filePath = path.join(tmpDir, 'test.txt');
    await fs.writeFile(filePath, 'hello world');
    const hash = await hashFile(filePath);
    expect(hash).toBe(hashContent('hello world'));
  });
});
