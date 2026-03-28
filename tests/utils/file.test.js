import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import { fileExists, dirExists, ensureDir, writeFile, readFile } from '../../src/utils/file.js';

describe('file utils', () => {
  let tmpDir;

  afterEach(async () => {
    if (tmpDir) {
      await fs.remove(tmpDir);
      tmpDir = null;
    }
  });

  async function makeTmpDir() {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cw-test-'));
    return tmpDir;
  }

  it('fileExists returns true for existing file', async () => {
    const dir = await makeTmpDir();
    const filePath = path.join(dir, 'test.txt');
    await fs.writeFile(filePath, 'hello');
    expect(await fileExists(filePath)).toBe(true);
  });

  it('fileExists returns false for non-existing file', async () => {
    expect(await fileExists(path.join(os.tmpdir(), 'does-not-exist-12345.txt'))).toBe(false);
  });

  it('dirExists returns true for existing directory', async () => {
    const dir = await makeTmpDir();
    expect(await dirExists(dir)).toBe(true);
  });

  it('dirExists returns false for file', async () => {
    const dir = await makeTmpDir();
    const filePath = path.join(dir, 'test.txt');
    await fs.writeFile(filePath, 'hello');
    expect(await dirExists(filePath)).toBe(false);
  });

  it('ensureDir creates nested directories', async () => {
    const dir = await makeTmpDir();
    const nested = path.join(dir, 'a', 'b', 'c');
    await ensureDir(nested);
    expect(await dirExists(nested)).toBe(true);
  });

  it('writeFile creates file with parent dirs', async () => {
    const dir = await makeTmpDir();
    const filePath = path.join(dir, 'sub', 'deep', 'test.txt');
    await writeFile(filePath, 'content');
    expect(await fileExists(filePath)).toBe(true);
    expect(await readFile(filePath)).toBe('content');
  });

  it('readFile returns file content as string', async () => {
    const dir = await makeTmpDir();
    const filePath = path.join(dir, 'read.txt');
    await fs.writeFile(filePath, 'read me');
    expect(await readFile(filePath)).toBe('read me');
  });
});
