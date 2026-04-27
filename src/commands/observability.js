import path from 'node:path';
import fs from 'fs-extra';
import { computeReport, renderMarkdown } from '../utils/observability.js';
import * as display from '../utils/display.js';

export async function observabilityCommand(options = {}) {
  const projectRoot = process.cwd();
  const report = await computeReport(projectRoot);

  const output = options.json ? JSON.stringify(report, null, 2) : renderMarkdown(report);

  if (options.out) {
    const outPath = path.isAbsolute(options.out)
      ? options.out
      : path.join(projectRoot, options.out);
    await fs.ensureDir(path.dirname(outPath));
    await fs.writeFile(outPath, output);
    display.success(`Wrote observability report to ${path.relative(projectRoot, outPath)}`);
    return;
  }

  process.stdout.write(output);
  if (!output.endsWith('\n')) process.stdout.write('\n');
}
