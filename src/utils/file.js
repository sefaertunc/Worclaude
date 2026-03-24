import fs from 'fs-extra';
import path from 'node:path';

export async function fileExists(filePath) {
  return fs.pathExists(filePath);
}

export async function dirExists(dirPath) {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

export async function ensureDir(dirPath) {
  await fs.ensureDir(dirPath);
}

export async function writeFile(filePath, content) {
  await fs.outputFile(filePath, content, 'utf-8');
}

export async function readFile(filePath) {
  return fs.readFile(filePath, 'utf-8');
}

export async function copyFile(src, dest) {
  await fs.ensureDir(path.dirname(dest));
  await fs.copy(src, dest);
}

export async function listFiles(dirPath) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries.filter((e) => e.isFile()).map((e) => e.name);
  } catch {
    return [];
  }
}

export async function copyDirectory(src, dest) {
  await fs.copy(src, dest);
}

export async function removeDirectory(dirPath) {
  await fs.remove(dirPath);
}

export async function listFilesRecursive(dirPath) {
  const results = [];
  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else {
        results.push(fullPath);
      }
    }
  }
  try {
    await walk(dirPath);
  } catch {
    // directory doesn't exist
  }
  return results;
}
