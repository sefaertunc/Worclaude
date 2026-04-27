import { lintRepo } from '../utils/doc-lint.js';
import * as display from '../utils/display.js';

export async function docLintCommand(options = {}) {
  const projectRoot = process.cwd();
  const result = await lintRepo(projectRoot);

  if (!result.hasDrift) {
    display.success(`doc-lint clean — ${result.markerCount} marker(s) checked, no drift.`);
    return;
  }

  display.newline();
  display.barLine(`Drift in ${result.findings.length} location(s):`);
  for (const f of result.findings) {
    if (f.kind === 'test-count-drift') {
      display.barLine(
        `  ${f.file}:${f.claimLine} — claims ${f.claimed.files} test files (actual ${f.actual.files})`
      );
    } else if (f.kind === 'missing-npm-script') {
      display.barLine(
        `  ${f.file}:${f.markerLine} — references \`npm run ${f.scriptName}\` but no such script in package.json`
      );
    } else {
      display.barLine(`  ${f.file}:${f.markerLine} — ${f.kind}`);
    }
  }

  display.newline();
  display.dim(
    'Fix by running /sync (refreshes both test count and file count in step 10c via the test runner) or by editing the cited section.'
  );

  if (options.strict) {
    process.exitCode = 1;
  }
}
